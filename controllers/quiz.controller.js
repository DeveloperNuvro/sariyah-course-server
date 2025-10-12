// quiz.controller.js

import Quiz from "../models/quiz.model.js";
import Lesson from "../models/lesson.model.js";
import Enrollment from "../models/enrollment.model.js";
import asyncHandler from "express-async-handler";
import QuizScore from "../models/quizScore.model.js";

/**
 * @desc    Create a quiz for a lesson
 * @route   POST /api/lessons/:lessonId/quiz
 * @access  Private/Instructor or Private/Admin
 */
export const createQuiz = asyncHandler(async (req, res) => {
  const { lessonId } = req.params;
  const { questions } = req.body;

  // 1. Validation
  if (!questions || !Array.isArray(questions) || questions.length === 0) {
    res.status(400);
    throw new Error("Questions array is required and cannot be empty.");
  }

  // Validate each question in the array
  for (const q of questions) {
    if (!q.question || !q.options || !Array.isArray(q.options) || q.options.length < 2 || !q.correctAnswer) {
        res.status(400);
        throw new Error("Each question must have a 'question', at least two 'options', and a 'correctAnswer'.");
    }
    if (!q.options.includes(q.correctAnswer)) {
        res.status(400);
        throw new Error(`The correct answer for question "${q.question}" must be one of the provided options.`);
    }
  }

  // 2. Find the lesson and authorize the user
  const lesson = await Lesson.findById(lessonId).populate({
    path: 'course',
    select: 'instructor'
  });

  if (!lesson) {
    res.status(404);
    throw new Error("Lesson not found");
  }

  if (lesson.course.instructor.toString() !== req.user.id && req.user.role !== "admin") {
    res.status(403);
    throw new Error("Not authorized to add a quiz to this lesson");
  }

  // 3. Prevent duplicate quiz creation (schema has unique index, but this gives a better error)
  if (lesson.quiz) {
    res.status(409);
    throw new Error("A quiz for this lesson already exists. Please update the existing one.");
  }

  // 4. Create the quiz
  const quiz = await Quiz.create({ lesson: lessonId, questions });
  
  // 5. Link the quiz back to the lesson
  lesson.quiz = quiz._id;
  await lesson.save();

  res.status(201).json({ success: true, message: "Quiz created successfully", data: quiz });
});

/**
 * @desc    Get the quiz for a lesson
 * @route   GET /api/lessons/:lessonId/quiz
 * @access  Private (Enrolled students, Instructor, Admin)
 */
export const getQuizForLesson = asyncHandler(async (req, res) => {
  const { lessonId } = req.params;

  const lesson = await Lesson.findById(lessonId).populate('course', 'instructor');
  if (!lesson) {
    res.status(404);
    throw new Error("Lesson not found");
  }

  // Authorization check (enrolled students, instructor, or admin)
  const isInstructor = lesson.course.instructor.toString() === req.user.id;
  const isAdmin = req.user.role === 'admin';
  const isEnrolled = await Enrollment.findOne({ student: req.user.id, course: lesson.course._id });

  if (!isInstructor && !isAdmin && !isEnrolled) {
    res.status(403);
    throw new Error("Not authorized to view this quiz");
  }

  const quiz = await Quiz.findOne({ lesson: lessonId });
  if (!quiz) {
    res.status(404);
    throw new Error("No quiz found for this lesson");
  }

  // For students, we should not send the correct answers
  // A copy is made to avoid modifying the original object
  const quizData = JSON.parse(JSON.stringify(quiz));
  if (!isInstructor && !isAdmin) {
      quizData.questions.forEach(q => delete q.correctAnswer);
  }

  res.status(200).json({ success: true, data: quizData });
});

/**
 * @desc    Update the quiz for a lesson
 * @route   PUT /api/lessons/:lessonId/quiz
 * @access  Private/Instructor or Private/Admin
 */
