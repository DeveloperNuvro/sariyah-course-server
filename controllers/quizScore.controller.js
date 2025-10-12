import QuizScore from '../models/quizScore.model.js';
import Lesson from '../models/lesson.model.js';
import Course from '../models/course.model.js';
import asyncHandler from 'express-async-handler';

/**
 * @desc    Get all quiz scores for a specific lesson
 * @route   GET /api/quiz-scores/lesson/:lessonId
 * @access  Private/Instructor or Private/Admin
 */
export const getScoresForLesson = asyncHandler(async (req, res) => {
    const { lessonId } = req.params;
    
    // 1. Find the lesson to get the course and instructor ID for authorization
    const lesson = await Lesson.findById(lessonId).populate('course', 'instructor');
    if (!lesson) {
        res.status(404);
        throw new Error("Lesson not found");
    }

    // 2. Authorization check
    if (lesson.course.instructor.toString() !== req.user.id && req.user.role !== 'admin') {
        res.status(403);
        throw new Error("Not authorized to view scores for this lesson.");
    }

    // 3. Fetch scores
    const scores = await QuizScore.find({ lesson: lessonId })
        .populate('student', 'name email')
        .sort({ score: -1 }); // Sort by highest score

    res.status(200).json({
        success: true,
        count: scores.length,
        data: scores,
    });
});

/**
 * @desc    Get all quiz scores for a specific course
 * @route   GET /api/quiz-scores/course/:courseId
 * @access  Private/Instructor or Private/Admin
 */
export const getScoresForCourse = asyncHandler(async (req, res) => {
    const { courseId } = req.params;

    // 1. Authorization check
    const course = await Course.findById(courseId);
    if (!course) {
        res.status(404);
        throw new Error("Course not found");
    }
    if (course.instructor.toString() !== req.user.id && req.user.role !== 'admin') {
        res.status(403);
        throw new Error("Not authorized to view scores for this course.");
    }
    
    // 2. Fetch all scores for the course, populating lesson and student details
    const scores = await QuizScore.find({ course: courseId })
        .populate('student', 'name email')
        .populate('lesson', 'title')
        .sort({ createdAt: -1 });

    res.status(200).json({
        success: true,
        count: scores.length,
        data: scores,
    });
});