import { Request, Response } from "express";
import {
  calculateDomesticCost,
  searchDomesticDestination,
} from "../config/rajaongkir";

export async function searchShippingDestinationController(req: Request, res: Response) {
  try {
    const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
    const limit = typeof req.query.limit === "string" ? Number(req.query.limit) : 10;

    if (search.length < 3) {
      return res.status(400).json({
        success: false,
        message: "Search keyword must be at least 3 characters",
      });
    }

    const destinations = await searchDomesticDestination(search, Number.isFinite(limit) ? limit : 10);

    return res.status(200).json({
      success: true,
      message: "Shipping destinations fetched successfully",
      data: destinations,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Internal server error",
      error,
    });
  }
}

export async function calculateShippingCostController(req: Request, res: Response) {
  try {
    const { destinationId, weight, courier, price } = req.body as {
      destinationId?: string;
      weight?: number;
      courier?: string;
      price?: "lowest" | "highest";
    };

    const origin = process.env.RAJAONGKIR_ORIGIN_ID;

    if (!origin) {
      return res.status(500).json({
        success: false,
        message: "RAJAONGKIR_ORIGIN_ID is required in environment variables",
      });
    }

    if (!destinationId) {
      return res.status(400).json({
        success: false,
        message: "Destination is required",
      });
    }

    const packageWeight =
      typeof weight === "number" && weight > 0
        ? weight
        : Number(process.env.RAJAONGKIR_DEFAULT_WEIGHT_GRAM ?? 1000);
    const courierCode = courier ?? process.env.RAJAONGKIR_DEFAULT_COURIER ?? "jne";

    const costs = await calculateDomesticCost({
      origin,
      destination: destinationId,
      weight: packageWeight,
      courier: courierCode,
      price,
    });

    return res.status(200).json({
      success: true,
      message: "Shipping cost calculated successfully",
      data: costs,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Internal server error",
      error,
    });
  }
}
