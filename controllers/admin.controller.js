// admin.controller.js

import User from '../models/user.model.js';
import Course from '../models/course.model.js';
import Lesson from '../models/lesson.model.js';
import Category from '../models/category.model.js';
import Review from '../models/review.model.js';
import Enrollment from '../models/enrollment.model.js';
import Order from '../models/order.model.js';
import QuizScore from '../models/quizScore.model.js';
import asyncHandler from 'express-async-handler';
import { sendCoursePurchaseConfirmation } from '../services/email.service.js';

// =================================================================
// USER MANAGEMENT
// =================================================================

/**
 * @desc    Get all users with pagination and filtering
 * @route   GET /api/admin/users
 * @access  Private/Admin
 */
export const getAllUsers = asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const role = req.query.role; // Filter by role: student, instructor, admin
    const search = req.query.search; // Search by name or email

    // Build query
    let query = {};
    if (role) {
        query.role = role;
    }
    if (search) {
        query.$or = [
            { name: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } }
        ];
    }

    const skip = (page - 1) * limit;

    const users = await User.find(query)
        .select('-password')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

    const total = await User.countDocuments(query);

    res.status(200).json({
        success: true,
        count: users.length,
        total,
        page,
        pages: Math.ceil(total / limit),
        data: users
    });
});

/**
 * @desc    Get user by ID
 * @route   GET /api/admin/users/:id
 * @access  Private/Admin
 */
export const getUserById = asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id).select('-password');
    
    if (!user) {
        res.status(404);
        throw new Error('User not found');
    }

    res.status(200).json({
        success: true,
        data: user
    });
});

/**
 * @desc    Update user
 * @route   PUT /api/admin/users/:id
 * @access  Private/Admin
 */
export const updateUser = asyncHandler(async (req, res) => {
    const { name, email, role, isActive } = req.body;

    const user = await User.findById(req.params.id);
    if (!user) {
        res.status(404);
        throw new Error('User not found');
    }

    // Prevent admin from changing their own role
    if (req.user.id === req.params.id && role && role !== user.role) {
        res.status(400);
        throw new Error('You cannot change your own role');
    }

    const updatedUser = await User.findByIdAndUpdate(
        req.params.id,
        { name, email, role, isActive },
        { new: true, runValidators: true }
    ).select('-password');

    res.status(200).json({
        success: true,
        message: 'User updated successfully',
        data: updatedUser
    });
});

/**
 * @desc    Delete user
 * @route   DELETE /api/admin/users/:id
 * @access  Private/Admin
 */
export const deleteUser = asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id);
    if (!user) {
        res.status(404);
        throw new Error('User not found');
    }

    // Prevent admin from deleting themselves
    if (req.user.id === req.params.id) {
        res.status(400);
        throw new Error('You cannot delete your own account');
    }

    await user.deleteOne();

    res.status(200).json({
        success: true,
        message: 'User deleted successfully'
    });
});

// =================================================================
// COURSE MANAGEMENT
// =================================================================

/**
 * @desc    Get all courses with detailed information
 * @route   GET /api/admin/courses
 * @access  Private/Admin
 */
export const getAllCoursesAdmin = asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const status = req.query.status; // published, unpublished, ended
    const search = req.query.search;

    let query = {};
    if (status === 'published') {
        query.isPublished = true;
        query.isEnded = false;
    } else if (status === 'unpublished') {
        query.isPublished = false;
    } else if (status === 'ended') {
        query.isEnded = true;
    }

    if (search) {
        query.$or = [
            { title: { $regex: search, $options: 'i' } },
            { description: { $regex: search, $options: 'i' } }
        ];
    }

    const skip = (page - 1) * limit;

    const courses = await Course.find(query)
        .populate('instructor', 'name email avatar')
        .populate('category', 'name')
        .populate('lessons', 'title duration')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

    // Add enrollment count for each course
    const coursesWithCounts = await Promise.all(courses.map(async (course) => {
        const enrollmentCount = await Enrollment.countDocuments({ course: course._id });
        return {
            ...course.toObject(),
            enrollmentCount
        };
    }));

    const total = await Course.countDocuments(query);

    res.status(200).json({
        success: true,
        count: coursesWithCounts.length,
        total,
        page,
        pages: Math.ceil(total / limit),
        data: coursesWithCounts
    });
});

