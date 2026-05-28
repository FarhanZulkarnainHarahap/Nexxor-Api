import { Response } from "express";

export function successResponse<T>(
  res: Response,
  message: string,
  data: T,
  status = 200,
) {
  return res.status(status).json({
    success: true,
    message,
    data,
  });
}

export function errorResponse(
  res: Response,
  message: string,
  status = 500,
  error?: unknown,
) {
  return res.status(status).json({
    success: false,
    message,
    error,
  });
}
