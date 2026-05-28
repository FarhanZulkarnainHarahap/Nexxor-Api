import { NextFunction, Request, Response } from "express";
import { Role } from "../../prisma/generated/prisma/client";

export function roleGuard(role: Role) {
  return function guard(req: Request, res: Response, next: NextFunction) {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    if (req.user.role !== role) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: insufficient role",
      });
    }

    return next();
  };
}
