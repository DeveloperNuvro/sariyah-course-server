import mongoose from "mongoose";

const orderSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  course: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true },
  amount: { type: Number, required: true },
  paymentMethod: { type: String, enum: ["bkash", "Nagad", "Upay", "Rocket", "Cellfin", "free"], required: true },
  paymentStatus: { type: String, enum: ["pending", "paid", "failed"], default: "pending" },
  transactionId: { type: String, required: true, unique: true, sparse: true, },
  paymentNumber: { type: Number, },
  paymentSlip: { type: String, default: "" }, // URL to the uploaded payment slip image

}, { timestamps: true });

// --- Indexes ---
// Index to find all orders for a user
orderSchema.index({ user: 1 });
// Index to find all orders for a course
orderSchema.index({ course: 1 });

export default mongoose.model("Order", orderSchema);