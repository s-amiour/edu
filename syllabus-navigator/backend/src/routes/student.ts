import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { prisma } from "../db/client.js";
import { authenticate } from "../middleware/auth.js";
import { logger } from "../config/logger.js";
import { MasteryState } from "../types/index.js";
import { generateRecommendation } from "../agents/plannerAgent.js";

const router = Router();

router.use(authenticate);

const masteryUpdateSchema = z.object({
  state: z.nativeEnum(MasteryState),
  score: z.number().min(0).max(100).optional(),
  reason: z.string().max(500).optional(),
});

const interactionSchema = z.object({
  type: z.enum(["view", "expand", "read"]),
  duration: z.number().int().min(0).optional(),
  metadata: z.record(z.unknown()).optional(),
});

const feedbackSchema = z.object({
  helpful: z.boolean(),
  comment: z.string().max(1000).optional(),
});

router.get("/dashboard", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const studentId = (req as any).user.id;

    const [masteryRecords, streak, upcomingAssessments, recentActivity, recommendations] =
      await Promise.all([
        prisma.masteryRecord.findMany({
          where: { studentId },
          include: {
            topic: { select: { id: true, title: true, moduleId: true } },
          },
          orderBy: { lastActivityAt: "desc" },
        }),
        prisma.learningStreak.findUnique({ where: { studentId } }),
        prisma.assessment.findMany({
          where: {
            topic: {
              module: {
                course: {
                  enrollments: { some: { studentId } },
                },
              },
            },
          },
          include: {
            topic: { select: { id: true, title: true } },
          },
          orderBy: { createdAt: "desc" },
          take: 5,
        }),
        prisma.activityLog.findMany({
          where: { studentId },
          orderBy: { timestamp: "desc" },
          take: 10,
        }),
        prisma.contentRecommendation.findMany({
          where: { studentId, viewedAt: null },
          orderBy: { relevanceScore: "desc" },
          take: 5,
          include: {
            topic: { select: { id: true, title: true } },
          },
        }),
      ]);

    const strongTopics = masteryRecords
      .filter((m) => m.state === MasteryState.CONFIDENT)
      .slice(0, 5)
      .map((m) => ({ topicId: m.topicId, title: m.topic.title, score: m.score }));

    const weakTopics = masteryRecords
      .filter((m) => m.state === MasteryState.SEEN || m.state === MasteryState.UNSEEN)
      .slice(0, 5)
      .map((m) => ({ topicId: m.topicId, title: m.topic.title, score: m.score }));

    const masterySummary = {
      total: masteryRecords.length,
      confident: masteryRecords.filter((m) => m.state === MasteryState.CONFIDENT).length,
      practiced: masteryRecords.filter((m) => m.state === MasteryState.PRACTICED).length,
      seen: masteryRecords.filter((m) => m.state === MasteryState.SEEN).length,
      unseen: masteryRecords.filter((m) => m.state === MasteryState.UNSEEN).length,
    };

    res.json({
      dashboard: {
        masterySummary,
        streak: streak
          ? { currentDays: streak.currentDays, longestDays: streak.longestDays, lastActivityDate: streak.lastActivityDate }
          : { currentDays: 0, longestDays: 0, lastActivityDate: null },
        upcomingAssessments,
        weakTopics,
        strongTopics,
        recentActivity,
        pendingRecommendations: recommendations,
      },
    });
  } catch (err) {
    next(err);
  }
});

router.get("/mastery", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const studentId = (req as any).user.id;

    const records = await prisma.masteryRecord.findMany({
      where: { studentId },
      include: {
        topic: {
          select: { id: true, title: true, module: { select: { title: true, course: { select: { title: true } } } } },
        },
      },
      orderBy: { lastActivityAt: "desc" },
    });

    res.json({ mastery: records });
  } catch (err) {
    next(err);
  }
});

