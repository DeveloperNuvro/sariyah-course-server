// user.controller.js

import User from "../models/user.model.js"; // Adjust the path to your user model
import asyncHandler from "express-async-handler";
import jwt from "jsonwebtoken";
import { v2 as cloudinary } from 'cloudinary';
import { generateVerificationToken, sendVerificationEmail } from '../services/email.service.js';
import crypto from 'crypto';

// --- Helper Function to Generate Tokens and Set Cookie ---
const generateTokensAndSetCookie = async (userId, res) => {
  // 1. Create Access Token
  const accessToken = jwt.sign({ id: userId }, process.env.JWT_ACCESS_SECRET, {
    expiresIn: process.env.JWT_ACCESS_EXPIRES_IN,
  });

  // 2. Create Refresh Token
  const refreshToken = jwt.sign({ id: userId }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN,
  });

  // 3. Save the refresh token to the user document in the database
  const user = await User.findById(userId);
  user.refreshToken = refreshToken;
  await user.save({ validateBeforeSave: false });

  // 4. Set the refresh token in an HTTP-Only cookie
  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV !== "development", // Use secure cookies in production
    sameSite: "strict", // Prevent CSRF attacks
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });

  return { accessToken };
};

/**
 * @desc    Register a new user
 * @route   POST /api/users/register
 * @access  Public
 */
export const registerUser = asyncHandler(async (req, res) => {
  // Import validation utilities
  const { 
    sanitizeString, 
    sanitizeEmail, 
    sanitizePhone,
    validateEmail, 
    validatePassword, 
    validateRequired,
    validateLength 
  } = await import('../utils/validation.js');

  // 1. Sanitize and validate inputs
  const name = sanitizeString(req.body.name || '', 100);
  const email = sanitizeEmail(req.body.email || '');
  const password = req.body.password || '';
  const phone = sanitizePhone(req.body.phone || '');

  // 2. Required fields validation
  const requiredValidation = validateRequired(['name', 'email', 'password'], { name, email, password });
  if (!requiredValidation.valid) {
    res.status(400);
    throw new Error(requiredValidation.message);
  }

  // 3. Name validation
  if (!validateLength(name, 2, 100)) {
    res.status(400);
    throw new Error("Name must be between 2 and 100 characters");
  }

  // 4. Email validation
  if (!validateEmail(email)) {
    res.status(400);
    throw new Error("Please provide a valid email address");
  }

  // 5. Password validation
  const passwordValidation = validatePassword(password);
  if (!passwordValidation.valid) {
    res.status(400);
    throw new Error(passwordValidation.message);
  }

  // 6. Phone validation (optional but validate if provided)
  if (phone && phone.length > 0 && !/^[\d+\-() ]{7,20}$/.test(phone)) {
    res.status(400);
    throw new Error("Please provide a valid phone number");
  }

  // 7. Check if user already exists
  const userExists = await User.findOne({ email });
  if (userExists) {
    res.status(409);
    throw new Error("User with this email already exists");
  }

  // 8. Generate verification token
  const verificationToken = crypto.randomBytes(32).toString('hex');
  const verificationExpires = new Date();
  verificationExpires.setHours(verificationExpires.getHours() + 24); // 24 hours expiry

  // 9. Create user with email verification fields
  // Force role to 'student' for regular registration (security fix)
  const userRole = req.body.instructorRegistration ? 'instructor' : 'student';
  
  const user = await User.create({ 
    name, 
    email, 
    password, 
    role: userRole,
    phone: phone || '',
    emailVerified: false,
    emailVerificationToken: verificationToken,
    emailVerificationExpires: verificationExpires,
  });

  if (user) {
    // 7. Send verification email
    try {
      await sendVerificationEmail({
        email: user.email,
        name: user.name,
        token: verificationToken,
      });
    } catch (emailError) {
      // If email fails, delete the user and return error
      await User.findByIdAndDelete(user._id);
      console.error('Email sending failed:', emailError);
      res.status(500);
      throw new Error("Failed to send verification email. Please try again later.");
    }

    // 10. Log registration event
    const { logAuthEvent } = await import('../utils/securityLogger.js');
    logAuthEvent('register', user._id, true, req);

    // 11. Return success response (don't log user in yet)
    res.status(201).json({
      success: true,
      message: "Registration successful! Please check your email to verify your account.",
      email: user.email,
      // Don't send token or user data - they need to verify first
    });
  } else {
    res.status(500);
    throw new Error("Server error: Could not create user");
  }
});

