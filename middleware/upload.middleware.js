import multer from 'multer';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import cloudinary from '../config/cloudinary.js'; // <-- Import the configured instance

// --- REMOVED THE cloudinary.config({...}) BLOCK FROM THIS FILE ---

// Configure storage for user avatars
const avatarStorage = new CloudinaryStorage({
  cloudinary: cloudinary, // Use the imported, pre-configured instance
  params: {
    folder: "lms/avatars",
    allowed_formats: ["jpg", "png", "jpeg"],
    transformation: [{ width: 150, height: 150, crop: "fill" }],
  },
});

// Configure storage for course thumbnails
const thumbnailStorage = new CloudinaryStorage({
  cloudinary: cloudinary, // Use the imported, pre-configured instance
  params: {
    folder: "lms/thumbnails",
    allowed_formats: ["jpg", "png", "jpeg"],
    transformation: [{ width: 1000, height: 1000, crop: "fill" }],
  },
});

// Configure storage for payment slips
const paymentSlipStorage = new CloudinaryStorage({
  cloudinary: cloudinary, // Use the imported, pre-configured instance
  params: {
    folder: "lms/payment-slips",
    allowed_formats: ["jpg", "png", "jpeg"],
    transformation: [{ width: 800, height: 600, crop: "limit" }],
  },
});

export const uploadAvatar = multer({ storage: avatarStorage }).single("avatar");
export const uploadThumbnail = multer({ storage: thumbnailStorage }).single("thumbnail");
export const uploadPaymentSlip = multer({ storage: paymentSlipStorage }).single("paymentSlip");