import {
  MarketplaceMode,
  MarketplaceProvider,
} from "../../prisma/generated/prisma/client";

export { MarketplaceMode, MarketplaceProvider };

export type MarketplaceListParams = {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
};

export type MarketplaceShop = {
  shopId: string;
  shopName: string;
  sellerId?: string;
  fsId?: string;
  provider: MarketplaceProvider;
};

export type MarketplaceProductData = {
  productId: string;
  sku: string | null;
  name: string;
  price: number;
  stock: number;
  status: string;
  imageUrl: string | null;
  provider: MarketplaceProvider;
};

export type MarketplaceOrderItemData = {
  marketplaceProductId: string | null;
  productName: string;
  sku: string | null;
  quantity: number;
  price: number;
};

export type MarketplaceOrderData = {
  orderId: string;
  invoiceNumber: string;
  buyerName: string;
  buyerPhone?: string;
  totalAmount: number;
  orderStatus: string;
  paymentStatus: string;
  shippingStatus: string;
  orderedAt: string;
  provider: MarketplaceProvider;
  items: MarketplaceOrderItemData[];
};

export type MarketplaceWebhookPayload = {
  eventType?: string;
  event_type?: string;
  eventId?: string;
  event_id?: string;
  [key: string]: unknown;
};

export type MarketplaceConnectionStatus = {
  connected: boolean;
  mode: MarketplaceMode;
  provider: MarketplaceProvider;
  message: string;
};

export interface MarketplaceAdapter {
  getConnectionStatus(
    provider: MarketplaceProvider,
  ): Promise<MarketplaceConnectionStatus>;
  connect(provider: MarketplaceProvider): Promise<MarketplaceShop>;
  disconnect(provider: MarketplaceProvider): Promise<{ disconnected: true }>;
  getShopInfo(provider: MarketplaceProvider): Promise<MarketplaceShop>;
  getProducts(
    provider: MarketplaceProvider,
    params?: MarketplaceListParams,
  ): Promise<MarketplaceProductData[]>;
  getProductDetail(
    provider: MarketplaceProvider,
    productId: string,
  ): Promise<MarketplaceProductData>;
  syncProducts(provider: MarketplaceProvider): Promise<MarketplaceProductData[]>;
  updateProductStock(
    provider: MarketplaceProvider,
    productId: string,
    stock: number,
  ): Promise<MarketplaceProductData>;
  updateProductPrice(
    provider: MarketplaceProvider,
    productId: string,
    price: number,
  ): Promise<MarketplaceProductData>;
  getOrders(
    provider: MarketplaceProvider,
    params?: MarketplaceListParams,
  ): Promise<MarketplaceOrderData[]>;
  getOrderDetail(
    provider: MarketplaceProvider,
    orderId: string,
  ): Promise<MarketplaceOrderData>;
  syncOrders(provider: MarketplaceProvider): Promise<MarketplaceOrderData[]>;
  importMarketplaceOrderToNexxora(
    provider: MarketplaceProvider,
    orderId: string,
  ): Promise<{ orderId: string }>;
  processWebhookEvent(
    provider: MarketplaceProvider,
    payload: MarketplaceWebhookPayload,
  ): Promise<{ processed: boolean; eventType: string }>;
}
