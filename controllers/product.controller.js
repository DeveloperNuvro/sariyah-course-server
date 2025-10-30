import asyncHandler from "express-async-handler";
import slugify from "slugify";
import Product from "../models/product.model.js";
import cloudinary from "../config/cloudinary.js";

export const createProduct = asyncHandler(async (req, res) => {
  try {
    const { title, description, price, discountPrice, category, isPublished } = req.body;

  if (!title || price === undefined) {
    res.status(400);
    throw new Error("Title and price are required");
  }

  const slug = slugify(title, { lower: true, strict: true });
  const exists = await Product.findOne({ slug });
  if (exists) {
    res.status(409);
    throw new Error("A product with a similar title already exists");
  }

  // Build thumbnail from upload if provided (multer fields => req.files.thumbnail[0])
  let thumbnailUrl = '';
  const uploadedThumb = req.files?.thumbnail?.[0];
  if (uploadedThumb?.path && typeof uploadedThumb.path === 'string') {
    thumbnailUrl = uploadedThumb.path;
  } else if (typeof req.body.thumbnail === 'string' && req.body.thumbnail.trim().length > 0) {
    thumbnailUrl = req.body.thumbnail.trim();
  }

  // Build files array from uploads (multer fields => req.files.files)
  let filesArray = [];
  const uploadedFiles = req.files?.files;
  if (Array.isArray(uploadedFiles) && uploadedFiles.length > 0) {
    filesArray = uploadedFiles.map((f) => ({
      name: f.originalname || f.filename,
      url: f.path,
      sizeBytes: typeof f.size === 'number' ? f.size : 0,
      format: (f.mimetype?.split('/')?.[1] || f.format || '').toLowerCase(),
      publicId: f.filename || '',
      resourceType: 'raw',
    }));
  } else if (Array.isArray(req.body.files)) {
    filesArray = req.body.files;
  }

  // Normalize tags from either tags (string or array) or tags[] from multipart form
  let incomingTags = req.body.tags;
  if (!incomingTags && req.body["tags[]"]) {
    incomingTags = req.body["tags[]"]; // could be string or array
  }
  const tagsArray = Array.isArray(incomingTags)
    ? incomingTags.map((t) => String(t).trim()).filter(Boolean)
    : typeof incomingTags === 'string'
      ? incomingTags.split(',').map((t) => t.trim()).filter(Boolean)
      : [];

  const product = await Product.create({
    title,
    slug,
    description,
    price,
    discountPrice: discountPrice || 0,
    thumbnail: thumbnailUrl,
    files: filesArray,
    category,
    tags: tagsArray,
    isPublished: !!isPublished,
    createdBy: req.user?._id,
  });

  res.status(201).json({ success: true, data: product });
  } catch (e) {
    console.error('Create product error', e);
    res.status(500).json({ success: false, message: e.message || 'Failed to create product' });
  }
});

export const updateProduct = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const updates = { ...req.body };
    if (updates.title) {
      updates.slug = slugify(updates.title, { lower: true, strict: true });
    }

  // If new thumbnail uploaded or provided as non-empty string
  const newThumb = req.files?.thumbnail?.[0];
  if (newThumb?.path && typeof newThumb.path === 'string') {
    updates.thumbnail = newThumb.path;
  } else if (typeof updates.thumbnail === 'string') {
    updates.thumbnail = updates.thumbnail.trim();
    if (updates.thumbnail.length === 0) {
      delete updates.thumbnail;
    }
  } else {
    delete updates.thumbnail;
  }
  // Normalize tags on update
  if (updates.tags === undefined && updates["tags[]"] !== undefined) {
    updates.tags = updates["tags[]"];
    delete updates["tags[]"];
  }
  if (typeof updates.tags === 'string') {
    updates.tags = updates.tags.split(',').map((t) => t.trim()).filter(Boolean);
  } else if (Array.isArray(updates.tags)) {
    updates.tags = updates.tags.map((t) => String(t).trim()).filter(Boolean);
  }

  // If new files uploaded, append to existing list
  const newFiles = req.files?.files;
  if (Array.isArray(newFiles) && newFiles.length > 0) {
    const uploaded = newFiles.map((f) => ({
      name: f.originalname || f.filename,
      url: f.path,
      sizeBytes: typeof f.size === 'number' ? f.size : 0,
      format: (f.mimetype?.split('/')?.[1] || f.format || '').toLowerCase(),
      publicId: f.filename || '',
      resourceType: 'raw',
    }));
    updates.$push = { files: { $each: uploaded } };
  }

    const product = await Product.findByIdAndUpdate(id, updates, { new: true });
    if (!product) {
      res.status(404);
      throw new Error("Product not found");
    }
    res.status(200).json({ success: true, data: product });
  } catch (e) {
    console.error('Update product error', e);
    res.status(500).json({ success: false, message: e.message || 'Failed to update product' });
  }
});

