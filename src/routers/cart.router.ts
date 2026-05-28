import { Router } from "express";
import {
  addToCartController,
  clearCartController,
  getCartController,
  removeCartItemController,
  updateCartItemController,
} from "../controllers/cart.controller";
import { verifyToken } from "../middlewares/auth.middleware";

const router = Router();

router.use(verifyToken);
router.get("/", getCartController);
router.post("/", addToCartController);
router.put("/:itemId", updateCartItemController);
router.delete("/:itemId", removeCartItemController);
router.delete("/", clearCartController);

export default router;