/**
 * @desc    Update course (admin can update any course)
 * @route   PUT /api/admin/courses/:id
 * @access  Private/Admin
 */
export const updateCourseAdmin = asyncHandler(async (req, res) => {
    const course = await Course.findById(req.params.id);
    if (!course) {
        res.status(404);
        throw new Error('Course not found');
    }

    // Filter out empty strings and undefined values to prevent ObjectId casting errors
    const updateData = {};
    Object.keys(req.body).forEach(key => {
        const value = req.body[key];
        // Only include non-empty strings and valid values
        if (value !== '' && value !== null && value !== undefined) {
            updateData[key] = value;
        }
    });

    const updatedCourse = await Course.findByIdAndUpdate(
        req.params.id,
        updateData,
        { new: true, runValidators: true }
    ).populate('instructor', 'name email avatar').populate('category', 'name');

    res.status(200).json({
        success: true,
        message: 'Course updated successfully',
        data: updatedCourse
    });
});

/**
 * @desc    Delete course (admin can delete any course)
 * @route   DELETE /api/admin/courses/:id
 * @access  Private/Admin
 */
export const deleteCourseAdmin = asyncHandler(async (req, res) => {
    const course = await Course.findById(req.params.id);
    if (!course) {
        res.status(404);
        throw new Error('Course not found');
    }

    // Delete associated lessons
    await Lesson.deleteMany({ course: req.params.id });

    // Delete associated enrollments
    await Enrollment.deleteMany({ course: req.params.id });

    // Delete associated reviews
    await Review.deleteMany({ course: req.params.id });

    // Delete associated quiz scores
    await QuizScore.deleteMany({ course: req.params.id });

    await course.deleteOne();

    res.status(200).json({
        success: true,
        message: 'Course and all associated data deleted successfully'
    });
});

// =================================================================
// LESSON MANAGEMENT
// =================================================================

/**
 * @desc    Get all lessons with course information
 * @route   GET /api/admin/lessons
 * @access  Private/Admin
 */
export const getAllLessonsAdmin = asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const courseId = req.query.courseId;
    const search = req.query.search;

    let query = {};
    if (courseId) {
        query.course = courseId;
    }
    if (search) {
        query.$or = [
            { title: { $regex: search, $options: 'i' } },
            { content: { $regex: search, $options: 'i' } }
        ];
    }

    const skip = (page - 1) * limit;

    const lessons = await Lesson.find(query)
        .populate('course', 'title instructor')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

    const total = await Lesson.countDocuments(query);

    res.status(200).json({
        success: true,
        count: lessons.length,
        total,
        page,
        pages: Math.ceil(total / limit),
        data: lessons
    });
});

/**
 * @desc    Update lesson (admin can update any lesson)
 * @route   PUT /api/admin/lessons/:id
 * @access  Private/Admin
 */
export const updateLessonAdmin = asyncHandler(async (req, res) => {
    const lesson = await Lesson.findById(req.params.id);
    if (!lesson) {
        res.status(404);
        throw new Error('Lesson not found');
    }

    const updatedLesson = await Lesson.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true, runValidators: true }
    ).populate('course', 'title instructor');

    res.status(200).json({
        success: true,
        message: 'Lesson updated successfully',
        data: updatedLesson
    });
});

/**
 * @desc    Delete lesson (admin can delete any lesson)
 * @route   DELETE /api/admin/lessons/:id
 * @access  Private/Admin
 */
export const deleteLessonAdmin = asyncHandler(async (req, res) => {
    const lesson = await Lesson.findById(req.params.id);
    if (!lesson) {
        res.status(404);
        throw new Error('Lesson not found');
    }

    // Remove lesson from course
    await Course.findByIdAndUpdate(
        lesson.course,
        { $pull: { lessons: req.params.id } }
    );

    // Delete associated quiz scores
    await QuizScore.deleteMany({ lesson: req.params.id });

    await lesson.deleteOne();

    res.status(200).json({
        success: true,
        message: 'Lesson deleted successfully'
    });
});

// =================================================================
// CATEGORY MANAGEMENT
// =================================================================

/**
 * @desc    Get all categories
 * @route   GET /api/admin/categories
 * @access  Private/Admin
 */