export const deleteProduct = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const product = await Product.findById(id);
  if (!product) {
    res.status(404);
    throw new Error("Product not found");
  }
  await product.deleteOne();
  res.status(200).json({ success: true, message: "Product deleted" });
});

export const deleteProductFile = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const publicId = req.params.publicId || req.query.publicId;
  const product = await Product.findById(id);
  if (!product) {
    res.status(404);
    throw new Error("Product not found");
  }

  const beforeCount = product.files.length;
  const file = product.files.find((f) => (f.publicId || '') === publicId);
  product.files = product.files.filter((f) => (f.publicId || '') !== publicId);
  await product.save();

  // Try to delete from Cloudinary if we know the publicId
  if (file) {
    try {
      // Attempt both types, upload first then authenticated
      await cloudinary.uploader.destroy(publicId, { resource_type: 'raw', type: 'upload' });
    } catch {}
    try {
      await cloudinary.uploader.destroy(publicId, { resource_type: 'raw', type: 'authenticated' });
    } catch {}
  }

  res.json({ success: true, removed: beforeCount - product.files.length });
});

export const replaceProductFile = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const publicId = req.params.publicId || req.query.publicId;
  const product = await Product.findById(id);
  if (!product) {
    res.status(404);
    throw new Error("Product not found");
  }

  const incoming = req.files?.files?.[0];
  if (!incoming) {
    res.status(400);
    throw new Error("No replacement file uploaded");
  }

  // Upload already handled by multer-storage-cloudinary. Build replacement entry
  const replacement = {
    name: incoming.originalname || incoming.filename,
    url: incoming.path,
    sizeBytes: typeof incoming.size === 'number' ? incoming.size : 0,
    format: (incoming.mimetype?.split('/')?.[1] || incoming.format || '').toLowerCase(),
    publicId: incoming.filename || '',
    resourceType: 'raw',
  };

  // Replace matching file
  let replaced = false;
  product.files = product.files.map((f) => {
    if ((f.publicId || '') === publicId) {
      replaced = true;
      return replacement;
    }
    return f;
  });

  if (!replaced) {
    // if not found, append
    product.files.push(replacement);
  }

  await product.save();

  // Best-effort delete old asset
  try { await cloudinary.uploader.destroy(publicId, { resource_type: 'raw', type: 'upload' }); } catch {}
  try { await cloudinary.uploader.destroy(publicId, { resource_type: 'raw', type: 'authenticated' }); } catch {}

  res.json({ success: true, data: product });
});

export const getProducts = asyncHandler(async (req, res) => {
  const { q, category, page = 1, limit = 12 } = req.query;
  const query = { };
  if (q) {
    query.$text = { $search: q };
  }
  if (category) {
    query.category = category;
  }
  query.isPublished = true;

  const skip = (Number(page) - 1) * Number(limit);
  const [items, total] = await Promise.all([
    Product.find(query).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
    Product.countDocuments(query),
  ]);

  res.status(200).json({ success: true, data: items, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
});

export const getProductBySlug = asyncHandler(async (req, res) => {
  const { slug } = req.params;
  const product = await Product.findOne({ slug, isPublished: true }).populate("category", "name");
  if (!product) {
    res.status(404);
    throw new Error("Product not found");
  }
  res.status(200).json({ success: true, data: product });
});

export const adminListProducts = asyncHandler(async (req, res) => {
  const items = await Product.find({}).sort({ createdAt: -1 }).populate("category", "name");
  res.status(200).json({ success: true, data: items });
});

export const adminGetProductById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const product = await Product.findById(id).populate("category", "name");
  if (!product) {
    res.status(404);
    throw new Error("Product not found");
  }
  res.status(200).json({ success: true, data: product });
});


