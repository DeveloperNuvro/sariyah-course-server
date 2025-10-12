// order.routes.js

import express from "express";
import {
  createOrder,
  getMyOrders,
  getOrderById,
  getAllOrders,
  updateOrderStatus,
  updateOrder,
  deleteOrder,
  updatePaymentSlip,
} from "../controllers/order.controller.js";
import { protect, authorize } from "../middleware/auth.middleware.js"; // Adjust path as needed
import { uploadPaymentSlip } from "../middleware/upload.middleware.js";

const router = express.Router();

// All routes below are protected
router.use(protect);

router.route("/")
  .post(authorize("student"), uploadPaymentSlip, createOrder)
  .get(authorize("admin"), getAllOrders);

router.route("/my-orders")
  .get(getMyOrders);

router.route("/:id")
  .get(getOrderById)
  .put(authorize("admin"), updateOrder)
  .delete(authorize("admin"), deleteOrder);

router.route("/:id/status")
  .patch(authorize("admin"), updateOrderStatus);

router.route("/:id/payment-slip")
  .put(uploadPaymentSlip, updatePaymentSlip);

export default router;