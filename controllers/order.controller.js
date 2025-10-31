// order.controller.js

import Order from "../models/order.model.js";
import Course from "../models/course.model.js";
import Enrollment from "../models/enrollment.model.js";
import User from "../models/user.model.js";
import asyncHandler from "express-async-handler";
import { v2 as cloudinary } from 'cloudinary';
import { sendCoursePurchaseConfirmation } from "../services/email.service.js";

export const createOrder = asyncHandler(async (req, res) => {
  // Import validation utilities
  const { sanitizeString, validateObjectId } = await import('../utils/validation.js');

  // We don't require payment details for free courses, so they can be optional
  const courseId = req.body.courseId ? String(req.body.courseId).trim() : '';
  const paymentMethod = req.body.paymentMethod ? sanitizeString(req.body.paymentMethod, 50) : '';
  const paymentNumber = req.body.paymentNumber ? sanitizeString(String(req.body.paymentNumber), 50) : '';
  const transactionId = req.body.transactionId ? sanitizeString(req.body.transactionId, 100) : '';
  const userId = req.user._id;

  // Validate courseId
  if (!courseId || !validateObjectId(courseId)) {
    res.status(400);
    throw new Error("Valid course ID is required");
  }

  const course = await Course.findById(courseId);
  if (!course || !course.isPublished) {
    res.status(404);
    throw new Error("Course not found or is not available");
  }

  const isEnrolled = await Enrollment.findOne({ student: userId, course: courseId });
  if (isEnrolled) {
    res.status(409);
    throw new Error("You are already enrolled in this course");
  }

  // --- NEW LOGIC FOR FREE COURSES ---
  const isFreeCourse = course.price === 0;

  if (isFreeCourse) {
    // 1. Create an Order record for tracking purposes (optional but good practice)
    const order = await Order.create({
      user: userId,
      course: courseId,
      amount: 0,
      paymentMethod: "free", // Use a specific method for free orders
      paymentStatus: "paid", // Mark as paid immediately
      paymentNumber: 0,
      transactionId: `free_${userId}_${courseId}`,
    });
    
    // 2. Create the Enrollment record immediately
    const enrollment = await Enrollment.create({
      student: userId,
      course: courseId,
    });
    
    // 3. Send confirmation email (async, don't block response)
    try {
      const user = await User.findById(userId).select('name email');
      if (user && user.email) {
        await sendCoursePurchaseConfirmation({
          email: user.email,
          name: user.name,
          courseTitle: course.title,
          courseSlug: course.slug,
          amount: 0,
          orderId: order._id.toString(),
          groupLink: course.groupLink || '',
        });
      }
    } catch (emailError) {
      console.error('Error sending course purchase confirmation email:', emailError);
      // Don't fail the request if email fails
    }
    
    return res.status(201).json({
      success: true,
      message: "Successfully enrolled in the free course!",
      data: enrollment, // Send back enrollment data
    });
  }

  // --- EXISTING LOGIC FOR PAID COURSES ---
  
  // Validation for paid courses
  if (!paymentMethod || !paymentNumber || !transactionId) {
    res.status(400);
    throw new Error("Payment method, number, and transaction ID are required for paid courses.");
  }

  // Validate payment method format
  const allowedPaymentMethods = ['bkash', 'nagad', 'rocket', 'bank', 'card', 'cash'];
  if (!allowedPaymentMethods.includes(paymentMethod.toLowerCase())) {
    res.status(400);
    throw new Error("Invalid payment method");
  }

  const existingOrder = await Order.findOne({ user: userId, course: courseId, paymentStatus: { $in: ['pending', 'paid'] } });
  if(existingOrder) {
      res.status(409);
      throw new Error(`You already have a '${existingOrder.paymentStatus}' order for this course.`);
  }

  const amount = course.discountPrice > 0 ? course.discountPrice : course.price;

  // Handle payment slip upload
  let paymentSlipUrl = "";
  if (req.file) {
    // Cloudinary returns the URL in different properties depending on the version
    paymentSlipUrl = req.file.secure_url || req.file.url || req.file.path;
  }

  const order = await Order.create({
    user: userId,
    course: courseId,
    amount,
    paymentMethod,
    paymentNumber,
    transactionId,
    paymentSlip: paymentSlipUrl,
    paymentStatus: "pending",
  });

  res.status(201).json({
    success: true,
    message: "Order created successfully. Please wait for payment confirmation.",
    data: order,
  });
});


