import { Request, Response } from "express";
import { prisma } from "../config/prisma";
import { getRouteParam } from "../utils/request";

type AddressBody = {
  label?: string;
  recipientName?: string;
  recipientPhone?: string;
  detail?: string;
  rajaongkirId?: string;
  rajaongkirLabel?: string;
  provinceName?: string;
  cityName?: string;
  districtName?: string;
  subdistrictName?: string;
  zipCode?: string;
  isPrimary?: boolean;
};

function validateAddressBody(body: AddressBody) {
  return Boolean(
    body.label &&
      body.recipientName &&
      body.recipientPhone &&
      body.detail &&
      body.rajaongkirId &&
      body.rajaongkirLabel &&
      body.provinceName &&
      body.cityName &&
      body.districtName,
  );
}

export async function getAddressesController(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const addresses = await prisma.address.findMany({
      where: {
        userId: req.user.id,
      },
      orderBy: [{ isPrimary: "desc" }, { createdAt: "desc" }],
    });

    return res.status(200).json({
      success: true,
      message: "Addresses fetched successfully",
      data: addresses,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error,
    });
  }
}

export async function createAddressController(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const body = req.body as AddressBody;

    if (!validateAddressBody(body)) {
      return res.status(400).json({
        success: false,
        message: "Complete address and RajaOngkir destination data are required",
      });
    }

    const shouldBePrimary =
      typeof body.isPrimary === "boolean"
        ? body.isPrimary
        : (await prisma.address.count({ where: { userId: req.user.id } })) === 0;

    const address = await prisma.$transaction(async (tx) => {
      if (shouldBePrimary) {
        await tx.address.updateMany({
          where: {
            userId: req.user!.id,
          },
          data: {
            isPrimary: false,
          },
        });
      }

      return tx.address.create({
        data: {
          userId: req.user!.id,
          label: body.label!,
          recipientName: body.recipientName!,
          recipientPhone: body.recipientPhone!,
          detail: body.detail!,
          rajaongkirId: body.rajaongkirId!,
          rajaongkirLabel: body.rajaongkirLabel!,
          provinceName: body.provinceName!,
          cityName: body.cityName!,
          districtName: body.districtName!,
          subdistrictName: body.subdistrictName,
          zipCode: body.zipCode,
          isPrimary: shouldBePrimary,
        },
      });
    });

    return res.status(201).json({
      success: true,
      message: "Address created successfully",
      data: address,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error,
    });
  }
}

export async function updateAddressController(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const id = getRouteParam(req, "id");
    const existingAddress = await prisma.address.findFirst({
      where: {
        id,
        userId: req.user.id,
      },
    });

    if (!existingAddress) {
      return res.status(404).json({
        success: false,
        message: "Address not found",
      });
    }

    const body = req.body as AddressBody;
    const shouldBePrimary = body.isPrimary === true;

    const address = await prisma.$transaction(async (tx) => {
      if (shouldBePrimary) {
        await tx.address.updateMany({
          where: {
            userId: req.user!.id,
          },
          data: {
            isPrimary: false,
          },
        });
      }

      return tx.address.update({
        where: {
          id,
        },
        data: {
          ...(body.label ? { label: body.label } : {}),
          ...(body.recipientName ? { recipientName: body.recipientName } : {}),
          ...(body.recipientPhone ? { recipientPhone: body.recipientPhone } : {}),
          ...(body.detail ? { detail: body.detail } : {}),
          ...(body.rajaongkirId ? { rajaongkirId: body.rajaongkirId } : {}),
          ...(body.rajaongkirLabel ? { rajaongkirLabel: body.rajaongkirLabel } : {}),
          ...(body.provinceName ? { provinceName: body.provinceName } : {}),
          ...(body.cityName ? { cityName: body.cityName } : {}),
          ...(body.districtName ? { districtName: body.districtName } : {}),
          ...(body.subdistrictName !== undefined ? { subdistrictName: body.subdistrictName } : {}),
          ...(body.zipCode !== undefined ? { zipCode: body.zipCode } : {}),
          ...(typeof body.isPrimary === "boolean" ? { isPrimary: body.isPrimary } : {}),
        },
      });
    });

    return res.status(200).json({
      success: true,
      message: "Address updated successfully",
      data: address,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error,
    });
  }
}

export async function deleteAddressController(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const id = getRouteParam(req, "id");
    const existingAddress = await prisma.address.findFirst({
      where: {
        id,
        userId: req.user.id,
      },
    });

    if (!existingAddress) {
      return res.status(404).json({
        success: false,
        message: "Address not found",
      });
    }

    await prisma.address.delete({
      where: {
        id,
      },
    });

    return res.status(200).json({
      success: true,
      message: "Address deleted successfully",
      data: existingAddress,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error,
    });
  }
}