router.put("/mastery/:topicId", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const studentId = (req as any).user.id;
    const { topicId } = req.params;
    const body = masteryUpdateSchema.parse(req.body);

    const record = await prisma.masteryRecord.upsert({
      where: {
        studentId_topicId: { studentId, topicId },
      },
      update: {
        state: body.state,
        score: body.score ?? undefined,
        lastActivityAt: new Date(),
        attempts: { increment: 1 },
      },
      create: {
        studentId,
        topicId,
        state: body.state,
        score: body.score ?? 0,
        attempts: 1,
        lastActivityAt: new Date(),
      },
    });

    await prisma.activityLog.create({
      data: {
        studentId,
        topicId,
        action: "mastery_update",
        metadata: { state: body.state, score: body.score, reason: body.reason },
      },
    });

    logger.info("Mastery updated", { studentId, topicId, state: body.state });

    res.json({ mastery: record });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: "Validation failed", details: err.errors });
      return;
    }
    next(err);
  }
});

router.post("/mastery/:topicId/interact", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const studentId = (req as any).user.id;
    const { topicId } = req.params;
    const body = interactionSchema.parse(req.body);

    const activity = await prisma.activityLog.create({
      data: {
        studentId,
        topicId,
        action: `content_${body.type}`,
        metadata: { duration: body.duration, ...body.metadata },
      },
    });

    if (body.duration) {
      await prisma.learningStreak.upsert({
        where: { studentId },
        update: {
          lastActivityDate: new Date(),
          totalMinutes: { increment: Math.round(body.duration / 60) },
        },
        create: {
          studentId,
          currentDays: 1,
          longestDays: 1,
          lastActivityDate: new Date(),
          totalMinutes: Math.round(body.duration / 60),
        },
      });
    }

    res.json({ activity });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: "Validation failed", details: err.errors });
      return;
    }
    next(err);
  }
});

router.get("/recommendations", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const studentId = (req as any).user.id;

    const recommendations = await prisma.contentRecommendation.findMany({
      where: { studentId },
      orderBy: { generatedAt: "desc" },
      include: {
        topic: { select: { id: true, title: true } },
      },
      take: 50,
    });

    res.json({ recommendations });
  } catch (err) {
    next(err);
  }
});

router.post("/recommendations/:id/feedback", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const studentId = (req as any).user.id;
    const { id } = req.params;
    const body = feedbackSchema.parse(req.body);

    const recommendation = await prisma.contentRecommendation.findFirst({
      where: { id, studentId },
    });

    if (!recommendation) {
      res.status(404).json({ error: "Recommendation not found" });
      return;
    }

    await prisma.recommendationFeedback.upsert({
      where: { recommendationId: id },
      update: { helpful: body.helpful, comment: body.comment },
      create: {
        recommendationId: id,
        studentId,
        helpful: body.helpful,
        comment: body.comment,
      },
    });

    logger.info("Recommendation feedback submitted", { studentId, recommendationId: id, helpful: body.helpful });

    res.json({ message: "Feedback recorded" });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: "Validation failed", details: err.errors });
      return;
    }
    next(err);
  }
});

router.post("/recommendations/generate", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const studentId = (req as any).user.id;

    logger.info("Generating recommendations", { studentId });

    const recommendations = await generateRecommendation(studentId);

    res.json({ recommendations, count: recommendations.length });
  } catch (err) {
    next(err);
  }
});

router.get("/activity", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const studentId = (req as any).user.id;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);

    const activity = await prisma.activityLog.findMany({
      where: { studentId },
      orderBy: { timestamp: "desc" },
      take: limit,
      include: {
        topic: { select: { id: true, title: true } },
      },
    });

    res.json({ activity });
  } catch (err) {
    next(err);
  }
});

router.get("/streak", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const studentId = (req as any).user.id;

    const streak = await prisma.learningStreak.findUnique({
      where: { studentId },
    });

    res.json({
      streak: streak
        ? {
            currentDays: streak.currentDays,
            longestDays: streak.longestDays,
            lastActivityDate: streak.lastActivityDate,
            totalMinutes: streak.totalMinutes,
          }
        : { currentDays: 0, longestDays: 0, lastActivityDate: null, totalMinutes: 0 },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
