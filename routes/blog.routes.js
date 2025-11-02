import express from "express";
import { protect, authorize } from "../middleware/auth.middleware.js";
import {
  createBlog,
  updateBlog,
  deleteBlog,
  getBlogs,
  getBlogBySlug,
  getBlogSEO,
  adminGetBlogs,
  adminGetBlogById,
  getRelatedBlogs,
  getBlogSitemap,
  getRobotsTxt,
} from "../controllers/blog.controller.js";
import { uploadBlogAssets } from "../middleware/upload.middleware.js";

const router = express.Router();

// Public routes (specific routes before parameterized ones)
router.get("/sitemap.xml", getBlogSitemap);
router.get("/robots.txt", getRobotsTxt);
router.get("/", getBlogs);
router.get("/slug/:slug", getBlogBySlug);
router.get("/seo/:slug", getBlogSEO);
router.get("/:slug/related", getRelatedBlogs);

// Admin routes (protected - must come after public routes)
router.use(protect, authorize("admin"));
router.get("/admin", adminGetBlogs);
router.get("/admin/:id", adminGetBlogById);
router.post("/", uploadBlogAssets, createBlog);
router.put("/:id", uploadBlogAssets, updateBlog);
router.delete("/:id", deleteBlog);

export default router;

