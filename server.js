import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';

// =================================================================
// 1. VERY IMPORTANT: Load environment variables BEFORE any of your other code runs.
// This ensures that process.env is populated for all subsequent imports.
dotenv.config();
// =================================================================


// 2. NOW, import all your application routes and configs.
// When these files are imported, they will be able to see the process.env variables.
import authRoutes from './routes/auth.routes.js';
import courseRoutes from './routes/course.routes.js';
import enrollmentRoutes from './routes/enrollment.routes.js';
import orderRoutes from './routes/order.routes.js';
import { lessonRouter } from './routes/lesson.routes.js';
import categoryRoutes from './routes/category.routes.js';
import progressRoutes from './routes/progress.routes.js';
import { reviewRouter } from './routes/review.routes.js';
import certificateRouter from './routes/certificate.route.js';
import quizScoreRoutes from './routes/quizScore.routes.js';
import adminRoutes from './routes/admin.routes.js';

// Note: You should also have your Cloudinary config being initialized by one of these imports
// and a database connection file.

const app = express();

const corsOptions = {
  origin: 'https://www.sariyahtech.com', // Your frontend URL
  credentials: true,
};

// --- Middleware ---
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Database Connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB Connected...'))
  .catch(err => console.error('MongoDB Connection Error:', err)); // Added better logging

// --- API Routes ---
app.use('/api/users', authRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/enrollments', enrollmentRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/lessons', lessonRouter);
app.use('/api/categories', categoryRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/reviews', reviewRouter);
app.use('/api/certificates', certificateRouter);
app.use('/api/quiz-scores', quizScoreRoutes);
app.use('/api/admin', adminRoutes); // <-- ADD ADMIN ROUTES

const PORT = process.env.PORT || 8900;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));