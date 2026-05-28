import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { CouponType, PrismaClient, Role } from "./generated/prisma/client";
import pkg from "pg";
import bcrypt from "bcrypt";
import { createSlug } from "../src/utils/slug";

const { Pool } = pkg;

if (!process.env.DIRECT_URL) {
  throw new Error("DIRECT_URL is required");
}

const pool = new Pool({
  connectionString: process.env.DIRECT_URL,
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const categories = ["Fashion", "Sneakers", "Accessories", "Electronics", "Lifestyle"];

const products = [
  {
    name: "Nexxora Premium Jacket",
    category: "Fashion",
    price: 1299000,
    stock: 18,
    image:
      "https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=1200&q=80",
    description:
      "A structured premium jacket with refined details for clean city layering.",
  },
  {
    name: "Urban Navy Sneakers",
    category: "Sneakers",
    price: 899000,
    stock: 24,
    image:
      "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=1200&q=80",
    description:
      "Lightweight sneakers with modern cushioning and a polished navy profile.",
  },
  {
    name: "Rose Gold Smart Watch",
    category: "Electronics",
    price: 1599000,
    stock: 15,
    image:
      "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=1200&q=80",
    description:
      "A premium smart watch for daily tracking, notifications, and elegant styling.",
  },
  {
    name: "Minimalist Backpack",
    category: "Lifestyle",
    price: 749000,
    stock: 21,
    image:
      "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=1200&q=80",
    description:
      "A clean everyday backpack with laptop storage and premium water-resistant fabric.",
  },
  {
    name: "Luxury Cotton Hoodie",
    category: "Fashion",
    price: 679000,
    stock: 30,
    image:
      "https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&w=1200&q=80",
    description:
      "Soft heavyweight cotton hoodie with a tailored casual fit.",
  },
  {
    name: "Wireless Headset Pro",
    category: "Electronics",
    price: 1199000,
    stock: 17,
    image:
      "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=1200&q=80",
    description:
      "Immersive wireless audio with long battery life and clear microphone pickup.",
  },
  {
    name: "Classic Leather Wallet",
    category: "Accessories",
    price: 429000,
    stock: 35,
    image:
      "https://images.unsplash.com/photo-1627123424574-724758594e93?auto=format&fit=crop&w=1200&q=80",
    description:
      "Compact genuine leather wallet with refined stitching and practical compartments.",
  },
  {
    name: "Modern Sunglasses",
    category: "Accessories",
    price: 529000,
    stock: 26,
    image:
      "https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&w=1200&q=80",
    description:
      "Modern sunglasses with UV protection and an understated premium silhouette.",
  },
  {
    name: "Elegant Crossbody Bag",
    category: "Fashion",
    price: 849000,
    stock: 14,
    image:
      "https://images.unsplash.com/photo-1590874103328-eac38a683ce7?auto=format&fit=crop&w=1200&q=80",
    description:
      "A versatile crossbody bag for travel, daily essentials, and polished styling.",
  },
  {
    name: "Premium Denim Pants",
    category: "Fashion",
    price: 729000,
    stock: 22,
    image:
      "https://images.unsplash.com/photo-1542272604-787c3835535d?auto=format&fit=crop&w=1200&q=80",
    description:
      "Premium denim pants with durable fabric and a comfortable straight cut.",
  },
  {
    name: "Tech Organizer Pouch",
    category: "Lifestyle",
    price: 379000,
    stock: 40,
    image:
      "https://images.unsplash.com/photo-1622560480605-d83c853bc5c3?auto=format&fit=crop&w=1200&q=80",
    description:
      "A sleek pouch for chargers, cables, and everyday productivity essentials.",
  },
  {
    name: "Signature Navy T-Shirt",
    category: "Fashion",
    price: 349000,
    stock: 50,
    image:
      "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=1200&q=80",
    description:
      "A signature Nexxora tee in soft cotton with a premium daily fit.",
  },
];

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
      cart: {
        create: {},
      },
    },
  });

  console.log("Admin created:", admin.email);

  const categoryRecords = new Map<string, string>();

  for (const categoryName of categories) {
    const category = await prisma.category.upsert({
      where: {
        slug: createSlug(categoryName),
      },
      update: {
        name: categoryName,
      },
      create: {
        name: categoryName,
        slug: createSlug(categoryName),
      },
    });

    categoryRecords.set(categoryName, category.id);
  }

  for (const product of products) {
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
        slug: createSlug(product.name),
        categoryId,
      },
      create: {
        ...productData,
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

  console.log("Nexxora categories, products, and coupons seeded");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
