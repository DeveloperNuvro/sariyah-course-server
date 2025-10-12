// auth.middleware.js

import jwt from "jsonwebtoken";
import asyncHandler from "express-async-handler";
import User from "../models/user.model.js"; // Adjust the path to your user model

/**
 * @desc Protect routes by verifying JWT access token
 */
const protect = asyncHandler(async (req, res, next) => {
  let token;

  // Check for the token in the Authorization header
  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
    try {
      // Get token from header (format: "Bearer <token>")
      token = req.headers.authorization.split(" ")[1];

      // Check if token exists after splitting
      if (!token) {
        res.status(401);
        throw new Error("Not authorized, no token provided");
      }

      // Verify the token
      const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);

      // Get user from the token's ID and attach it to the request object
      // Exclude the password field from the result
      req.user = await User.findById(decoded.id).select("-password");
      
      if (!req.user) {
         res.status(401);
         throw new Error("Not authorized, user not found");
      }

      next();
    } catch (error) {
      console.error('Auth middleware error:', error);
      
      if (error.name === 'JsonWebTokenError') {
        res.status(401);
        throw new Error("Not authorized, invalid token");
      } else if (error.name === 'TokenExpiredError') {
        res.status(401);
        throw new Error("Not authorized, token expired");
      } else {
        res.status(401);
        throw new Error("Not authorized, token verification failed");
      }
    }
  } else {
    res.status(401);
    throw new Error("Not authorized, no token provided");
  }
});

/**
 * @desc Authorize users based on their role
 * @param  {...String} roles - List of roles that are allowed to access the route
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403); // Forbidden
      throw new Error(`User role '${req.user.role}' is not authorized to access this route`);
    }
    next();
  };
};

export { protect, authorize };