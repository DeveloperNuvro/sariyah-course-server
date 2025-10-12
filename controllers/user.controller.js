// user.controller.js

import User from "../models/user.model.js"; // Adjust the path to your user model
import asyncHandler from "express-async-handler";
import jwt from "jsonwebtoken";
import { v2 as cloudinary } from 'cloudinary';

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
  const { name, email, password, role } = req.body; // Allow role selection on register if desired

  // 1. Validation
  if (!name || !email || !password) {
    res.status(400);
    throw new Error("Please provide name, email, and password");
  }

  const userExists = await User.findOne({ email });
  if (userExists) {
    res.status(409);
    throw new Error("User with this email already exists");
  }

  // 2. Create user (avatar can be added later in profile update)
  const user = await User.create({ name, email, password, role });

  if (user) {
    const { accessToken } = await generateTokensAndSetCookie(user._id, res);

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      accessToken,
      user: { _id: user._id, name: user.name, email: user.email, role: user.role },
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
  const { email, password } = req.body;

  // 1. Validation
  if (!email || !password) {
    res.status(400);
    throw new Error("Please provide email and password");
  }

  // 2. Check for user and include password in the query result
  const user = await User.findOne({ email }).select("+password");

  // 3. Check if user exists and password is correct
  if (user && (await user.comparePassword(password))) {
    // 4. Generate tokens and set cookie
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
    if (!user || user.refreshToken !== refreshToken) {
      res.status(401);
      throw new Error("Not authorized, token is invalid or expired");
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
    res.status(401);
    throw new Error("Not authorized, refresh token failed");
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
    console.log('Update profile request received');
    console.log('Request body:', req.body);
    console.log('Request file:', req.file);
    
    const user = await User.findById(req.user._id);

    if (!user) {
        res.status(404);
        throw new Error("User not found");
    }

    // Update text fields
    user.name = req.body.name || user.name;
    user.email = req.body.email || user.email;
    user.bio = req.body.bio || user.bio;
    
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
        console.log('File received:', req.file); // Debug log
        
        // If user already has an avatar, delete the old one from Cloudinary
        if(user.avatar) {
            const publicId = user.avatar.split('/').pop().split('.')[0];
            await cloudinary.uploader.destroy(`lms/avatars/${publicId}`);
        }
        
        // Cloudinary returns the URL in different properties depending on the version
        // Try different possible properties
        const avatarUrl = req.file.secure_url || req.file.url || req.file.path;
        console.log('Avatar URL to save:', avatarUrl); // Debug log
        
        user.avatar = avatarUrl;
    }

    const updatedUser = await user.save();
    console.log('User saved with avatar:', updatedUser.avatar);

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
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
        res.status(400);
        throw new Error("Please provide current password and new password");
    }

    if (newPassword.length < 6) {
        res.status(400);
        throw new Error("New password must be at least 6 characters long");
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


// --- Admin Controllers ---

/**
 * @desc    Get all users
 * @route   GET /api/users
 * @access  Private/Admin
 */
export const getAllUsers = asyncHandler(async (req, res) => {
  const users = await User.find({});
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