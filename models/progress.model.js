import mongoose from "mongoose";

const progressSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  course: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true },
  completedLessons: [{ type: mongoose.Schema.Types.ObjectId, ref: "Lesson" }],
  lastWatchedLesson: { type: mongoose.Schema.Types.ObjectId, ref: "Lesson" },
}, { timestamps: true }); // Using timestamps' updatedAt is more standard than a manual one

// --- Indexes ---
// Unique compound index to quickly find a student's progress in a course
progressSchema.index({ student: 1, course: 1 }, { unique: true });

export default mongoose.model("Progress", progressSchema);