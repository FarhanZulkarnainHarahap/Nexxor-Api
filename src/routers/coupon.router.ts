import { Router } from "express";
import { Role } from "../../prisma/generated/prisma/client";
import {
  createCouponController,
  deleteCouponController,
  getCouponsController,
  updateCouponController,
  validateCouponController,
} from "../controllers/coupon.controller";
import { verifyToken } from "../middlewares/auth.middleware";
import { roleGuard } from "../middlewares/role.middleware";

const router = Router();

router.get("/", verifyToken, getCouponsController);
router.post("/validate", verifyToken, validateCouponController);
router.post("/", verifyToken, roleGuard(Role.ADMIN), createCouponController);
router.put("/:id", verifyToken, roleGuard(Role.ADMIN), updateCouponController);
router.delete("/:id", verifyToken, roleGuard(Role.ADMIN), deleteCouponController);

export default router;
