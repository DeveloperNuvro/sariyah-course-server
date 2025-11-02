import asyncHandler from "express-async-handler";
import slugify from "slugify";
import Blog from "../models/blog.model.js";
import { generateBlogSitemap, generateRobotsTxt } from "../utils/seo.utils.js";

// Utility function to generate unique slug
const generateUniqueSlug = async (title, existingId = null) => {
  let baseSlug = slugify(title, { lower: true, strict: true });
  let slug = baseSlug;
  let counter = 1;

  while (true) {
    const query = { slug };
    if (existingId) {
      query._id = { $ne: existingId };
    }
    const existing = await Blog.findOne(query);
    if (!existing) {
      break;
    }
    slug = `${baseSlug}-${counter}`;
    counter++;
  }

  return slug;
};

// @desc    Create a new blog post
// @route   POST /api/blogs
// @access  Private/Admin
export const createBlog = asyncHandler(async (req, res) => {
  try {
    const {
      sanitizeString,
      sanitizeText,
      sanitizeStringArray,
      validateRequired,
      validateLength,
      validateObjectId,
    } = await import('../utils/validation.js');

    // Sanitize inputs
    const title = sanitizeString(req.body.title || '', 200);
    const content = sanitizeText(req.body.content || '', 50000);
    const excerpt = sanitizeText(req.body.excerpt || '', 500);
    const category = req.body.category ? String(req.body.category).trim() : '';
    const isPublished = req.body.isPublished === true || req.body.isPublished === 'true';

    // Required fields validation
    if (!title || !content) {
      res.status(400);
      throw new Error("Title and content are required");
    }

    // Validate title length
    if (!validateLength(title, 3, 200)) {
      res.status(400);
      throw new Error("Title must be between 3 and 200 characters");
    }

    // Generate unique slug
    const slug = await generateUniqueSlug(title);

    // SEO fields
    const metaTitle = req.body.metaTitle 
      ? sanitizeString(req.body.metaTitle, 60)
      : title.slice(0, 60);
    
    const metaDescription = req.body.metaDescription
      ? sanitizeString(req.body.metaDescription, 160)
      : (excerpt || content.slice(0, 160));

    const metaKeywords = sanitizeStringArray(
      Array.isArray(req.body.metaKeywords)
        ? req.body.metaKeywords
        : typeof req.body.metaKeywords === 'string'
          ? req.body.metaKeywords.split(',').map(k => k.trim())
          : [],
      50,
      20
    );

    const ogTitle = req.body.ogTitle
      ? sanitizeString(req.body.ogTitle, 95)
      : title.slice(0, 95);

    const ogDescription = req.body.ogDescription
      ? sanitizeString(req.body.ogDescription, 200)
      : (excerpt || metaDescription);

    // Featured image and OG image
    const featuredImage = typeof req.body.featuredImage === 'string' 
      ? req.body.featuredImage.trim() 
      : (req.files?.featuredImage?.[0]?.path || '');

    const ogImage = req.body.ogImage 
      ? sanitizeString(req.body.ogImage, 500)
      : featuredImage;

    // Canonical URL
    const canonicalUrl = req.body.canonicalUrl
      ? sanitizeString(req.body.canonicalUrl, 500)
      : '';

    // Tags
    const tags = sanitizeStringArray(
      Array.isArray(req.body.tags)
        ? req.body.tags
        : typeof req.body.tags === 'string'
          ? req.body.tags.split(',').map(t => t.trim())
          : [],
      50,
      30
    );

    // Validate category if provided
    if (category && !validateObjectId(category)) {
      res.status(400);
      throw new Error("Invalid category ID");
    }

    // Schema type
    const schemaType = ['Article', 'BlogPosting', 'NewsArticle'].includes(req.body.schemaType)
      ? req.body.schemaType
      : 'BlogPosting';

    const blog = await Blog.create({
      title,
      slug,
      content,
      excerpt,
      featuredImage,
      metaTitle,
      metaDescription,
      metaKeywords,
      ogImage,
      ogTitle,
      ogDescription,
      canonicalUrl,
      category: category || undefined,
      tags,
      author: req.user._id,
      isPublished,
      schemaType,
      publishedAt: isPublished ? new Date() : undefined,
    });

    const populatedBlog = await Blog.findById(blog._id)
      .populate('author', 'name email avatar')
      .populate('category', 'name');

    res.status(201).json({ 
      success: true, 
      data: populatedBlog 
    });
  } catch (e) {
    console.error('Create blog error', e);
    res.status(500).json({ 
      success: false, 
      message: e.message || 'Failed to create blog post' 
    });
  }
});