export const getAllCategoriesAdmin = asyncHandler(async (req, res) => {
    const categories = await Category.find({})
        .sort({ createdAt: -1 });

    // Add course count for each category
    const categoriesWithCounts = await Promise.all(categories.map(async (category) => {
        const courseCount = await Course.countDocuments({ category: category._id });
        return {
            ...category.toObject(),
            courseCount
        };
    }));

    res.status(200).json({
        success: true,
        count: categoriesWithCounts.length,
        data: categoriesWithCounts
    });
});

/**
 * @desc    Create category
 * @route   POST /api/admin/categories
 * @access  Private/Admin
 */
export const createCategoryAdmin = asyncHandler(async (req, res) => {
    const { name, description } = req.body;

    // 1. Validation
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
        res.status(400);
        throw new Error("Category name is required and must be a non-empty string");
    }

    // 2. Generate slug with better error handling
    let slug;
    try {
        const slugify = (await import('slugify')).default;
        slug = slugify(name.trim(), { 
            lower: true, 
            strict: true,
            remove: /[*+~.()'"!:@]/g // Remove special characters that might cause issues
        });
        
        // Ensure slug is not empty after processing
        if (!slug || slug.length === 0) {
            slug = slugify(name.trim(), { lower: true, replacement: '-' });
        }
    } catch (error) {
        console.error('Error generating slug:', error);
        res.status(500);
        throw new Error("Error processing category name");
    }

    // 3. Check for existing category with the same name or slug
    const categoryExists = await Category.findOne({ $or: [{ name: name.trim() }, { slug }] });
    if (categoryExists) {
        res.status(409); // Conflict
        throw new Error("A category with this name or slug already exists");
    }

    // 4. Create and save the new category
    try {
        const category = await Category.create({ 
            name: name.trim(), 
            slug,
            description: description?.trim() || undefined
        });

        res.status(201).json({
            success: true,
            message: 'Category created successfully',
            data: category
        });
    } catch (error) {
        console.error('Error creating category:', error);
        if (error.name === 'ValidationError') {
            res.status(400);
            throw new Error(`Validation error: ${error.message}`);
        }
        throw error;
    }
});

/**
 * @desc    Update category
 * @route   PUT /api/admin/categories/:id
 * @access  Private/Admin
 */
export const updateCategoryAdmin = asyncHandler(async (req, res) => {
    const categoryId = req.params.id;
    const { name, description } = req.body;

    // 1. Find the category to be updated
    let category = await Category.findById(categoryId);
    if (!category) {
        res.status(404);
        throw new Error('Category not found');
    }

    // 2. Prepare updates
    const updates = {};
    if (name) {
        // Validate name
        if (typeof name !== 'string' || name.trim().length === 0) {
            res.status(400);
            throw new Error("Category name must be a non-empty string");
        }

        updates.name = name.trim();
        
        // Generate slug with better error handling
        try {
            const slugify = (await import('slugify')).default;
            let slug = slugify(name.trim(), { 
                lower: true, 
                strict: true,
                remove: /[*+~.()'"!:@]/g
            });
            
            // Ensure slug is not empty after processing
            if (!slug || slug.length === 0) {
                slug = slugify(name.trim(), { lower: true, replacement: '-' });
            }
            
            updates.slug = slug;
        } catch (error) {
            console.error('Error generating slug:', error);
            res.status(500);
            throw new Error("Error processing category name");
        }

        // 3. Check for conflict with another category
        const existingCategory = await Category.findOne({
            $or: [{ name: updates.name }, { slug: updates.slug }],
            _id: { $ne: categoryId }, // Exclude the current category from the check
        });

        if (existingCategory) {
            res.status(409);
            throw new Error("Another category with this name or slug already exists");
        }
    }

    if (description !== undefined) {
        updates.description = description?.trim() || undefined;
    }

    // 4. Perform the update
    try {
        const updatedCategory = await Category.findByIdAndUpdate(categoryId, updates, {
            new: true,
            runValidators: true,
        });

        res.status(200).json({
            success: true,
            message: 'Category updated successfully',
            data: updatedCategory
        });
    } catch (error) {
        console.error('Error updating category:', error);
        if (error.name === 'ValidationError') {
            res.status(400);
            throw new Error(`Validation error: ${error.message}`);
        }
        throw error;
    }
});

/**
 * @desc    Delete category
 * @route   DELETE /api/admin/categories/:id
 * @access  Private/Admin
 */
export const deleteCategoryAdmin = asyncHandler(async (req, res) => {
    const category = await Category.findById(req.params.id);
    if (!category) {
        res.status(404);
        throw new Error('Category not found');
    }

    // Check if category is being used by any courses
    const courseCount = await Course.countDocuments({ category: req.params.id });
    if (courseCount > 0) {
        res.status(400);
        throw new Error(`Cannot delete category. It is being used by ${courseCount} course(s)`);
    }

    await category.deleteOne();

    res.status(200).json({
        success: true,
        message: 'Category deleted successfully'
    });
});

// =================================================================
// REVIEW MANAGEMENT
// =================================================================

/**
 * @desc    Get all reviews
 * @route   GET /api/admin/reviews
 * @access  Private/Admin
 */
export const getAllReviewsAdmin = asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const rating = req.query.rating;
    const courseId = req.query.courseId;

    let query = {};
    if (rating) {
        query.rating = parseInt(rating);
    }
    if (courseId) {
        query.course = courseId;
    }

    const skip = (page - 1) * limit;

    const reviews = await Review.find(query)
        .populate('student', 'name email')
        .populate('course', 'title')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

    const total = await Review.countDocuments(query);

    res.status(200).json({
        success: true,
        count: reviews.length,
        total,
        page,
        pages: Math.ceil(total / limit),
        data: reviews
    });
});

