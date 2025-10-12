// order.routes.js

import express from "express";
import {
  createOrder,
  getMyOrders,
  getOrderById,
  getAllOrders,
  updateOrderStatus,
} from "../controllers/order.controller.js";
import { protect, authorize } from "../middleware/auth.middleware.js"; // Adjust path as needed

const router = express.Router();

// All routes below are protected
router.use(protect);

router.route("/")
  .post(authorize("student"), createOrder)
  .get(authorize("admin"), getAllOrders);

router.route("/my-orders")
  .get(getMyOrders);

router.route("/:id")
  .get(getOrderById);

router.route("/:id/status")
  .patch(authorize("admin"), updateOrderStatus);

export default router;