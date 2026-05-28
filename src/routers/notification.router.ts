import { Router } from "express";
import {
  getNotificationsController,
  markAllNotificationsReadController,
  markNotificationReadController,
} from "../controllers/notification.controller";
import { verifyToken } from "../middlewares/auth.middleware";

const router = Router();

router.use(verifyToken);
router.get("/", getNotificationsController);
router.put("/read-all", markAllNotificationsReadController);
router.put("/:id/read", markNotificationReadController);

export default router;
