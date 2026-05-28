import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../prisma/generated/prisma/client";
import pkg from "pg";

const { Pool } = pkg;

if (!process.env.DIRECT_URL) {
  throw new Error("DIRECT_URL is required in environment variables");
}

const pool = new Pool({
  connectionString: process.env.DIRECT_URL,
});

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const adapter = new PrismaPg(pool);

const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export { prisma };
