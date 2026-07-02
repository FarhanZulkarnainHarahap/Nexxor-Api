import {
  MarketplaceAdapter,
  MarketplaceMode,
  MarketplaceProvider,
} from "../types/marketplace";
import { marketplaceMockService } from "../services/marketplaceMock.service";
import { TikTokShopPartnerService } from "../services/tiktokShopPartner.service";
import { TokopediaPartnerService } from "../services/tokopediaPartner.service";

export function getMarketplaceMode() {
  return process.env.MARKETPLACE_MODE?.toLowerCase() === "live"
    ? MarketplaceMode.LIVE
    : MarketplaceMode.MOCK;
}

function requireLiveConfiguration(provider: MarketplaceProvider) {
  const common = ["MARKETPLACE_ENCRYPTION_KEY"];
  const providerVariables =
    provider === MarketplaceProvider.TOKOPEDIA
      ? [
          "TOKOPEDIA_PARTNER_BASE_URL",
          "TOKOPEDIA_APP_KEY",
          "TOKOPEDIA_APP_SECRET",
          "TOKOPEDIA_SHOP_ID",
        ]
      : [
          "TIKTOK_SHOP_BASE_URL",
          "TIKTOK_SHOP_APP_KEY",
          "TIKTOK_SHOP_APP_SECRET",
          "TIKTOK_SHOP_SHOP_ID",
        ];
  const missing = [...common, ...providerVariables].filter(
    (key) => !process.env[key],
  );
  if (missing.length) {
    throw new Error(`Missing live marketplace configuration: ${missing.join(", ")}`);
  }
}

export function getMarketplaceClient(
  provider: MarketplaceProvider,
): MarketplaceAdapter {
  if (getMarketplaceMode() === MarketplaceMode.MOCK) {
    return marketplaceMockService;
  }

  requireLiveConfiguration(provider);
  return provider === MarketplaceProvider.TOKOPEDIA
    ? new TokopediaPartnerService()
    : new TikTokShopPartnerService();
}
