import asyncHandler from "express-async-handler";
import crypto from "crypto";
import Cart from "../models/cart.model.js";
import DigitalOrder from "../models/digitalOrder.model.js";
import Product from "../models/product.model.js";
import User from "../models/user.model.js";
import cloudinary from "../config/cloudinary.js";
import { sendProductPurchaseConfirmation } from "../services/email.service.js";

function generateToken() {
  return crypto.randomBytes(24).toString("hex");
}

export const checkoutFromCart = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { paymentMethod, transactionId, buyerInfo } = req.body;

  const cart = await Cart.findOne({ user: userId }).populate({ path: "items.product" });
  if (!cart || cart.items.length === 0) {
    res.status(400);
    throw new Error("Cart is empty");
  }

  const items = cart.items.map((it) => ({
    product: it.product._id,
    price: it.price,
    titleSnapshot: it.product.title,
  }));
  const amount = cart.subtotal;

  if (amount === 0) {
    // free order flow
    const order = await DigitalOrder.create({
      user: userId,
      items,
      amount: 0,
      paymentMethod: "free",
      paymentStatus: "paid",
      transactionId: `free_${userId}_${Date.now()}`,
      buyerInfo: buyerInfo || undefined,
    });
    // Create download tokens
    const tokens = items.map((it) => ({ product: it.product, token: generateToken(), expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7) }));
    order.downloadTokens = tokens;
    await order.save();
    
    // Send confirmation email (async, don't block response)
    try {
      const user = await User.findById(userId).select('name email');
      if (user && user.email) {
        const emailItems = items.map(item => ({
          title: item.titleSnapshot || 'Product',
          price: item.price || 0,
        }));
        
        await sendProductPurchaseConfirmation({
          email: user.email,
          name: user.name,
          items: emailItems,
          totalAmount: 0,
          orderId: order._id.toString(),
        });
      }
    } catch (emailError) {
      console.error('Error sending product purchase confirmation email:', emailError);
      // Don't fail the request if email fails
    }
    
    // clear cart
    cart.items = [];
    cart.subtotal = 0;
    await cart.save();
    return res.status(201).json({ success: true, data: order });
  }

  if (!paymentMethod || !transactionId) {
    res.status(400);
    throw new Error("paymentMethod and transactionId are required for paid orders");
  }

  const order = await DigitalOrder.create({
    user: userId,
    items,
    amount,
    paymentMethod,
    paymentStatus: "pending",
    transactionId,
    buyerInfo: buyerInfo || undefined,
  });

  // do not clear cart until payment is marked as paid; keep for convenience
  res.status(201).json({ success: true, data: order });
});

export const myDigitalOrders = asyncHandler(async (req, res) => {
  const orders = await DigitalOrder.find({ user: req.user._id })
    .populate({ path: "items.product", select: "title slug thumbnail" })
    .sort({ createdAt: -1 });
  res.status(200).json({ success: true, data: orders });
});

export const getDigitalOrder = asyncHandler(async (req, res) => {
  const order = await DigitalOrder.findById(req.params.id)
    .populate("user", "name email")
    .populate({ path: "items.product", select: "title slug thumbnail files" });
  if (!order) {
    res.status(404);
    throw new Error("Order not found");
  }
  if (order.user._id.toString() !== req.user.id && req.user.role !== "admin") {
    res.status(403);
    throw new Error("Not authorized");
  }
  res.status(200).json({ success: true, data: order });
});

export const adminListDigitalOrders = asyncHandler(async (req, res) => {
  const orders = await DigitalOrder.find({})
    .populate("user", "name email")
    .populate({ path: "items.product", select: "title" })
    .sort({ createdAt: -1 });
  res.status(200).json({ success: true, data: orders });
});

export const adminMarkPaid = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { paymentStatus, transactionId } = req.body;
  const order = await DigitalOrder.findById(id);
  if (!order) {
    res.status(404);
    throw new Error("Order not found");
  }
  // Store previous status to check if it changed
  const previousStatus = order.paymentStatus;
  
  // Update status
  if (paymentStatus) {
    order.paymentStatus = paymentStatus;
  }
  if (transactionId) order.transactionId = transactionId;

  // generate tokens only when marking as paid
  if (order.paymentStatus === "paid") {
    const tokens = order.items.map((it) => ({ product: it.product, token: generateToken(), expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7) }));
    order.downloadTokens = tokens;
    
    // Send confirmation email only if status changed to paid (not already paid)
    if (previousStatus !== "paid") {
      try {
        const populatedOrder = await DigitalOrder.findById(order._id)
          .populate('user', 'name email');
        
        if (populatedOrder && populatedOrder.user && populatedOrder.user.email) {
          const emailItems = order.items.map(item => ({
            title: item.titleSnapshot || 'Product',
            price: item.price || 0,
          }));
          
          await sendProductPurchaseConfirmation({
            email: populatedOrder.user.email,
            name: populatedOrder.user.name,
            items: emailItems,
            totalAmount: order.amount,
            orderId: order._id.toString(),
          });
        }
      } catch (emailError) {
        console.error('Error sending product purchase confirmation email:', emailError);
        // Don't fail the request if email fails
      }
    }
  } else {
    order.downloadTokens = [];
  }
  
  await order.save();
  res.status(200).json({ success: true, data: order });
});

export const getDownloadLinks = asyncHandler(async (req, res) => {
  const { id } = req.params; // order id
  const order = await DigitalOrder.findById(id).populate({ path: "items.product", select: "files title" });
  if (!order) {
    res.status(404);
    throw new Error("Order not found");
  }
  if (order.user.toString() !== req.user._id.toString() && req.user.role !== "admin") {
    res.status(403);
    throw new Error("Not authorized");
  }
  if (order.paymentStatus !== "paid") {
    return res.status(403).json({ success: false, message: "Order is not paid" });
  }

  // For now, return direct file URLs with token metadata (client can display and download directly)
  // Future: proxy downloads via server to enforce token limits
  const links = order.items.map((it) => {
    const token = order.downloadTokens.find((t) => t.product.toString() === it.product._id.toString());
    // Build signed URLs for files uploaded to Cloudinary (raw resources)
    const signedFiles = (it.product.files || []).map((f) => {
      const original = f.toObject?.() || f;
      const urlStr = String(original.url || '');
      const isAuthenticated = urlStr.includes('/authenticated/');

      // Determine publicId reliably
      let publicId = original.publicId;
      if (!publicId) {
        const m = urlStr.match(/\/v\d+\/(.+)$/); // capture everything after /v12345/
        if (m && m[1]) {
          publicId = decodeURIComponent(m[1].split('?')[0]);
        }
      }

      if (isAuthenticated && publicId) {
        const secureUrl = cloudinary.url(publicId, {
          resource_type: 'raw',
          type: 'authenticated',
          sign_url: true,
          expires_at: Math.floor(Date.now() / 1000) + 60 * 15,
        });
        return { ...original, url: secureUrl, publicId };
      }
      // Already public or missing info: return as-is
      return { ...original, publicId };
    });
    return {
      productId: it.product._id,
      title: it.product.title,
      files: signedFiles,
      token: token?.token,
      expiresAt: token?.expiresAt,
      remaining: token ? Math.max(0, (token.maxDownloads || 5) - (token.downloads || 0)) : 0,
    };
  });
  res.status(200).json({ success: true, data: links });
});


