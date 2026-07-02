import { Request, Response } from "express";
import { AdminRequestStatus, OrderStatus, PaymentStatus } from "../../prisma/generated/prisma/client";
import { prisma } from "../config/prisma";

export async function getAdminDashboardController(_req: Request, res: Response) {
  try {
    const [
      totalProducts,
      totalCategories,
      totalOrders,
      pendingOrders,
      paidTransactions,
      revenue,
      pendingAdminRequests,
      latestOrders,
      lowStockProducts,
      recentAdminRequests,
    ] = await Promise.all([
      prisma.product.count(),
      prisma.category.count(),
      prisma.order.count(),
      prisma.order.count({ where: { status: OrderStatus.PENDING } }),
      prisma.payment.count({ where: { status: PaymentStatus.PAID } }),
      prisma.payment.aggregate({
        where: { status: PaymentStatus.PAID },
        _sum: { amount: true },
      }),
      prisma.adminRequest.count({ where: { status: AdminRequestStatus.PENDING } }),
      prisma.order.findMany({
        take: 5,
        orderBy: { createdAt: "desc" },
        include: {
          user: { select: { id: true, name: true, email: true } },
          payments: { orderBy: { createdAt: "desc" }, take: 1 },
        },
      }),
      prisma.product.findMany({
        where: { stock: { lte: 20 } },
        take: 5,
        orderBy: { stock: "asc" },
        include: { category: true },
      }),
      prisma.adminRequest.findMany({
        take: 5,
        orderBy: { createdAt: "desc" },
        include: {
          user: { select: { id: true, name: true, email: true, role: true } },
        },
      }),
    ]);

    return res.status(200).json({
      success: true,
      message: "Admin dashboard fetched successfully",
      data: {
        stats: {
          totalProducts,
          totalCategories,
          totalOrders,
          pendingOrders,
          paidTransactions,
          revenue: revenue._sum.amount ?? 0,
          pendingAdminRequests,
        },
        latestOrders,
        lowStockProducts,
        recentAdminRequests,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error,
    });
  }
}

export async function getAdminTransactionsController(req: Request, res: Response) {
  try {
    const rawStatus = typeof req.query.status === "string" ? req.query.status.toUpperCase() : "";
    const status = Object.values(PaymentStatus).includes(rawStatus as PaymentStatus)
      ? (rawStatus as PaymentStatus)
      : undefined;

    const transactions = await prisma.payment.findMany({
      where: status ? { status } : undefined,
      include: {
        order: {
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return res.status(200).json({
      success: true,
      message: "Transactions fetched successfully",
      data: transactions,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error,
    });
  }
}