/**
 * @desc    Authenticate user & get tokens
 * @route   POST /api/users/login
 * @access  Public
 */
export const loginUser = asyncHandler(async (req, res) => {
  // Import validation utilities
  const { sanitizeEmail, validateEmail, validateRequired } = await import('../utils/validation.js');

  // 1. Sanitize inputs
  const email = sanitizeEmail(req.body.email || '');
  const password = req.body.password || '';

  // 2. Validation
  const requiredValidation = validateRequired(['email', 'password'], { email, password });
  if (!requiredValidation.valid) {
    res.status(400);
    throw new Error(requiredValidation.message);
  }

  if (!validateEmail(email)) {
    res.status(400);
    throw new Error("Please provide a valid email address");
  }

  // Import security logger
  const { logAuthEvent } = await import('../utils/securityLogger.js');

  // 2. Check for user and include password and verification token fields in the query result
  const user = await User.findOne({ email }).select("+password +emailVerificationToken +emailVerificationExpires");

  // 3. Check if user exists and password is correct
  if (user && (await user.comparePassword(password))) {
    logAuthEvent('login', user._id, true, req);
    // 4. Check if email is verified
    if (!user.emailVerified && user.role !== 'admin') {
      // Generate or reuse verification token
      let verificationToken = user.emailVerificationToken;
      const needsNewToken = !verificationToken || 
                           !user.emailVerificationExpires || 
                           user.emailVerificationExpires < new Date();

      if (needsNewToken) {
        // Generate new verification token
        verificationToken = crypto.randomBytes(32).toString('hex');
        const verificationExpires = new Date();
        verificationExpires.setHours(verificationExpires.getHours() + 24); // 24 hours expiry

        // Update user with new token
        user.emailVerificationToken = verificationToken;
        user.emailVerificationExpires = verificationExpires;
        await user.save({ validateBeforeSave: false });
      }

      // Send verification email
      try {
        await sendVerificationEmail({
          email: user.email,
          name: user.name,
          token: verificationToken,
        });

        return res.status(403).json({
          success: false,
          message: "Please verify your email address before logging in. A new verification email has been sent to your inbox. Please check your email and click the verification link.",
          emailSent: true,
        });
      } catch (emailError) {
        console.error('Error sending verification email on login:', emailError);
        // If email fails, still inform user but mention they can use resend endpoint
        return res.status(403).json({
          success: false,
          message: "Please verify your email address before logging in. Please use the 'Resend Verification Email' option or check your inbox for the verification link.",
          emailSent: false,
        });
      }
    }

    // 5. Check if user account is active
    if (user.status === 'inactive') {
      res.status(403);
      throw new Error("Your account has been deactivated. Please contact support.");
    }

    // 6. Generate tokens and set cookie
    const { accessToken } = await generateTokensAndSetCookie(user._id, res);

    res.status(200).json({
      success: true,
      message: "Logged in successfully",
      accessToken,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } else {
    logAuthEvent('login', user?._id || null, false, req);
    res.status(401); // Unauthorized
    throw new Error("Invalid email or password");
  }
});

/**
 * @desc    Logout user
 * @route   POST /api/users/logout
 * @access  Private
 */
export const logoutUser = asyncHandler(async (req, res) => {
  // Clear the refresh token from the database
  req.user.refreshToken = undefined;
  await req.user.save({ validateBeforeSave: false });

  // Clear the cookie on the client side
  res.cookie("refreshToken", "", {
    httpOnly: true,
    expires: new Date(0),
  });

  res.status(200).json({ success: true, message: "User logged out" });
});

/**
 * @desc    Get new access token from refresh token
 * @route   GET /api/users/refresh-token
 * @access  Public (Relies on the cookie)
 */
export const getRefreshToken = asyncHandler(async (req, res) => {
  const refreshToken = req.cookies.refreshToken;

  if (!refreshToken) {
    res.status(401);
    throw new Error("Not authorized, no refresh token found");
  }

  try {
    // 1. Verify the refresh token
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

    // 2. Find the user associated with the token
    const user = await User.findById(decoded.id);

    // 3. Check if user exists and the token matches the one in DB
    if (!user) {
      res.status(401);
      throw new Error("Not authorized, user not found");
    }

    if (user.refreshToken !== refreshToken) {
      res.status(401);
      throw new Error("Not authorized, refresh token mismatch");
    }

    // 4. User is valid, issue a new access token
    const accessToken = jwt.sign({ id: user._id }, process.env.JWT_ACCESS_SECRET, {
      expiresIn: process.env.JWT_ACCESS_EXPIRES_IN,
    });

    res.status(200).json({
      success: true,
      accessToken,
    });

  } catch (error) {
    console.error('Refresh token error:', error);
    
    if (error.name === 'JsonWebTokenError') {
      res.status(401);
      throw new Error("Not authorized, invalid refresh token");
    } else if (error.name === 'TokenExpiredError') {
      res.status(401);
      throw new Error("Not authorized, refresh token expired");
    } else {
      res.status(401);
      throw new Error("Not authorized, refresh token verification failed");
    }
  }
});


/**
 * @desc    Get user profile
 * @route   GET /api/users/profile
 * @access  Private
 */
export const getUserProfile = asyncHandler(async (req, res) => {
  // The user object is already attached to the request by the `protect` middleware
  res.status(200).json({ success: true, user: req.user });
});


/**
 * @desc    Update user profile
 * @route   PUT /api/users/profile
 * @access  Private
 */
/**
 * @desc    Update user profile (including avatar)
 * @route   PUT /api/users/profile
 * @access  Private
 */
export const updateUserProfile = asyncHandler(async (req, res) => {
    // Import validation utilities
    const {
        sanitizeString,
        sanitizeEmail,
        sanitizeText,
        validateEmail,
        validateLength,
        validateRequired,
    } = await import('../utils/validation.js');
    
    const user = await User.findById(req.user._id);

    if (!user) {
        res.status(404);
        throw new Error("User not found");
    }

    // Sanitize and validate inputs
    const name = req.body.name ? sanitizeString(req.body.name, 100) : user.name;
    const email = req.body.email ? sanitizeEmail(req.body.email) : user.email;
    const bio = req.body.bio ? sanitizeText(req.body.bio, 500) : user.bio;

    // Validate name if provided
    if (req.body.name && !validateLength(name, 2, 100)) {
        res.status(400);
        throw new Error("Name must be between 2 and 100 characters");
    }

    // Validate email if provided
    if (req.body.email) {
        if (!validateEmail(email)) {
            res.status(400);
            throw new Error("Please provide a valid email address");
        }
        // Check if email is already taken by another user
        const emailExists = await User.findOne({ email, _id: { $ne: user._id } });
        if (emailExists) {
            res.status(409);
            throw new Error("Email is already in use");
        }
    }

    // Validate bio length if provided
    if (req.body.bio && !validateLength(bio, 0, 500)) {
        res.status(400);
        throw new Error("Bio must be less than 500 characters");
    }

    // Update text fields
    user.name = name;
    user.email = email;
    user.bio = bio;
    
    // Update nested socialLinks object
    if(req.body.socialLinks) {
        const socialLinks = JSON.parse(req.body.socialLinks);
        user.socialLinks.facebook = socialLinks.facebook || user.socialLinks.facebook;
        user.socialLinks.twitter = socialLinks.twitter || user.socialLinks.twitter;
        user.socialLinks.linkedin = socialLinks.linkedin || user.socialLinks.linkedin;
        user.socialLinks.youtube = socialLinks.youtube || user.socialLinks.youtube;
    }

    // Update avatar if a new file is uploaded
    if (req.file) {
        // If user already has an avatar, delete the old one from Cloudinary
        if(user.avatar) {
            const publicId = user.avatar.split('/').pop().split('.')[0];
            await cloudinary.uploader.destroy(`lms/avatars/${publicId}`);
        }
        
        // Cloudinary returns the URL in different properties depending on the version
        // Try different possible properties
        const avatarUrl = req.file.secure_url || req.file.url || req.file.path;
        
        user.avatar = avatarUrl;
    }

    const updatedUser = await user.save();

    res.status(200).json({
        success: true,
        message: "Profile updated successfully",
        user: updatedUser,
    });
});

/**
 * @desc    Change user password
 * @route   PUT /api/users/change-password
 * @access  Private
 */
export const changePassword = asyncHandler(async (req, res) => {
    // Import validation utilities
    const { validatePassword, validateRequired } = await import('../utils/validation.js');

    const { currentPassword, newPassword } = req.body;

    // Validation
    const requiredValidation = validateRequired(['currentPassword', 'newPassword'], {
        currentPassword,
        newPassword,
    });
    if (!requiredValidation.valid) {
        res.status(400);
        throw new Error(requiredValidation.message);
    }

    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.valid) {
        res.status(400);
        throw new Error(passwordValidation.message);
    }

    const user = await User.findById(req.user._id).select("+password");

    if (!user) {
        res.status(404);
        throw new Error("User not found");
    }

    // Check if current password is correct
    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
        res.status(400);
        throw new Error("Current password is incorrect");
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.status(200).json({
        success: true,
        message: "Password changed successfully"
    });
});

/**
 * @desc    Update user status
 * @route   PATCH /api/users/:id/status
 * @access  Private/Admin
 */
/**
 * @desc    Request password reset
 * @route   POST /api/users/forgot-password
 * @access  Public
 */
export const forgotPassword = asyncHandler(async (req, res) => {
  // Import validation and email utilities
  const { sanitizeEmail, validateEmail, validateRequired } = await import('../utils/validation.js');
  const { sendPasswordResetEmail } = await import('../services/email.service.js');
  const { generateVerificationToken } = await import('../services/email.service.js');

  const email = sanitizeEmail(req.body.email || '');

  // Validate email
  const requiredValidation = validateRequired(['email'], { email });
  if (!requiredValidation.valid) {
    res.status(400);
    throw new Error(requiredValidation.message);
  }

  if (!validateEmail(email)) {
    res.status(400);
    throw new Error("Please provide a valid email address");
  }

  // Find user by email
  const user = await User.findOne({ email }).select('+passwordResetToken +passwordResetExpires');

  if (!user) {
    // Don't reveal if email exists (security best practice)
    return res.status(200).json({
      success: true,
      message: "If an account with that email exists, a password reset link has been sent.",
    });
  }

  // Generate reset token
  const resetToken = generateVerificationToken();
  const resetExpires = new Date();
  resetExpires.setHours(resetExpires.getHours() + 1); // 1 hour expiry

  // Save reset token
  user.passwordResetToken = resetToken;
  user.passwordResetExpires = resetExpires;
  await user.save({ validateBeforeSave: false });

  try {
    // Send reset email
    await sendPasswordResetEmail({
      email: user.email,
      name: user.name,
      token: resetToken,
    });

    // Log password reset request
    const { logPasswordReset } = await import('../utils/securityLogger.js');
    logPasswordReset(user.email, true, req);

    res.status(200).json({
      success: true,
      message: "Password reset email sent",
    });
  } catch (error) {
    // Clear reset token if email fails
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });

    console.error('Error sending password reset email:', error);
    res.status(500);
    throw new Error("Failed to send password reset email. Please try again later.");
  }
});

