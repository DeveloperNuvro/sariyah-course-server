import rateLimit from 'express-rate-limit';
import helmet from 'helmet';

import { logRateLimit } from '../utils/securityLogger.js';

/**
 * Rate limiting middleware for general API routes
 * More lenient in development to account for React StrictMode double renders
 */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 300 : 1000, // 300 in production, 1000 in development
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for health check endpoint
    return req.path === '/api/health';
  },
  handler: (req, res) => {
    logRateLimit(req.ip, req.path, req);
    res.status(429).json({
      success: false,
      error: 'Too many requests from this IP, please try again later.',
    });
  },
});

/**
 * Strict rate limiting for authentication routes
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  message: 'Too many login attempts, please try again after 15 minutes.',
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logRateLimit(req.ip, req.path, req);
    res.status(429).json({
      success: false,
      error: 'Too many login attempts, please try again after 15 minutes.',
    });
  },
});

/**
 * Rate limiting for project inquiries
 */
export const inquiryLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // Limit each IP to 3 inquiries per hour
  message: 'Too many inquiries submitted, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Security headers middleware using Helmet
 */
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:", "http:"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'"],
    },
  },
  crossOriginEmbedderPolicy: false, // Allow embedding for images from cloudinary, etc.
});

/**
 * MongoDB injection protection - Custom implementation
 * Replaces express-mongo-sanitize to avoid compatibility issues
 */
const mongoOperatorPattern = /[$]|[.]/g;
const dangerousKeys = ['$where', '$ne', '$gt', '$gte', '$lt', '$lte', '$in', '$nin', '$regex', '$exists', '$mod', '$size', '$type', '$all', '$elemMatch', '$or', '$and', '$nor', '$not', '$expr', '$jsonSchema', '$text', '$geoWithin', '$geoIntersects', '$near', '$nearSphere'];

function sanitizeObject(obj, depth = 0) {
  if (depth > 10) return obj; // Prevent infinite recursion
  if (!obj || typeof obj !== 'object') return obj;
  
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item, depth + 1));
  }
  
  const sanitized = {};
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      // Check for MongoDB operators
      if (key.startsWith('$') || dangerousKeys.includes(key)) {
        continue; // Skip dangerous keys
      }
      // Recursively sanitize nested objects
      sanitized[key] = sanitizeObject(obj[key], depth + 1);
    }
  }
  return sanitized;
}

export const mongoSanitization = (req, res, next) => {
  try {
    // Sanitize body parameters only (req.body is mutable)
    // req.query and req.params are read-only in Express v5, so we handle those in validation
    if (req.body && typeof req.body === 'object') {
      req.body = sanitizeObject(req.body);
    }
    
    next();
  } catch (error) {
    // If sanitization fails, log but continue (don't break the request)
    if (process.env.NODE_ENV === 'development') {
      console.warn('MongoDB sanitization warning:', error.message);
    }
    next();
  }
};

/**
 * XSS protection - Custom implementation
 * Replaces xss-clean to avoid compatibility issues with Express v5
 */
function sanitizeString(str) {
  if (typeof str !== 'string') return str;
  
  // Remove potentially dangerous HTML/script tags and encode special characters
  return str
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
    .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

function sanitizeForXSS(obj, depth = 0) {
  if (depth > 10) return obj; // Prevent infinite recursion
  if (!obj || typeof obj !== 'object') {
    return typeof obj === 'string' ? sanitizeString(obj) : obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeForXSS(item, depth + 1));
  }
  
  const sanitized = {};
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      sanitized[key] = sanitizeForXSS(obj[key], depth + 1);
    }
  }
  return sanitized;
}

export const xssProtection = (req, res, next) => {
  try {
    // Only sanitize req.body (mutable) - req.query and req.params are read-only in Express v5
    if (req.body && typeof req.body === 'object') {
      req.body = sanitizeForXSS(req.body);
    }
    
    next();
  } catch (error) {
    // If sanitization fails, log but continue (don't break the request)
    if (process.env.NODE_ENV === 'development') {
      console.warn('XSS sanitization warning:', error.message);
    }
    next();
  }
};

/**
 * Request body size limits (configured in express.json middleware in server.js)
 * But adding validation middleware here
 */
export const validateRequestSize = (req, res, next) => {
  const contentLength = req.headers['content-length'];
  
  if (contentLength && parseInt(contentLength) > 10 * 1024 * 1024) { // 10MB
    res.status(413).json({
      success: false,
      error: 'Request entity too large. Maximum size is 10MB.',
    });
    return;
  }
  
  next();
};

