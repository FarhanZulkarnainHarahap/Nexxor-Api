import { Router } from "express";
import {
  getProfileController,
  updateAvatarController,
  updateProfileController,
} from "../controllers/user.controller";
import { verifyToken } from "../middlewares/auth.middleware";
import { upload } from "../middlewares/upload.middleware";

const router = Router();

router.use(verifyToken);
router.get("/profile", getProfileController);
router.put("/profile", updateProfileController);
router.put("/avatar", upload.single("avatar"), updateAvatarController);

export default router;
