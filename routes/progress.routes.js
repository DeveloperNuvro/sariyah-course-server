// progress.routes.js

import express from "express";
import {
  getProgressForCourse,
  updateProgress,
  recalculateCourseProgress,
} from "../controllers/progress.controller.js";
import { protect, authorize } from "../middleware/auth.middleware.js"; // Adjust path as needed

const router = express.Router();

// All routes here are for logged-in students to manage their own progress
router.use(protect);

// Route to get progress for a specific course (students only)
router.get("/course/:courseId", authorize("student"), getProgressForCourse);

// Route to update progress (mark lessons complete, set last watched) (students only)
router.patch("/update", authorize("student"), updateProgress);

// Route to recalculate progress for all students in a course (instructors/admins only)
router.post("/recalculate/:courseId", authorize("instructor", "admin"), recalculateCourseProgress);

export default router;