// order.controller.js

import Order from "../models/order.model.js";
import Course from "../models/course.model.js";
import Enrollment from "../models/enrollment.model.js";
import asyncHandler from "express-async-handler";

export const createOrder = asyncHandler(async (req, res) => {
  // We don't require payment details for free courses, so they can be optional
  const { courseId, paymentMethod, paymentNumber, transactionId } = req.body;
  const userId = req.user._id;

  if (!courseId) {
    res.status(400);
    throw new Error("Course ID is required");
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
    await Order.create({
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

  const existingOrder = await Order.findOne({ user: userId, course: courseId, paymentStatus: { $in: ['pending', 'paid'] } });
  if(existingOrder) {
      res.status(409);
      throw new Error(`You already have a '${existingOrder.paymentStatus}' order for this course.`);
  }

  const amount = course.discountPrice > 0 ? course.discountPrice : course.price;

  const order = await Order.create({
    user: userId,
    course: courseId,
    amount,
    paymentMethod,
    paymentNumber,
    transactionId,
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
    .populate("course", "title slug thumbnail")
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
      .populate("user", "name email")
      .populate("course", "title slug");

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
    const { paymentStatus, transactionId } = req.body;

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
    }
    
    const updatedOrder = await order.save();

    res.status(200).json({
        success: true,
        message: `Order status updated to '${paymentStatus}'`,
        data: updatedOrder
    });
});