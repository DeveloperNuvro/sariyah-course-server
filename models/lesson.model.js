import mongoose from "mongoose";

const lessonSchema = new mongoose.Schema({
  course: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true },
  title: { type: String, required: true },
  videoUrl: { type: String },
  content: { type: String },
  duration: { type: Number, default: 0 }, // in minutes
  order: { type: Number }, // lesson order
  quiz: { type: mongoose.Schema.Types.ObjectId, ref: "Quiz" },
}, { timestamps: true });

// --- Indexes ---
// Index for quickly fetching and ordering all lessons for a specific course
lessonSchema.index({ course: 1, order: 1 });

export default mongoose.model("Lesson", lessonSchema);