/**
 * @desc    Delete review
 * @route   DELETE /api/admin/reviews/:id
 * @access  Private/Admin
 */
export const deleteReviewAdmin = asyncHandler(async (req, res) => {
    const review = await Review.findById(req.params.id);
    if (!review) {
        res.status(404);
        throw new Error('Review not found');
    }

    await review.deleteOne();

    res.status(200).json({
        success: true,
        message: 'Review deleted successfully'
    });
});

// =================================================================
// ENROLLMENT MANAGEMENT
// =================================================================

/**
 * @desc    Get all enrollments
 * @route   GET /api/admin/enrollments
 * @access  Private/Admin
 */
export const getAllEnrollmentsAdmin = asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const courseId = req.query.courseId;
    const studentId = req.query.studentId;

    let query = {};
    if (courseId) {
        query.course = courseId;
    }
    if (studentId) {
        query.student = studentId;
    }

    const skip = (page - 1) * limit;

    const enrollments = await Enrollment.find(query)
        .populate('student', 'name email')
        .populate('course', 'title instructor')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

    const total = await Enrollment.countDocuments(query);

    res.status(200).json({
        success: true,
        count: enrollments.length,
        total,
        page,
        pages: Math.ceil(total / limit),
        data: enrollments
    });
});

/**
 * @desc    Delete enrollment
 * @route   DELETE /api/admin/enrollments/:id
 * @access  Private/Admin
 */
export const deleteEnrollmentAdmin = asyncHandler(async (req, res) => {
    const enrollment = await Enrollment.findById(req.params.id);
    if (!enrollment) {
        res.status(404);
        throw new Error('Enrollment not found');
    }

    await enrollment.deleteOne();

    res.status(200).json({
        success: true,
        message: 'Enrollment deleted successfully'
    });
});

// =================================================================
// ORDER MANAGEMENT
// =================================================================

/**
 * @desc    Get all orders
 * @route   GET /api/admin/orders
 * @access  Private/Admin
 */
export const getAllOrdersAdmin = asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const status = req.query.status;

    let query = {};
    if (status) {
        query.paymentStatus = status;
    }

    const skip = (page - 1) * limit;

    const orders = await Order.find(query)
        .populate('user', 'name email avatar')
        .populate({
            path: 'course',
            select: 'title price thumbnail discountPrice instructor category',
            populate: [
                {
                    path: 'instructor',
                    select: 'name avatar'
                },
                {
                    path: 'category',
                    select: 'name'
                }
            ]
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

    const total = await Order.countDocuments(query);

    res.status(200).json({
        success: true,
        count: orders.length,
        total,
        page,
        pages: Math.ceil(total / limit),
        data: orders
    });
});

/**
 * @desc    Get order by ID
 * @route   GET /api/admin/orders/:id
 * @access  Private/Admin
 */
