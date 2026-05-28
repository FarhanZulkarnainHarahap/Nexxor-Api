import { Request, Response } from "express";
import { prisma } from "../config/prisma";
import { uploadImageBuffer } from "../utils/uploadImage";

function sanitizeUser<T extends { password?: string }>(user: T) {
  const { password: _password, ...safeUser } = user;
  return safeUser;
}

export async function getProfileController(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        addresses: {
          orderBy: [{ isPrimary: "desc" }, { createdAt: "desc" }],
        },
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Profile fetched successfully",
      data: sanitizeUser(user),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error,
    });
  }
}

export async function updateProfileController(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const { name, phone, address } = req.body as {
      name?: string;
      phone?: string;
      address?: string;
    };

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        name,
        phone,
        address,
      },
    });

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      data: sanitizeUser(user),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error,
    });
  }
}

export async function updateAvatarController(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Avatar image is required",
      });
    }

    const uploadedImage = await uploadImageBuffer(req.file.buffer, "nexxora/avatars");
    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        avatar: uploadedImage.secure_url,
      },
    });

    return res.status(200).json({
      success: true,
      message: "Avatar updated successfully",
      data: sanitizeUser(user),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error,
    });
  }
}
