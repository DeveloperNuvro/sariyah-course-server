import asyncHandler from "express-async-handler";
import { sendProjectInquiryEmail } from "../services/email.service.js";
import {
  sanitizeString,
  sanitizeEmail,
  sanitizePhone,
  sanitizeText,
  validateEmail,
  validatePhone,
  validateRequired,
  validateLength,
} from "../utils/validation.js";

/**
 * @desc    Submit project inquiry
 * @route   POST /api/project-inquiry
 * @access  Public
 */
export const submitProjectInquiry = asyncHandler(async (req, res) => {
  // 1. Sanitize all inputs
  const clientName = sanitizeString(req.body.clientName || '', 100);
  const clientEmail = sanitizeEmail(req.body.clientEmail || '');
  const clientPhone = sanitizePhone(req.body.clientPhone || '');
  const projectIdea = sanitizeText(req.body.projectIdea || '', 5000);

  // 2. Required fields validation
  const requiredValidation = validateRequired(
    ['clientName', 'clientEmail', 'clientPhone', 'projectIdea'],
    { clientName, clientEmail, clientPhone, projectIdea }
  );
  if (!requiredValidation.valid) {
    res.status(400);
    throw new Error(requiredValidation.message);
  }

  // 3. Name validation
  if (!validateLength(clientName, 2, 100)) {
    res.status(400);
    throw new Error("Name must be between 2 and 100 characters");
  }

  // 4. Email validation
  if (!validateEmail(clientEmail)) {
    res.status(400);
    throw new Error("Invalid email address");
  }

  // 5. Phone validation
  if (!validatePhone(clientPhone)) {
    res.status(400);
    throw new Error("Invalid phone number. Please provide a valid phone number with 7-15 digits");
  }

  // 6. Project idea validation
  if (!validateLength(projectIdea, 10, 5000)) {
    res.status(400);
    throw new Error("Project idea must be between 10 and 5000 characters");
  }

  try {
    // Send email to business
    await sendProjectInquiryEmail({
      clientName,
      clientEmail,
      clientPhone,
      projectIdea,
    });

    res.status(200).json({
      success: true,
      message: "Thank you for your inquiry! We'll get back to you soon.",
    });
  } catch (error) {
    console.error("Error in submitProjectInquiry:", error);
    res.status(500);
    throw new Error("Failed to submit project inquiry. Please try again later.");
  }
});

