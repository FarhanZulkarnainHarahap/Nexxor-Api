import { Request } from "express";

export function getRouteParam(req: Request, key: string) {
  const value = req.params[key];
  const normalizedValue = Array.isArray(value) ? value[0] : value;

  if (!normalizedValue) {
    throw new Error(`Missing route parameter: ${key}`);
  }

  return normalizedValue;
}
