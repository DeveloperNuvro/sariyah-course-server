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

// Product-specific storage (single engine handling both thumbnail and files)
// Use a params callback to switch destination/options by fieldname
const productMixedStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: (req, file) => {
    if (file.fieldname === "thumbnail") {
      return {
        folder: "lms/products/thumbnails",
        allowed_formats: ["jpg", "png", "jpeg"],
        transformation: [{ width: 1000, height: 1000, crop: "fill" }],
      };
    }
    // default to product files
    return {
      folder: "lms/products/files",
      resource_type: "raw",
      access_mode: "public", // make files publicly accessible to avoid authenticated URL 404s
      type: "upload",
    };
  },
});

export const uploadProductAssets = multer({
  storage: productMixedStorage,
}).fields([
  { name: "thumbnail", maxCount: 1 },
  { name: "files", maxCount: 10 },
]);