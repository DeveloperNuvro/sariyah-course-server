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
import productRoutes from './routes/product.routes.js';
import cartRoutes from './routes/cart.routes.js';
import digitalOrderRoutes from './routes/digitalOrder.routes.js';
import projectInquiryRoutes from './routes/projectInquiry.routes.js';

// Import Cloudinary configuration
import './config/cloudinary.js';

// Security middleware
import { 
  apiLimiter, 
  authLimiter, 
  inquiryLimiter,
  securityHeaders, 
  mongoSanitization, 
  xssProtection,
  validateRequestSize 
} from './middleware/security.middleware.js';

const app = express();

const corsOptions = {
  origin: ['https://www.sariyahtech.com', 'http://localhost:5173'], // Production and development URLs
  credentials: true,
};

// --- Security Middleware (apply early) ---
app.use(securityHeaders);
app.use(mongoSanitization);
app.use(xssProtection);
app.use(validateRequestSize);

// --- Middleware ---
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' })); // Limit request body size
app.use(express.urlencoded({ extended: true, limit: '10mb' })); // Limit URL-encoded body size
app.use(cookieParser());

// --- Rate Limiting (apply to all routes by default) ---
app.use('/api/', apiLimiter);

// Database Connection (supports in-memory for local testing)
async function connectDb() {
  try {
    // Always use real MongoDB; do not auto-switch to memory DB
    const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/sariyah';
    await mongoose.connect(uri);
    const dbName = mongoose.connection.name;
    console.log(`MongoDB Connected... uri=${uri} db=${dbName}`);

    // Ensure product indexes are correct (drop any text index that includes 'tags')
    try {
      const collection = mongoose.connection.collection('products');
      const indexes = await collection.indexes();
      for (const idx of indexes) {
        const keys = idx.key || {};
        const isTextIndex = Object.values(keys).some((v) => v === 'text');
        if (isTextIndex) {
          const keyNames = Object.keys(keys);
          const isExactlyTitleDescText =
            keyNames.length === 2 &&
            keys.title === 'text' &&
            keys.description === 'text';
          if (!isExactlyTitleDescText) {
            try {
              await collection.dropIndex(idx.name);
              console.log(`Dropped unexpected text index: ${idx.name}`);
            } catch {}
          }
        }
      }
      // Ensure desired text index exists only on title and description
      await collection.createIndex({ title: 'text', description: 'text' });
      // Ensure tags has a normal (non-text) index
      await collection.createIndex({ tags: 1 });
    } catch (e) {
      console.warn('Index ensure warning:', e?.message || e);
    }
  } catch (err) {
    console.error('MongoDB Connection Error:', err);
  }
}
connectDb();

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
app.use('/api/products', productRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/dorders', digitalOrderRoutes);
app.use('/api/project-inquiry', projectInquiryRoutes);

// Simple health endpoint to verify DB and counts
app.get('/api/health', async (req, res) => {
  try {
    const db = mongoose.connection;
    const state = db.readyState; // 1 connected
    const dbName = db.name;
    let courseCount = null;
    try {
      const Course = (await import('./models/course.model.js')).default;
      courseCount = await Course.countDocuments({});
    } catch {
      // ignore if model not available
    }
    res.json({ ok: true, memoryDb: false, mongoState: state, dbName, courseCount });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// --- Global Error Handler ---
app.use((err, req, res, next) => {
  console.error('Global error handler:', err);
  
  // Default error
  let error = { ...err };
  error.message = err.message;

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    const message = 'Resource not found';
    error = { message, statusCode: 404 };
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const message = 'Duplicate field value entered';
    error = { message, statusCode: 400 };
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message).join(', ');
    error = { message, statusCode: 400 };
  }

  res.status(error.statusCode || 500).json({
    success: false,
    error: error.message || 'Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// --- 404 Handler ---
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found'
  });
});

const PORT = process.env.PORT || 8900;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));