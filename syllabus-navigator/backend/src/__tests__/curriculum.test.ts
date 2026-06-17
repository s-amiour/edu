jest.mock("../db/client.js", () => ({
  prisma: {
    course: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    module: {
      findMany: jest.fn(),
    },
    topic: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
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

jest.mock("../agents/graphBuilder.js", () => ({
  buildKnowledgeGraph: jest.fn().mockResolvedValue({ nodesCreated: 0, relationshipsCreated: 0 }),
}));

import request from "supertest";
import { app } from "../index.js";
import { prisma } from "../db/client.js";

const mockedPrisma = prisma as jest.Mocked<typeof prisma>;

const mockCourses = [
  {
    id: "course-1",
    name: "IAM Fundamentals",
    code: "CS401",
    description: "IAM course",
    semester: "Semester 5",
    professor: { id: "prof-1", name: "Dr. Bob" },
    _count: { modules: 6 },
  },
  {
    id: "course-2",
    name: "Counting & Enumerating",
    code: "MA201",
    description: "Math course",
    semester: "Semester 3",
    professor: { id: "prof-1", name: "Dr. Bob" },
    _count: { modules: 4 },
  },
  {
    id: "course-3",
    name: "Probability",
    code: "MA301",
    description: "Probability course",
    semester: "Semester 5",
    professor: { id: "prof-1", name: "Dr. Bob" },
    _count: { modules: 4 },
  },
];

const mockCourseDetail = {
  id: "course-1",
  name: "IAM Fundamentals",
  code: "CS401",
  description: "IAM course",
  semester: "Semester 5",
  professor: { id: "prof-1", name: "Dr. Bob" },
  modules: [
    {
      id: "mod-1",
      name: "Introduction to IAM",
      order: 1,
      description: "Foundational IAM concepts",
      topics: [
        {
          id: "topic-1",
          name: "IAM Fundamentals",
          order: 1,
          description: "Core definitions",
          learningObjectives: [
            { id: "obj-1", description: "Define IAM core components.", bloomLevel: "Remember" },
          ],
          assessmentTopics: [],
        },
      ],
    },
  ],
};

describe("Curriculum Routes", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("GET /api/curriculum/courses", () => {
    it("should return all courses", async () => {
      mockedPrisma.course.findMany.mockResolvedValue(mockCourses as never);

      const res = await request(app).get("/api/curriculum/courses");

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("courses");
      expect(res.body.courses).toHaveLength(3);
      expect(res.body.courses[0]).toMatchObject({
        id: "course-1",
        code: "CS401",
      });
    });

    it("should return empty array when no courses exist", async () => {
      mockedPrisma.course.findMany.mockResolvedValue([]);

      const res = await request(app).get("/api/curriculum/courses");

      expect(res.status).toBe(200);
      expect(res.body.courses).toHaveLength(0);
    });
  });

  describe("GET /api/curriculum/courses/:id", () => {
    it("should return course detail with modules and topics", async () => {
      mockedPrisma.course.findUnique.mockResolvedValue(mockCourseDetail as never);

      const res = await request(app).get("/api/curriculum/courses/course-1");

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("course");
      expect(res.body.course).toMatchObject({
        id: "course-1",
        code: "CS401",
        name: "IAM Fundamentals",
      });
      expect(res.body.course.modules).toHaveLength(1);
    });

    it("should return 404 for non-existent course", async () => {
      mockedPrisma.course.findUnique.mockResolvedValue(null);

      const res = await request(app).get("/api/curriculum/courses/nonexistent");

      expect(res.status).toBe(404);
      expect(res.body).toEqual({ error: "Course not found" });
    });
  });

  describe("GET /api/curriculum/courses/:id/topics", () => {
    it("should return topics for a course", async () => {
      mockedPrisma.course.findUnique.mockResolvedValue({ id: "course-1" } as never);

      const mockTopics = [
        {
          id: "topic-1",
          name: "IAM Fundamentals",
          order: 1,
          description: "Core definitions",
          module: { id: "mod-1", name: "Introduction to IAM", order: 1 },
          learningObjectives: [
            { id: "obj-1", description: "Define IAM.", bloomLevel: "Remember" },
          ],
        },
        {
          id: "topic-2",
          name: "Core IAM Concepts",
          order: 2,
          description: "IAAA pillars",
          module: { id: "mod-1", name: "Introduction to IAM", order: 1 },
          learningObjectives: [],
        },
      ];

      mockedPrisma.topic.findMany.mockResolvedValue(mockTopics as never);

      const res = await request(app).get("/api/curriculum/courses/course-1/topics");

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("topics");
      expect(res.body.topics).toHaveLength(2);
      expect(res.body.topics[0]).toMatchObject({
        id: "topic-1",
        name: "IAM Fundamentals",
      });
    });

    it("should return 404 if course does not exist", async () => {
      mockedPrisma.course.findUnique.mockResolvedValue(null);

      const res = await request(app).get("/api/curriculum/courses/bad-id/topics");

      expect(res.status).toBe(404);
      expect(res.body).toEqual({ error: "Course not found" });
    });
  });

  describe("GET /api/curriculum/courses/:id/modules", () => {
    it("should return modules for a course", async () => {
      mockedPrisma.course.findUnique.mockResolvedValue({ id: "course-1" } as never);

      const mockModules = [
        { id: "mod-1", name: "Introduction to IAM", order: 1, description: "Foundations", _count: { topics: 4 } },
        { id: "mod-2", name: "Authentication Mechanisms", order: 2, description: "Auth methods", _count: { topics: 4 } },
      ];

      mockedPrisma.module.findMany.mockResolvedValue(mockModules as never);

      const res = await request(app).get("/api/curriculum/courses/course-1/modules");

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("modules");
      expect(res.body.modules).toHaveLength(2);
    });
  });

  describe("GET /api/curriculum/topics/:id", () => {
    it("should return topic detail", async () => {
      const mockTopic = {
        id: "topic-1",
        name: "IAM Fundamentals",
        order: 1,
        description: "Core definitions",
        module: { id: "mod-1", name: "Introduction to IAM", courseId: "course-1" },
        learningObjectives: [
          { id: "obj-1", description: "Define IAM.", bloomLevel: "Remember" },
        ],
        assessmentTopics: [],
      };

      mockedPrisma.topic.findUnique.mockResolvedValue(mockTopic as never);

      const res = await request(app).get("/api/curriculum/topics/topic-1");

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("topic");
      expect(res.body.topic).toMatchObject({
        id: "topic-1",
        name: "IAM Fundamentals",
      });
    });

    it("should return 404 for non-existent topic", async () => {
      mockedPrisma.topic.findUnique.mockResolvedValue(null);

      const res = await request(app).get("/api/curriculum/topics/bad-id");

      expect(res.status).toBe(404);
      expect(res.body).toEqual({ error: "Topic not found" });
    });
  });
});
