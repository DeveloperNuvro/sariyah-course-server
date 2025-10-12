import express from "express";
import {
  getMyCertificates,
  getCertificateById,
  getAllCertificates,
} from "../controllers/certificate.controller.js";
import { protect, authorize } from "../middleware/auth.middleware.js";

// This log will now work correctly.
console.log("--- CORRECT CERTIFICATE ROUTES FILE LOADED ---");

const router = express.Router();

// --- ROUTE ORDER IS CRITICAL ---

// 1. Define specific, static routes first.
router.get("/my-certificates", protect, authorize("student"), getMyCertificates);
router.get("/", protect, authorize("admin"), getAllCertificates);

// 2. Define generic, parameterized routes last.
router.get("/:id", getCertificateById);

export default router;