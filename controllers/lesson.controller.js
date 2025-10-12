// lesson.controller.js
import jwt from 'jsonwebtoken';
import User from '../models/user.model.js';
import Lesson from "../models/lesson.model.js";
import Course from "../models/course.model.js";
import Enrollment from "../models/enrollment.model.js";
import Progress from "../models/progress.model.js";
import asyncHandler from "express-async-handler";

// --- Helper function to update the total duration of a course ---
const updateCourseTotalDuration = async (courseId) => {
  const lessons = await Lesson.find({ course: courseId });
  const totalDuration = lessons.reduce((acc, lesson) => acc + (lesson.duration || 0), 0);
  await Course.findByIdAndUpdate(courseId, { totalDuration });
};

// --- Helper function to recalculate progress for all enrolled students ---
const recalculateProgressForAllStudents = async (courseId) => {
  try {
    // Get all enrollments for this course
    const enrollments = await Enrollment.find({ course: courseId });
    
    // Count total lessons for this course
    const totalLessons = await Lesson.countDocuments({ course: courseId });
    
    if (totalLessons === 0) return; // No lessons, no progress to calculate
    
    // Update progress for each enrollment
    for (const enrollment of enrollments) {
      // Get the student's progress
      const progress = await Progress.findOne({ 
        student: enrollment.student, 
        course: courseId 
      });
      
      if (progress) {
        const completedLessonsCount = progress.completedLessons.length;
        const newProgressPercentage = Math.round((completedLessonsCount / totalLessons) * 100);
        
        // Update enrollment progress
        enrollment.progress = newProgressPercentage;
        enrollment.completed = newProgressPercentage === 100;
        await enrollment.save();
      }
    }
    
    console.log(`Progress recalculated for ${enrollments.length} students in course ${courseId}`);
  } catch (error) {
    console.error('Error recalculating progress:', error);
  }
};

/**
 * @desc    Create a new lesson for a specific course
 * @route   POST /api/courses/:courseId/lessons
 * @access  Private/Instructor or Private/Admin
 */
export const createLesson = asyncHandler(async (req, res) => {
  const { title, videoUrl, content, duration } = req.body;
  const { courseId } = req.params;

  // 1. Validation
  if (!title) {
    res.status(400);
    throw new Error("Lesson title is required");
  }

  // 2. Find the course to ensure it exists
  const course = await Course.findById(courseId);
  if (!course) {
    res.status(404);
    throw new Error("Course not found");
  }

  // 3. Authorization: Only the course instructor or an admin can add lessons
  if (course.instructor.toString() !== req.user.id && req.user.role !== "admin") {
    res.status(403); // Forbidden
    throw new Error("Not authorized to add lessons to this course");
  }

  // 4. Determine the order for the new lesson
  const lastLesson = await Lesson.findOne({ course: courseId }).sort({ order: -1 });
  const newOrder = lastLesson ? lastLesson.order + 1 : 1;

  // 5. Create the lesson
  const lesson = await Lesson.create({
    course: courseId,
    title,
    videoUrl,
    content,
    duration: duration || 0,
    order: newOrder,
  });

  // 6. Update the course's total duration
  await updateCourseTotalDuration(courseId);
  
  // 7. (Optional but good practice) Add lesson's ID to the course's lessons array
  course.lessons.push(lesson._id);
  await course.save();
  
  // 8. Recalculate progress for all enrolled students
  await recalculateProgressForAllStudents(courseId);

  res.status(201).json({
    success: true,
    message: "Lesson created and added to the course successfully",
    data: lesson,
  });
});

/**
 * @desc    Get all lessons for a specific course (Publicly viewable text content)
 * @route   GET /api/courses/:courseId/lessons
 * @access  Public (with conditional private data)
 */
