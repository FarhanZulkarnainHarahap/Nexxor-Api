import { Request, Response } from "express";
import { prisma } from "../config/prisma";
import { getRouteParam } from "../utils/request";
import { createSlug } from "../utils/slug";

export async function getCategoriesController(_req: Request, res: Response) {
  try {
    const categories = await prisma.category.findMany({
      include: {
        _count: {
          select: {
            products: true,
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    });

    return res.status(200).json({
      success: true,
      message: "Categories fetched successfully",
      data: categories,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error,
    });
  }
}

export async function createCategoryController(req: Request, res: Response) {
  try {
    const { name } = req.body as { name?: string };

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Category name is required",
      });
    }

    const category = await prisma.category.create({
      data: {
        name,
        slug: createSlug(name),
      },
    });

    return res.status(201).json({
      success: true,
      message: "Category created successfully",
      data: category,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error,
    });
  }
}

export async function updateCategoryController(req: Request, res: Response) {
  try {
    const id = getRouteParam(req, "id");
    const { name } = req.body as { name?: string };

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Category name is required",
      });
    }

    const category = await prisma.category.update({
      where: { id },
      data: {
        name,
        slug: createSlug(name),
      },
    });

    return res.status(200).json({
      success: true,
      message: "Category updated successfully",
      data: category,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error,
    });
  }
}

export async function deleteCategoryController(req: Request, res: Response) {
  try {
    const id = getRouteParam(req, "id");

    await prisma.category.delete({
      where: { id },
    });

    return res.status(200).json({
      success: true,
      message: "Category deleted successfully",
      data: { id },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error,
    });
  }
}