/**
 * @desc    Reset password with token
 * @route   PUT /api/users/reset-password
 * @access  Public
 */
export const resetPassword = asyncHandler(async (req, res) => {
  // Import validation utilities
  const { validatePassword, validateRequired } = await import('../utils/validation.js');

  const { token, password } = req.body;

  // Validation
  const requiredValidation = validateRequired(['token', 'password'], { token, password });
  if (!requiredValidation.valid) {
    res.status(400);
    throw new Error(requiredValidation.message);
  }

  const passwordValidation = validatePassword(password);
  if (!passwordValidation.valid) {
    res.status(400);
    throw new Error(passwordValidation.message);
  }

  // Find user by token
  const user = await User.findOne({
    passwordResetToken: token,
    passwordResetExpires: { $gt: Date.now() },
  }).select('+passwordResetToken +passwordResetExpires');

  if (!user) {
    res.status(400);
    throw new Error("Invalid or expired password reset token");
  }

  // Update password and clear reset token
  user.password = password;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  // Log password reset success
  const { logPasswordReset, logAuthEvent } = await import('../utils/securityLogger.js');
  logPasswordReset(user.email, true, req);
  logAuthEvent('password_reset', user._id, true, req);

  res.status(200).json({
    success: true,
    message: "Password reset successfully. You can now log in with your new password.",
  });
});

