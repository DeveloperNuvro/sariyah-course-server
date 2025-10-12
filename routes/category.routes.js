// category.routes.js

import express from "express";
import {
  createCategory,
  getAllCategories,
  getCategoryBySlug,
  updateCategory,
  deleteCategory,
} from "../controllers/category.controller.js";
import { protect, authorize } from "../middleware/auth.middleware.js"; // Adjust path as needed

const router = express.Router();

// --- Public Routes ---
router.route("/")
  .get(getAllCategories);

router.route("/:slug")
  .get(getCategoryBySlug);

// --- Admin Only Routes ---
router.use(protect);
router.use(authorize("admin"));

router.route("/")
  .post(createCategory);

router.route("/:id")
  .put(updateCategory)
  .delete(deleteCategory);

export default router;