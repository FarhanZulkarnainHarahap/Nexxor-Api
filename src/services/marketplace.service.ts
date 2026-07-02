import bcrypt from "bcrypt";
import { randomBytes } from "crypto";
import {
  MarketplaceProvider,
  Prisma,
  MarketplaceSyncStatus,
  MarketplaceWebhookStatus,
  OrderStatus,
  PaymentStatus,
} from "../../prisma/generated/prisma/client";
import { prisma } from "../config/prisma";
import {
  MarketplaceListParams,
  MarketplaceOrderData,
  MarketplaceProductData,
  MarketplaceWebhookPayload,
} from "../types/marketplace";
import {
  getMarketplaceClient,
  getMarketplaceMode,
} from "../utils/marketplaceClient";

function safePayload(value: unknown) {
  if (value === undefined) return undefined;
  return JSON.parse(
    JSON.stringify(value, (key, nestedValue) =>
      /secret|token|authorization|credential|signature/i.test(key)
        ? "[REDACTED]"
        : nestedValue,
    ),
  ) as Prisma.InputJsonValue;
}

async function withSyncLog<T>(
  provider: MarketplaceProvider,
  action: string,
  requestPayload: unknown,
  operation: () => Promise<T>,
) {
  const log = await prisma.marketplaceSyncLog.create({
    data: {
      provider,
      action,
      status: MarketplaceSyncStatus.PENDING,
      requestPayload: safePayload(requestPayload),
    },
  });

  try {
    const result = await operation();
    await prisma.marketplaceSyncLog.update({
      where: { id: log.id },
      data: {
        status: MarketplaceSyncStatus.SUCCESS,
        message: `${action} completed`,
        responsePayload: safePayload(result),
        finishedAt: new Date(),
      },
    });
    return result;
  } catch (error) {
    await prisma.marketplaceSyncLog.update({
      where: { id: log.id },
      data: {
        status: MarketplaceSyncStatus.FAILED,
        message: error instanceof Error ? error.message : `${action} failed`,
        finishedAt: new Date(),
      },
    });
    throw error;
  }
}

async function requireAccount(provider: MarketplaceProvider) {
  const account = await prisma.marketplaceAccount.findUnique({
    where: { provider },
  });
  if (!account?.isActive) {
    throw new Error(`${provider} marketplace account is not connected`);
  }
  return account;
}

function productData(data: MarketplaceProductData, accountId: string) {
  return {
    marketplaceAccountId: accountId,
    provider: data.provider,
    marketplaceProductId: data.productId,
    marketplaceSku: data.sku,
    name: data.name,
    price: data.price,
    stock: data.stock,
    status: data.status,
    imageUrl: data.imageUrl,
    rawData: safePayload(data),
    lastSyncedAt: new Date(),
  };
}

function parseOrderStatus(status: string) {
  const normalized = status.toUpperCase();
  if (normalized === "PAID") return OrderStatus.PAID;
  if (normalized === "SHIPPED") return OrderStatus.SHIPPED;
  if (normalized === "COMPLETED") return OrderStatus.COMPLETED;
  if (normalized === "CANCELLED") return OrderStatus.CANCELLED;
  return OrderStatus.PENDING;
}

function parsePaymentStatus(status?: string | null) {
  const normalized = status?.toUpperCase();
  if (normalized === "PAID") return PaymentStatus.PAID;
  if (normalized === "FAILED") return PaymentStatus.FAILED;
  if (normalized === "CANCELLED") return PaymentStatus.CANCELLED;
  if (normalized === "REFUNDED") return PaymentStatus.REFUNDED;
  return PaymentStatus.UNPAID;
}

