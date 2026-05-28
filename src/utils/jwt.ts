import "dotenv/config";
import jwt from "jsonwebtoken";
import { Role } from "../../prisma/generated/prisma/client";

type JwtPayload = {
  id: string;
  email: string;
  role: Role;
};

function getJwtSecret() {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is required in environment variables");
  }

  return process.env.JWT_SECRET;
}

export function signToken(payload: JwtPayload) {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: "7d" });
}

export function verifyJwtToken(token: string) {
  return jwt.verify(token, getJwtSecret()) as JwtPayload;
}
