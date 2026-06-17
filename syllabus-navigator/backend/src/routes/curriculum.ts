import { Router, Request, Response, NextFunction } from "express";
import { prisma } from "../db/client.js";
import { authenticate, requireRole } from "../middleware/auth.js";
import { logger } from "../config/logger.js";
import { buildKnowledgeGraph } from "../agents/graphBuilder.js";
import { UserRole } from "../types/index.js";

const router = Router();

router.get("/courses", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const courses = await prisma.course.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        code: true,
        description: true,
        term: true,
        professor: { select: { id: true, name: true } },
        _count: { select: { modules: true } },
      },
    });

    res.json({ courses });
  } catch (err) {
    next(err);
  }
});

router.get("/courses/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const course = await prisma.course.findUnique({
      where: { id: req.params.id },
      include: {
        modules: {
          orderBy: { order: "asc" },
          include: {
            topics: {
              orderBy: { order: "asc" },
              include: {
                objectives: true,
                assessments: true,
              },
            },
          },
        },
        professor: { select: { id: true, name: true } },
      },
    });

    if (!course) {
      res.status(404).json({ error: "Course not found" });
      return;
    }

    res.json({ course });
  } catch (err) {
    next(err);
  }
});

router.get("/courses/:id/modules", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const course = await prisma.course.findUnique({ where: { id: req.params.id } });
    if (!course) {
      res.status(404).json({ error: "Course not found" });
      return;
    }

    const modules = await prisma.module.findMany({
      where: { courseId: req.params.id },
      orderBy: { order: "asc" },
      include: {
        _count: { select: { topics: true } },
      },
    });

    res.json({ modules });
  } catch (err) {
    next(err);
  }
});

router.get("/courses/:id/topics", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const course = await prisma.course.findUnique({ where: { id: req.params.id } });
    if (!course) {
      res.status(404).json({ error: "Course not found" });
      return;
    }

    const topics = await prisma.topic.findMany({
      where: { module: { courseId: req.params.id } },
      orderBy: [{ module: { order: "asc" } }, { order: "asc" }],
      include: {
        module: { select: { id: true, title: true, order: true } },
        objectives: true,
      },
    });

    res.json({ topics });
  } catch (err) {
    next(err);
  }
});

router.get("/topics/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const topic = await prisma.topic.findUnique({
      where: { id: req.params.id },
      include: {
        module: { select: { id: true, title: true, courseId: true } },
        objectives: true,
        assessments: true,
      },
    });

    if (!topic) {
      res.status(404).json({ error: "Topic not found" });
      return;
    }

    res.json({ topic });
  } catch (err) {
    next(err);
  }
});

router.get("/topics/:id/prerequisites", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { getPrerequisiteChain } = await import("../agents/graphAgent.js");
    const chain = await getPrerequisiteChain(req.params.id);

    res.json({ topicId: req.params.id, prerequisites: chain });
  } catch (err) {
    next(err);
  }
});

router.post(
  "/graph/build",
  authenticate,
  requireRole(UserRole.PROFESSOR, UserRole.ADMIN),
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      logger.info("Knowledge graph build triggered", { triggeredBy: "api" });

      const result = await buildKnowledgeGraph();

      res.json({
        message: "Knowledge graph build initiated",
        nodesCreated: result.nodesCreated,
        relationshipsCreated: result.relationshipsCreated,
      });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
