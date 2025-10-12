import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';

// This file now has one job: configure Cloudinary.
// It assumes dotenv has already been run.
dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export default cloudinary;