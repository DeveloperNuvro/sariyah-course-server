import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema({
  course: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true },
  student: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  rating: { type: Number, min: 1, max: 5, required: true },
  comment: { type: String },
}, { timestamps: true });

// --- Indexes ---
// Unique compound index to ensure one review per student per course and for fast lookups
reviewSchema.index({ course: 1, student: 1 }, { unique: true });

export default mongoose.model("Review", reviewSchema);