import { Router } from "express";
import {
  calculateShippingCostController,
  searchShippingDestinationController,
} from "../controllers/shipping.controller";
import { verifyToken } from "../middlewares/auth.middleware";

const router = Router();

router.use(verifyToken);
router.get("/destinations", searchShippingDestinationController);
router.post("/cost", calculateShippingCostController);

export default router;
