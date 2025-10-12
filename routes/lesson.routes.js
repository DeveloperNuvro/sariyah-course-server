// lesson.routes.js

import express from "express";
import {
  createLesson,
  getLessonsForCourse,
  getLessonById,
  updateLesson,
  deleteLesson,
} from "../controllers/lesson.controller.js";
import { protect, authorize } from "../middleware/auth.middleware.js"; // Adjust path as needed
import quizRouter from "./quiz.route.js"; // Import quiz routes

// This router will handle routes like /api/lessons/:id
const router = express.Router();

// This router will handle nested routes like /api/courses/:courseId/lessons
// mergeParams: true allows this router to access params from its parent router (e.g., :courseId)
const courseLessonRouter = express.Router({ mergeParams: true });

// All routes are protected
router.use(protect);
courseLessonRouter.use(protect);

// --- Nested Routes ---
// /api/courses/:courseId/lessons
courseLessonRouter.route("/")
  .post(authorize("instructor", "admin"), createLesson)
  .get(getLessonsForCourse); // Authorization is handled inside controller

// --- Top-Level Routes ---
// /api/lessons/:id
router.route("/:id")
  .get(getLessonById) // Authorization is inside controller
  .put(authorize("instructor", "admin"), updateLesson)
  .delete(authorize("instructor", "admin"), deleteLesson);

router.use('/:lessonId/quiz', quizRouter); // <-- ADD THIS LINE

// Export both routers
export { router as lessonRouter, courseLessonRouter };