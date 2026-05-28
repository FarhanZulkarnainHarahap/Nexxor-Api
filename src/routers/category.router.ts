import { Router } from "express";
import { Role } from "../../prisma/generated/prisma/client";
import {
  createCategoryController,
  deleteCategoryController,
  getCategoriesController,
  updateCategoryController,
} from "../controllers/category.controller";
import { verifyToken } from "../middlewares/auth.middleware";
import { roleGuard } from "../middlewares/role.middleware";

const router = Router();

router.get("/", getCategoriesController);
router.post("/", verifyToken, roleGuard(Role.ADMIN), createCategoryController);
router.put("/:id", verifyToken, roleGuard(Role.ADMIN), updateCategoryController);
router.delete("/:id", verifyToken, roleGuard(Role.ADMIN), deleteCategoryController);

export default router;
