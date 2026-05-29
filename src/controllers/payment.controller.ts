import { Request, Response } from "express";
import {
  OrderStatus,
  PaymentProvider,
  PaymentStatus,
} from "../../prisma/generated/prisma/client";
import { createXenditInvoice } from "../config/xendit";
import { prisma } from "../config/prisma";
import { sendPurchaseSuccessEmail } from "../utils/email";
import { getRouteParam } from "../utils/request";

type XenditWebhookBody = {
  id?: string;
  external_id?: string;
  status?: string;
  amount?: number;
  paid_amount?: number;
  paid_at?: string;
  invoice_url?: string;
  payment_method?: string;
  payment_channel?: string;
};

function getFrontendUrl() {
  return process.env.FRONTEND_URL ?? "http://localhost:3000";
}

function mapXenditStatus(status?: string) {
  const normalizedStatus = status?.toUpperCase();

  if (normalizedStatus === "PAID" || normalizedStatus === "SETTLED") {
    return PaymentStatus.PAID;
  }

  if (normalizedStatus === "EXPIRED") {
    return PaymentStatus.EXPIRED;
  }

  if (normalizedStatus === "FAILED") {
    return PaymentStatus.FAILED;
  }

  return PaymentStatus.PENDING;
}

async function updateOrderAfterPayment(
  orderId: string,
  paymentStatus: PaymentStatus,
  notificationTitle: string,
  notificationMessage: string,
) {
  const order = await prisma.order.update({
    where: { id: orderId },
    data: {
      paymentStatus,
      status: paymentStatus === PaymentStatus.PAID ? OrderStatus.PAID : undefined,
    },
  });

  await prisma.notification.create({
    data: {
      userId: order.userId,
      title: notificationTitle,
      message: notificationMessage,
    },
  });

  return order;
}

export async function createXenditPaymentController(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const { orderId } = req.body as { orderId?: string };

    if (!orderId) {
      return res.status(400).json({
        success: false,
        message: "OrderId is required",
      });
    }

    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        userId: req.user.id,
      },
      include: {
        user: true,
        orderItems: {
          include: {
            product: {
              include: {
                category: true,
              },
            },
          },
        },
      },
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    if (order.paymentStatus === PaymentStatus.PAID) {
      return res.status(400).json({
        success: false,
        message: "Order already paid",
      });
    }

    const existingPayment = await prisma.payment.findFirst({
      where: { orderId: order.id, provider: PaymentProvider.XENDIT },
    });

    const payment = existingPayment
      ? await prisma.payment.update({
          where: { id: existingPayment.id },
          data: {
            status: PaymentStatus.PENDING,
            amount: order.totalPrice,
          },
        })
      : await prisma.payment.create({
          data: {
            orderId: order.id,
            provider: PaymentProvider.XENDIT,
            status: PaymentStatus.PENDING,
            amount: order.totalPrice,
          },
        });

    const externalId = `${order.orderNumber}-${payment.id}`;
    const invoice = await createXenditInvoice({
      external_id: externalId,
      amount: order.totalPrice,
      description: `Nexxora order ${order.orderNumber}`,
      invoice_duration: 86400,
      customer: {
        given_names: order.user.name,
        email: order.user.email,
        mobile_number: order.user.phone ?? undefined,
      },
      success_redirect_url: `${getFrontendUrl()}/payment/success?orderId=${order.id}`,
      failure_redirect_url: `${getFrontendUrl()}/payment/failed?orderId=${order.id}`,
      currency: "IDR",
      items: order.orderItems.map((item) => ({
        name: item.product.name,
        quantity: item.quantity,
        price: item.price,
        category: item.product.category.name,
        url: `${getFrontendUrl()}/product/${item.product.slug}`,
      })),
      metadata: {
        orderId: order.id,
        userId: order.userId,
        paymentId: payment.id,
      },
    });

    const updatedPayment = await prisma.payment.update({
      where: { id: payment.id },
      data: {
        transactionId: invoice.id,
        paymentToken: invoice.external_id,
        paymentUrl: invoice.invoice_url,
        rawResponse: JSON.parse(JSON.stringify(invoice)),
      },
    });

    await prisma.order.update({
      where: { id: order.id },
      data: { paymentStatus: PaymentStatus.PENDING },
    });

    return res.status(200).json({
      success: true,
      message: "Xendit payment created successfully",
      data: {
        paymentId: updatedPayment.id,
        orderId: order.id,
        invoiceId: invoice.id,
        invoiceUrl: invoice.invoice_url,
        checkoutUrl: invoice.invoice_url,
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

export async function xenditWebhookController(req: Request, res: Response) {
  try {
    const callbackToken = req.headers["x-callback-token"];

    if (
      process.env.XENDIT_CALLBACK_TOKEN &&
      callbackToken !== process.env.XENDIT_CALLBACK_TOKEN
    ) {
      return res.status(401).json({
        success: false,
        message: "Invalid Xendit callback token",
      });
    }

    const body = req.body as XenditWebhookBody;
    const paymentStatus = mapXenditStatus(body.status);

    if (!body.id && !body.external_id) {
      return res.status(400).json({
        success: false,
        message: "Xendit invoice id or external_id is required",
      });
    }

    const paymentWhere =
      body.id && body.external_id
        ? {
            provider: PaymentProvider.XENDIT,
            OR: [{ transactionId: body.id }, { paymentToken: body.external_id }],
          }
        : body.id
          ? {
              provider: PaymentProvider.XENDIT,
              transactionId: body.id,
            }
          : {
              provider: PaymentProvider.XENDIT,
              paymentToken: body.external_id ?? "",
            };

    const payment = await prisma.payment.findFirst({
      where: paymentWhere,
      include: {
        order: {
          include: {
            user: {
              select: {
                name: true,
                email: true,
              },
            },
            orderItems: {
              include: {
                product: {
                  select: {
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment not found",
      });
    }

    const updatedPayment = await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: paymentStatus,
        amount: body.paid_amount ?? body.amount ?? payment.amount,
        paidAt:
          paymentStatus === PaymentStatus.PAID
            ? body.paid_at
              ? new Date(body.paid_at)
              : new Date()
            : undefined,
        paymentUrl: body.invoice_url ?? payment.paymentUrl,
        rawResponse: JSON.parse(JSON.stringify(body)),
      },
    });

    await updateOrderAfterPayment(
      payment.orderId,
      paymentStatus,
      paymentStatus === PaymentStatus.PAID ? "Payment successful" : "Payment updated",
      `Your Nexxora payment for order ${payment.order.orderNumber} is ${paymentStatus}.`,
    );

    if (paymentStatus === PaymentStatus.PAID && payment.status !== PaymentStatus.PAID) {
      try {
        await sendPurchaseSuccessEmail(payment.order.user, payment.order);
      } catch (emailError) {
        console.error("Failed to send purchase email", emailError);
      }
    }

    return res.status(200).json({
      success: true,
      message: "Xendit webhook processed successfully",
      data: updatedPayment,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error,
    });
  }
}

export async function getPaymentStatusController(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const orderId = getRouteParam(req, "orderId");
    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        userId: req.user.id,
      },
      include: {
        payments: {
          orderBy: {
            createdAt: "desc",
          },
          take: 1,
        },
      },
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    const payment = order.payments[0] ?? null;

    return res.status(200).json({
      success: true,
      message: "Payment status fetched successfully",
      data: {
        order,
        provider: payment?.provider ?? null,
        paymentStatus: order.paymentStatus,
        paymentUrl: payment?.paymentUrl ?? null,
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
