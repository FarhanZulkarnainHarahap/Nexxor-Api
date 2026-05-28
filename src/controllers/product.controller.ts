import { Request, Response } from "express";
import { Role } from "../../prisma/generated/prisma/client";
import { prisma } from "../config/prisma";
import { getRouteParam } from "../utils/request";
import { createSlug, uniqueSlug } from "../utils/slug";
import { uploadImageBuffer } from "../utils/uploadImage";

type SortOption = "newest" | "price-low" | "price-high";

export async function getProductsController(req: Request, res: Response) {
  try {
    const { search, category, sort } = req.query as {
      search?: string;
      category?: string;
      sort?: SortOption;
    };

    const products = await prisma.product.findMany({
      where: {
        name: search ? { contains: search, mode: "insensitive" } : undefined,
        category: category ? { slug: category } : undefined,
      },
      include: {
        category: true,
      },
      orderBy:
        sort === "price-low"
          ? { price: "asc" }
          : sort === "price-high"
            ? { price: "desc" }
            : { createdAt: "desc" },
    });

    return res.status(200).json({
      success: true,
      message: "Products fetched successfully",
      data: products,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error,
    });
  }
}

export async function getProductDetailController(req: Request, res: Response) {
  try {
    const slug = getRouteParam(req, "slug");
    const product = await prisma.product.findUnique({
      where: { slug },
      include: { category: true },
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Product fetched successfully",
      data: product,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error,
    });
  }
}

export async function createProductController(req: Request, res: Response) {
  try {
    const { name, description, price, stock, categoryId } = req.body as {
      name?: string;
      description?: string;
      price?: string;
      stock?: string;
      categoryId?: string;
    };

    if (!name || !description || !price || !stock || !categoryId) {
      return res.status(400).json({
        success: false,
        message: "Name, description, price, stock, and categoryId are required",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Product image is required",
      });
    }

    const uploadedImage = await uploadImageBuffer(req.file.buffer, "nexxora/products");
    const product = await prisma.product.create({
      data: {
        name,
        slug: uniqueSlug(name),
        description,
        price: Number(price),
        stock: Number(stock),
        image: uploadedImage.secure_url,
        categoryId,
      },
      include: { category: true },
    });

    return res.status(201).json({
      success: true,
      message: "Product created successfully",
      data: product,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error,
    });
  }
}

export async function updateProductController(req: Request, res: Response) {
  try {
    const id = getRouteParam(req, "id");
    const { name, description, price, stock, categoryId } = req.body as {
      name?: string;
      description?: string;
      price?: string;
      stock?: string;
      categoryId?: string;
    };

    const currentProduct = await prisma.product.findUnique({ where: { id } });

    if (!currentProduct) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    const uploadedImage = req.file
      ? await uploadImageBuffer(req.file.buffer, "nexxora/products")
      : undefined;

    const product = await prisma.product.update({
      where: { id },
      data: {
        name,
        slug: name ? createSlug(name) : undefined,
        description,
        price: price ? Number(price) : undefined,
        stock: stock ? Number(stock) : undefined,
        image: uploadedImage?.secure_url,
        categoryId,
      },
      include: { category: true },
    });

    return res.status(200).json({
      success: true,
      message: "Product updated successfully",
      data: product,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error,
    });
  }
}

export async function deleteProductController(req: Request, res: Response) {
  try {
    const id = getRouteParam(req, "id");

    await prisma.product.delete({
      where: { id },
    });

    return res.status(200).json({
      success: true,
      message: "Product deleted successfully",
      data: { id, roleRequired: Role.ADMIN },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error,
    });
  }
}
