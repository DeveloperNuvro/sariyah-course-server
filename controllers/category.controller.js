// category.controller.js

import Category from "../models/category.model.js";
import Course from "../models/course.model.js"; // Needed for safe deletion check
import asyncHandler from "express-async-handler";
import slugify from "slugify";

/**
 * @desc    Create a new category
 * @route   POST /api/categories
 * @access  Private/Admin
 */
export const createCategory = asyncHandler(async (req, res) => {
  const { name } = req.body;

  // 1. Validation
  if (!name) {
    res.status(400);
    throw new Error("Category name is required");
  }

  // 2. Generate slug
  const slug = slugify(name, { lower: true, strict: true });

  // 3. Check for existing category with the same name or slug
  const categoryExists = await Category.findOne({ $or: [{ name }, { slug }] });
  if (categoryExists) {
    res.status(409); // Conflict
    throw new Error("A category with this name or slug already exists");
  }

  // 4. Create and save the new category
  const category = await Category.create({ name, slug });

  res.status(201).json({
    success: true,
    message: "Category created successfully",
    data: category,
  });
});

/**
 * @desc    Get all categories
 * @route   GET /api/categories
 * @access  Public
 */
export const getAllCategories = asyncHandler(async (req, res) => {
  const categories = await Category.find({}).sort({ name: "asc" });

  res.status(200).json({
    success: true,
    count: categories.length,
    data: categories,
  });
});

/**
 * @desc    Get a single category by its slug
 * @route   GET /api/categories/:slug
 * @access  Public
 */
export const getCategoryBySlug = asyncHandler(async (req, res) => {
  const category = await Category.findOne({ slug: req.params.slug });

  if (!category) {
    res.status(404);
    throw new Error("Category not found");
  }

  res.status(200).json({
    success: true,
    data: category,
  });
});

/**
 * @desc    Update a category
 * @route   PUT /api/categories/:id
 * @access  Private/Admin
 */
export const updateCategory = asyncHandler(async (req, res) => {
  const { name } = req.body;
  const categoryId = req.params.id;

  // 1. Find the category to be updated
  let category = await Category.findById(categoryId);
  if (!category) {
    res.status(404);
    throw new Error("Category not found");
  }

  // 2. Prepare updates
  const updates = {};
  if (name) {
    updates.name = name;
    updates.slug = slugify(name, { lower: true, strict: true });

    // 3. Check for conflict with another category
    const existingCategory = await Category.findOne({
      $or: [{ name: updates.name }, { slug: updates.slug }],
      _id: { $ne: categoryId }, // Exclude the current category from the check
    });

    if (existingCategory) {
      res.status(409);
      throw new Error("Another category with this name or slug already exists");
    }
  }

  // 4. Perform the update
  const updatedCategory = await Category.findByIdAndUpdate(categoryId, updates, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({
    success: true,
    message: "Category updated successfully",
    data: updatedCategory,
  });
});

/**
 * @desc    Delete a category
 * @route   DELETE /api/categories/:id
 * @access  Private/Admin
 */
export const deleteCategory = asyncHandler(async (req, res) => {
  const categoryId = req.params.id;

  const category = await Category.findById(categoryId);

  if (!category) {
    res.status(404);
    throw new Error("Category not found");
  }

  // **Important Safety Check**: Check if any courses are using this category
  const coursesInCategory = await Course.findOne({ category: categoryId });
  if (coursesInCategory) {
    res.status(400);
    throw new Error("Cannot delete category. It is currently in use by one or more courses.");
  }

  await category.deleteOne();

  res.status(200).json({
    success: true,
    message: "Category deleted successfully",
  });
});