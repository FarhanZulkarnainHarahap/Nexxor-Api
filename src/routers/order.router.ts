import { Router } from "express";
import { Role } from "../../prisma/generated/prisma/client";
import {
  checkoutOrderController,
  getOrderDetailController,
  getOrdersController,
  updateOrderStatusController,
} from "../controllers/order.controller";
import { verifyToken } from "../middlewares/auth.middleware";
import { roleGuard } from "../middlewares/role.middleware";

const router = Router();

router.use(verifyToken);
router.get("/", getOrdersController);
router.get("/my", getOrdersController);
router.get("/:id", getOrderDetailController);
router.post("/", checkoutOrderController);
router.put("/:id/status", roleGuard(Role.ADMIN), updateOrderStatusController);

export default router;
