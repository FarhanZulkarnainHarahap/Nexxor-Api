import { Router } from "express";
import {
  createAdminRequestController,
  getMyAdminRequestController,
} from "../controllers/admin-request.controller";
import { verifyToken } from "../middlewares/auth.middleware";

const router = Router();

router.use(verifyToken);
router.post("/", createAdminRequestController);
router.get("/my-request", getMyAdminRequestController);

export default router;