// @desc    Update a blog post
// @route   PUT /api/blogs/:id
// @access  Private/Admin
export const updateBlog = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const {
      sanitizeString,
      sanitizeText,
      sanitizeStringArray,
      validateLength,
      validateObjectId,
    } = await import('../utils/validation.js');

    const blog = await Blog.findById(id);
    if (!blog) {
      res.status(404);
      throw new Error("Blog post not found");
    }

    const updates = {};

    // Update title and regenerate slug if needed
    if (req.body.title) {
      const title = sanitizeString(req.body.title, 200);
      if (!validateLength(title, 3, 200)) {
        res.status(400);
        throw new Error("Title must be between 3 and 200 characters");
      }
      updates.title = title;
      updates.slug = await generateUniqueSlug(title, id);
    }

    if (req.body.content !== undefined) {
      updates.content = sanitizeText(req.body.content, 50000);
    }

    if (req.body.excerpt !== undefined) {
      updates.excerpt = sanitizeText(req.body.excerpt, 500);
    }

    // SEO fields
    if (req.body.metaTitle !== undefined) {
      updates.metaTitle = sanitizeString(req.body.metaTitle, 60);
    }
    if (req.body.metaDescription !== undefined) {
      updates.metaDescription = sanitizeString(req.body.metaDescription, 160);
    }
    if (req.body.metaKeywords !== undefined) {
      updates.metaKeywords = sanitizeStringArray(
        Array.isArray(req.body.metaKeywords)
          ? req.body.metaKeywords
          : typeof req.body.metaKeywords === 'string'
            ? req.body.metaKeywords.split(',').map(k => k.trim())
            : [],
        50,
        20
      );
    }
    if (req.body.ogTitle !== undefined) {
      updates.ogTitle = sanitizeString(req.body.ogTitle, 95);
    }
    if (req.body.ogDescription !== undefined) {
      updates.ogDescription = sanitizeString(req.body.ogDescription, 200);
    }
    if (req.body.canonicalUrl !== undefined) {
      updates.canonicalUrl = sanitizeString(req.body.canonicalUrl, 500);
    }

    // Images
    if (req.files?.featuredImage?.[0]?.path) {
      updates.featuredImage = req.files.featuredImage[0].path;
    } else if (req.body.featuredImage !== undefined) {
      updates.featuredImage = typeof req.body.featuredImage === 'string' 
        ? req.body.featuredImage.trim() 
        : '';
    }

    if (req.body.ogImage !== undefined) {
      updates.ogImage = sanitizeString(req.body.ogImage, 500);
    }

    // Tags
    if (req.body.tags !== undefined) {
      updates.tags = sanitizeStringArray(
        Array.isArray(req.body.tags)
          ? req.body.tags
          : typeof req.body.tags === 'string'
            ? req.body.tags.split(',').map(t => t.trim())
            : [],
        50,
        30
      );
    }

    // Category
    if (req.body.category !== undefined) {
      const category = String(req.body.category).trim();
      if (category && !validateObjectId(category)) {
        res.status(400);
        throw new Error("Invalid category ID");
      }
      updates.category = category || undefined;
    }

    // Publishing status
    if (req.body.isPublished !== undefined) {
      const isPublished = req.body.isPublished === true || req.body.isPublished === 'true';
      updates.isPublished = isPublished;
      if (isPublished && !blog.publishedAt) {
        updates.publishedAt = new Date();
      }
    }

    // Schema type
    if (req.body.schemaType !== undefined) {
      if (['Article', 'BlogPosting', 'NewsArticle'].includes(req.body.schemaType)) {
        updates.schemaType = req.body.schemaType;
      }
    }

    const updatedBlog = await Blog.findByIdAndUpdate(id, updates, { 
      new: true,
      runValidators: true 
    })
      .populate('author', 'name email avatar')
      .populate('category', 'name');

    if (!updatedBlog) {
      res.status(404);
      throw new Error("Blog post not found");
    }

    res.status(200).json({ 
      success: true, 
      data: updatedBlog 
    });
  } catch (e) {
    console.error('Update blog error', e);
    res.status(500).json({ 
      success: false, 
      message: e.message || 'Failed to update blog post' 
    });
  }
});

