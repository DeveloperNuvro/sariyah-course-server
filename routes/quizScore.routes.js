import express from 'express';
import { getScoresForLesson, getScoresForCourse } from '../controllers/quizScore.controller.js';
import { protect, authorize } from '../middleware/auth.middleware.js';

const router = express.Router();

// All routes are protected and for instructors/admins only
router.use(protect);
router.use(authorize('instructor', 'admin'));

router.get('/lesson/:lessonId', getScoresForLesson);
router.get('/course/:courseId', getScoresForCourse);

export default router;