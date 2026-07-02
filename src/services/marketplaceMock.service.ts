import {
  MarketplaceAdapter,
  MarketplaceConnectionStatus,
  MarketplaceListParams,
  MarketplaceMode,
  MarketplaceOrderData,
  MarketplaceProductData,
  MarketplaceProvider,
  MarketplaceShop,
  MarketplaceWebhookPayload,
} from "../types/marketplace";

const shops: Record<MarketplaceProvider, MarketplaceShop> = {
  TOKOPEDIA: {
    provider: MarketplaceProvider.TOKOPEDIA,
    shopId: "TKP-NEXXORA-001",
    shopName: "Nexxora Official Tokopedia",
    sellerId: "seller-tkp-9001",
    fsId: "fs-12001",
  },
  TIKTOK_SHOP: {
    provider: MarketplaceProvider.TIKTOK_SHOP,
    shopId: "TTS-NEXXORA-001",
    shopName: "Nexxora TikTok Shop",
    sellerId: "seller-tts-8801",
  },
};

const productSeeds = [
  {
    key: "wireless-headphones",
    sku: "NXR-AUD-001",
    name: "Nexxora Pulse Wireless Headphones",
    price: 899000,
    stock: 48,
    status: "ACTIVE",
    imageUrl: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e",
  },
  {
    key: "smart-watch",
    sku: "NXR-WEA-002",
    name: "Nexxora Orbit Smart Watch",
    price: 1299000,
    stock: 31,
    status: "ACTIVE",
    imageUrl: "https://images.unsplash.com/photo-1523275335684-37898b6baf30",
  },
  {
    key: "mechanical-keyboard",
    sku: "NXR-PC-003",
    name: "Nexxora Arc Mechanical Keyboard",
    price: 749000,
    stock: 22,
    status: "ACTIVE",
    imageUrl: "https://images.unsplash.com/photo-1587829741301-dc798b83add3",
  },
];

function prefix(provider: MarketplaceProvider) {
  return provider === MarketplaceProvider.TOKOPEDIA ? "TKP" : "TTS";
}

function mockProducts(provider: MarketplaceProvider): MarketplaceProductData[] {
  return productSeeds.map((seed, index) => ({
    productId: `${prefix(provider)}-PRD-${1001 + index}`,
    sku: seed.sku,
    name: seed.name,
    price: seed.price + (provider === MarketplaceProvider.TIKTOK_SHOP ? 10000 : 0),
    stock: seed.stock - index * 2,
    status: seed.status,
    imageUrl: seed.imageUrl,
    provider,
  }));
}

function mockOrders(provider: MarketplaceProvider): MarketplaceOrderData[] {
  const products = mockProducts(provider);
  return [
    {
      orderId: `${prefix(provider)}-ORD-20260701-001`,
      invoiceNumber: `INV/${prefix(provider)}/20260701/001`,
      buyerName: provider === MarketplaceProvider.TOKOPEDIA ? "Ayu Lestari" : "Rizky Pratama",
      buyerPhone: "6281230001001",
      totalAmount: products[0].price * 2,
      orderStatus: "PAID",
      paymentStatus: "PAID",
      shippingStatus: "READY_TO_SHIP",
      orderedAt: "2026-07-01T08:30:00.000Z",
      provider,
      items: [
        {
          marketplaceProductId: products[0].productId,
          productName: products[0].name,
          sku: products[0].sku,
          quantity: 2,
          price: products[0].price,
        },
      ],
    },
    {
      orderId: `${prefix(provider)}-ORD-20260630-002`,
      invoiceNumber: `INV/${prefix(provider)}/20260630/002`,
      buyerName: provider === MarketplaceProvider.TOKOPEDIA ? "Dimas Saputra" : "Nadia Putri",
      buyerPhone: "6281230001002",
      totalAmount: products[1].price,
      orderStatus: "SHIPPED",
      paymentStatus: "PAID",
      shippingStatus: "IN_TRANSIT",
      orderedAt: "2026-06-30T12:15:00.000Z",
      provider,
      items: [
        {
          marketplaceProductId: products[1].productId,
          productName: products[1].name,
          sku: products[1].sku,
          quantity: 1,
          price: products[1].price,
        },
      ],
    },
  ];
}

