import { NextFunction, Request, Response } from "express";
import { MarketplaceProvider } from "../../prisma/generated/prisma/client";
import { marketplaceService } from "../services/marketplace.service";

function providerFromRequest(req: Request) {
  const value = String(req.params.provider).toUpperCase().replace(/-/g, "_");
  if (!Object.values(MarketplaceProvider).includes(value as MarketplaceProvider)) {
    throw new Error("Provider must be TOKOPEDIA or TIKTOK_SHOP");
  }
  return value as MarketplaceProvider;
}

function listParams(req: Request) {
  return {
    page: Number(req.query.page) || 1,
    limit: Number(req.query.limit) || 20,
    search: typeof req.query.search === "string" ? req.query.search : undefined,
    status: typeof req.query.status === "string" ? req.query.status : undefined,
  };
}

function action(
  handler: (req: Request) => Promise<unknown>,
  message: string,
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await handler(req);
      return res.status(200).json({ success: true, message, data });
    } catch (error) {
      return next(error);
    }
  };
}

export const getMarketplaceStatus = action(
  () => marketplaceService.getStatus(),
  "Marketplace status fetched",
);
export const getMarketplaceAccounts = action(
  () => marketplaceService.getAccounts(),
  "Marketplace accounts fetched",
);
export const getMarketplaceConnection = action(
  (req) => marketplaceService.getConnectionStatus(providerFromRequest(req)),
  "Marketplace connection tested",
);
export const connectMarketplace = action(
  (req) => marketplaceService.connect(providerFromRequest(req)),
  "Marketplace connected",
);
export const disconnectMarketplace = action(
  (req) => marketplaceService.disconnect(providerFromRequest(req)),
  "Marketplace disconnected",
);
export const getMarketplaceShop = action(
  (req) => marketplaceService.getShopInfo(providerFromRequest(req)),
  "Marketplace shop fetched",
);
export const getMarketplaceProducts = action(
  (req) => marketplaceService.getProducts(providerFromRequest(req), listParams(req)),
  "Marketplace products fetched",
);
export const syncMarketplaceProducts = action(
  (req) => marketplaceService.syncProducts(providerFromRequest(req)),
  "Marketplace products synced",
);
export const getMarketplaceProduct = action(
  (req) =>
    marketplaceService.getProductDetail(providerFromRequest(req), String(req.params.id)),
  "Marketplace product fetched",
);
export const linkMarketplaceProduct = action(
  (req) =>
    marketplaceService.linkLocalProduct(
      providerFromRequest(req),
      String(req.params.id),
      String(req.body.localProductId ?? ""),
    ),
  "Marketplace product linked",
);
export const syncMarketplaceProductStock = action(
  (req) =>
    marketplaceService.syncProductStock(providerFromRequest(req), String(req.params.id)),
  "Marketplace stock synced",
);
export const syncMarketplaceProductPrice = action(
  (req) =>
    marketplaceService.syncProductPrice(providerFromRequest(req), String(req.params.id)),
  "Marketplace price synced",
);
export const getMarketplaceOrders = action(
  (req) => marketplaceService.getOrders(providerFromRequest(req), listParams(req)),
  "Marketplace orders fetched",
);
export const syncMarketplaceOrders = action(
  (req) => marketplaceService.syncOrders(providerFromRequest(req)),
  "Marketplace orders synced",
);
export const getMarketplaceOrder = action(
  (req) =>
    marketplaceService.getOrderDetail(providerFromRequest(req), String(req.params.id)),
  "Marketplace order fetched",
);
export const importMarketplaceOrder = action(
  (req) =>
    marketplaceService.importMarketplaceOrderToNexxora(
      providerFromRequest(req),
      String(req.params.id),
    ),
  "Marketplace order imported",
);
export const getMarketplaceSyncLogs = action(
  (req) => marketplaceService.getSyncLogs(listParams(req)),
  "Marketplace sync logs fetched",
);
export const getMarketplaceWebhookEvents = action(
  (req) => marketplaceService.getWebhookEvents(listParams(req)),
  "Marketplace webhook events fetched",
);
export const processMarketplaceWebhook = action(
  (req) =>
    marketplaceService.processWebhookEvent(
      providerFromRequest(req),
      req.body,
      req.get("x-marketplace-signature"),
    ),
  "Marketplace webhook processed",
);
