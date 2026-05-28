import { Coupon, CouponType, CouponUsage } from "../../prisma/generated/prisma/client";

export type CouponWithUsage = Coupon & {
  usages?: CouponUsage[];
};

export function normalizeCouponCode(code: string) {
  return code.trim().toUpperCase();
}

export function calculateCouponDiscount(coupon: Coupon, subtotal: number) {
  const rawDiscount =
    coupon.type === CouponType.PERCENT
      ? Math.floor((subtotal * coupon.value) / 100)
      : coupon.value;
  const cappedDiscount = coupon.maxDiscount
    ? Math.min(rawDiscount, coupon.maxDiscount)
    : rawDiscount;

  return Math.max(0, Math.min(cappedDiscount, subtotal));
}

export function assertCouponCanBeUsed(
  coupon: CouponWithUsage | null,
  subtotal: number,
) {
  if (!coupon) {
    throw new Error("Coupon code is not valid");
  }

  const now = new Date();

  if (!coupon.isActive) {
    throw new Error("Coupon is not active");
  }

  if (coupon.startsAt && coupon.startsAt > now) {
    throw new Error("Coupon is not available yet");
  }

  if (coupon.expiresAt && coupon.expiresAt < now) {
    throw new Error("Coupon has expired");
  }

  if (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit) {
    throw new Error("Coupon usage limit has been reached");
  }

  if (coupon.minSubtotal > 0 && subtotal < coupon.minSubtotal) {
    throw new Error("Minimum order is not reached for this coupon");
  }

  if (coupon.usages && coupon.usages.length > 0) {
    throw new Error("Coupon has already been used by this account");
  }
}

export function getCouponRemainingUses(coupon: Coupon) {
  if (coupon.usageLimit === null) return null;
  return Math.max(0, coupon.usageLimit - coupon.usedCount);
}
