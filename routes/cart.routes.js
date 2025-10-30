import express from "express";
import { protect, authorize } from "../middleware/auth.middleware.js";
import { getMyCart, addToCart, updateCartItem, removeFromCart, clearCart } from "../controllers/cart.controller.js";

const router = express.Router();

router.use(protect, authorize("student"));

router.get("/", getMyCart);
router.post("/add", addToCart);
router.patch("/update", updateCartItem);
router.delete("/remove/:productId", removeFromCart);
router.delete("/clear", clearCart);

export default router;


