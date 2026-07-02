import { Router } from "express";
import {
  getProfileController,
  updateAvatarController,
  updateProfileController,
} from "../controllers/user.controller";
import { verifyToken } from "../middlewares/auth.middleware";
import { upload } from "../middlewares/upload.middleware";
import { getMyAdminRequestController } from "../controllers/admin-request.controller";

const router = Router();

router.use(verifyToken);
router.get("/profile", getProfileController);
router.get("/me", getProfileController);
router.get("/admin-requests/status", getMyAdminRequestController);
router.put("/profile", updateProfileController);
router.put("/me", updateProfileController);
router.put("/avatar", upload.single("avatar"), updateAvatarController);
router.post("/avatar", upload.single("avatar"), updateAvatarController);

export default router;
