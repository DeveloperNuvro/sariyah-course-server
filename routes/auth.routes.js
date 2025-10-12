// user.routes.js

import express from "express";
import {
  registerUser,
  loginUser,
  logoutUser,
  getRefreshToken,
  getUserProfile,
  updateUserProfile,
  getAllUsers,
  getUserById,
  deleteUser,
  updateUserStatus,
} from "../controllers/user.controller.js";
import { protect, authorize } from "../middleware/auth.middleware.js";
import { uploadAvatar } from "../middleware/upload.middleware.js"; 

const router = express.Router();

// --- Public Routes ---
router.post("/register", registerUser);
router.post("/login", loginUser);
router.get("/refresh-token", getRefreshToken);

// --- Protected Routes (Require a valid access token) ---
// The `protect` middleware will be applied to all routes below this line
router.use(protect);

router.post("/logout", logoutUser);
router.route("/profile")
      .get(getUserProfile)
      .put(uploadAvatar, updateUserProfile); 

// --- Admin Only Routes ---
// These routes require the user to be an admin
router.route("/")
      .get(authorize("admin"), getAllUsers);

router.route("/:id")
      .get(authorize("admin"), getUserById)
      .delete(authorize("admin"), deleteUser);
      // Note: A route for an admin to update any user could be added here as well
      // .put(authorize('admin'), updateUser)

router.patch("/:id/status", authorize("admin"), updateUserStatus);

export default router;