export function getMockWebhookEvents(
  provider: MarketplaceProvider,
): MarketplaceWebhookPayload[] {
  const [firstOrder, secondOrder] = mockOrders(provider);
  const [firstProduct] = mockProducts(provider);
  return [
    {
      eventType: "order.paid",
      eventId: `${prefix(provider)}-EVT-PAID-001`,
      orderId: firstOrder.orderId,
      paymentStatus: "PAID",
      occurredAt: "2026-07-01T08:31:00.000Z",
    },
    {
      eventType: "order.shipped",
      eventId: `${prefix(provider)}-EVT-SHIPPED-001`,
      orderId: secondOrder.orderId,
      shippingStatus: "IN_TRANSIT",
      trackingNumber: `${prefix(provider)}-TRACK-88001`,
      occurredAt: "2026-07-01T10:15:00.000Z",
    },
    {
      eventType: "order.completed",
      eventId: `${prefix(provider)}-EVT-COMPLETED-001`,
      orderId: secondOrder.orderId,
      orderStatus: "COMPLETED",
      occurredAt: "2026-07-02T05:20:00.000Z",
    },
    {
      eventType: "product.stock.changed",
      eventId: `${prefix(provider)}-EVT-STOCK-001`,
      productId: firstProduct.productId,
      sku: firstProduct.sku,
      stock: firstProduct.stock - 1,
      occurredAt: "2026-07-02T06:00:00.000Z",
    },
  ];
}

function filterPage<T extends { name?: string; orderId?: string; orderStatus?: string }>(
  data: T[],
  params: MarketplaceListParams = {},
) {
  const search = params.search?.toLowerCase();
  const filtered = data.filter((item) => {
    const matchesSearch =
      !search ||
      item.name?.toLowerCase().includes(search) ||
      item.orderId?.toLowerCase().includes(search);
    const matchesStatus =
      !params.status || item.orderStatus === params.status || (item as { status?: string }).status === params.status;
    return matchesSearch && matchesStatus;
  });
  const page = Math.max(1, params.page ?? 1);
  const limit = Math.max(1, Math.min(100, params.limit ?? 20));
  return filtered.slice((page - 1) * limit, page * limit);
}

export class MarketplaceMockService implements MarketplaceAdapter {
  async getConnectionStatus(
    provider: MarketplaceProvider,
  ): Promise<MarketplaceConnectionStatus> {
    return {
      connected: true,
      mode: MarketplaceMode.MOCK,
      provider,
      message: "Connected to Nexxora mock sandbox",
    };
  }

  async connect(provider: MarketplaceProvider) {
    return shops[provider];
  }

  async disconnect() {
    return { disconnected: true as const };
  }

  async getShopInfo(provider: MarketplaceProvider) {
    return shops[provider];
  }

  async getProducts(provider: MarketplaceProvider, params?: MarketplaceListParams) {
    return filterPage(mockProducts(provider), params);
  }

  async getProductDetail(provider: MarketplaceProvider, productId: string) {
    const product = mockProducts(provider).find((item) => item.productId === productId);
    if (!product) throw new Error("Mock marketplace product not found");
    return product;
  }

  async syncProducts(provider: MarketplaceProvider) {
    return mockProducts(provider);
  }

  async updateProductStock(
    provider: MarketplaceProvider,
    productId: string,
    stock: number,
  ) {
    return { ...(await this.getProductDetail(provider, productId)), stock };
  }

  async updateProductPrice(
    provider: MarketplaceProvider,
    productId: string,
    price: number,
  ) {
    return { ...(await this.getProductDetail(provider, productId)), price };
  }

  async getOrders(provider: MarketplaceProvider, params?: MarketplaceListParams) {
    return filterPage(mockOrders(provider), params);
  }

  async getOrderDetail(provider: MarketplaceProvider, orderId: string) {
    const order = mockOrders(provider).find((item) => item.orderId === orderId);
    if (!order) throw new Error("Mock marketplace order not found");
    return order;
  }

  async syncOrders(provider: MarketplaceProvider) {
    return mockOrders(provider);
  }

  async importMarketplaceOrderToNexxora(
    _provider: MarketplaceProvider,
    orderId: string,
  ) {
    return { orderId };
  }

  async processWebhookEvent(
    _provider: MarketplaceProvider,
    payload: MarketplaceWebhookPayload,
  ) {
    return {
      processed: true,
      eventType:
        payload.eventType ?? payload.event_type ?? "mock.event.received",
    };
  }
}

export const marketplaceMockService = new MarketplaceMockService();
