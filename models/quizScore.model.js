import mongoose from "mongoose";

const quizScoreSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  course: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true },
  lesson: { type: mongoose.Schema.Types.ObjectId, ref: "Lesson", required: true },
  score: { type: Number, required: true }, // This will store the percentage (e.g., 80 for 80%)
  // You could optionally add the full results array here if needed in the future
  // results: { type: Array, required: true } 
}, { timestamps: true });

// --- CRITICAL: This index prevents a student from submitting a quiz for the same lesson more than once.
quizScoreSchema.index({ student: 1, lesson: 1 }, { unique: true });

// Index for instructors to quickly find all scores for a course or lesson
quizScoreSchema.index({ course: 1 });
quizScoreSchema.index({ lesson: 1 });

export default mongoose.model("QuizScore", quizScoreSchema);