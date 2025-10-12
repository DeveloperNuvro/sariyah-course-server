// enrollment.controller.js

import Enrollment from "../models/enrollment.model.js";
import Course from "../models/course.model.js"; // Needed to check course status
import asyncHandler from "express-async-handler";

/**
 * @desc    Create a new enrollment (enroll in a course)
 * @route   POST /api/enrollments
 * @access  Private/Student
 */
export const createEnrollment = asyncHandler(async (req, res) => {
  const { courseId } = req.body;
  const studentId = req.user._id;

  // 1. Validation
  if (!courseId) {
    res.status(400);
    throw new Error("Course ID is required");
  }

  // 2. Check if the course exists and is published
  const course = await Course.findById(courseId);
  if (!course || !course.isPublished) {
    res.status(404);
    throw new Error("Course not found or is not available for enrollment");
  }

  // 3. Check if the user is already enrolled
  const alreadyEnrolled = await Enrollment.findOne({
    student: studentId,
    course: courseId,
  });

  if (alreadyEnrolled) {
    res.status(409); // Conflict
    throw new Error("You are already enrolled in this course");
  }

  // 4. Create the enrollment
  const enrollment = await Enrollment.create({
    student: studentId,
    course: courseId,
  });

  res.status(201).json({
    success: true,
    message: "Successfully enrolled in the course",
    data: enrollment,
  });
});

/**
 * @desc    Get all courses the current user is enrolled in
 * @route   GET /api/enrollments/my-enrollments
 * @access  Private
 */
export const getMyEnrollments = asyncHandler(async (req, res) => {
  const enrollments = await Enrollment.find({ student: req.user._id })
    .populate({
      path: "course",
      // --- THIS IS THE LINE TO CHANGE ---
      // Add 'isEnded' to the list of fields you want to retrieve.
      select: "title slug thumbnail instructor isEnded", 
      // --- END OF CHANGE ---
      populate: {
        path: "instructor",
        select: "name avatar",
      },
    })
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    count: enrollments.length,
    data: enrollments,
  });
});
/**
 * @desc    Get a single enrollment by its ID
 * @route   GET /api/enrollments/:id
 * @access  Private
 */
export const getEnrollmentById = asyncHandler(async (req, res) => {
  const enrollment = await Enrollment.findById(req.params.id)
    .populate("student", "name email")
    .populate("course", "title slug");

  if (!enrollment) {
    res.status(404);
    throw new Error("Enrollment not found");
  }

  // Authorization: Ensure the user is the student in the enrollment or an admin
  if (
    enrollment.student._id.toString() !== req.user.id &&
    req.user.role !== "admin"
  ) {
    res.status(403); // Forbidden
    throw new Error("Not authorized to view this enrollment");
  }

  res.status(200).json({
    success: true,
    data: enrollment,
  });
});

/**
 * @desc    Update enrollment progress
 * @route   PATCH /api/enrollments/:id/progress
 * @access  Private/Student
 */
export const updateEnrollmentProgress = asyncHandler(async (req, res) => {
  const { progress } = req.body;

  // 1. Validate progress input
  const progressPercentage = Number(progress);
  if (
    isNaN(progressPercentage) ||
    progressPercentage < 0 ||
    progressPercentage > 100
  ) {
    res.status(400);
    throw new Error("Progress must be a number between 0 and 100");
  }

  // 2. Find the enrollment
  const enrollment = await Enrollment.findById(req.params.id);

  if (!enrollment) {
    res.status(404);
    throw new Error("Enrollment not found");
  }

  // 3. Authorization: Ensure the logged-in user is the owner of this enrollment
  if (enrollment.student.toString() !== req.user.id) {
    res.status(403);
    throw new Error("Not authorized to update this enrollment");
  }

  // 4. Update the progress
  enrollment.progress = progressPercentage;
  if (progressPercentage === 100) {
    enrollment.completed = true;
  } else {
    enrollment.completed = false; // In case progress is reversed
  }

  const updatedEnrollment = await enrollment.save();

  res.status(200).json({
    success: true,
    message: "Progress updated successfully",
    data: updatedEnrollment,
  });
});