/**
 * Security Logging Utility
 * Logs security-related events for monitoring and auditing
 */

/**
 * Log security events
 * @param {string} eventType - Type of security event
 * @param {Object} details - Event details
 * @param {Object} req - Express request object (optional)
 */
export const logSecurityEvent = (eventType, details, req = null) => {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    eventType,
    details,
    ip: req?.ip || req?.connection?.remoteAddress || 'unknown',
    userAgent: req?.get('user-agent') || 'unknown',
    userId: req?.user?._id || null,
    path: req?.path || null,
    method: req?.method || null,
  };

  // Log to console (only in development, in production use a proper logging service)
  if (process.env.NODE_ENV === 'development') {
    console.log('[SECURITY]', JSON.stringify(logEntry, null, 2));
  }

  // In production, you would send this to:
  // - Logging service (e.g., Winston, Pino)
  // - Security monitoring service
  // - Database for audit trail
  // - External security service (e.g., Sentry, LogRocket)
};

/**
 * Log authentication events
 */
export const logAuthEvent = (event, userId, success, req = null) => {
  logSecurityEvent('AUTHENTICATION', {
    action: event, // 'login', 'logout', 'register', 'password_reset', etc.
    userId: userId?.toString(),
    success,
    reason: success ? null : 'Failed authentication attempt',
  }, req);
};

/**
 * Log authorization events
 */
export const logAuthorizationEvent = (event, userId, resource, success, req = null) => {
  logSecurityEvent('AUTHORIZATION', {
    action: event,
    userId: userId?.toString(),
    resource,
    success,
  }, req);
};

/**
 * Log suspicious activity
 */
export const logSuspiciousActivity = (activity, details, req = null) => {
  logSecurityEvent('SUSPICIOUS_ACTIVITY', {
    activity,
    ...details,
  }, req);
};

/**
 * Log rate limit hits
 */
export const logRateLimit = (ip, endpoint, req = null) => {
  logSecurityEvent('RATE_LIMIT', {
    endpoint,
    message: 'Rate limit exceeded',
  }, req || { ip });
};

/**
 * Log input validation failures
 */
export const logValidationFailure = (field, value, reason, req = null) => {
  logSecurityEvent('VALIDATION_FAILURE', {
    field,
    value: typeof value === 'string' ? value.substring(0, 100) : value, // Truncate long values
    reason,
  }, req);
};

/**
 * Log password reset requests
 */
export const logPasswordReset = (email, success, req = null) => {
  logSecurityEvent('PASSWORD_RESET', {
    email,
    success,
  }, req);
};

/**
 * Log sensitive data access
 */
export const logSensitiveAccess = (userId, resource, action, req = null) => {
  logSecurityEvent('SENSITIVE_ACCESS', {
    userId: userId?.toString(),
    resource,
    action,
  }, req);
};

