import { Request, Response } from "express";
import { AdminRequestStatus, Role } from "../../prisma/generated/prisma/client";
import { prisma } from "../config/prisma";
import { getRouteParam } from "../utils/request";

const publicUserSelect = {
  id: true,
  name: true,
  email: true,
  phone: true,
  avatar: true,
  role: true,
} as const;

export async function createAdminRequestController(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    if (req.user.role === Role.ADMIN) {
      return res.status(400).json({
        success: false,
        message: "Your account already has admin access",
      });
    }

    const { reason, experience, whatsapp, agreed } = req.body as {
      reason?: string;
      experience?: string;
      whatsapp?: string;
      agreed?: boolean;
    };

    if (!reason?.trim() || reason.trim().length < 20) {
      return res.status(400).json({
        success: false,
        message: "Reason must contain at least 20 characters",
      });
    }
    if (!experience?.trim() || experience.trim().length < 20) {
      return res.status(400).json({
        success: false,
        message: "Experience must contain at least 20 characters",
      });
    }
    if (!whatsapp?.trim() || !/^[+\d][\d\s-]{7,18}$/.test(whatsapp.trim())) {
      return res.status(400).json({
        success: false,
        message: "A valid WhatsApp number is required",
      });
    }
    if (agreed !== true) {
      return res.status(400).json({
        success: false,
        message: "You must accept the admin verification agreement",
      });
    }

    const activeRequest = await prisma.adminRequest.findFirst({
      where: {
        userId: req.user.id,
        status: { in: [AdminRequestStatus.PENDING, AdminRequestStatus.APPROVED] },
      },
      orderBy: { createdAt: "desc" },
    });

    if (activeRequest) {
      return res.status(409).json({
        success: false,
        message:
          activeRequest.status === AdminRequestStatus.PENDING
            ? "You already have a pending admin request"
            : "Your admin request has already been approved",
      });
    }

    const request = await prisma.adminRequest.create({
      data: {
        userId: req.user.id,
        reason: reason.trim(),
        experience: experience.trim(),
        whatsapp: whatsapp.trim(),
        agreed: true,
      },
      include: { user: { select: publicUserSelect } },
    });

    return res.status(201).json({
      success: true,
      message: "Admin request submitted successfully",
      data: request,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error,
    });
  }
}

export async function getMyAdminRequestController(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const request = await prisma.adminRequest.findFirst({
      where: { userId: req.user.id },
      orderBy: { createdAt: "desc" },
      include: { user: { select: publicUserSelect } },
    });

    return res.status(200).json({
      success: true,
      message: "Admin request status fetched successfully",
      data: request,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error,
    });
  }
}

export async function getAdminRequestsController(req: Request, res: Response) {
  try {
    const rawStatus = typeof req.query.status === "string" ? req.query.status.toUpperCase() : "";
    const status = Object.values(AdminRequestStatus).includes(rawStatus as AdminRequestStatus)
      ? (rawStatus as AdminRequestStatus)
      : undefined;

    const requests = await prisma.adminRequest.findMany({
      where: status ? { status } : undefined,
      include: { user: { select: publicUserSelect } },
      orderBy: { createdAt: "desc" },
    });

    return res.status(200).json({
      success: true,
      message: "Admin requests fetched successfully",
      data: requests,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error,
    });
  }
}

async function reviewAdminRequest(
  req: Request,
  res: Response,
  status: typeof AdminRequestStatus.APPROVED | typeof AdminRequestStatus.REJECTED,
) {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const id = getRouteParam(req, "id");
    const adminNote =
      typeof req.body.adminNote === "string" ? req.body.adminNote.trim() : "";
    const request = await prisma.adminRequest.findUnique({ where: { id } });

    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Admin request not found",
      });
    }
    if (request.userId === req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Administrators cannot review their own request",
      });
    }
    if (request.status !== AdminRequestStatus.PENDING) {
      return res.status(409).json({
        success: false,
        message: "Only pending requests can be reviewed",
      });
    }
    if (status === AdminRequestStatus.REJECTED && adminNote.length < 5) {
      return res.status(400).json({
        success: false,
        message: "A rejection note of at least 5 characters is required",
      });
    }

    const updatedRequest = await prisma.$transaction(async (tx) => {
      const reviewed = await tx.adminRequest.update({
        where: { id },
        data: { status, adminNote: adminNote || null },
        include: { user: { select: publicUserSelect } },
      });

      if (status === AdminRequestStatus.APPROVED) {
        await tx.user.update({
          where: { id: request.userId },
          data: { role: Role.ADMIN },
        });
      }

      await tx.notification.create({
        data: {
          userId: request.userId,
          title:
            status === AdminRequestStatus.APPROVED
              ? "Admin access approved"
              : "Admin request reviewed",
          message:
            status === AdminRequestStatus.APPROVED
              ? "Your Nexxora admin request was approved. Sign in again to refresh your access."
              : `Your Nexxora admin request was not approved.${adminNote ? ` Note: ${adminNote}` : ""}`,
        },
      });

      return reviewed;
    });

    return res.status(200).json({
      success: true,
      message: `Admin request ${status.toLowerCase()} successfully`,
      data: updatedRequest,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error,
    });
  }
}

export function approveAdminRequestController(req: Request, res: Response) {
  return reviewAdminRequest(req, res, AdminRequestStatus.APPROVED);
}

export function rejectAdminRequestController(req: Request, res: Response) {
  return reviewAdminRequest(req, res, AdminRequestStatus.REJECTED);
}
