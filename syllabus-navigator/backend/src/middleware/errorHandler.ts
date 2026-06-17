import type { Request, Response, NextFunction } from "express";
import { logger } from "../config/logger.js";

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode: number, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof AppError) {
    logger.warn("Operational error", {
      statusCode: err.statusCode,
      message: err.message,
      path: req.path,
      method: req.method,
    });
    res.status(err.statusCode).json({
      error: err.message,
    });
    return;
  }

  logger.error("Unhandled error", {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  res.status(500).json({
    error: "Internal server error",
  });
}
