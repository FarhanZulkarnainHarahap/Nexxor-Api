import { MarketplaceAdapter, MarketplaceProvider } from "../types/marketplace";

export class TikTokShopPartnerService implements MarketplaceAdapter {
  private unavailable(): never {
    // TODO(partner-api): Implement only from approved TikTok Shop Partner Center
    // documentation after credentials, scopes, signing rules, and endpoints are issued.
    throw new Error(
      "TikTok Shop live adapter requires official Partner Center documentation and credentials",
    );
  }

  async getConnectionStatus() { return this.unavailable(); }
  async connect() { return this.unavailable(); }
  async disconnect() { return this.unavailable(); }
  async getShopInfo() { return this.unavailable(); }
  async getProducts() { return this.unavailable(); }
  async getProductDetail() { return this.unavailable(); }
  async syncProducts() { return this.unavailable(); }
  async updateProductStock() { return this.unavailable(); }
  async updateProductPrice() { return this.unavailable(); }
  async getOrders() { return this.unavailable(); }
  async getOrderDetail() { return this.unavailable(); }
  async syncOrders() { return this.unavailable(); }
  async importMarketplaceOrderToNexxora(
    _provider: MarketplaceProvider,
    _orderId: string,
  ) { return this.unavailable(); }
  async processWebhookEvent() { return this.unavailable(); }
}
