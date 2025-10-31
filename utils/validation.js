/**
 * Validation and Sanitization Utilities
 * Provides comprehensive input validation and sanitization functions
 */

/**
 * Sanitize string input - removes dangerous characters and trims whitespace
 */
export const sanitizeString = (input, maxLength = 5000) => {
  if (typeof input !== 'string') return '';
  
  return input
    .trim()
    .slice(0, maxLength)
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers like onclick=
    .replace(/\0/g, ''); // Remove null bytes
};

/**
 * Sanitize email
 */
export const sanitizeEmail = (email) => {
  if (typeof email !== 'string') return '';
  
  return email.trim().toLowerCase().slice(0, 255);
};

/**
 * Sanitize phone number
 */
export const sanitizePhone = (phone) => {
  if (typeof phone !== 'string') return '';
  
  // Remove all non-digit characters except +, -, spaces, and parentheses
  return phone.trim().replace(/[^\d+\-() ]/g, '').slice(0, 20);
};

/**
 * Sanitize URL
 */
export const sanitizeUrl = (url) => {
  if (typeof url !== 'string') return '';
  
  const trimmed = url.trim().slice(0, 2048);
  
  // Basic URL validation
  try {
    const urlObj = new URL(trimmed);
    // Only allow http and https protocols
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      return '';
    }
    return trimmed;
  } catch {
    // If URL parsing fails, return empty
    return '';
  }
};

/**
 * Sanitize MongoDB ObjectId
 */
export const sanitizeObjectId = (id) => {
  if (typeof id !== 'string') return null;
  
  // MongoDB ObjectId is 24 hex characters
  const objectIdRegex = /^[0-9a-fA-F]{24}$/;
  const trimmed = id.trim();
  
  if (objectIdRegex.test(trimmed)) {
    return trimmed;
  }
  
  return null;
};

/**
 * Sanitize number - ensures it's a valid number within range
 */
export const sanitizeNumber = (value, min = -Infinity, max = Infinity, defaultValue = 0) => {
  const num = Number(value);
  
  if (isNaN(num) || !isFinite(num)) {
    return defaultValue;
  }
  
  return Math.max(min, Math.min(max, num));
};

/**
 * Validate email format
 */
export const validateEmail = (email) => {
  if (typeof email !== 'string') return false;
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim()) && email.length <= 255;
};

/**
 * Validate password strength
 */
export const validatePassword = (password) => {
  if (typeof password !== 'string') return { valid: false, message: 'Password must be a string' };
  
  if (password.length < 6) {
    return { valid: false, message: 'Password must be at least 6 characters long' };
  }
  
  if (password.length > 128) {
    return { valid: false, message: 'Password must be less than 128 characters' };
  }
  
  return { valid: true, message: 'Password is valid' };
};

/**
 * Validate phone number format (basic)
 */
export const validatePhone = (phone) => {
  if (typeof phone !== 'string') return false;
  
  // Allow digits, +, -, spaces, parentheses
  const phoneRegex = /^[\d+\-() ]{7,20}$/;
  const digitsOnly = phone.replace(/\D/g, '');
  
  return phoneRegex.test(phone.trim()) && digitsOnly.length >= 7 && digitsOnly.length <= 15;
};

/**
 * Validate MongoDB ObjectId format
 */
export const validateObjectId = (id) => {
  if (typeof id !== 'string') return false;
  
  const objectIdRegex = /^[0-9a-fA-F]{24}$/;
  return objectIdRegex.test(id.trim());
};

/**
 * Validate required fields
 */
export const validateRequired = (fields, data) => {
  const missing = [];
  
  for (const field of fields) {
    if (!data[field] || (typeof data[field] === 'string' && !data[field].trim())) {
      missing.push(field);
    }
  }
  
  if (missing.length > 0) {
    return {
      valid: false,
      message: `Missing required fields: ${missing.join(', ')}`
    };
  }
  
  return { valid: true };
};

/**
 * Validate string length
 */
export const validateLength = (str, min = 0, max = Infinity) => {
  if (typeof str !== 'string') return false;
  
  const length = str.trim().length;
  return length >= min && length <= max;
};

/**
 * Sanitize and validate price/discount price
 */
export const validatePrice = (price, discountPrice = null) => {
  const sanitizedPrice = sanitizeNumber(price, 0, 1000000, null);
  
  if (sanitizedPrice === null) {
    return { valid: false, message: 'Invalid price' };
  }
  
  if (discountPrice !== null && discountPrice !== undefined) {
    const sanitizedDiscount = sanitizeNumber(discountPrice, 0, 1000000, null);
    
    if (sanitizedDiscount === null) {
      return { valid: false, message: 'Invalid discount price' };
    }
    
    if (sanitizedDiscount >= sanitizedPrice) {
      return { valid: false, message: 'Discount price must be less than regular price' };
    }
  }
  
  return { valid: true, price: sanitizedPrice, discountPrice: discountPrice ? sanitizeNumber(discountPrice, 0, 1000000) : null };
};

/**
 * Sanitize array of strings
 */
export const sanitizeStringArray = (arr, maxLength = 50, maxItems = 100) => {
  if (!Array.isArray(arr)) return [];
  
  return arr
    .slice(0, maxItems)
    .filter(item => typeof item === 'string')
    .map(item => sanitizeString(item, maxLength))
    .filter(item => item.length > 0);
};

/**
 * Sanitize text content (for descriptions, etc.)
 */
export const sanitizeText = (text, maxLength = 10000) => {
  if (typeof text !== 'string') return '';
  
  return text
    .trim()
    .slice(0, maxLength)
    .replace(/\0/g, '') // Remove null bytes
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, ''); // Remove control characters
};

