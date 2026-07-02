import { Request, Response } from "express";
import { Role } from "../../prisma/generated/prisma/client";
import { prisma } from "../config/prisma";
import { getRouteParam } from "../utils/request";
import { createSlug, uniqueSlug } from "../utils/slug";
import { uploadImageBuffer } from "../utils/uploadImage";
import { fashionProductDetails, fashionProducts, fashionCategories } from "../data/fashion-products";

type SortOption = "newest" | "price-low" | "price-high" | "rating" | "best-selling";

export async function getProductsController(req: Request, res: Response) {
  try {
    const { search, category, sort, stock, minPrice, maxPrice, featured } = req.query as {
      search?: string;
      category?: string;
      sort?: SortOption;
      stock?: "in-stock" | "out-of-stock";
      minPrice?: string;
      maxPrice?: string;
      featured?: string;
    };
    const parsedMinPrice = minPrice ? Number(minPrice) : undefined;
    const parsedMaxPrice = maxPrice ? Number(maxPrice) : undefined;

    const products = await prisma.product.findMany({
      where: {
        OR: search
          ? [
              { name: { contains: search, mode: "insensitive" } },
              { description: { contains: search, mode: "insensitive" } },
              { tags: { has: search.toLowerCase() } },
            ]
          : undefined,
        category: category ? { slug: category } : undefined,
        stock:
          stock === "in-stock"
            ? { gt: 0 }
            : stock === "out-of-stock"
              ? { lte: 0 }
              : undefined,
        price:
          Number.isFinite(parsedMinPrice) || Number.isFinite(parsedMaxPrice)
            ? {
                gte: Number.isFinite(parsedMinPrice) ? parsedMinPrice : undefined,
                lte: Number.isFinite(parsedMaxPrice) ? parsedMaxPrice : undefined,
              }
            : undefined,
        isFeatured: featured === "true" ? true : undefined,
      },
      include: {
        category: true,
      },
      orderBy:
        sort === "price-low"
          ? { price: "asc" }
          : sort === "price-high"
            ? { price: "desc" }
            : sort === "rating"
              ? { rating: "desc" }
              : sort === "best-selling"
                ? { sold: "desc" }
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
    const product = await prisma.product.findFirst({
      where: {
        OR: [{ slug }, { id: slug }],
      },
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
    const { name, description, price, stock, categoryId, isFeatured } = req.body as {
      name?: string;
      description?: string;
      price?: string;
      stock?: string;
      categoryId?: string;
      isFeatured?: string;
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
        isFeatured: isFeatured === "true",
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
    const { name, description, price, stock, categoryId, isFeatured } = req.body as {
      name?: string;
      description?: string;
      price?: string;
      stock?: string;
      categoryId?: string;
      isFeatured?: string;
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
        isFeatured: typeof isFeatured === "string" ? isFeatured === "true" : undefined,
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

export async function seedFashionProductsController(_req: Request, res: Response) {
  try {
    const categoryRecords = new Map<string, string>();

    for (const categorySeed of fashionCategories) {
      const category = await prisma.category.upsert({
        where: { slug: createSlug(categorySeed.name) },
        update: {
          name: categorySeed.name,
          description: categorySeed.description,
        },
        create: {
          name: categorySeed.name,
          slug: createSlug(categorySeed.name),
          description: categorySeed.description,
        },
      });
      categoryRecords.set(categorySeed.name, category.id);
    }

    for (const product of fashionProducts) {
      const { category, ...data } = product;
      const categoryId = categoryRecords.get(category);
      if (!categoryId) throw new Error(`Missing category ${category}`);

      await prisma.product.upsert({
        where: { slug: createSlug(product.name) },
        update: {
          ...data,
          ...fashionProductDetails(product),
          categoryId,
        },
        create: {
          ...data,
          ...fashionProductDetails(product),
          slug: createSlug(product.name),
          categoryId,
        },
      });
    }

    return res.status(200).json({
      success: true,
      message: "24 fashion products seeded successfully",
      data: { categories: fashionCategories.length, products: fashionProducts.length },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to seed fashion products",
      error,
    });
  }
}