/**
 * @desc    Get all orders for the logged-in user
 * @route   GET /api/orders/my-orders
 * @access  Private
 */
export const getMyOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find({ user: req.user._id })
    .populate({
      path: "course",
      select: "title slug thumbnail price discountPrice instructor category",
      populate: [
        {
          path: "instructor",
          select: "name avatar"
        },
        {
          path: "category",
          select: "name"
        }
      ]
    })
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    count: orders.length,
    data: orders,
  });
});


/**
 * @desc    Get a single order by ID
 * @route   GET /api/orders/:id
 * @access  Private
 */
export const getOrderById = asyncHandler(async (req, res) => {
    const order = await Order.findById(req.params.id)
      .populate("user", "name email avatar")
      .populate({
        path: "course",
        select: "title slug thumbnail price discountPrice instructor category",
        populate: [
          {
            path: "instructor",
            select: "name avatar"
          },
          {
            path: "category",
            select: "name"
          }
        ]
      });

    if (!order) {
        res.status(404);
        throw new Error("Order not found");
    }

    // Authorization: User must be the order owner or an admin
    if (order.user._id.toString() !== req.user.id && req.user.role !== 'admin') {
        res.status(403);
        throw new Error("Not authorized to view this order");
    }

    res.status(200).json({ success: true, data: order });
});


/**
 * @desc    Get all orders (Admin only)
 * @route   GET /api/orders
 * @access  Private/Admin
 */
export const getAllOrders = asyncHandler(async (req, res) => {
    const orders = await Order.find({})
      .populate("user", "name email")
      .populate("course", "title")
      .sort({ createdAt: -1 });
      
    res.status(200).json({ success: true, count: orders.length, data: orders });
});


/**
 * @desc    Update order status (Admin only)
 * @route   PATCH /api/orders/:id/status
 * @access  Private/Admin
 */
export const updateOrderStatus = asyncHandler(async (req, res) => {
    const { paymentStatus, transactionId, paymentNumber } = req.body;

    if (!paymentStatus || !['pending', 'paid', 'failed'].includes(paymentStatus)) {
        res.status(400);
        throw new Error("Invalid payment status");
    }
    
    const order = await Order.findById(req.params.id);

    if (!order) {
        res.status(404);
        throw new Error("Order not found");
    }

    if (order.paymentStatus === 'paid') {
        res.status(400);
        throw new Error("This order has already been completed and cannot be changed.");
    }

    order.paymentStatus = paymentStatus;
    if (transactionId) {
        order.transactionId = transactionId;
    }
    if (paymentNumber) {
        order.paymentNumber = paymentNumber;
    }

    // === CRITICAL LOGIC: Create enrollment if payment is successful ===
    if (paymentStatus === 'paid') {
        // Ensure enrollment doesn't already exist before creating
        const isEnrolled = await Enrollment.findOne({ student: order.user, course: order.course });
        if (!isEnrolled) {
            await Enrollment.create({
                student: order.user,
                course: order.course
            });
        }
        
        // Send confirmation email (async, don't block response)
        try {
            const populatedOrder = await Order.findById(order._id)
                .populate('user', 'name email')
                .populate('course', 'title slug groupLink');
            
            if (populatedOrder && populatedOrder.user && populatedOrder.user.email && populatedOrder.course) {
                await sendCoursePurchaseConfirmation({
                    email: populatedOrder.user.email,
                    name: populatedOrder.user.name,
                    courseTitle: populatedOrder.course.title,
                    courseSlug: populatedOrder.course.slug,
                    amount: order.amount,
                    orderId: order._id.toString(),
                    groupLink: populatedOrder.course.groupLink || '',
                });
            }
        } catch (emailError) {
            console.error('Error sending course purchase confirmation email:', emailError);
            // Don't fail the request if email fails
        }
    }
    
    const updatedOrder = await order.save();

    res.status(200).json({
        success: true,
        message: `Order status updated to '${paymentStatus}'`,
        data: updatedOrder
    });
});

