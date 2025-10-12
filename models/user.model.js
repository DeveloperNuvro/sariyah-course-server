import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, trim: true, lowercase: true },
  password: { type: String, required: true, select: false },
  avatar: { type: String, default: "" },
  role: {
    type: String,
    enum: ["student", "instructor", "admin"],
    default: "student",
  },
  bio: { type: String },
  socialLinks: {
    facebook: String,
    twitter: String,
    linkedin: String,
    youtube: String,
  },
  refreshToken: { type: String, select: false },
  accessToken: { type: String, select: false },
  status: { type: String, enum: ["active", "inactive"], default: "active" },
}, { timestamps: true });

// Pre-save hook to hash password before saving
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Method to compare candidate password with the hashed password
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// --- Indexes ---
// Index for efficient user lookup by role
userSchema.index({ role: 1 });

export default mongoose.model("User", userSchema);