export const getLessonsForCourse = asyncHandler(async (req, res) => {
    const { courseId } = req.params;
    
    const course = await Course.findById(courseId);
    if (!course) {
        res.status(404);
        throw new Error("Course not found");
    }

    let isAuthorized = false;
    
    // --- ROBUST AUTHORIZATION CHECK WITH LOGGING ---
    console.log("\n--- [LESSON AUTH CHECK] ---");
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith("Bearer")) {
        const token = authHeader.split(" ")[1];
        console.log("[LESSON AUTH CHECK] Token found.");
        try {
            const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
            console.log("[LESSON AUTH CHECK] Token decoded successfully. User ID from token:", decoded.id);

            const loggedInUser = await User.findById(decoded.id).lean();

            if (loggedInUser) {
                console.log(`[LESSON AUTH CHECK] User found in DB: ${loggedInUser.name} (${loggedInUser.role})`);
                
                const isInstructor = course.instructor.equals(loggedInUser._id);
                const isAdmin = loggedInUser.role === 'admin';
                const isEnrolled = await Enrollment.findOne({ student: loggedInUser._id, course: courseId });

                console.log(`[LESSON AUTH CHECK] Is Instructor: ${isInstructor}, Is Admin: ${isAdmin}, Is Enrolled: ${!!isEnrolled}`);

                if (isInstructor || isAdmin || isEnrolled) {
                    isAuthorized = true;
                    console.log("[LESSON AUTH CHECK] User IS AUTHORIZED.");
                } else {
                    console.log("[LESSON AUTH CHECK] User is NOT AUTHORIZED (not instructor, admin, or enrolled).");
                }
            } else {
                console.log("[LESSON AUTH CHECK] User ID from token not found in database.");
            }
        } catch (error) {
            console.error("[LESSON AUTH CHECK] Token verification failed:", error.message);
        }
    } else {
        console.log("[LESSON AUTH CHECK] No Authorization header found. Treating as public user.");
    }
    console.log("--- [END LESSON AUTH CHECK] ---\n");
    // --- END OF AUTHORIZATION BLOCK ---

    const lessons = await Lesson.find({ course: courseId }).sort({ order: "asc" }).lean();

    if (!isAuthorized) {
        console.log("Sanitizing lesson data for public view.");
        lessons.forEach(lesson => {
            delete lesson.videoUrl;
            delete lesson.quiz;
        });
    }

    res.status(200).json({
        success: true,
        count: lessons.length,
        data: lessons,
    });
});

/**
 * @desc    Get a single lesson by ID
 * @route   GET /api/lessons/:id
 * @access  Private (Enrolled students, Instructor, Admin)
 */
export const getLessonById = asyncHandler(async (req, res) => {
  const lesson = await Lesson.findById(req.params.id).populate('course', 'instructor');
  
  if (!lesson) {
    res.status(404);
    throw new Error("Lesson not found");
  }

  // Re-run the same authorization check as getLessonsForCourse
  const isInstructor = lesson.course.instructor.toString() === req.user.id;
  const isAdmin = req.user.role === 'admin';
  const isEnrolled = await Enrollment.findOne({ student: req.user.id, course: lesson.course._id });

  if (!isInstructor && !isAdmin && !isEnrolled) {
    res.status(403);
    throw new Error("Not authorized to view this lesson");
  }

  res.status(200).json({ success: true, data: lesson });
});

/**
 * @desc    Update a lesson
 * @route   PUT /api/lessons/:id
 * @access  Private/Instructor or Private/Admin
 */
export const updateLesson = asyncHandler(async (req, res) => {
  const lesson = await Lesson.findById(req.params.id).populate('course', 'instructor');

  if (!lesson) {
    res.status(404);
    throw new Error("Lesson not found");
  }

  // Authorization: Only instructor or admin can update
  if (lesson.course.instructor.toString() !== req.user.id && req.user.role !== "admin") {
    res.status(403);
    throw new Error("Not authorized to update this lesson");
  }

  const updatedLesson = await Lesson.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  // If duration changed, recalculate course total duration
  if (req.body.duration && req.body.duration !== lesson.duration) {
      await updateCourseTotalDuration(lesson.course._id);
  }

  res.status(200).json({ success: true, data: updatedLesson });
});

/**
 * @desc    Delete a lesson
 * @route   DELETE /api/lessons/:id
 * @access  Private/Instructor or Private/Admin
 */
export const deleteLesson = asyncHandler(async (req, res) => {
  const lesson = await Lesson.findById(req.params.id);

  if (!lesson) {
    res.status(404);
    throw new Error("Lesson not found");
  }

  const course = await Course.findById(lesson.course);
  if (!course) {
      // This case is unlikely but good for data integrity
      await lesson.deleteOne();
      return res.status(200).json({ success: true, message: "Lesson removed (course not found)." });
  }

  // Authorization check
  if (course.instructor.toString() !== req.user.id && req.user.role !== 'admin') {
      res.status(403);
      throw new Error("Not authorized to delete this lesson");
  }

  const courseId = lesson.course;

  await lesson.deleteOne();

  // Update the course's lessons array and total duration
  await Course.findByIdAndUpdate(courseId, { $pull: { lessons: lesson._id } });
  await updateCourseTotalDuration(courseId);
  
  // Recalculate progress for all enrolled students
  await recalculateProgressForAllStudents(courseId);

  res.status(200).json({ success: true, message: 'Lesson removed successfully' });
});