export const updateUserStatus = asyncHandler(async (req, res) => {
    const { status } = req.body;

    // Validate status
    if (!status || !['active', 'inactive'].includes(status)) {
        res.status(400);
        throw new Error("Invalid status provided. Must be 'active' or 'inactive'.");
    }

    const user = await User.findById(req.params.id);

    if (!user) {
        res.status(404);
        throw new Error("User not found");
    }

    user.status = status;
    await user.save();

    res.status(200).json({ success: true, message: `User status updated to ${status}` });
});

/**
 * @desc    Verify user email
 * @route   GET /api/users/verify-email
 * @access  Public
 */
export const verifyEmail = asyncHandler(async (req, res) => {
  const { token } = req.query;

  if (!token) {
    res.status(400);
    throw new Error("Verification token is required");
  }

  // Find user by verification token (need to select the hidden field)
  const user = await User.findOne({ 
    emailVerificationToken: token 
  }).select("+emailVerificationToken +emailVerificationExpires");

  // If user found with token, verify them
  if (user) {
    // Check if token has expired
    if (user.emailVerificationExpires < new Date()) {
      res.status(400);
      throw new Error("Verification token has expired. Please request a new one.");
    }

    // Check if already verified (handles race conditions/double clicks)
    if (user.emailVerified === true) {
      return res.status(200).json({
        success: true,
        message: "Email already verified! You can log in to your account.",
      });
    }

    // Verify the email
    user.emailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();

    return res.status(200).json({
      success: true,
      message: "Email verified successfully! You can now log in to your account.",
    });
  }

  // If no user found with token, it might already be verified
  // Return success message instead of error to handle double-clicks gracefully
  // This prevents user confusion when React StrictMode causes double renders
  return res.status(200).json({
    success: true,
    message: "Email verification link has already been used. Your email is verified! You can log in to your account.",
  });
});