export const migrateProductFilesToPublic = asyncHandler(async (req, res) => {
  const products = await Product.find({ "files.0": { $exists: true } });
  let updatedCount = 0;

  for (const product of products) {
    let changed = false;
    const newFiles = [];

    for (const f of product.files) {
      const isAuthenticatedUrl = typeof f.url === 'string' && f.url.includes('/authenticated/');
      if (!isAuthenticatedUrl) {
        newFiles.push(f);
        continue;
      }

      // Derive publicId
      let publicId = f.publicId || '';
      if (!publicId && typeof f.url === 'string') {
        // Extract publicId including folders: everything after /v12345/
        const match = f.url.match(/\/v\d+\/(.+?)(?:\?.*)?$/);
        if (match) publicId = decodeURIComponent(match[1]);
      }
      if (!publicId) {
        newFiles.push(f);
        continue;
      }

      try {
        // Move from authenticated -> upload (public)
        const result = await cloudinary.uploader.rename(publicId, publicId, {
          resource_type: 'raw',
          from_type: 'authenticated',
          to_type: 'upload',
          overwrite: true,
        });

        const newUrl = result.secure_url || result.url || cloudinary.url(publicId, {
          resource_type: 'raw',
          type: 'upload',
          secure: true,
        });

        newFiles.push({
          ...f.toObject?.() || f,
          url: newUrl,
          publicId: publicId,
          resourceType: 'raw',
        });
        changed = true;
      } catch (e) {
        console.error('Failed migrating file', publicId, e?.message || e);
        newFiles.push(f);
      }
    }

    if (changed) {
      product.files = newFiles;
      await product.save();
      updatedCount += 1;
    }
  }

  res.json({ success: true, updated: updatedCount });
});

export const migrateProductFilesReuploadPublic = asyncHandler(async (req, res) => {
  const products = await Product.find({ "files.0": { $exists: true } });
  let updatedCount = 0;

  for (const product of products) {
    let changed = false;
    const newFiles = [];

    for (const f of product.files) {
      const isAuthenticatedUrl = typeof f.url === 'string' && f.url.includes('/authenticated/');
      if (!isAuthenticatedUrl) {
        newFiles.push(f);
        continue;
      }

      let publicId = f.publicId || '';
      if (!publicId && typeof f.url === 'string') {
        const match = f.url.match(/\/v\d+\/(.+?)(?:\?.*)?$/);
        if (match) publicId = decodeURIComponent(match[1]);
      }
      if (!publicId) {
        newFiles.push(f);
        continue;
      }

      try {
        // 1) Get a short-lived signed download URL for the authenticated asset
        const signedUrl = cloudinary.utils.private_download_url(publicId, null, {
          resource_type: 'raw',
          type: 'authenticated',
          expires_at: Math.floor(Date.now() / 1000) + 60, // 60s
          attachment: false,
        });

        // 2) Fetch bytes
        const resp = await fetch(signedUrl);
        if (!resp.ok) throw new Error(`Fetch failed ${resp.status}`);
        const arrayBuffer = await resp.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // 3) Upload as PUBLIC raw upload into same folder
        const uploadResult = await new Promise((resolve, reject) => {
          const opts = {
            resource_type: 'raw',
            type: 'upload',
            folder: 'lms/products/files',
            public_id: publicId, // reuse id to keep stable URLs if possible
            overwrite: true,
          };
          const stream = cloudinary.uploader.upload_stream(opts, (err, result) => {
            if (err) return reject(err);
            resolve(result);
          });
          stream.end(buffer);
        });

        const newUrl = uploadResult.secure_url || uploadResult.url;
        newFiles.push({
          ...f.toObject?.() || f,
          url: newUrl,
          publicId: uploadResult.public_id || publicId,
          resourceType: 'raw',
        });
        changed = true;
      } catch (e) {
        console.error('Reupload migration failed for', publicId, e?.message || e);
        newFiles.push(f);
      }
    }

    if (changed) {
      product.files = newFiles;
      await product.save();
      updatedCount += 1;
    }
  }

  res.json({ success: true, updated: updatedCount });
});

export const productFilePreviewRedirect = asyncHandler(async (req, res) => {
  const { publicId } = req.params;
  // Find the file by publicId to detect its current URL type (authenticated vs upload)
  const product = await Product.findOne({ 'files.publicId': publicId }, { 'files.$': 1 });
  let targetUrl = '';
  if (product && product.files && product.files[0]) {
    const f = product.files[0];
    const isAuthenticated = typeof f.url === 'string' && f.url.includes('/authenticated/');
    if (isAuthenticated) {
      // Create short-lived SIGNED DELIVERY URL (not private_download_url) to allow inline preview
      targetUrl = cloudinary.url(publicId, {
        resource_type: 'raw',
        type: 'authenticated',
        sign_url: true,
        expires_at: Math.floor(Date.now() / 1000) + 60,
        secure: true,
      });
    } else {
      // Public upload raw URL
      targetUrl = f.url || cloudinary.url(publicId, { resource_type: 'raw', type: 'upload', secure: true });
    }
  } else {
    // Fallback to public raw upload URL if file record not found
    targetUrl = cloudinary.url(publicId, { resource_type: 'raw', type: 'upload', secure: true });
  }

  // Add fragment to hint page 1 only (client may ignore, but UI hides toolbar)
  if (!targetUrl.includes('#')) {
    targetUrl = `${targetUrl}#page=1`;
  }
  res.redirect(302, targetUrl);
});
