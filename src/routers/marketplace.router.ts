import { Router } from "express";
import { Role } from "../../prisma/generated/prisma/client";
import {
  connectMarketplace,
  disconnectMarketplace,
  getMarketplaceAccounts,
  getMarketplaceConnection,
  getMarketplaceOrder,
  getMarketplaceOrders,
  getMarketplaceProduct,
  getMarketplaceProducts,
  getMarketplaceShop,
  getMarketplaceStatus,
  getMarketplaceSyncLogs,
  getMarketplaceWebhookEvents,
  importMarketplaceOrder,
  linkMarketplaceProduct,
  processMarketplaceWebhook,
  syncMarketplaceOrders,
  syncMarketplaceProductPrice,
  syncMarketplaceProducts,
  syncMarketplaceProductStock,
} from "../controllers/marketplace.controller";
import { verifyToken } from "../middlewares/auth.middleware";
import { roleGuard } from "../middlewares/role.middleware";
import { verifyMarketplaceWebhook } from "../middlewares/marketplaceWebhook.middleware";

const router = Router();

router.post(
  "/webhook/:provider",
  verifyMarketplaceWebhook,
  processMarketplaceWebhook,
);

router.use(verifyToken, roleGuard(Role.ADMIN));

router.get("/status", getMarketplaceStatus);
router.get("/accounts", getMarketplaceAccounts);
router.get("/sync-logs", getMarketplaceSyncLogs);
router.get("/webhook-events", getMarketplaceWebhookEvents);

router.post("/:provider/connect", connectMarketplace);
router.post("/:provider/disconnect", disconnectMarketplace);
router.get("/:provider/test-connection", getMarketplaceConnection);
router.get("/:provider/shop", getMarketplaceShop);

router.get("/:provider/products", getMarketplaceProducts);
router.post("/:provider/products/sync", syncMarketplaceProducts);
router.get("/:provider/products/:id", getMarketplaceProduct);
router.post(
  "/:provider/products/:id/link-local-product",
  linkMarketplaceProduct,
);
router.patch(
  "/:provider/products/:id/sync-stock",
  syncMarketplaceProductStock,
);
router.patch(
  "/:provider/products/:id/sync-price",
  syncMarketplaceProductPrice,
);

router.get("/:provider/orders", getMarketplaceOrders);
router.post("/:provider/orders/sync", syncMarketplaceOrders);
router.get("/:provider/orders/:id", getMarketplaceOrder);
router.post("/:provider/orders/:id/import", importMarketplaceOrder);

export default router;
