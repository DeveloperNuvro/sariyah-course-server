import mongoose from "mongoose";

const enrollmentSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  course: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true },
  progress: { type: Number, default: 0, min: 0, max: 100 }, // %
  completed: { type: Boolean, default: false },
}, { timestamps: true });

// --- Indexes ---
// Unique compound index to prevent duplicate enrollments and speed up lookups.
enrollmentSchema.index({ student: 1, course: 1 }, { unique: true });

export default mongoose.model("Enrollment", enrollmentSchema);