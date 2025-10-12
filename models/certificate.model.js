import mongoose from "mongoose";

const certificateSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  course: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true },
  certificateUrl: { type: String, required: true }, // The URL where the certificate is hosted
}, { timestamps: true }); // Using timestamps' createdAt is more standard than issuedAt

// --- Indexes ---
// Unique compound index to ensure one certificate per student per course
certificateSchema.index({ student: 1, course: 1 }, { unique: true });

export default mongoose.model("Certificate", certificateSchema);