// @desc    Delete a blog post
// @route   DELETE /api/blogs/:id
// @access  Private/Admin
export const deleteBlog = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const blog = await Blog.findById(id);
  if (!blog) {
    res.status(404);
    throw new Error("Blog post not found");
  }
  await blog.deleteOne();
  res.status(200).json({ 
    success: true, 
    message: "Blog post deleted successfully" 
  });
});

// @desc    Get all published blog posts (public)
// @route   GET /api/blogs
// @access  Public
export const getBlogs = asyncHandler(async (req, res) => {
  const { 
    q, 
    category, 
    tag, 
    author, 
    page = 1, 
    limit = 12,
    sort = 'publishedAt'
  } = req.query;

  const query = { isPublished: true };

  // Text search
  if (q) {
    query.$text = { $search: q };
  }

  // Filter by category
  if (category) {
    query.category = category;
  }

  // Filter by tag
  if (tag) {
    query.tags = { $in: [tag] };
  }

  // Filter by author
  if (author) {
    query.author = author;
  }

  // Sort options
  let sortOption = {};
  switch (sort) {
    case 'title':
      sortOption = { title: 1 };
      break;
    case 'oldest':
      sortOption = { publishedAt: 1 };
      break;
    case 'popular':
      sortOption = { viewCount: -1 };
      break;
    default:
      sortOption = { publishedAt: -1 };
  }

  // Add text score for text search
  if (q && query.$text) {
    sortOption = { score: { $meta: 'textScore' }, ...sortOption };
  }

  const skip = (Number(page) - 1) * Number(limit);
  
  try {
    const [blogs, total] = await Promise.all([
      Blog.find(query)
        .select('-content') // Don't send full content in list view
        .sort(sortOption)
        .skip(skip)
        .limit(Number(limit))
        .populate('author', 'name email avatar')
        .populate('category', 'name'),
      Blog.countDocuments(query),
    ]);

    res.status(200).json({ 
      success: true, 
      data: blogs, 
      total, 
      page: Number(page), 
      pages: Math.ceil(total / Number(limit)) 
    });
  } catch (err) {
    // If text search fails (no index), fallback to regular search
    if (q && err.message?.includes('text index')) {
      delete query.$text;
      delete sortOption.score;
      
      const [blogs, total] = await Promise.all([
        Blog.find({
          ...query,
          $or: [
            { title: { $regex: q, $options: 'i' } },
            { excerpt: { $regex: q, $options: 'i' } }
          ]
        })
          .select('-content')
          .sort(sortOption)
          .skip(skip)
          .limit(Number(limit))
          .populate('author', 'name email avatar')
          .populate('category', 'name'),
        Blog.countDocuments({
          ...query,
          $or: [
            { title: { $regex: q, $options: 'i' } },
            { excerpt: { $regex: q, $options: 'i' } }
          ]
        }),
      ]);

      return res.status(200).json({ 
        success: true, 
        data: blogs, 
        total, 
        page: Number(page), 
        pages: Math.ceil(total / Number(limit)) 
      });
    }
    throw err;
  }
});

