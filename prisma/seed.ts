import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { CouponType, PrismaClient, Role } from "./generated/prisma/client";
import pkg from "pg";
import bcrypt from "bcrypt";
import { createSlug } from "../src/utils/slug";
import {
  fashionCategories,
  fashionProductDetails,
  fashionProducts,
} from "../src/data/fashion-products";

const { Pool } = pkg;

if (!process.env.DIRECT_URL) {
  throw new Error("DIRECT_URL is required");
}

const pool = new Pool({
  connectionString: process.env.DIRECT_URL,
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const coupons = [
  {
    code: "NEXXORA10",
    name: "Nexxora 10",
    description: "10% discount for selected orders.",
    type: CouponType.PERCENT,
    value: 10,
    minSubtotal: 0,
    maxDiscount: 100000,
    usageLimit: 500,
  },
  {
    code: "WELCOME15",
    name: "Welcome 15",
    description: "15% discount for new Nexxora customers.",
    type: CouponType.PERCENT,
    value: 15,
    minSubtotal: 150000,
    maxDiscount: 150000,
    usageLimit: 300,
  },
  {
    code: "SAVE25",
    name: "Save 25",
    description: "Rp25.000 discount for larger baskets.",
    type: CouponType.FIXED,
    value: 25000,
    minSubtotal: 250000,
    maxDiscount: null,
    usageLimit: 250,
  },
];

async function main() {
  const password = await bcrypt.hash("admin123", 10);
  const userPassword = await bcrypt.hash("user12345", 10);

  const admin = await prisma.user.upsert({
    where: {
      email: "admin@nexxora.com",
    },
    update: {},
    create: {
      name: "Nexxora Admin",
      email: "admin@nexxora.com",
      password,
      role: Role.ADMIN,
      emailVerifiedAt: new Date(),
      cart: {
        create: {},
      },
    },
  });

  console.log("Admin created:", admin.email);

  const customer = await prisma.user.upsert({
    where: { email: "user@nexxora.com" },
    update: {},
    create: {
      name: "Nexxora Customer",
      email: "user@nexxora.com",
      password: userPassword,
      role: Role.USER,
      emailVerifiedAt: new Date(),
      cart: { create: {} },
    },
  });

  console.log("Customer created:", customer.email);

  const categoryRecords = new Map<string, string>();

  for (const categorySeed of fashionCategories) {
    const category = await prisma.category.upsert({
      where: {
        slug: createSlug(categorySeed.name),
      },
      update: {
        name: categorySeed.name,
        description: categorySeed.description,
      },
      create: {
        name: categorySeed.name,
        slug: createSlug(categorySeed.name),
        description: categorySeed.description,
      },
    });

    categoryRecords.set(categorySeed.name, category.id);
  }

  for (const product of fashionProducts) {
    const { category, ...productData } = product;
    const categoryId = categoryRecords.get(category);

    if (!categoryId) {
      throw new Error(`Missing category ${category}`);
    }

    await prisma.product.upsert({
      where: {
        slug: createSlug(product.name),
      },
      update: {
        ...productData,
        ...fashionProductDetails(product),
        slug: createSlug(product.name),
        categoryId,
      },
      create: {
        ...productData,
        ...fashionProductDetails(product),
        slug: createSlug(product.name),
        categoryId,
      },
    });
  }

  for (const coupon of coupons) {
    await prisma.coupon.upsert({
      where: {
        code: coupon.code,
      },
      update: coupon,
      create: coupon,
    });
  }

  console.log("Nexxora users, 8 fashion categories, 24 products, and coupons seeded");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
