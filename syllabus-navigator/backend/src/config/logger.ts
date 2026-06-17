import winston from "winston";

const { combine, timestamp, json, errors, colorize } = winston.format;

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL ?? "info",
  format: combine(
    errors({ stack: true }),
    timestamp({ format: "ISO" }),
    json()
  ),
  defaultMeta: { service: "syllabus-navigator" },
  transports: [
    new winston.transports.Console({
      format:
        process.env.NODE_ENV === "production"
          ? combine(timestamp({ format: "ISO" }), json())
          : combine(colorize(), timestamp({ format: "HH:mm:ss" }), winston.format.simple()),
    }),
  ],
});

if (process.env.NODE_ENV === "production") {
  logger.add(
    new winston.transports.File({ filename: "logs/error.log", level: "error" })
  );
  logger.add(
    new winston.transports.File({ filename: "logs/combined.log" })
  );
}