export const getOrderByIdAdmin = asyncHandler(async (req, res) => {
    const order = await Order.findById(req.params.id)
        .populate('user', 'name email avatar')
        .populate('course', 'title price thumbnail instructor')
        .populate('course.instructor', 'name');

    if (!order) {
        res.status(404);
        throw new Error('Order not found');
    }

    res.status(200).json({
        success: true,
        data: order
    });
});

/**
 * @desc    Update order details
 * @route   PUT /api/admin/orders/:id
 * @access  Private/Admin
 */
export const updateOrderAdmin = asyncHandler(async (req, res) => {
    const { paymentMethod, paymentNumber, transactionId, amount, paymentStatus } = req.body;
    
    const order = await Order.findById(req.params.id);

    if (!order) {
        res.status(404);
        throw new Error('Order not found');
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
        message: 'Order updated successfully',
        data: updatedOrder
    });
});

/**
 * @desc    Delete order
 * @route   DELETE /api/admin/orders/:id
 * @access  Private/Admin
 */
export const deleteOrderAdmin = asyncHandler(async (req, res) => {
    const order = await Order.findById(req.params.id);

    if (!order) {
        res.status(404);
        throw new Error('Order not found');
    }

    await order.deleteOne();

    res.status(200).json({
        success: true,
        message: 'Order deleted successfully'
    });
});

// =================================================================
// QUIZ SCORES MANAGEMENT
// =================================================================

/**
 * @desc    Get all quiz scores
 * @route   GET /api/admin/quiz-scores
 * @access  Private/Admin
 */
export const getAllQuizScoresAdmin = asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const courseId = req.query.courseId;
    const lessonId = req.query.lessonId;
    const studentId = req.query.studentId;

    let query = {};
    if (courseId) {
        query.course = courseId;
    }
    if (lessonId) {
        query.lesson = lessonId;
    }
    if (studentId) {
        query.student = studentId;
    }

    const skip = (page - 1) * limit;

    const quizScores = await QuizScore.find(query)
        .populate('student', 'name email')
        .populate('course', 'title')
        .populate('lesson', 'title')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

    const total = await QuizScore.countDocuments(query);

    res.status(200).json({
        success: true,
        count: quizScores.length,
        total,
        page,
        pages: Math.ceil(total / limit),
        data: quizScores
    });
});

// =================================================================
// DASHBOARD STATISTICS
// =================================================================

/**
 * @desc    Get admin dashboard statistics
 * @route   GET /api/admin/dashboard/stats
 * @access  Private/Admin
 */
export const getAdminDashboardStats = asyncHandler(async (req, res) => {
    const [
        totalUsers,
        totalStudents,
        totalInstructors,
        totalCourses,
        publishedCourses,
        unpublishedCourses,
        totalLessons,
        totalCategories,
        totalEnrollments,
        totalOrders,
        totalRevenue,
        recentUsers,
        recentCourses
    ] = await Promise.all([
        User.countDocuments(),
        User.countDocuments({ role: 'student' }),
        User.countDocuments({ role: 'instructor' }),
        Course.countDocuments(),
        Course.countDocuments({ isPublished: true }),
        Course.countDocuments({ isPublished: false }),
        Lesson.countDocuments(),
        Category.countDocuments(),
        Enrollment.countDocuments(),
        Order.countDocuments(),
        Order.aggregate([
            { $match: { status: 'completed' } },
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]),
        User.find().sort({ createdAt: -1 }).limit(5).select('name email role createdAt'),
        Course.find().sort({ createdAt: -1 }).limit(5).populate('instructor', 'name avatar').select('title instructor createdAt')
    ]);

    const revenue = totalRevenue.length > 0 ? totalRevenue[0].total : 0;

    res.status(200).json({
        success: true,
        data: {
            users: {
                total: totalUsers,
                students: totalStudents,
                instructors: totalInstructors
            },
            courses: {
                total: totalCourses,
                published: publishedCourses,
                unpublished: unpublishedCourses
            },
            content: {
                lessons: totalLessons,
                categories: totalCategories
            },
            engagement: {
                enrollments: totalEnrollments,
                orders: totalOrders,
                revenue: revenue
            },
            recent: {
                users: recentUsers,
                courses: recentCourses
            }
        }
    });
});
