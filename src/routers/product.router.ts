import { Router } from "express";
import { Role } from "../../prisma/generated/prisma/client";
import {
  createProductController,
  deleteProductController,
  getProductDetailController,
  getProductsController,
  updateProductController,
} from "../controllers/product.controller";
import { verifyToken } from "../middlewares/auth.middleware";
import { roleGuard } from "../middlewares/role.middleware";
import { upload } from "../middlewares/upload.middleware";

const router = Router();

router.get("/", getProductsController);
router.get("/:slug", getProductDetailController);
router.post("/", verifyToken, roleGuard(Role.ADMIN), upload.single("image"), createProductController);
router.put("/:id", verifyToken, roleGuard(Role.ADMIN), upload.single("image"), updateProductController);
router.delete("/:id", verifyToken, roleGuard(Role.ADMIN), deleteProductController);

export default router;
