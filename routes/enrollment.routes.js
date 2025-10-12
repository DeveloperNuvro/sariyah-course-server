import express from 'express';
import {   createEnrollment,
  getMyEnrollments,
  getEnrollmentById,
  updateEnrollmentProgress,} from '../controllers/enrollment.controller.js';
import { protect, authorize } from '../middleware/auth.middleware.js';

const router = express.Router();

router.use(protect);

router.route("/")
  .post(authorize("student"), createEnrollment);

router.route("/my-enrollments")
  .get(getMyEnrollments);

router.route("/:id")
  .get(getEnrollmentById);

router.route("/:id/progress")
  .patch(authorize("student"), updateEnrollmentProgress);

export default router;