import express from "express";
import { protect, authorize } from "../middleware/auth.middleware.js";
import {
  createProduct,
  updateProduct,
  deleteProduct,
  getProducts,
  getProductBySlug,
  adminListProducts,
} from "../controllers/product.controller.js";
import { uploadProductAssets } from "../middleware/upload.middleware.js";
import { adminGetProductById, migrateProductFilesToPublic, migrateProductFilesReuploadPublic, productFilePreviewRedirect, deleteProductFile, replaceProductFile } from "../controllers/product.controller.js";

const router = express.Router();

// Public
router.get("/", getProducts);
router.get("/slug/:slug", getProductBySlug);
router.get("/preview/:publicId", productFilePreviewRedirect);

// Admin
router.use(protect, authorize("admin"));
router.get("/admin", adminListProducts);
router.get("/:id", adminGetProductById);
router.post("/", uploadProductAssets, createProduct);
router.put("/:id", uploadProductAssets, updateProduct);
router.delete("/:id", deleteProduct);
router.post("/admin/migrate-files", migrateProductFilesToPublic);
router.post("/admin/migrate-files-reupload", migrateProductFilesReuploadPublic);
// Simpler endpoints using query param for publicId to avoid path-to-regexp issues
router.delete("/:id/files", deleteProductFile); // expects ?publicId=
router.put("/:id/files/replace", uploadProductAssets, replaceProductFile); // expects ?publicId=

export default router;