export const updateQuiz = asyncHandler(async (req, res) => {
    const { lessonId } = req.params;
    // ... (Authorization logic same as createQuiz)
    
    // Find and update the quiz
    const quiz = await Quiz.findOneAndUpdate({ lesson: lessonId }, req.body, {
        new: true,
        runValidators: true,
    });

    if (!quiz) {
        res.status(404);
        throw new Error("No quiz found for this lesson to update.");
    }
    
    res.status(200).json({ success: true, message: "Quiz updated successfully", data: quiz });
});

/**
 * @desc    Delete the quiz for a lesson
 * @route   DELETE /api/lessons/:lessonId/quiz
 * @access  Private/Instructor or Private/Admin
 */
export const deleteQuiz = asyncHandler(async (req, res) => {
    const { lessonId } = req.params;
    // ... (Authorization logic same as createQuiz)

    const quiz = await Quiz.findOne({ lesson: lessonId });
    if (!quiz) {
        res.status(404);
        throw new Error("No quiz found to delete.");
    }

    // Unlink from lesson and delete quiz
    await Lesson.findByIdAndUpdate(lessonId, { $unset: { quiz: "" } });
    await quiz.deleteOne();

    res.status(200).json({ success: true, message: "Quiz deleted successfully." });
});

/**
 * @desc    Submit answers for a quiz and get results
 * @route   POST /api/lessons/:lessonId/quiz/submit
 * @access  Private/Student
 */
export const submitQuiz = asyncHandler(async (req, res) => {
    const { lessonId } = req.params;
    const { answers } = req.body;
    const studentId = req.user.id;

    const lesson = await Lesson.findById(lessonId).select('course');
    if (!lesson) {
        res.status(404);
        throw new Error("Lesson not found.");
    }

    // 1. Authorization: Must be an enrolled student
    const isEnrolled = await Enrollment.findOne({ student: studentId, course: lesson.course });
    if (!isEnrolled) {
        res.status(403);
        throw new Error("You must be enrolled in the course to submit the quiz.");
    }
    
    // --- 2. ADD THIS BLOCK: PREVENT DUPLICATE SUBMISSIONS ---
    const existingSubmission = await QuizScore.findOne({ student: studentId, lesson: lessonId });
    if (existingSubmission) {
        res.status(409); // 409 Conflict
        throw new Error("You have already submitted this quiz and cannot retake it.");
    }
    // --- END OF NEW BLOCK ---

    // 3. Get the quiz with correct answers
    const quiz = await Quiz.findOne({ lesson: lessonId });
    if (!quiz) {
        res.status(404);
        throw new Error("Quiz not found for this lesson.");
    }

    // 4. Grade the submission (this logic remains the same)
    let score = 0;
    const results = [];
    const totalQuestions = quiz.questions.length;

    quiz.questions.forEach(question => {
        const submittedAnswer = answers.find(a => a.questionId.toString() === question._id.toString());
        const isCorrect = submittedAnswer && submittedAnswer.answer === question.correctAnswer;
        
        if (isCorrect) {
            score++;
        }
        
        results.push({
            questionId: question._id,
            question: question.question,
            yourAnswer: submittedAnswer ? submittedAnswer.answer : 'No Answer',
            correctAnswer: question.correctAnswer,
            isCorrect: isCorrect,
        });
    });

    const percentage = (score / totalQuestions) * 100;

    // --- 5. ADD THIS BLOCK: SAVE THE SCORE TO THE DATABASE ---
    await QuizScore.create({
        student: studentId,
        course: lesson.course,
        lesson: lessonId,
        score: percentage,
        // results: results, // Uncomment if you add the 'results' field to your schema
    });
    // --- END OF NEW BLOCK ---

    // 6. Send results back to the student (this logic remains the same)
    res.status(200).json({
        success: true,
        message: "Quiz submitted successfully!", // Added a message
        data: {
            score,
            totalQuestions,
            percentage,
            results,
        }
    });
});