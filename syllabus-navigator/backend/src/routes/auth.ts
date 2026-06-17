import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../db/client.js";
import { authenticate } from "../middleware/auth.js";
import { logger } from "../config/logger.js";
import { config } from "../config/index.js";
import { UserRole } from "../types/index.js";

const router = Router();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  name: z.string().min(1).max(255),
  role: z.nativeEnum(UserRole).optional().default(UserRole.STUDENT),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

function signToken(userId: string, email: string, role: UserRole): string {
  return jwt.sign(
    { sub: userId, email, role },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn as string }
  );
}

router.post("/register", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = registerSchema.parse(req.body);

    const existing = await prisma.user.findUnique({ where: { email: body.email } });
    if (existing) {
      res.status(409).json({ error: "Email already registered" });
      return;
    }

    const passwordHash = await bcrypt.hash(body.password, 12);

    const user = await prisma.user.create({
      data: {
        email: body.email,
        name: body.name,
        role: body.role,
        passwordHash,
      },
    });

    const token = signToken(user.id, user.email, user.role);

    logger.info("User registered", { userId: user.id, role: user.role });

    res.status(201).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: "Validation failed", details: err.errors });
      return;
    }
    next(err);
  }
});

router.post("/login", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { email: body.email } });
    if (!user) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    const valid = await bcrypt.compare(body.password, user.passwordHash);
    if (!valid) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    const token = signToken(user.id, user.email, user.role);

    logger.info("User logged in", { userId: user.id });

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: "Validation failed", details: err.errors });
      return;
    }
    next(err);
  }
});

router.get("/me", authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as Request & { user: { id: string } };
    const user = await prisma.user.findUnique({
      where: { id: authReq.user.id },
      select: { id: true, email: true, name: true, role: true, avatarUrl: true, createdAt: true },
    });

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    res.json({ user });
  } catch (err) {
    next(err);
  }
});

export default router;
