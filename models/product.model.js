import mongoose from "mongoose";

const productFileSchema = new mongoose.Schema({
  name: { type: String, required: true },
  url: { type: String, required: true },
  sizeBytes: { type: Number, default: 0 },
  format: { type: String, default: "" },
  publicId: { type: String, default: "" },
  resourceType: { type: String, default: "raw" },
}, { _id: false });

const productSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  slug: { type: String, required: true, unique: true, index: true },
  description: { type: String, default: "" },
  price: { type: Number, required: true, min: 0 },
  discountPrice: { type: Number, default: 0, min: 0 },
  thumbnail: { type: String, default: "" },
  files: { type: [productFileSchema], default: [] },
  category: { type: mongoose.Schema.Types.ObjectId, ref: "Category" },
  tags: { type: [String], default: undefined },
  isPublished: { type: Boolean, default: false },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
}, { timestamps: true });

productSchema.index({ title: "text", description: "text" });
productSchema.index({ tags: 1 });

export default mongoose.model("Product", productSchema);


