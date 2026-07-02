import { Router } from "express";
import {
  getMeController,
  loginController,
  registerController,
  resendVerificationController,
  verifyEmailController,
} from "../controllers/auth.controller";
import { verifyToken } from "../middlewares/auth.middleware";

const router = Router();

router.post("/register", registerController);
router.post("/login", loginController);
router.post("/verify-email", verifyEmailController);
router.get("/verify-email", verifyEmailController);
router.post("/resend-verification", resendVerificationController);
router.get("/me", verifyToken, getMeController);
router.post("/logout", verifyToken, (_req, res) => {
  return res.status(200).json({
    success: true,
    message: "Logout successful",
    data: null,
  });
});

export default router;
