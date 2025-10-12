import express from 'express';
import {
    getAllCourses,
    getCourseBySlug,
    createCourse,
    updateCourse,
    deleteCourse,
    getMyCourses,
    getCourseEnrollments,
    getCourseById,
    togglePublishStatus,
    toggleEndedStatus,
    getAllCoursesAdmin
} from '../controllers/course.controller.js';
import { protect, authorize } from '../middleware/auth.middleware.js';
import { uploadThumbnail } from '../middleware/upload.middleware.js';
import { courseLessonRouter } from './lesson.routes.js';
import { courseReviewRouter } from './review.routes.js';


const router = express.Router();


// =================================================================
// THE CORRECT ROUTE ORDER
// We define routes from MOST SPECIFIC to MOST GENERIC.
// =================================================================


// --- Nested Routers ---
// These are highly specific and should be defined early.
router.use('/:courseId/reviews', courseReviewRouter);
router.use('/:courseId/lessons', courseLessonRouter);


// --- Specific Static Routes ---

// PUBLIC: Get all courses.
router.get('/', getAllCourses);

// PROTECTED: Get the logged-in user's courses.
// This is the key fix. This specific route is now defined BEFORE the generic /:slug route.
// We apply the 'protect' middleware directly to it.
router.get('/my-courses', protect, getMyCourses);

// PROTECTED/ADMIN: Create a new course or update an existing one.
router.route('/')
    .post(protect, authorize('instructor', 'admin'), uploadThumbnail, createCourse);

router.route('/:id')
    .put(protect, authorize('instructor', 'admin'), uploadThumbnail, updateCourse)
    .delete(protect, authorize('instructor', 'admin'), deleteCourse);

// PROTECTED/ADMIN: Get enrollments for a specific course.
router.route('/:courseId/enrollments')
    .get(protect, authorize('instructor', 'admin'), getCourseEnrollments);

router.route('/:id/publish')
    .patch(protect, authorize('instructor', 'admin'), togglePublishStatus);

router.route('/:id/end')
    .patch(protect, authorize('instructor', 'admin'), toggleEndedStatus);

router.get('/all', protect, authorize('admin'), getAllCoursesAdmin);


// --- Generic Dynamic Routes (Must Come Last) ---

// PUBLIC: Get a single course by its unique slug.
// Because this comes after '/my-courses', Express will never mistake 'my-courses' for a slug.
router.get('/id/:id', getCourseById);
router.get('/:slug', getCourseBySlug);


export default router;