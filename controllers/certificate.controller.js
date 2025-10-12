// certificate.controller.js

import Certificate from "../models/certificate.model.js";
import asyncHandler from "express-async-handler";

/**
 * @desc    Get all certificates for the logged-in student
 * @route   GET /api/certificates/my-certificates
 * @access  Private/Student
 */
export const getMyCertificates = asyncHandler(async (req, res) => {
  const certificates = await Certificate.find({ student: req.user._id })
    .populate("course", "title slug thumbnail")
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    count: certificates.length,
    data: certificates,
  });
});

/**
 * @desc    Get a single certificate by its ID (for verification)
 * @route   GET /api/certificates/:id
 * @access  Public
 */
export const getCertificateById = asyncHandler(async (req, res) => {
  const certificate = await Certificate.findById(req.params.id)
    .populate("student", "name")
    .populate("course", "title");

  if (!certificate) {
    res.status(404);
    throw new Error("Certificate not found or invalid");
  }

  res.status(200).json({ success: true, data: certificate });
});

/**
 * @desc    Get all certificates (Admin only)
 * @route   GET /api/certificates
 * @access  Private/Admin
 */
export const getAllCertificates = asyncHandler(async (req, res) => {
  const certificates = await Certificate.find({})
    .populate("student", "name email")
    .populate("course", "title")
    .sort({ createdAt: -1 });

  res.status(200).json({ success: true, count: certificates.length, data: certificates });
});