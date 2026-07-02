import { Router } from "express";
import { Role } from "../../prisma/generated/prisma/client";
import {
  approveAdminRequestController,
  getAdminRequestsController,
  rejectAdminRequestController,
} from "../controllers/admin-request.controller";
import {
  getAdminDashboardController,
  getAdminTransactionsController,
} from "../controllers/admin.controller";
import { updateOrderStatusController } from "../controllers/order.controller";
import { verifyToken } from "../middlewares/auth.middleware";
import { roleGuard } from "../middlewares/role.middleware";

const router = Router();

router.use(verifyToken, roleGuard(Role.ADMIN));
router.get("/dashboard", getAdminDashboardController);
router.get("/transactions", getAdminTransactionsController);
router.get("/admin-requests", getAdminRequestsController);
router.patch("/admin-requests/:id/approve", approveAdminRequestController);
router.patch("/admin-requests/:id/reject", rejectAdminRequestController);
router.patch("/orders/:id/status", updateOrderStatusController);

export default router;
