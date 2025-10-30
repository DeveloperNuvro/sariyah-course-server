import asyncHandler from "express-async-handler";
import Cart from "../models/cart.model.js";
import Product from "../models/product.model.js";

function computeSubtotal(items) {
  return items.reduce((sum, it) => sum + it.price * it.quantity, 0);
}

export const getMyCart = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const cart = await Cart.findOne({ user: userId }).populate({ path: "items.product", select: "title slug thumbnail price discountPrice" });
  if (!cart) return res.status(200).json({ success: true, data: { items: [], subtotal: 0 } });
  res.status(200).json({ success: true, data: cart });
});

export const addToCart = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { productId, quantity = 1 } = req.body;
  if (!productId) {
    res.status(400);
    throw new Error("productId is required");
  }

  const product = await Product.findById(productId);
  if (!product || !product.isPublished) {
    res.status(404);
    throw new Error("Product not found");
  }

  const price = product.discountPrice > 0 ? product.discountPrice : product.price;
  let cart = await Cart.findOne({ user: userId });
  if (!cart) {
    cart = await Cart.create({ user: userId, items: [], subtotal: 0 });
  }

  const existing = cart.items.find((it) => it.product.toString() === productId);
  if (existing) {
    existing.quantity += Number(quantity);
  } else {
    cart.items.push({ product: product._id, quantity: Number(quantity), price });
  }
  cart.subtotal = computeSubtotal(cart.items);
  await cart.save();
  const populated = await cart.populate({ path: "items.product", select: "title slug thumbnail price discountPrice" });
  res.status(200).json({ success: true, data: populated });
});

export const updateCartItem = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { productId, quantity } = req.body;
  if (!productId || quantity === undefined) {
    res.status(400);
    throw new Error("productId and quantity are required");
  }

  const cart = await Cart.findOne({ user: userId });
  if (!cart) {
    res.status(404);
    throw new Error("Cart not found");
  }

  const item = cart.items.find((it) => it.product.toString() === productId);
  if (!item) {
    res.status(404);
    throw new Error("Item not found in cart");
  }

  item.quantity = Math.max(1, Number(quantity));
  cart.subtotal = computeSubtotal(cart.items);
  await cart.save();
  const populated = await cart.populate({ path: "items.product", select: "title slug thumbnail price discountPrice" });
  res.status(200).json({ success: true, data: populated });
});

export const removeFromCart = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { productId } = req.params;
  const cart = await Cart.findOne({ user: userId });
  if (!cart) {
    res.status(404);
    throw new Error("Cart not found");
  }
  cart.items = cart.items.filter((it) => it.product.toString() !== productId);
  cart.subtotal = computeSubtotal(cart.items);
  await cart.save();
  const populated = await cart.populate({ path: "items.product", select: "title slug thumbnail price discountPrice" });
  res.status(200).json({ success: true, data: populated });
});

export const clearCart = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const cart = await Cart.findOne({ user: userId });
  if (!cart) return res.status(200).json({ success: true, data: { items: [], subtotal: 0 } });
  cart.items = [];
  cart.subtotal = 0;
  await cart.save();
  res.status(200).json({ success: true, data: cart });
});


