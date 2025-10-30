import mongoose from "mongoose";

const digitalOrderItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
  price: { type: Number, required: true },
  titleSnapshot: { type: String, required: true },
}, { _id: false });

const downloadTokenSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
  token: { type: String, required: true, index: true },
  expiresAt: { type: Date, required: true },
  maxDownloads: { type: Number, default: 5 },
  downloads: { type: Number, default: 0 },
}, { _id: false });

const digitalOrderSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  items: { type: [digitalOrderItemSchema], default: [] },
  amount: { type: Number, required: true },
  paymentMethod: { type: String, enum: ["bkash", "Nagad", "Upay", "Rocket", "Cellfin", "free"], required: true },
  paymentStatus: { type: String, enum: ["pending", "paid", "failed"], default: "pending" },
  transactionId: { type: String, required: true, unique: true, sparse: true },
  buyerInfo: {
    name: { type: String },
    email: { type: String },
    phone: { type: String },
  },
  downloadTokens: { type: [downloadTokenSchema], default: [] },
}, { timestamps: true });

digitalOrderSchema.index({ user: 1, createdAt: -1 });

export default mongoose.model("DigitalOrder", digitalOrderSchema);


