import mongoose from "mongoose";

const courseSchema = new mongoose.Schema({
  title: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  shortDescription: { type: String },
  description: { type: String, required: true },
  thumbnail: { type: String },
  category: { type: mongoose.Schema.Types.ObjectId, ref: "Category" },
  price: { type: Number, required: true, min: 0 },
  discountPrice: { type: Number },
  level: { type: String, enum: ["beginner", "intermediate", "advanced"], default: "beginner" },
  instructor: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  lessons: [{ type: mongoose.Schema.Types.ObjectId, ref: "Lesson" }],
  totalDuration: { type: Number, default: 0 }, // in minutes
  language: { type: String, default: "English" },
  objectives: { type: String },
  prerequisites: { type: String },
  groupLink: { type: String, default: "" },
  isPublished: { type: Boolean, default: false },
  isEnded: { type: Boolean, default: false },
}, { timestamps: true });

// --- Indexes ---
// Index for finding courses by instructor
courseSchema.index({ instructor: 1 });
// Index for filtering courses by category
courseSchema.index({ category: 1 });
// Compound index for filtering the public course catalog
courseSchema.index({ isPublished: 1, level: 1, price: 1 });
// Text index for searching by title and description
courseSchema.index({ title: "text", description: "text" });

export default mongoose.model("Course", courseSchema);