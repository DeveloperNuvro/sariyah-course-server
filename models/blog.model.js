import mongoose from "mongoose";

const blogSchema = new mongoose.Schema({
  title: { 
    type: String, 
    required: true, 
    trim: true,
    maxlength: 200
  },
  slug: { 
    type: String, 
    required: true, 
    unique: true, 
    index: true,
    lowercase: true
  },
  excerpt: { 
    type: String, 
    trim: true,
    maxlength: 500 
  },
  content: { 
    type: String, 
    required: true 
  },
  featuredImage: { 
    type: String, 
    default: "" 
  },
  
  // SEO Fields
  metaTitle: { 
    type: String, 
    trim: true,
    maxlength: 60 
  },
  metaDescription: { 
    type: String, 
    trim: true,
    maxlength: 160 
  },
  metaKeywords: { 
    type: [String], 
    default: [] 
  },
  ogImage: { 
    type: String, 
    default: "" 
  },
  ogTitle: { 
    type: String, 
    trim: true,
    maxlength: 95 
  },
  ogDescription: { 
    type: String, 
    trim: true,
    maxlength: 200 
  },
  canonicalUrl: { 
    type: String, 
    trim: true 
  },
  
  // Content Metadata
  author: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User", 
    required: true 
  },
  category: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Category" 
  },
  tags: { 
    type: [String], 
    default: []
  },
  
  // Publishing
  isPublished: { 
    type: Boolean, 
    default: false,
    index: true
  },
  publishedAt: { 
    type: Date 
  },
  
  // SEO Metrics
  readingTime: { 
    type: Number, 
    default: 0 // in minutes
  },
  viewCount: { 
    type: Number, 
    default: 0 
  },
  
  // Schema.org structured data
  schemaType: {
    type: String,
    enum: ['Article', 'BlogPosting', 'NewsArticle'],
    default: 'BlogPosting'
  }
}, { 
  timestamps: true 
});

// --- Indexes ---
// Text search index for title, content, and excerpt
blogSchema.index({ title: "text", content: "text", excerpt: "text" });
// Index for published blogs by date
blogSchema.index({ isPublished: 1, publishedAt: -1 });
// Index for author
blogSchema.index({ author: 1 });
// Index for category
blogSchema.index({ category: 1 });
// Index for tags
blogSchema.index({ tags: 1 });

// Pre-save hook to calculate reading time (average 200 words per minute)
blogSchema.pre('save', function(next) {
  if (this.isModified('content')) {
    const wordCount = this.content.split(/\s+/).length;
    this.readingTime = Math.max(1, Math.ceil(wordCount / 200));
  }
  if (this.isModified('isPublished') && this.isPublished && !this.publishedAt) {
    this.publishedAt = new Date();
  }
  next();
});

export default mongoose.model("Blog", blogSchema);