/**
 * @desc    Resend verification email
 * @route   POST /api/users/resend-verification
 * @access  Public
 */
export const resendVerificationEmail = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    res.status(400);
    throw new Error("Email address is required");
  }

  // Find user
  const user = await User.findOne({ email }).select("+emailVerificationToken +emailVerificationExpires");

  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  // Check if already verified
  if (user.emailVerified) {
    res.status(400);
    throw new Error("Email is already verified");
  }

  // Generate new verification token
  const verificationToken = crypto.randomBytes(32).toString('hex');
  const verificationExpires = new Date();
  verificationExpires.setHours(verificationExpires.getHours() + 24);

  // Update user with new token
  user.emailVerificationToken = verificationToken;
  user.emailVerificationExpires = verificationExpires;
  await user.save();

  // Send verification email
  try {
    await sendVerificationEmail({
      email: user.email,
      name: user.name,
      token: verificationToken,
    });

    res.status(200).json({
      success: true,
      message: "Verification email sent successfully. Please check your inbox.",
    });
  } catch (emailError) {
    console.error('Error sending verification email:', emailError);
    res.status(500);
    throw new Error("Failed to send verification email. Please try again later.");
  }
});


// --- Admin Controllers ---

/**
 * @desc    Get all users
 * @route   GET /api/users
 * @access  Private/Admin
 */
export const getAllUsers = asyncHandler(async (req, res) => {
  const users = await User.find({}).sort({ createdAt: -1 });
  res.status(200).json({ success: true, count: users.length, users });
});

/**
 * @desc    Get user by ID
 * @route   GET /api/users/:id
 * @access  Private/Admin
 */
export const getUserById = asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id);

    if (user) {
        res.status(200).json({ success: true, user });
    } else {
        res.status(404);
        throw new Error("User not found");
    }
});


/**
 * @desc    Delete user
 * @route   DELETE /api/users/:id
 * @access  Private/Admin
 */
export const deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);

  if (user) {
    await user.deleteOne();
    res.status(200).json({ success: true, message: "User removed" });
  } else {
    res.status(404);
    throw new Error("User not found");
  }
});