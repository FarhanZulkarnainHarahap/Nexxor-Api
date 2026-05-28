import { Request, Response } from "express";
import { prisma } from "../config/prisma";
import { getRouteParam } from "../utils/request";

function calculateCartTotal(items: Array<{ product: { price: number }; quantity: number }>) {
  return items.reduce((total, item) => total + item.product.price * item.quantity, 0);
}

export async function getCartController(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const cart = await prisma.cart.upsert({
      where: { userId: req.user.id },
      update: {},
      create: { userId: req.user.id },
      include: {
        items: {
          include: {
            product: {
              include: {
                category: true,
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
        },
      },
    });

    return res.status(200).json({
      success: true,
      message: "Cart fetched successfully",
      data: {
        ...cart,
        total: calculateCartTotal(cart.items),
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error,
    });
  }
}

export async function addToCartController(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const { productId, quantity } = req.body as {
      productId?: string;
      quantity?: number;
    };

    if (!productId || !quantity || quantity < 1) {
      return res.status(400).json({
        success: false,
        message: "ProductId and valid quantity are required",
      });
    }

    const product = await prisma.product.findUnique({ where: { id: productId } });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    const cart = await prisma.cart.upsert({
      where: { userId: req.user.id },
      update: {},
      create: { userId: req.user.id },
    });

    const currentItem = await prisma.cartItem.findUnique({
      where: {
        cartId_productId: {
          cartId: cart.id,
          productId,
        },
      },
    });

    const nextQuantity = (currentItem?.quantity ?? 0) + quantity;

    if (nextQuantity > product.stock) {
      return res.status(400).json({
        success: false,
        message: "Requested quantity exceeds product stock",
      });
    }

    const item = await prisma.cartItem.upsert({
      where: {
        cartId_productId: {
          cartId: cart.id,
          productId,
        },
      },
      update: {
        quantity: nextQuantity,
      },
      create: {
        cartId: cart.id,
        productId,
        quantity,
      },
      include: {
        product: {
          include: {
            category: true,
          },
        },
      },
    });

    return res.status(200).json({
      success: true,
      message: "Product added to cart",
      data: item,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error,
    });
  }
}

export async function updateCartItemController(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const itemId = getRouteParam(req, "itemId");
    const { quantity } = req.body as { quantity?: number };

    if (!quantity || quantity < 1) {
      return res.status(400).json({
        success: false,
        message: "Quantity must be at least 1",
      });
    }

    const item = await prisma.cartItem.findFirst({
      where: {
        id: itemId,
        cart: {
          userId: req.user.id,
        },
      },
      include: {
        product: {
          select: {
            stock: true,
          },
        },
      },
    });

    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Cart item not found",
      });
    }

    if (quantity > item.product.stock) {
      return res.status(400).json({
        success: false,
        message: "Requested quantity exceeds product stock",
      });
    }

    const updatedItem = await prisma.cartItem.update({
      where: { id: itemId },
      data: { quantity },
      include: {
        product: {
          include: {
            category: true,
          },
        },
      },
    });

    return res.status(200).json({
      success: true,
      message: "Cart item updated successfully",
      data: updatedItem,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error,
    });
  }
}

export async function removeCartItemController(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const itemId = getRouteParam(req, "itemId");
    const item = await prisma.cartItem.findFirst({
      where: {
        id: itemId,
        cart: {
          userId: req.user.id,
        },
      },
    });

    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Cart item not found",
      });
    }

    await prisma.cartItem.delete({ where: { id: itemId } });

    return res.status(200).json({
      success: true,
      message: "Cart item removed successfully",
      data: { id: itemId },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error,
    });
  }
}

export async function clearCartController(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const cart = await prisma.cart.findUnique({
      where: { userId: req.user.id },
    });

    if (cart) {
      await prisma.cartItem.deleteMany({
        where: { cartId: cart.id },
      });
    }

    return res.status(200).json({
      success: true,
      message: "Cart cleared successfully",
      data: { userId: req.user.id },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error,
    });
  }
}
