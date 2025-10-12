// review.routes.js

import express from "express";
import {
  createReview,
  getReviewsForCourse,
  updateReview,
  deleteReview,
  canReviewCourse,
} from "../controllers/review.controller.js";
import { protect, authorize } from "../middleware/auth.middleware.js";

const reviewRouter = express.Router();
const courseReviewRouter = express.Router({ mergeParams: true });

// --- Nested Routes (Contextual to a Course) ---
courseReviewRouter.route("/")
  .get(getReviewsForCourse)
  .post(protect, authorize("student"), createReview);

courseReviewRouter.route("/can-review")
  .get(protect, authorize("student"), canReviewCourse);

// --- Top-Level Routes (Specific to a Review) ---
reviewRouter.use(protect);

reviewRouter.route("/:id")
  .put(updateReview)
  .delete(deleteReview);

export { reviewRouter, courseReviewRouter };