import { NextFunction, Request, Response } from "express";
import { getMarketplaceMode } from "../utils/marketplaceClient";
import { MarketplaceMode } from "../types/marketplace";

export function verifyMarketplaceWebhook(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  if (getMarketplaceMode() === MarketplaceMode.MOCK) {
    return next();
  }

  // TODO(partner-api): Verify the exact canonical request and signature scheme
  // from each provider's approved Partner Center documentation. Rejecting all
  // live webhooks is safer than guessing a verification algorithm.
  return res.status(501).json({
    success: false,
    message:
      "Live webhook verification is pending official marketplace documentation",
  });
}