// @desc    Get blog post by slug (public)
// @route   GET /api/blogs/slug/:slug
// @access  Public
export const getBlogBySlug = asyncHandler(async (req, res) => {
  const { slug } = req.params;
  
  // Prevent conflict with admin routes
  if (slug === 'admin') {
    res.status(404);
    throw new Error("Not found");
  }
  
  const blog = await Blog.findOne({ slug, isPublished: true })
    .populate('author', 'name email avatar bio socialLinks')
    .populate('category', 'name slug');

  if (!blog) {
    res.status(404);
    throw new Error("Blog post not found");
  }

  // Increment view count
  blog.viewCount += 1;
  await blog.save({ validateBeforeSave: false });

  res.status(200).json({ 
    success: true, 
    data: blog 
  });
});

// @desc    Get blog post SEO data (for frontend)
// @route   GET /api/blogs/seo/:slug
// @access  Public
export const getBlogSEO = asyncHandler(async (req, res) => {
  const { slug } = req.params;
  
  // Prevent conflict with admin routes
  if (slug === 'admin') {
    res.status(404);
    throw new Error("Not found");
  }
  
  const blog = await Blog.findOne({ slug, isPublished: true })
    .select('title metaTitle metaDescription metaKeywords ogTitle ogDescription ogImage canonicalUrl featuredImage publishedAt author category schemaType')
    .populate('author', 'name')
    .populate('category', 'name');

  if (!blog) {
    res.status(404);
    throw new Error("Blog post not found");
  }

  // Generate structured data (JSON-LD)
  const baseUrl = process.env.FRONTEND_URL || 'https://www.sariyahtech.com';
  const blogUrl = `${baseUrl}/blog/${blog.slug}`;

  const structuredData = {
    "@context": "https://schema.org",
    "@type": blog.schemaType || "BlogPosting",
    "headline": blog.metaTitle || blog.title,
    "description": blog.metaDescription || blog.excerpt,
    "image": blog.ogImage || blog.featuredImage || `${baseUrl}/default-og-image.jpg`,
    "datePublished": blog.publishedAt?.toISOString(),
    "dateModified": blog.updatedAt?.toISOString(),
    "author": {
      "@type": "Person",
      "name": blog.author?.name || "Sariyah Tech"
    },
    "publisher": {
      "@type": "Organization",
      "name": "Sariyah Tech",
      "logo": {
        "@type": "ImageObject",
        "url": `${baseUrl}/logo.png`
      }
    },
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": blogUrl
    }
  };

  if (blog.category) {
    structuredData.articleSection = blog.category.name;
  }

  res.status(200).json({ 
    success: true, 
    data: {
      metaTitle: blog.metaTitle || blog.title,
      metaDescription: blog.metaDescription || blog.excerpt,
      metaKeywords: blog.metaKeywords || [],
      ogTitle: blog.ogTitle || blog.title,
      ogDescription: blog.ogDescription || blog.metaDescription || blog.excerpt,
      ogImage: blog.ogImage || blog.featuredImage || `${baseUrl}/default-og-image.jpg`,
      canonicalUrl: blog.canonicalUrl || blogUrl,
      structuredData,
      url: blogUrl
    }
  });
});

