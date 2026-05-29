import { Request, Response } from "express";
import {
  Address,
  Coupon,
  CouponUsage,
  OrderStatus,
  PaymentStatus,
  Role,
} from "../../prisma/generated/prisma/client";
import { prisma } from "../config/prisma";
import {
  assertCouponCanBeUsed,
  calculateCouponDiscount,
  normalizeCouponCode,
} from "../utils/coupon";
import { sendOrderCreatedEmail } from "../utils/email";
import { getRouteParam } from "../utils/request";

function createOrderNumber() {
  return `NXR-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

export async function getOrdersController(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const orders = await prisma.order.findMany({
      where: req.user.role === Role.ADMIN ? undefined : { userId: req.user.id },
      include: {
        orderItems: {
          include: {
            product: {
              include: {
                category: true,
              },
            },
          },
        },
        payments: {
          orderBy: {
            createdAt: "desc",
          },
        },
        address: true,
        coupon: true,
        couponUsage: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return res.status(200).json({
      success: true,
      message: "Orders fetched successfully",
      data: orders,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error,
    });
  }
}

export async function getOrderDetailController(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const id = getRouteParam(req, "id");
    const order = await prisma.order.findFirst({
      where: {
        id,
        ...(req.user.role === Role.ADMIN ? {} : { userId: req.user.id }),
      },
      include: {
        orderItems: {
          include: {
            product: {
              include: {
                category: true,
              },
            },
          },
        },
        payments: {
          orderBy: {
            createdAt: "desc",
          },
        },
        address: true,
        coupon: true,
        couponUsage: true,
      },
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Order fetched successfully",
      data: order,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error,
    });
  }
}

export async function checkoutOrderController(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const { shippingAddress, addressId, shippingOption, couponCode } = req.body as {
      shippingAddress?: string;
      addressId?: string;
      shippingOption?: {
        courier?: string;
        service?: string;
        etd?: string;
        cost?: number;
      };
      couponCode?: string;
    };

    if (!shippingAddress && !addressId) {
      return res.status(400).json({
        success: false,
        message: "Shipping address or saved address is required",
      });
    }

    const userId = req.user.id;

    const cart = await prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Cart is empty",
      });
    }

    const outOfStockItem = cart.items.find((item) => item.quantity > item.product.stock);

    if (outOfStockItem) {
      return res.status(400).json({
        success: false,
        message: `${outOfStockItem.product.name} does not have enough stock`,
      });
    }

    const subtotal = cart.items.reduce(
      (total, item) => total + item.product.price * item.quantity,
      0,
    );
    let selectedAddress: Address | null = null;

    if (addressId) {
      selectedAddress = await prisma.address.findFirst({
        where: {
          id: addressId,
          userId,
        },
      });

      if (!selectedAddress) {
        return res.status(404).json({
          success: false,
          message: "Address not found",
        });
      }
    }

    const shippingFee =
      typeof shippingOption?.cost === "number" && shippingOption.cost >= 0
        ? shippingOption.cost
        : subtotal > 0
          ? 25000
          : 0;
    let coupon: (Coupon & { usages: CouponUsage[] }) | null = null;
    let discountAmount = 0;

    if (couponCode) {
      coupon = await prisma.coupon.findUnique({
        where: {
          code: normalizeCouponCode(couponCode),
        },
        include: {
          usages: {
            where: {
              userId,
            },
          },
        },
      });

      try {
        assertCouponCanBeUsed(coupon, subtotal);
      } catch (couponError) {
        return res.status(400).json({
          success: false,
          message: couponError instanceof Error ? couponError.message : "Coupon code is not valid",
        });
      }

      if (coupon) {
        discountAmount = calculateCouponDiscount(coupon, subtotal);
      }
    }

    if (coupon && discountAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Coupon discount is not available for this order",
      });
    }

    const totalPrice = Math.max(0, subtotal + shippingFee - discountAmount);

    const order = await prisma.$transaction(async (tx) => {
      const createdOrder = await tx.order.create({
        data: {
          orderNumber: createOrderNumber(),
          userId,
          addressId: selectedAddress ? selectedAddress.id : null,
          subtotal,
          shippingFee,
          shippingCourier: shippingOption?.courier,
          shippingService: shippingOption?.service,
          shippingEtd: shippingOption?.etd,
          discountAmount,
          couponCode: coupon ? coupon.code : null,
          couponId: coupon ? coupon.id : null,
          totalPrice,
          shippingAddress:
            selectedAddress
              ? `${selectedAddress.recipientName} - ${selectedAddress.recipientPhone}. ${selectedAddress.detail}, ${selectedAddress.rajaongkirLabel}`
              : shippingAddress!,
          orderItems: {
            create: cart.items.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              price: item.product.price,
            })),
          },
        },
        include: {
          user: {
            select: {
              name: true,
              email: true,
            },
          },
          orderItems: {
            include: {
              product: true,
            },
          },
          payments: true,
          address: true,
          coupon: true,
          couponUsage: true,
        },
      });

      if (coupon) {
        await tx.couponUsage.create({
          data: {
            couponId: coupon.id,
            userId,
            orderId: createdOrder.id,
            couponCode: coupon.code,
            discountAmount,
          },
        });

        await tx.coupon.update({
          where: {
            id: coupon.id,
          },
          data: {
            usedCount: {
              increment: 1,
            },
          },
        });
      }

      await Promise.all(
        cart.items.map((item) =>
          tx.product.update({
            where: { id: item.productId },
            data: {
              stock: {
                decrement: item.quantity,
              },
            },
          }),
        ),
      );

      await tx.cartItem.deleteMany({
        where: {
          cartId: cart.id,
        },
      });

      await tx.notification.create({
        data: {
          userId,
          title: "Order created",
          message: `Your Nexxora order ${createdOrder.orderNumber} has been created.`,
        },
      });

      return createdOrder;
    });

    try {
      await sendOrderCreatedEmail(order.user, order);
    } catch (emailError) {
      console.error("Failed to send order email", emailError);
    }

    return res.status(201).json({
      success: true,
      message: "Order created successfully",
      data: order,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error,
    });
  }
}

export async function updateOrderStatusController(req: Request, res: Response) {
  try {
    const id = getRouteParam(req, "id");
    const { status, paymentStatus } = req.body as {
      status?: OrderStatus;
      paymentStatus?: PaymentStatus;
    };

    if (!status || !Object.values(OrderStatus).includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Valid order status is required",
      });
    }

    if (paymentStatus && !Object.values(PaymentStatus).includes(paymentStatus)) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment status",
      });
    }

    const order = await prisma.order.update({
      where: { id },
      data: {
        status,
        paymentStatus,
      },
    });

    await prisma.notification.create({
      data: {
        userId: order.userId,
        title: "Order status updated",
        message: `Your Nexxora order ${order.orderNumber} is now ${order.status}.`,
      },
    });

    return res.status(200).json({
      success: true,
      message: "Order status updated successfully",
      data: order,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error,
    });
  }
}
