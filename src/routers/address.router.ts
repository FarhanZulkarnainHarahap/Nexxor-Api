import { Router } from "express";
import {
  createAddressController,
  deleteAddressController,
  getAddressesController,
  updateAddressController,
} from "../controllers/address.controller";
import { verifyToken } from "../middlewares/auth.middleware";

const router = Router();

router.use(verifyToken);
router.get("/", getAddressesController);
router.post("/", createAddressController);
router.put("/:id", updateAddressController);
router.delete("/:id", deleteAddressController);

export default router;
