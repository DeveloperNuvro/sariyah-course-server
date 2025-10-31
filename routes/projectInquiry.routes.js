import express from 'express';
import { submitProjectInquiry } from '../controllers/projectInquiry.controller.js';
import { inquiryLimiter } from '../middleware/security.middleware.js';

const router = express.Router();

// Public route - no authentication required but rate limited
router.post('/', inquiryLimiter, submitProjectInquiry);

export default router;

