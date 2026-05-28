import { Request, Response } from "express";
import { CouponType, Role } from "../../prisma/generated/prisma/client";
import { prisma } from "../config/prisma";
import {
  assertCouponCanBeUsed,
  calculateCouponDiscount,
  getCouponRemainingUses,
  normalizeCouponCode,
} from "../utils/coupon";
import { getRouteParam } from "../utils/request";

function mapCouponStatus(coupon: {
  isActive: boolean;
  startsAt: Date | null;
  expiresAt: Date | null;
  usageLimit: number | null;
  usedCount: number;
}) {
  const now = new Date();

  if (!coupon.isActive) return "INACTIVE";
  if (coupon.startsAt && coupon.startsAt > now) return "SCHEDULED";
  if (coupon.expiresAt && coupon.expiresAt < now) return "EXPIRED";
  if (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit) return "USED_UP";

  return "AVAILABLE";
}

export async function getCouponsController(req: Request, res: Response) {
  try {
    const isAdmin = req.user?.role === Role.ADMIN;
    const coupons = await prisma.coupon.findMany({
      where: isAdmin ? undefined : { isActive: true },
      orderBy: {
        createdAt: "desc",
      },
      include: {
        usages: isAdmin
          ? {
              select: {
                id: true,
                userId: true,
                orderId: true,
                couponCode: true,
                discountAmount: true,
                usedAt: true,
              },
              orderBy: {
                usedAt: "desc",
              },
            }
          : false,
      },
    });

    const data = coupons.map((coupon) => ({
      ...coupon,
      status: mapCouponStatus(coupon),
      remainingUses: getCouponRemainingUses(coupon),
    }));

    return res.status(200).json({
      success: true,
      message: "Coupons fetched successfully",
      data,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error,
    });
  }
}

export async function validateCouponController(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const { code, subtotal } = req.body as {
      code?: string;
      subtotal?: number;
    };

    if (!code || typeof subtotal !== "number") {
      return res.status(400).json({
        success: false,
        message: "Coupon code and subtotal are required",
      });
    }

    const coupon = await prisma.coupon.findUnique({
      where: {
        code: normalizeCouponCode(code),
      },
      include: {
        usages: {
          where: {
            userId: req.user.id,
          },
        },
      },
    });

    try {
      assertCouponCanBeUsed(coupon, subtotal);
    } catch (couponError) {
      return res.status(400).json({
        success: false,
        message:
          couponError instanceof Error ? couponError.message : "Coupon code is not valid",
      });
    }

    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: "Coupon not found",
      });
    }

    const discount = calculateCouponDiscount(coupon, subtotal);

    return res.status(200).json({
      success: true,
      message: "Coupon validated successfully",
      data: {
        code: coupon.code,
        coupon: {
          id: coupon.id,
          code: coupon.code,
          name: coupon.name,
          description: coupon.description,
          type: coupon.type,
          value: coupon.value,
          minSubtotal: coupon.minSubtotal,
          maxDiscount: coupon.maxDiscount,
          usedCount: coupon.usedCount,
          usageLimit: coupon.usageLimit,
          remainingUses: getCouponRemainingUses(coupon),
          status: mapCouponStatus(coupon),
        },
        discount,
        alreadyUsed: false,
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

export async function createCouponController(req: Request, res: Response) {
  try {
    const {
      code,
      name,
      description,
      type,
      value,
      minSubtotal,
      maxDiscount,
      usageLimit,
      isActive,
      startsAt,
      expiresAt,
    } = req.body as {
      code?: string;
      name?: string;
      description?: string;
      type?: CouponType;
      value?: number;
      minSubtotal?: number;
      maxDiscount?: number | null;
      usageLimit?: number | null;
      isActive?: boolean;
      startsAt?: string | null;
      expiresAt?: string | null;
    };

    if (!code || !name || !type || typeof value !== "number") {
      return res.status(400).json({
        success: false,
        message: "Code, name, type, and value are required",
      });
    }

    if (!Object.values(CouponType).includes(type)) {
      return res.status(400).json({
        success: false,
        message: "Invalid coupon type",
      });
    }

    const coupon = await prisma.coupon.create({
      data: {
        code: normalizeCouponCode(code),
        name,
        description,
        type,
        value,
        minSubtotal: minSubtotal ?? 0,
        maxDiscount: maxDiscount ?? null,
        usageLimit: usageLimit ?? null,
        isActive: isActive ?? true,
        startsAt: startsAt ? new Date(startsAt) : null,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      },
    });

    return res.status(201).json({
      success: true,
      message: "Coupon created successfully",
      data: coupon,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error,
    });
  }
}

export async function updateCouponController(req: Request, res: Response) {
  try {
    const id = getRouteParam(req, "id");
    const {
      code,
      name,
      description,
      type,
      value,
      minSubtotal,
      maxDiscount,
      usageLimit,
      isActive,
      startsAt,
      expiresAt,
    } = req.body as {
      code?: string;
      name?: string;
      description?: string;
      type?: CouponType;
      value?: number;
      minSubtotal?: number;
      maxDiscount?: number | null;
      usageLimit?: number | null;
      isActive?: boolean;
      startsAt?: string | null;
      expiresAt?: string | null;
    };

    if (type && !Object.values(CouponType).includes(type)) {
      return res.status(400).json({
        success: false,
        message: "Invalid coupon type",
      });
    }

    const coupon = await prisma.coupon.update({
      where: { id },
      data: {
        ...(code ? { code: normalizeCouponCode(code) } : {}),
        ...(name ? { name } : {}),
        ...(description !== undefined ? { description } : {}),
        ...(type ? { type } : {}),
        ...(typeof value === "number" ? { value } : {}),
        ...(typeof minSubtotal === "number" ? { minSubtotal } : {}),
        ...(maxDiscount !== undefined ? { maxDiscount } : {}),
        ...(usageLimit !== undefined ? { usageLimit } : {}),
        ...(typeof isActive === "boolean" ? { isActive } : {}),
        ...(startsAt !== undefined ? { startsAt: startsAt ? new Date(startsAt) : null } : {}),
        ...(expiresAt !== undefined ? { expiresAt: expiresAt ? new Date(expiresAt) : null } : {}),
      },
    });

    return res.status(200).json({
      success: true,
      message: "Coupon updated successfully",
      data: coupon,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error,
    });
  }
}

export async function deleteCouponController(req: Request, res: Response) {
  try {
    const id = getRouteParam(req, "id");

    const coupon = await prisma.coupon.update({
      where: { id },
      data: {
        isActive: false,
      },
    });

    return res.status(200).json({
      success: true,
      message: "Coupon disabled successfully",
      data: coupon,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error,
    });
  }
}
