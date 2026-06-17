import type { Request, Response, NextFunction } from "express";
import { logger } from "../config/logger.js";

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

const WINDOW_MS = 60_000;
const DEFAULT_MAX = 100;

function getClientIp(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") {
    return forwarded.split(",")[0].trim();
  }
  return req.socket.remoteAddress ?? "unknown";
}

function cleanup(): void {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (now > entry.resetAt) {
      store.delete(key);
    }
  }
}

setInterval(cleanup, WINDOW_MS).unref();

export function rateLimiter(maxRequests = DEFAULT_MAX, windowMs = WINDOW_MS) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const clientIp = getClientIp(req);
    const key = `${clientIp}:${req.path}`;
    const now = Date.now();

    let entry = store.get(key);

    if (!entry || now > entry.resetAt) {
      entry = { count: 0, resetAt: now + windowMs };
      store.set(key, entry);
    }

    entry.count++;

    const remaining = Math.max(0, maxRequests - entry.count);
    res.setHeader("X-RateLimit-Limit", maxRequests);
    res.setHeader("X-RateLimit-Remaining", remaining);
    res.setHeader("X-RateLimit-Reset", Math.ceil(entry.resetAt / 1000));

    if (entry.count > maxRequests) {
      logger.warn("Rate limit exceeded", { clientIp, path: req.path });
      res.status(429).json({
        error: "Too many requests, please try again later",
      });
      return;
    }

    next();
  };
}
