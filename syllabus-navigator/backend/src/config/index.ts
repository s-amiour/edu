import dotenv from "dotenv";
import { logger } from "./logger.js";

dotenv.config();

function requiredEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    logger.warn(`Environment variable ${key} is not set`);
    return "";
  }
  return value;
}

function optionalEnv(key: string, fallback: string): string {
  return process.env[key] ?? fallback;
}

export const config = {
  port: parseInt(optionalEnv("PORT", "3001"), 10),
  nodeEnv: optionalEnv("NODE_ENV", "development"),

  database: {
    url: requiredEnv("DATABASE_URL"),
  },

  neo4j: {
    uri: requiredEnv("NEO4J_URI"),
    user: requiredEnv("NEO4J_USER"),
    password: requiredEnv("NEO4J_PASSWORD"),
  },

  redis: {
    url: optionalEnv("REDIS_URL", "redis://localhost:6379"),
  },

  gemini: {
    apiKey: requiredEnv("GEMINI_API_KEY"),
  },

  jwt: {
    secret: requiredEnv("JWT_SECRET"),
    expiresIn: optionalEnv("JWT_EXPIRES_IN", "7d"),
  },

  cloudflare: {
    r2Bucket: requiredEnv("R2_BUCKET"),
    r2AccountId: requiredEnv("R2_ACCOUNT_ID"),
    r2AccessKeyId: requiredEnv("R2_ACCESS_KEY_ID"),
    r2SecretAccessKey: requiredEnv("R2_SECRET_ACCESS_KEY"),
  },

  upload: {
    dir: optionalEnv("UPLOAD_DIR", "./uploads"),
    maxFileSize: parseInt(optionalEnv("MAX_FILE_SIZE", "52428800"), 10),
  },

  cors: {
    origin: optionalEnv("CORS_ORIGIN", "http://localhost:5173"),
  },
} as const;

export type Config = typeof config;
