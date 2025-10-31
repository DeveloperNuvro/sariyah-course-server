// progress.controller.js

import Progress from "../models/progress.model.js";
import Enrollment from "../models/enrollment.model.js";
import Course from "../models/course.model.js";
import Lesson from "../models/lesson.model.js";
import asyncHandler from "express-async-handler";
import { generateAndUploadCertificate } from "../services/certificate.service.js";

/**
 * @desc    Get a student's progress for a specific course
 * @route   GET /api/progress/course/:courseId
 * @access  Private/Student
 */
export const getProgressForCourse = asyncHandler(async (req, res) => {
  const studentId = req.user._id;
  const { courseId } = req.params;

  // 1. Verify the user is enrolled in the course
  const enrollment = await Enrollment.findOne({ student: studentId, course: courseId });
  if (!enrollment) {
    res.status(403);
    throw new Error("Not authorized. You are not enrolled in this course.");
  }

  // 2. Find the progress document
  let progress = await Progress.findOne({ student: studentId, course: courseId });

  // 3. If no progress document exists, it means the student hasn't started.
  // Return a default progress object.
  if (!progress) {
    return res.status(200).json({
      success: true,
      data: {
        student: studentId,
        course: courseId,
        completedLessons: [],
        lastWatchedLesson: null,
      },
    });
  }

  res.status(200).json({
    success: true,
    data: progress,
  });
});


/**
 * @desc    Update progress for a lesson (mark as complete/incomplete and set as last watched)
 * @route   PATCH /api/progress/update
 * @access  Private/Student
 */
export const updateProgress = asyncHandler(async (req, res) => {
  const studentId = req.user._id;
  const { courseId, lessonId, completed } = req.body; // `completed` is a boolean

  // 1. Validation
  if (!courseId || !lessonId || typeof completed !== 'boolean') {
    res.status(400);
    throw new Error("courseId, lessonId, and a 'completed' status (true/false) are required.");
  }

  // 2. Verify enrollment
  const enrollment = await Enrollment.findOne({ student: studentId, course: courseId });
  if (!enrollment) {
    res.status(403);
    throw new Error("Not authorized. You are not enrolled in this course.");
  }
  
  // 3. Verify the lesson belongs to the course
  const lesson = await Lesson.findOne({ _id: lessonId, course: courseId });
  if (!lesson) {
      res.status(404);
      throw new Error("Lesson not found in this course.");
  }

  // 4. Prepare the update operation for the Progress document
  const updateOperation = {
    $set: { lastWatchedLesson: lessonId },
  };

  if (completed) {
    // Add the lesson to the completedLessons array if it's not already there
    updateOperation.$addToSet = { completedLessons: lessonId };
  } else {
    // Remove the lesson from the completedLessons array
    updateOperation.$pull = { completedLessons: lessonId };
  }
  
  // 5. Find and update the progress document (or create it if it doesn't exist)
  const updatedProgress = await Progress.findOneAndUpdate(
    { student: studentId, course: courseId },
    updateOperation,
    { new: true, upsert: true, runValidators: true }
  );
  // 6. === Synchronize with Enrollment Model ===
  // Count lessons directly from Lesson model to ensure accuracy
  const totalLessons = await Lesson.countDocuments({ course: courseId });

  if (totalLessons > 0) {
    const completedLessonsCount = updatedProgress.completedLessons.length;
    const newProgressPercentage = Math.round((completedLessonsCount / totalLessons) * 100);

    // Only update if the percentage has changed
    if (enrollment.progress !== newProgressPercentage) {
        enrollment.progress = newProgressPercentage;
        enrollment.completed = newProgressPercentage === 100;
        await enrollment.save();
    }
    

    if (enrollment.completed) {
        generateAndUploadCertificate(studentId, courseId);
    }
  }

  res.status(200).json({
    success: true,
    message: "Progress updated successfully",
    data: {
        progress: updatedProgress,
        enrollmentPercentage: enrollment.progress
    }
  });
});

/**
 * @desc    Recalculate progress for all students in a course (Admin/Instructor only)
 * @route   POST /api/progress/recalculate/:courseId
 * @access  Private/Instructor or Private/Admin
 */
export const recalculateCourseProgress = asyncHandler(async (req, res) => {
  const { courseId } = req.params;
  
  // Verify the course exists and user has permission
  const course = await Course.findById(courseId);
  if (!course) {
    res.status(404);
    throw new Error("Course not found");
  }
  
  // Check if user is instructor or admin
  if (course.instructor.toString() !== req.user.id && req.user.role !== "admin") {
    res.status(403);
    throw new Error("Not authorized to recalculate progress for this course");
  }
  
  // Get all enrollments for this course
  const enrollments = await Enrollment.find({ course: courseId });
  
  // Count total lessons for this course
  const totalLessons = await Lesson.countDocuments({ course: courseId });
  
  if (totalLessons === 0) {
    return res.status(200).json({
      success: true,
      message: "No lessons found in this course",
      data: { totalLessons: 0, updatedEnrollments: 0 }
    });
  }
  
  let updatedCount = 0;
  
  // Update progress for each enrollment
  for (const enrollment of enrollments) {
    // Get the student's progress
    const progress = await Progress.findOne({ 
      student: enrollment.student, 
      course: courseId 
    });
    
    if (progress) {
      const completedLessonsCount = progress.completedLessons.length;
      const newProgressPercentage = Math.round((completedLessonsCount / totalLessons) * 100);
      
      // Update enrollment progress
      enrollment.progress = newProgressPercentage;
      enrollment.completed = newProgressPercentage === 100;
      await enrollment.save();
      updatedCount++;
    }
  }
  
  res.status(200).json({
    success: true,
    message: `Progress recalculated for ${updatedCount} students`,
    data: { 
      totalLessons, 
      totalEnrollments: enrollments.length,
      updatedEnrollments: updatedCount 
    }
  });
});