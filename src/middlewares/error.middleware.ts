import { NextFunction, Request, Response } from "express";

export function notFoundHandler(req: Request, res: Response) {
  return res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
  });
}

export function errorHandler(
  error: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  return res.status(500).json({
    success: false,
    message: error.message || "Internal server error",
    error,
  });
}
