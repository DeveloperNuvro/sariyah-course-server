import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';

// This file now has one job: configure Cloudinary.
// It assumes dotenv has already been run.
dotenv.config();

// Debug: Check if environment variables are loaded
console.log('Cloudinary Config Check:');
console.log('CLOUDINARY_CLOUD_NAME:', process.env.CLOUDINARY_CLOUD_NAME ? 'Set' : 'Missing');
console.log('CLOUDINARY_API_KEY:', process.env.CLOUDINARY_API_KEY ? 'Set' : 'Missing');
console.log('CLOUDINARY_API_SECRET:', process.env.CLOUDINARY_API_SECRET ? 'Set' : 'Missing');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export default cloudinary;