class MarketplaceService {
  async getStatus() {
    const [accounts, totalProducts, linkedProducts, totalOrders, importedOrders, failedSyncs, webhookEvents] =
      await Promise.all([
        prisma.marketplaceAccount.findMany({
          select: {
            id: true,
            provider: true,
            mode: true,
            shopId: true,
            shopName: true,
            isActive: true,
            lastSyncedAt: true,
          },
          orderBy: { provider: "asc" },
        }),
        prisma.marketplaceProduct.count(),
        prisma.marketplaceProduct.count({
          where: { localProductId: { not: null } },
        }),
        prisma.marketplaceOrder.count(),
        prisma.marketplaceOrder.count({
          where: { localOrderId: { not: null } },
        }),
        prisma.marketplaceSyncLog.count({
          where: { status: MarketplaceSyncStatus.FAILED },
        }),
        prisma.marketplaceWebhookEvent.count(),
      ]);

    return {
      mode: getMarketplaceMode(),
      accounts,
      metrics: {
        totalProducts,
        linkedProducts,
        totalOrders,
        importedOrders,
        failedSyncs,
        webhookEvents,
      },
    };
  }

  async getAccounts() {
    return prisma.marketplaceAccount.findMany({
      select: {
        id: true,
        provider: true,
        mode: true,
        shopId: true,
        shopName: true,
        sellerId: true,
        fsId: true,
        isActive: true,
        lastSyncedAt: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { provider: "asc" },
    });
  }

  async getConnectionStatus(provider: MarketplaceProvider) {
    return withSyncLog(provider, "CONNECTION_STATUS", undefined, async () => {
      const account = await prisma.marketplaceAccount.findUnique({
        where: { provider },
      });
      return {
        provider,
        mode: getMarketplaceMode(),
        connected: Boolean(account?.isActive),
        message: account?.isActive ? "Marketplace account connected" : "Marketplace account disconnected",
      };
    });
  }

  async connect(provider: MarketplaceProvider) {
    return withSyncLog(provider, "CONNECT", undefined, async () => {
      const shop = await getMarketplaceClient(provider).connect(provider);
      return prisma.marketplaceAccount.upsert({
        where: { provider },
        create: {
          provider,
          mode: getMarketplaceMode(),
          shopId: shop.shopId,
          shopName: shop.shopName,
          sellerId: shop.sellerId,
          fsId: shop.fsId,
          isActive: true,
          rawConfig: safePayload({ sandbox: getMarketplaceMode() === "MOCK" }),
        },
        update: {
          mode: getMarketplaceMode(),
          shopId: shop.shopId,
          shopName: shop.shopName,
          sellerId: shop.sellerId,
          fsId: shop.fsId,
          isActive: true,
        },
        select: {
          id: true,
          provider: true,
          mode: true,
          shopId: true,
          shopName: true,
          sellerId: true,
          fsId: true,
          isActive: true,
          lastSyncedAt: true,
        },
      });
    });
  }

  async disconnect(provider: MarketplaceProvider) {
    return withSyncLog(provider, "DISCONNECT", undefined, async () => {
      await getMarketplaceClient(provider).disconnect(provider);
      const account = await requireAccount(provider);
      return prisma.marketplaceAccount.update({
        where: { id: account.id },
        data: { isActive: false },
        select: { provider: true, isActive: true },
      });
    });
  }

  async getShopInfo(provider: MarketplaceProvider) {
    return withSyncLog(provider, "GET_SHOP", undefined, async () => {
      await requireAccount(provider);
      return getMarketplaceClient(provider).getShopInfo(provider);
    });
  }

  async getProducts(provider: MarketplaceProvider, params: MarketplaceListParams) {
    await requireAccount(provider);
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.max(1, Math.min(100, params.limit ?? 20));
    const where = {
      provider,
      ...(params.search
        ? {
            OR: [
              { name: { contains: params.search, mode: "insensitive" as const } },
              {
                marketplaceSku: {
                  contains: params.search,
                  mode: "insensitive" as const,
                },
              },
            ],
          }
        : {}),
      ...(params.status ? { status: params.status } : {}),
    };
    const [items, total] = await Promise.all([
      prisma.marketplaceProduct.findMany({
        where,
        include: { localProduct: true },
        orderBy: { updatedAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.marketplaceProduct.count({ where }),
    ]);
    return { items, total, page, limit };
  }

  async getProductDetail(provider: MarketplaceProvider, id: string) {
    await requireAccount(provider);
    const product = await prisma.marketplaceProduct.findFirst({
      where: {
        provider,
        OR: [{ id }, { marketplaceProductId: id }],
      },
      include: { localProduct: true },
    });
    if (!product) throw new Error("Marketplace product not found");
    return product;
  }

  async syncProducts(provider: MarketplaceProvider) {
    return withSyncLog(provider, "SYNC_PRODUCTS", undefined, async () => {
      const account = await requireAccount(provider);
      const products = await getMarketplaceClient(provider).syncProducts(provider);

      for (const product of products) {
        const data = productData(product, account.id);
        await prisma.marketplaceProduct.upsert({
          where: {
            provider_marketplaceProductId: {
              provider,
              marketplaceProductId: product.productId,
            },
          },
          create: data,
          update: data,
        });
      }

      await prisma.marketplaceAccount.update({
        where: { id: account.id },
        data: { lastSyncedAt: new Date() },
      });
      return { synced: products.length };
    });
  }

  async linkLocalProduct(
    provider: MarketplaceProvider,
    id: string,
    localProductId: string,
  ) {
    return withSyncLog(
      provider,
      "LINK_LOCAL_PRODUCT",
      { id, localProductId },
      async () => {
        const [marketplaceProduct, localProduct] = await Promise.all([
          this.getProductDetail(provider, id),
          prisma.product.findUnique({ where: { id: localProductId } }),
        ]);
        if (!localProduct) throw new Error("Local Nexxora product not found");
        return prisma.marketplaceProduct.update({
          where: { id: marketplaceProduct.id },
          data: { localProductId },
          include: { localProduct: true },
        });
      },
    );
  }

  async syncProductStock(provider: MarketplaceProvider, id: string) {
    return withSyncLog(provider, "SYNC_PRODUCT_STOCK", { id }, async () => {
      const product = await this.getProductDetail(provider, id);
      if (!product.localProduct) {
        throw new Error("Link a Nexxora product before syncing stock");
      }
      const result = await getMarketplaceClient(provider).updateProductStock(
        provider,
        product.marketplaceProductId,
        product.localProduct.stock,
      );
      return prisma.marketplaceProduct.update({
        where: { id: product.id },
        data: {
          stock: result.stock,
          rawData: safePayload(result),
          lastSyncedAt: new Date(),
        },
        include: { localProduct: true },
      });
    });
  }

  async syncProductPrice(provider: MarketplaceProvider, id: string) {
    return withSyncLog(provider, "SYNC_PRODUCT_PRICE", { id }, async () => {
      const product = await this.getProductDetail(provider, id);
      if (!product.localProduct) {
        throw new Error("Link a Nexxora product before syncing price");
      }
      const result = await getMarketplaceClient(provider).updateProductPrice(
        provider,
        product.marketplaceProductId,
        product.localProduct.price,
      );
      return prisma.marketplaceProduct.update({
        where: { id: product.id },
        data: {
          price: result.price,
          rawData: safePayload(result),
          lastSyncedAt: new Date(),
        },
        include: { localProduct: true },
      });
    });
  }

  async getOrders(provider: MarketplaceProvider, params: MarketplaceListParams) {
    await requireAccount(provider);
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.max(1, Math.min(100, params.limit ?? 20));
    const where = {
      provider,
      ...(params.search
        ? {
            OR: [
              {
                marketplaceOrderId: {
                  contains: params.search,
                  mode: "insensitive" as const,
                },
              },
              {
                invoiceNumber: {
                  contains: params.search,
                  mode: "insensitive" as const,
                },
              },
              {
                buyerName: {
                  contains: params.search,
                  mode: "insensitive" as const,
                },
              },
            ],
          }
        : {}),
      ...(params.status ? { orderStatus: params.status } : {}),
    };
    const [items, total] = await Promise.all([
      prisma.marketplaceOrder.findMany({
        where,
        include: { items: true, localOrder: true },
        orderBy: { orderedAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.marketplaceOrder.count({ where }),
    ]);
    return { items, total, page, limit };
  }

  async getOrderDetail(provider: MarketplaceProvider, id: string) {
    await requireAccount(provider);
    const order = await prisma.marketplaceOrder.findFirst({
      where: {
        provider,
        OR: [{ id }, { marketplaceOrderId: id }],
      },
      include: {
        items: {
          include: { marketplaceProduct: true, localProduct: true },
        },
        localOrder: true,
      },
    });
    if (!order) throw new Error("Marketplace order not found");
    return order;
  }

  private async persistOrder(
    provider: MarketplaceProvider,
    accountId: string,
    order: MarketplaceOrderData,
  ) {
    const saved = await prisma.marketplaceOrder.upsert({
      where: {
        provider_marketplaceOrderId: {
          provider,
          marketplaceOrderId: order.orderId,
        },
      },
      create: {
        marketplaceAccountId: accountId,
        provider,
        marketplaceOrderId: order.orderId,
        invoiceNumber: order.invoiceNumber,
        buyerName: order.buyerName,
        buyerPhone: order.buyerPhone,
        totalAmount: order.totalAmount,
        orderStatus: order.orderStatus,
        paymentStatus: order.paymentStatus,
        shippingStatus: order.shippingStatus,
        orderedAt: new Date(order.orderedAt),
        lastSyncedAt: new Date(),
        rawData: safePayload(order),
      },
      update: {
        invoiceNumber: order.invoiceNumber,
        buyerName: order.buyerName,
        buyerPhone: order.buyerPhone,
        totalAmount: order.totalAmount,
        orderStatus: order.orderStatus,
        paymentStatus: order.paymentStatus,
        shippingStatus: order.shippingStatus,
        orderedAt: new Date(order.orderedAt),
        lastSyncedAt: new Date(),
        rawData: safePayload(order),
      },
    });

    await prisma.marketplaceOrderItem.deleteMany({
      where: { marketplaceOrderId: saved.id },
    });
    for (const item of order.items) {
      const marketplaceProduct = item.marketplaceProductId
        ? await prisma.marketplaceProduct.findUnique({
            where: {
              provider_marketplaceProductId: {
                provider,
                marketplaceProductId: item.marketplaceProductId,
              },
            },
          })
        : null;
      await prisma.marketplaceOrderItem.create({
        data: {
          marketplaceOrderId: saved.id,
          marketplaceProductId: marketplaceProduct?.id,
          localProductId: marketplaceProduct?.localProductId,
          productName: item.productName,
          sku: item.sku,
          quantity: item.quantity,
          price: item.price,
          rawData: safePayload(item),
        },
      });
    }
    return saved;
  }

  async syncOrders(provider: MarketplaceProvider) {
    return withSyncLog(provider, "SYNC_ORDERS", undefined, async () => {
      const account = await requireAccount(provider);
      const orders = await getMarketplaceClient(provider).syncOrders(provider);
      for (const order of orders) {
        await this.persistOrder(provider, account.id, order);
      }
      await prisma.marketplaceAccount.update({
        where: { id: account.id },
        data: { lastSyncedAt: new Date() },
      });
      return { synced: orders.length };
    });
  }

  async importMarketplaceOrderToNexxora(
    provider: MarketplaceProvider,
    id: string,
  ) {
    return withSyncLog(provider, "IMPORT_ORDER", { id }, async () => {
      const marketplaceOrder = await this.getOrderDetail(provider, id);
      if (marketplaceOrder.localOrderId) {
        return { localOrderId: marketplaceOrder.localOrderId, duplicate: true };
      }
      if (!marketplaceOrder.items.length) {
        throw new Error("Marketplace order has no items");
      }
      if (marketplaceOrder.items.some((item) => !item.localProductId)) {
        throw new Error("Every marketplace order item must be linked to a Nexxora product");
      }

      const systemEmail = `marketplace_${provider.toLowerCase()}@oauth.local`;
      let customer = await prisma.user.findUnique({
        where: { email: systemEmail },
      });
      if (!customer) {
        customer = await prisma.user.create({
          data: {
            name: `${provider.replace("_", " ")} Customer`,
            email: systemEmail,
            password: await bcrypt.hash(randomBytes(32).toString("hex"), 12),
            profileCompleted: false,
            cart: { create: {} },
          },
        });
      }

      const localOrder = await prisma.$transaction(async (tx) => {
        const fresh = await tx.marketplaceOrder.findUniqueOrThrow({
          where: { id: marketplaceOrder.id },
        });
        if (fresh.localOrderId) {
          return tx.order.findUniqueOrThrow({ where: { id: fresh.localOrderId } });
        }

        for (const item of marketplaceOrder.items) {
          const updated = await tx.product.updateMany({
            where: {
              id: item.localProductId!,
              stock: { gte: item.quantity },
            },
            data: { stock: { decrement: item.quantity } },
          });
          if (updated.count !== 1) {
            throw new Error(`Insufficient stock for ${item.productName}`);
          }
        }

        const order = await tx.order.create({
          data: {
            orderNumber: `MKT-${provider}-${marketplaceOrder.marketplaceOrderId}`,
            userId: customer!.id,
            subtotal: marketplaceOrder.totalAmount,
            totalPrice: marketplaceOrder.totalAmount,
            status: parseOrderStatus(marketplaceOrder.orderStatus),
            paymentStatus: parsePaymentStatus(marketplaceOrder.paymentStatus),
            shippingAddress:
              "Marketplace fulfillment address (see MarketplaceOrder.rawData)",
            orderItems: {
              create: marketplaceOrder.items.map((item) => ({
                productId: item.localProductId!,
                quantity: item.quantity,
                price: item.price,
              })),
            },
          },
        });
        await tx.marketplaceOrder.update({
          where: { id: marketplaceOrder.id },
          data: { localOrderId: order.id },
        });
        return order;
      });

      return { localOrderId: localOrder.id, duplicate: false };
    });
  }

  async processWebhookEvent(
    provider: MarketplaceProvider,
    payload: MarketplaceWebhookPayload,
    signature?: string,
  ) {
    const eventType =
      payload.eventType ?? payload.event_type ?? "marketplace.event";
    const eventId = payload.eventId ?? payload.event_id;

    if (eventId) {
      const duplicate = await prisma.marketplaceWebhookEvent.findUnique({
        where: { provider_eventId: { provider, eventId } },
      });
      if (duplicate) {
        return { ...duplicate, duplicate: true };
      }
    }

    const event = await prisma.marketplaceWebhookEvent.create({
      data: {
        provider,
        eventType,
        eventId,
        payload: safePayload(payload)!,
        signature,
      },
    });

    try {
      const result = await withSyncLog(
        provider,
        `WEBHOOK_${eventType.toUpperCase()}`,
        payload,
        () =>
          getMarketplaceClient(provider).processWebhookEvent(provider, payload),
      );
      return prisma.marketplaceWebhookEvent.update({
        where: { id: event.id },
        data: {
          status: result.processed
            ? MarketplaceWebhookStatus.PROCESSED
            : MarketplaceWebhookStatus.IGNORED,
          processedAt: new Date(),
        },
      });
    } catch (error) {
      await prisma.marketplaceWebhookEvent.update({
        where: { id: event.id },
        data: {
          status: MarketplaceWebhookStatus.FAILED,
          processedAt: new Date(),
          errorMessage: error instanceof Error ? error.message : "Webhook failed",
        },
      });
      throw error;
    }
  }

  async getSyncLogs(params: MarketplaceListParams) {
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.max(1, Math.min(100, params.limit ?? 50));
    const [items, total] = await Promise.all([
      prisma.marketplaceSyncLog.findMany({
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.marketplaceSyncLog.count(),
    ]);
    return { items, total, page, limit };
  }

  async getWebhookEvents(params: MarketplaceListParams) {
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.max(1, Math.min(100, params.limit ?? 50));
    const [items, total] = await Promise.all([
      prisma.marketplaceWebhookEvent.findMany({
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.marketplaceWebhookEvent.count(),
    ]);
    return { items, total, page, limit };
  }
}

export const marketplaceService = new MarketplaceService();
