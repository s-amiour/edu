import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import compression from "compression";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";

dotenv.config();

import { config } from "./config/index.js";
import { logger } from "./config/logger.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { rateLimiter } from "./middleware/rateLimiter.js";

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: config.cors.origin,
    credentials: true,
  })
);
app.use(compression());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(
  morgan("short", {
    stream: { write: (message: string) => logger.info(message.trim()) },
  })
);
app.use(rateLimiter());

import authRouter from "./routes/auth.js";
import curriculumRouter from "./routes/curriculum.js";
import studentRouter from "./routes/student.js";
import contentRouter from "./routes/content.js";
import quizRouter from "./routes/quiz.js";
import uploadRouter from "./routes/upload.js";
import graphRouter from "./routes/graph.js";

app.use("/api/auth", authRouter);
app.use("/api/curriculum", curriculumRouter);
app.use("/api/student", studentRouter);
app.use("/api/content", contentRouter);
app.use("/api/quiz", quizRouter);
app.use("/api/upload", uploadRouter);
app.use("/api/graph", graphRouter);

app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use(errorHandler);

const server = app.listen(config.port, () => {
  logger.info(`Server running on port ${config.port}`, {
    env: config.nodeEnv,
    port: config.port,
  });
});

function gracefulShutdown(signal: string): void {
  logger.info(`Received ${signal}, shutting down gracefully`);

  server.close((err) => {
    if (err) {
      logger.error("Error during shutdown", { error: err.message });
      process.exit(1);
    }
    logger.info("HTTP server closed");
    process.exit(0);
  });

  setTimeout(() => {
    logger.error("Forced shutdown after timeout");
    process.exit(1);
  }, 10_000).unref();
}

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

process.on("unhandledRejection", (reason: unknown) => {
  logger.error("Unhandled promise rejection", {
    reason: reason instanceof Error ? reason.message : String(reason),
  });
});

process.on("uncaughtException", (err: Error) => {
  logger.error("Uncaught exception", { error: err.message, stack: err.stack });
  process.exit(1);
});

export { app };
