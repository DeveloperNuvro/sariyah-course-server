// quiz.routes.js

import express from "express";
import {
  createQuiz,
  getQuizForLesson,
  updateQuiz,
  deleteQuiz,
  submitQuiz,
} from "../controllers/quiz.controller.js";
import { protect, authorize } from "../middleware/auth.middleware.js"; // Adjust path as needed

// mergeParams: true allows this router to access :lessonId from the parent router
const router = express.Router({ mergeParams: true });

// All quiz routes require a logged-in user
router.use(protect);

// Routes for managing the quiz (Instructor/Admin)
router.route("/")
  .post(authorize("instructor", "admin"), createQuiz)
  .get(getQuizForLesson) // Auth is handled inside the controller
  .put(authorize("instructor", "admin"), updateQuiz)
  .delete(authorize("instructor", "admin"), deleteQuiz);

// Route for a student to submit their answers
router.route("/submit")
  .post(authorize("student"), submitQuiz);

export default router;