jest.mock("../db/client.js", () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  },
}));

jest.mock("../config/index.js", () => ({
  config: {
    jwt: { secret: "test-secret", expiresIn: "7d" },
    nodeEnv: "test",
    port: 3001,
    cors: { origin: "http://localhost:3000" },
    database: { url: "" },
    neo4j: { uri: "", user: "", password: "" },
    redis: { url: "" },
    gemini: { apiKey: "" },
    cloudflare: { r2Bucket: "", r2AccountId: "", r2AccessKeyId: "", r2SecretAccessKey: "" },
    upload: { dir: "", maxFileSize: 0 },
  },
}));

jest.mock("../config/logger.js", () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

import request from "supertest";
import { app } from "../index.js";
import { prisma } from "../db/client.js";

const mockedPrisma = prisma as jest.Mocked<typeof prisma>;

describe("Auth Routes", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("POST /api/auth/register", () => {
    it("should register a new user successfully", async () => {
      mockedPrisma.user.findUnique.mockResolvedValue(null);
      mockedPrisma.user.create.mockResolvedValue({
        id: "user-1",
        email: "new@edu.com",
        name: "New User",
        passwordHash: "hashed",
        role: "STUDENT",
        programLevel: "beginner",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const res = await request(app)
        .post("/api/auth/register")
        .send({ email: "new@edu.com", password: "password123", name: "New User" });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty("token");
      expect(res.body.user).toMatchObject({
        id: "user-1",
        email: "new@edu.com",
        name: "New User",
        role: "STUDENT",
      });
    });

    it("should return 409 for duplicate email", async () => {
      mockedPrisma.user.findUnique.mockResolvedValue({
        id: "existing-1",
        email: "taken@edu.com",
        name: "Existing",
        passwordHash: "hashed",
        role: "STUDENT",
        programLevel: "beginner",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const res = await request(app)
        .post("/api/auth/register")
        .send({ email: "taken@edu.com", password: "password123", name: "Dup" });

      expect(res.status).toBe(409);
      expect(res.body).toEqual({ error: "Email already registered" });
    });

    it("should return 400 for invalid input", async () => {
      const res = await request(app)
        .post("/api/auth/register")
        .send({ email: "bad-email", password: "123", name: "" });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("error", "Validation failed");
    });
  });

  describe("POST /api/auth/login", () => {
    it("should login successfully with correct credentials", async () => {
      mockedPrisma.user.findUnique.mockResolvedValue({
        id: "user-1",
        email: "student@edu.com",
        name: "Student",
        passwordHash: "$2a$12$correcthash",
        role: "STUDENT",
        programLevel: "beginner",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const bcrypt = await import("bcryptjs");
      jest.spyOn(bcrypt, "compare").mockResolvedValue(true as never);

      const res = await request(app)
        .post("/api/auth/login")
        .send({ email: "student@edu.com", password: "student123" });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("token");
      expect(res.body.user).toMatchObject({
        id: "user-1",
        email: "student@edu.com",
        role: "STUDENT",
      });
    });

    it("should return 401 for wrong password", async () => {
      mockedPrisma.user.findUnique.mockResolvedValue({
        id: "user-1",
        email: "student@edu.com",
        name: "Student",
        passwordHash: "$2a$12$correcthash",
        role: "STUDENT",
        programLevel: "beginner",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const bcrypt = await import("bcryptjs");
      jest.spyOn(bcrypt, "compare").mockResolvedValue(false as never);

      const res = await request(app)
        .post("/api/auth/login")
        .send({ email: "student@edu.com", password: "wrongpassword" });

      expect(res.status).toBe(401);
      expect(res.body).toEqual({ error: "Invalid credentials" });
    });

    it("should return 401 for non-existent user", async () => {
      mockedPrisma.user.findUnique.mockResolvedValue(null);

      const res = await request(app)
        .post("/api/auth/login")
        .send({ email: "nobody@edu.com", password: "password123" });

      expect(res.status).toBe(401);
      expect(res.body).toEqual({ error: "Invalid credentials" });
    });
  });

  describe("GET /api/auth/me", () => {
    it("should return 401 without authentication", async () => {
      const res = await request(app).get("/api/auth/me");

      expect(res.status).toBe(401);
    });

    it("should return user data with valid token", async () => {
      const loginRes = await request(app)
        .post("/api/auth/login")
        .send({ email: "student@edu.com", password: "student123" });

      mockedPrisma.user.findUnique.mockResolvedValue({
        id: "user-1",
        email: "student@edu.com",
        name: "Student",
        passwordHash: "hashed",
        role: "STUDENT",
        programLevel: "beginner",
        createdAt: new Date(),
        updatedAt: new Date(),
      } as never);

      const token = loginRes.body.token;
      const res = await request(app)
        .get("/api/auth/me")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("user");
      expect(res.body.user).toMatchObject({
        id: "user-1",
        email: "student@edu.com",
      });
    });
  });
});
