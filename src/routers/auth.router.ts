import { Router } from "express";
import {
  getMeController,
  loginController,
  registerController,
} from "../controllers/auth.controller";
import { verifyToken } from "../middlewares/auth.middleware";

const router = Router();

router.post("/register", registerController);
router.post("/login", loginController);
router.get("/me", verifyToken, getMeController);

export default router;