/**
 * @desc    Update order details (Admin only)
 * @route   PUT /api/orders/:id
 * @access  Private/Admin
 */
export const updateOrder = asyncHandler(async (req, res) => {
    const { paymentMethod, paymentNumber, transactionId, amount, paymentStatus } = req.body;
    
    const order = await Order.findById(req.params.id);

    if (!order) {
        res.status(404);
        throw new Error("Order not found");
    }

    // Store the previous payment status to check if it changed to 'paid'
    const previousStatus = order.paymentStatus;

    // Update fields if provided
    if (paymentMethod) order.paymentMethod = paymentMethod;
    if (paymentNumber) order.paymentNumber = paymentNumber;
    if (transactionId) order.transactionId = transactionId;
    if (amount !== undefined) order.amount = amount;
    if (paymentStatus) order.paymentStatus = paymentStatus;

    // === CRITICAL LOGIC: Create enrollment if payment status changed to 'paid' ===
    if (paymentStatus === 'paid' && previousStatus !== 'paid') {
        // Ensure enrollment doesn't already exist before creating
        const isEnrolled = await Enrollment.findOne({ student: order.user, course: order.course });
        if (!isEnrolled) {
            await Enrollment.create({
                student: order.user,
                course: order.course
            });
        }
        
        // Send confirmation email (async, don't block response)
        try {
            const populatedOrder = await Order.findById(order._id)
                .populate('user', 'name email')
                .populate('course', 'title slug groupLink');
            
            if (populatedOrder && populatedOrder.user && populatedOrder.user.email && populatedOrder.course) {
                await sendCoursePurchaseConfirmation({
                    email: populatedOrder.user.email,
                    name: populatedOrder.user.name,
                    courseTitle: populatedOrder.course.title,
                    courseSlug: populatedOrder.course.slug,
                    amount: order.amount,
                    orderId: order._id.toString(),
                    groupLink: populatedOrder.course.groupLink || '',
                });
            }
        } catch (emailError) {
            console.error('Error sending course purchase confirmation email:', emailError);
            // Don't fail the request if email fails
        }
    }

    const updatedOrder = await order.save();

    res.status(200).json({
        success: true,
        message: "Order updated successfully",
        data: updatedOrder
    });
});

/**
 * @desc    Update payment slip for an order
 * @route   PUT /api/orders/:id/payment-slip
 * @access  Private
 */
export const updatePaymentSlip = asyncHandler(async (req, res) => {
    const order = await Order.findById(req.params.id);

    if (!order) {
        res.status(404);
        throw new Error("Order not found");
    }

    // Authorization: User must be the order owner
    if (order.user.toString() !== req.user._id.toString()) {
        res.status(403);
        throw new Error("Not authorized to update this order");
    }

    // Update payment slip if a new file is uploaded
    if (req.file) {
        // If order already has a payment slip, delete the old one from Cloudinary
        if (order.paymentSlip) {
            const publicId = order.paymentSlip.split('/').pop().split('.')[0];
            await cloudinary.uploader.destroy(`lms/payment-slips/${publicId}`);
        }
        
        // Cloudinary returns the URL in different properties depending on the version
        const paymentSlipUrl = req.file.secure_url || req.file.url || req.file.path;
        order.paymentSlip = paymentSlipUrl;
    }

    const updatedOrder = await order.save();

    res.status(200).json({
        success: true,
        message: "Payment slip updated successfully",
        data: updatedOrder,
    });
});

/**
 * @desc    Delete order (Admin only)
 * @route   DELETE /api/orders/:id
 * @access  Private/Admin
 */
export const deleteOrder = asyncHandler(async (req, res) => {
    const order = await Order.findById(req.params.id);

    if (!order) {
        res.status(404);
        throw new Error("Order not found");
    }

    await order.deleteOne();

    res.status(200).json({
        success: true,
        message: "Order deleted successfully"
    });
});