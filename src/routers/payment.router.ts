import { Router } from "express";
import {
  createXenditPaymentController,
  getPaymentStatusController,
  xenditWebhookController,
} from "../controllers/payment.controller";
import { verifyToken } from "../middlewares/auth.middleware";

const router = Router();

router.post("/xendit/create", verifyToken, createXenditPaymentController);
router.post("/xendit/webhook", xenditWebhookController);
router.get("/:orderId/status", verifyToken, getPaymentStatusController);

export default router;
