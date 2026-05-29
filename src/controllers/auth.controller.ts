import { Request, Response } from "express";
import bcrypt from "bcrypt";
import { randomBytes } from "crypto";
import { prisma } from "../config/prisma";
import { sendAccountVerificationEmail } from "../utils/email";
import { signToken } from "../utils/jwt";

function sanitizeUser<
  T extends {
    password?: string;
    emailVerificationToken?: string | null;
    emailVerificationExpires?: Date | null;
  },
>(user: T) {
  const {
    password: _password,
    emailVerificationToken: _emailVerificationToken,
    emailVerificationExpires: _emailVerificationExpires,
    ...safeUser
  } = user;
  return safeUser;
}

function createEmailVerificationToken() {
  return randomBytes(32).toString("hex");
}

function createVerificationExpiry() {
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 24);
  return expiresAt;
}

async function sendVerificationSafely(user: { name: string; email: string }, token: string) {
  try {
    await sendAccountVerificationEmail(user, token);
  } catch (emailError) {
    console.error("Failed to send verification email", emailError);
  }
}

export async function registerController(req: Request, res: Response) {
  try {
    const { name, email, password } = req.body as {
      name?: string;
      email?: string;
      password?: string;
    };

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Name, email, and password are required",
      });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "Email is already registered",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const verificationToken = createEmailVerificationToken();
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        emailVerificationToken: verificationToken,
        emailVerificationExpires: createVerificationExpiry(),
        cart: {
          create: {},
        },
      },
    });

    await sendVerificationSafely(user, verificationToken);

    return res.status(201).json({
      success: true,
      message: "Register successful. Please verify your email.",
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

export async function loginController(req: Request, res: Response) {
  try {
    const { email, password } = req.body as {
      email?: string;
      password?: string;
    };

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    if (!user.emailVerifiedAt && user.emailVerificationToken && user.role !== "ADMIN") {
      return res.status(403).json({
        success: false,
        message: "Please verify your email before login",
      });
    }

    const token = signToken({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    return res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        token,
        user: sanitizeUser(user),
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

export async function verifyEmailController(req: Request, res: Response) {
  try {
    const token = (req.body as { token?: string }).token ?? req.query.token;

    if (!token || typeof token !== "string") {
      return res.status(400).json({
        success: false,
        message: "Verification token is required",
      });
    }

    const user = await prisma.user.findFirst({
      where: {
        emailVerificationToken: token,
        emailVerificationExpires: {
          gt: new Date(),
        },
      },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Verification token is invalid or expired",
      });
    }

    const verifiedUser = await prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        emailVerifiedAt: new Date(),
        emailVerificationToken: null,
        emailVerificationExpires: null,
      },
    });

    return res.status(200).json({
      success: true,
      message: "Email verified successfully",
      data: sanitizeUser(verifiedUser),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error,
    });
  }
}

export async function resendVerificationController(req: Request, res: Response) {
  try {
    const { email } = req.body as { email?: string };

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    const user = await prisma.user.findUnique({
      where: {
        email,
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (user.emailVerifiedAt) {
      return res.status(200).json({
        success: true,
        message: "Email is already verified",
        data: sanitizeUser(user),
      });
    }

    const verificationToken = createEmailVerificationToken();
    const updatedUser = await prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        emailVerificationToken: verificationToken,
        emailVerificationExpires: createVerificationExpiry(),
      },
    });

    await sendVerificationSafely(updatedUser, verificationToken);

    return res.status(200).json({
      success: true,
      message: "Verification email sent successfully",
      data: sanitizeUser(updatedUser),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error,
    });
  }
}

export async function getMeController(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "User fetched successfully",
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