// @desc    Get all blog posts (admin)
// @route   GET /api/blogs/admin
// @access  Private/Admin
export const adminGetBlogs = asyncHandler(async (req, res) => {
  const { 
    q, 
    category, 
    tag, 
    author, 
    isPublished,
    page = 1, 
    limit = 20 
  } = req.query;

  const query = {};

  if (q) {
    query.$text = { $search: q };
  }
  if (category) {
    query.category = category;
  }
  if (tag) {
    query.tags = { $in: [tag] };
  }
  if (author) {
    query.author = author;
  }
  if (isPublished !== undefined) {
    query.isPublished = isPublished === 'true' || isPublished === true;
  }

  const skip = (Number(page) - 1) * Number(limit);
  let sortOption = q && query.$text 
    ? { score: { $meta: 'textScore' }, createdAt: -1 }
    : { createdAt: -1 };

  try {
    const [blogs, total] = await Promise.all([
      Blog.find(query)
        .sort(sortOption)
        .skip(skip)
        .limit(Number(limit))
        .populate('author', 'name email avatar')
        .populate('category', 'name'),
      Blog.countDocuments(query),
    ]);

    res.status(200).json({ 
      success: true, 
      data: blogs, 
      total, 
      page: Number(page), 
      pages: Math.ceil(total / Number(limit)) 
    });
  } catch (err) {
    // If text search fails (no index), fallback to regular search
    if (q && err.message?.includes('text index')) {
      delete query.$text;
      sortOption = { createdAt: -1 };
      
      const [blogs, total] = await Promise.all([
        Blog.find({
          ...query,
          $or: [
            { title: { $regex: q, $options: 'i' } },
            { excerpt: { $regex: q, $options: 'i' } }
          ]
        })
          .sort(sortOption)
          .skip(skip)
          .limit(Number(limit))
          .populate('author', 'name email avatar')
          .populate('category', 'name'),
        Blog.countDocuments({
          ...query,
          $or: [
            { title: { $regex: q, $options: 'i' } },
            { excerpt: { $regex: q, $options: 'i' } }
          ]
        }),
      ]);

      return res.status(200).json({ 
        success: true, 
        data: blogs, 
        total, 
        page: Number(page), 
        pages: Math.ceil(total / Number(limit)) 
      });
    }
    throw err;
  }
});

// @desc    Get blog post by ID (admin)
// @route   GET /api/blogs/admin/:id
// @access  Private/Admin
export const adminGetBlogById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const blog = await Blog.findById(id)
    .populate('author', 'name email avatar')
    .populate('category', 'name slug');

  if (!blog) {
    res.status(404);
    throw new Error("Blog post not found");
  }

  res.status(200).json({ 
    success: true, 
    data: blog 
  });
});

// @desc    Get related blog posts
// @route   GET /api/blogs/:slug/related
// @access  Public
export const getRelatedBlogs = asyncHandler(async (req, res) => {
  const { slug } = req.params;
  
  // Prevent conflict with admin routes
  if (slug === 'admin' || slug === 'sitemap.xml' || slug === 'robots.txt') {
    res.status(404);
    throw new Error("Not found");
  }
  
  const limit = Number(req.query.limit) || 4;

  const currentBlog = await Blog.findOne({ slug, isPublished: true });
  if (!currentBlog) {
    res.status(404);
    throw new Error("Blog post not found");
  }

  // Find related blogs by tags or category
  const query = {
    _id: { $ne: currentBlog._id },
    isPublished: true,
    $or: []
  };

  if (currentBlog.tags && currentBlog.tags.length > 0) {
    query.$or.push({ tags: { $in: currentBlog.tags } });
  }
  if (currentBlog.category) {
    query.$or.push({ category: currentBlog.category });
  }

  // If no tags or category, get recent blogs
  if (query.$or.length === 0) {
    delete query.$or;
  }

  const relatedBlogs = await Blog.find(query)
    .select('-content')
    .sort({ publishedAt: -1 })
    .limit(limit)
    .populate('author', 'name avatar')
    .populate('category', 'name');

  res.status(200).json({ 
    success: true, 
    data: relatedBlogs 
  });
});

// @desc    Generate blog sitemap XML
// @route   GET /api/blogs/sitemap.xml
// @access  Public
export const getBlogSitemap = asyncHandler(async (req, res) => {
  const blogs = await Blog.find({ isPublished: true, publishedAt: { $exists: true } })
    .select('slug updatedAt publishedAt')
    .sort({ publishedAt: -1 });

  const baseUrl = process.env.FRONTEND_URL || 'https://www.sariyahtech.com';
  const sitemap = await generateBlogSitemap(blogs, baseUrl);

  res.set('Content-Type', 'application/xml');
  res.status(200).send(sitemap);
});

// @desc    Generate robots.txt
// @route   GET /api/blogs/robots.txt
// @access  Public
export const getRobotsTxt = asyncHandler(async (req, res) => {
  const baseUrl = process.env.FRONTEND_URL || 'https://www.sariyahtech.com';
  const robotsTxt = generateRobotsTxt(baseUrl);

  res.set('Content-Type', 'text/plain');
  res.status(200).send(robotsTxt);
});

