// progress.routes.js

import express from "express";
import {
  getProgressForCourse,
  updateProgress,
} from "../controllers/progress.controller.js";
import { protect, authorize } from "../middleware/auth.middleware.js"; // Adjust path as needed

const router = express.Router();

// All routes here are for logged-in students to manage their own progress
router.use(protect);
router.use(authorize("student"));

// Route to get progress for a specific course
router.get("/course/:courseId", getProgressForCourse);

// Route to update progress (mark lessons complete, set last watched)
router.patch("/update", updateProgress);

export default router;