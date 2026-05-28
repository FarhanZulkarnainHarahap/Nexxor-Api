import { NextFunction, Request, Response } from "express";
import { verifyJwtToken } from "../utils/jwt";

export function verifyToken(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: token is required",
      });
    }

    const token = authHeader.split(" ")[1];
    req.user = verifyJwtToken(token);

    return next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized: invalid token",
      error,
    });
  }
}
