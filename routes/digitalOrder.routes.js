import express from "express";
import { protect, authorize } from "../middleware/auth.middleware.js";
import { checkoutFromCart, myDigitalOrders, getDigitalOrder, adminListDigitalOrders, adminMarkPaid, getDownloadLinks } from "../controllers/digitalOrder.controller.js";

const router = express.Router();

router.use(protect);

router.post("/checkout", authorize("student"), checkoutFromCart);
router.get("/my", authorize("student"), myDigitalOrders);
router.get("/:id", getDigitalOrder);
router.get("/:id/downloads", getDownloadLinks);

router.get("/", authorize("admin"), adminListDigitalOrders);
router.patch("/:id/status", authorize("admin"), adminMarkPaid);

export default router;


