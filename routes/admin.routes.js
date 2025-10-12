// admin.routes.js

import express from 'express';
import {
    // User Management
    getAllUsers,
    getUserById,
    updateUser,
    deleteUser,
    
    // Course Management
    getAllCoursesAdmin,
    updateCourseAdmin,
    deleteCourseAdmin,
    
    // Lesson Management
    getAllLessonsAdmin,
    updateLessonAdmin,
    deleteLessonAdmin,
    
    // Category Management
    getAllCategoriesAdmin,
    createCategoryAdmin,
    updateCategoryAdmin,
    deleteCategoryAdmin,
    
    // Review Management
    getAllReviewsAdmin,
    deleteReviewAdmin,
    
    // Enrollment Management
    getAllEnrollmentsAdmin,
    deleteEnrollmentAdmin,
    
    // Order Management
    getAllOrdersAdmin,
    getOrderByIdAdmin,
    updateOrderAdmin,
    deleteOrderAdmin,
    
    // Quiz Scores Management
    getAllQuizScoresAdmin,
    
    // Dashboard Statistics
    getAdminDashboardStats
} from '../controllers/admin.controller.js';
import { protect, authorize } from '../middleware/auth.middleware.js';

const router = express.Router();

// All admin routes require authentication and admin role
router.use(protect);
router.use(authorize('admin'));

// =================================================================
// DASHBOARD STATISTICS
// =================================================================
router.get('/dashboard/stats', getAdminDashboardStats);

// =================================================================
// USER MANAGEMENT
// =================================================================
router.route('/users')
    .get(getAllUsers);

router.route('/users/:id')
    .get(getUserById)
    .put(updateUser)
    .delete(deleteUser);

// =================================================================
// COURSE MANAGEMENT
// =================================================================
router.route('/courses')
    .get(getAllCoursesAdmin);

router.route('/courses/:id')
    .put(updateCourseAdmin)
    .delete(deleteCourseAdmin);

// =================================================================
// LESSON MANAGEMENT
// =================================================================
router.route('/lessons')
    .get(getAllLessonsAdmin);

router.route('/lessons/:id')
    .put(updateLessonAdmin)
    .delete(deleteLessonAdmin);

// =================================================================
// CATEGORY MANAGEMENT
// =================================================================
router.route('/categories')
    .get(getAllCategoriesAdmin)
    .post(createCategoryAdmin);

router.route('/categories/:id')
    .put(updateCategoryAdmin)
    .delete(deleteCategoryAdmin);

// =================================================================
// REVIEW MANAGEMENT
// =================================================================
router.route('/reviews')
    .get(getAllReviewsAdmin);

router.route('/reviews/:id')
    .delete(deleteReviewAdmin);

// =================================================================
// ENROLLMENT MANAGEMENT
// =================================================================
router.route('/enrollments')
    .get(getAllEnrollmentsAdmin);

router.route('/enrollments/:id')
    .delete(deleteEnrollmentAdmin);

// =================================================================
// ORDER MANAGEMENT
// =================================================================
router.route('/orders')
    .get(getAllOrdersAdmin);

router.route('/orders/:id')
    .get(getOrderByIdAdmin)
    .put(updateOrderAdmin)
    .delete(deleteOrderAdmin);

// =================================================================
// QUIZ SCORES MANAGEMENT
// =================================================================
router.route('/quiz-scores')
    .get(getAllQuizScoresAdmin);

export default router;
