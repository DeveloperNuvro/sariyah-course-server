// review.controller.js

import Review from "../models/review.model.js";
import Enrollment from "../models/enrollment.model.js";
import asyncHandler from "express-async-handler";

/**
 * @desc    Create a new review for a course
 * @route   POST /api/courses/:courseId/reviews
 * @access  Private/Student
 */
export const createReview = asyncHandler(async (req, res) => {
  const { rating, comment } = req.body;
  const { courseId } = req.params;
  const userId = req.user._id;

  // 1. Validation: Check if the student is enrolled
  const isEnrolled = await Enrollment.findOne({ student: userId, course: courseId });
  if (!isEnrolled) {
    res.status(403);
    throw new Error("You must be enrolled in this course to leave a review.");
  }

  // 2. Validation: Check if the student has already reviewed this course
  // The unique index in the schema handles this, but this provides a cleaner error message.
  const alreadyReviewed = await Review.findOne({ user: userId, course: courseId });
  if (alreadyReviewed) {
    res.status(409); // Conflict
    throw new Error("You have already submitted a review for this course.");
  }

  // 3. Create the review
  const review = await Review.create({
    course: courseId,
    user: userId,
    rating,
    comment,
  });

  res.status(201).json({
    success: true,
    message: "Thank you for your review!",
    data: review,
  });
});

/**
 * @desc    Get all reviews for a specific course
 * @route   GET /api/courses/:courseId/reviews
 * @access  Public
 */
export const getReviewsForCourse = asyncHandler(async (req, res) => {
  const { courseId } = req.params;

  const reviews = await Review.find({ course: courseId })
    .populate("user", "name avatar")
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    count: reviews.length,
    data: reviews,
  });
});

/**
 * @desc    Update a review
 * @route   PUT /api/reviews/:id
 * @access  Private
 */
export const updateReview = asyncHandler(async (req, res) => {
  const { rating, comment } = req.body;
  let review = await Review.findById(req.params.id);

  if (!review) {
    res.status(404);
    throw new Error("Review not found");
  }

  // Authorization: Only the user who wrote the review can edit it
  if (review.user.toString() !== req.user.id) {
    res.status(403);
    throw new Error("Not authorized to update this review");
  }

  // Update fields
  review.rating = rating || review.rating;
  review.comment = comment || review.comment;

  const updatedReview = await review.save();

  res.status(200).json({
    success: true,
    message: "Review updated successfully",
    data: updatedReview,
  });
});

/**
 * @desc    Delete a review
 * @route   DELETE /api/reviews/:id
 * @access  Private
 */
export const deleteReview = asyncHandler(async (req, res) => {
  const review = await Review.findById(req.params.id);

  if (!review) {
    res.status(404);
    throw new Error("Review not found");
  }

  // Authorization: Must be the review owner or an admin
  if (review.user.toString() !== req.user.id && req.user.role !== 'admin') {
    res.status(403);
    throw new Error("Not authorized to delete this review");
  }

  await review.deleteOne();

  res.status(200).json({ success: true, message: "Review removed successfully" });
});