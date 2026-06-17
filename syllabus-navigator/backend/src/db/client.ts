import { PrismaClient } from "@prisma/client";
import neo4j, { Driver, Session } from "neo4j-driver";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

const neo4jUri = process.env.NEO4J_URI ?? "bolt://localhost:7687";
const neo4jUser = process.env.NEO4J_USER ?? "neo4j";
const neo4jPassword = process.env.NEO4J_PASSWORD ?? "neo4j";

export const neo4jDriver: Driver = neo4j.driver(neo4jUri, neo4j.auth.basic(neo4jUser, neo4jPassword), {
  maxConnectionLifetime: 3 * 60 * 60 * 1000,
  maxConnectionPoolSize: 50,
  connectionAcquisitionTimeout: 2 * 60 * 1000,
});

export function getNeo4jSession(): Session {
  return neo4jDriver.session({
    database: process.env.NEO4J_DATABASE ?? "neo4j",
  });
}

async function disconnectNeo4j(): Promise<void> {
  try {
    await neo4jDriver.close();
  } catch (error) {
    console.error("Error closing Neo4j driver:", error);
  }
}

async function disconnectPrisma(): Promise<void> {
  try {
    await prisma.$disconnect();
  } catch (error) {
    console.error("Error disconnecting Prisma:", error);
  }
}

export async function disconnectAll(): Promise<void> {
  await disconnectNeo4j();
  await disconnectPrisma();
}

const gracefulShutdown = async (signal: string) => {
  console.log(`${signal} received. Shutting down gracefully...`);
  await disconnectAll();
  process.exit(0);
};

process.on("SIGINT", () => {
  void gracefulShutdown("SIGINT");
});

process.on("SIGTERM", () => {
  void gracefulShutdown("SIGTERM");
});
