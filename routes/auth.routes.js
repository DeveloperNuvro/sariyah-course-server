// user.routes.js

import express from "express";
import {
  registerUser,
  loginUser,
  logoutUser,
  getRefreshToken,
  getUserProfile,
  updateUserProfile,
  changePassword,
  getAllUsers,
  getUserById,
  deleteUser,
  updateUserStatus,
  verifyEmail,
  resendVerificationEmail,
  forgotPassword,
  resetPassword,
} from "../controllers/user.controller.js";
import { protect, authorize } from "../middleware/auth.middleware.js";
import { uploadAvatar } from "../middleware/upload.middleware.js";
import { authLimiter } from "../middleware/security.middleware.js";

const router = express.Router();

// --- Public Routes (with rate limiting for auth endpoints) ---
router.post("/register", authLimiter, registerUser);
router.post("/login", authLimiter, loginUser);
router.get("/refresh-token", getRefreshToken);
router.get("/verify-email", verifyEmail);
router.post("/resend-verification", authLimiter, resendVerificationEmail);
router.post("/forgot-password", authLimiter, forgotPassword);
router.put("/reset-password", authLimiter, resetPassword);

// --- Protected Routes (Require a valid access token) ---
// The `protect` middleware will be applied to all routes below this line
router.use(protect);

router.post("/logout", logoutUser);
router.route("/profile")
      .get(getUserProfile)
      .put(uploadAvatar, updateUserProfile);
router.put("/change-password", changePassword); 

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