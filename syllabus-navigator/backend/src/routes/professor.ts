import { Router, Request, Response, NextFunction } from "express";
import { prisma } from "../db/client.js";
import { authenticate, requireRole } from "../middleware/auth.js";
import { logger } from "../config/logger.js";
import { UserRole, MasteryState } from "../types/index.js";

const router = Router();

router.use(authenticate, requireRole(UserRole.PROFESSOR, UserRole.ADMIN));

router.get("/dashboard", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const [
      masteryDistribution,
      avgQuizScores,
      difficultTopics,
      engagementTrends,
      topicCoverage,
      totalStudents,
      activeStudents,
    ] = await Promise.all([
      prisma.masteryRecord.groupBy({
        by: ["state"],
        _count: { state: true },
      }),
      prisma.quizAttempt.groupBy({
        by: ["topicId"],
        _avg: { score: true },
        _count: { score: true },
        having: { score: { _count: { gte: 3 } } },
        orderBy: { _avg: { score: "asc" } },
        take: 10,
      }),
      prisma.quizAttempt.groupBy({
        by: ["topicId"],
        _avg: { score: true },
        _count: { score: true },
        having: { score: { _count: { gte: 5 } } },
        orderBy: { _avg: { score: "asc" } },
        take: 10,
      }),
      prisma.activityLog.groupBy({
        by: ["action"],
        _count: { action: true },
      }),
      prisma.topic.findMany({
        select: {
          id: true,
          title: true,
          _count: {
            select: {
              masteryRecords: true,
            },
          },
        },
        orderBy: { order: "asc" },
        take: 50,
      }),
      prisma.user.count({ where: { role: UserRole.STUDENT } }),
      prisma.user.count({
        where: {
          role: UserRole.STUDENT,
          activityLogs: {
            some: {
              timestamp: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
            },
          },
        },
      }),
    ]);

    const riskAreas = await prisma.topic.findMany({
      where: {
        masteryRecords: {
          some: {
            state: { in: [MasteryState.UNSEEN, MasteryState.SEEN] },
          },
        },
      },
      select: {
        id: true,
        title: true,
        masteryRecords: {
          where: { state: { in: [MasteryState.UNSEEN, MasteryState.SEEN] } },
          _count: true,
        },
      },
      take: 10,
    });

    res.json({
      dashboard: {
        overview: {
          totalStudents,
          activeStudentsLast7Days: activeStudents,
        },
        masteryDistribution: masteryDistribution.map((m) => ({
          state: m.state,
          count: m._count.state,
        })),
        avgQuizScoresByTopic: avgQuizScores.map((q) => ({
          topicId: q.topicId,
          avgScore: Math.round(q._avg.score ?? 0),
          attemptCount: q._count.score,
        })),
        mostDifficultTopics: difficultTopics.map((t) => ({
          topicId: t.topicId,
          avgScore: Math.round(t._avg.score ?? 0),
          attemptCount: t._count.score,
        })),
        engagementTrends: engagementTrends.map((e) => ({
          action: e.action,
          count: e._count.action,
        })),
        predictedExamRiskAreas: riskAreas.map((t) => ({
          topicId: t.id,
          title: t.title,
          strugglingStudentCount: t.masteryRecords.length,
        })),
        topicCoverage: topicCoverage.map((t) => ({
          topicId: t.id,
          title: t.title,
          studentInteractions: t._count.masteryRecords,
        })),
      },
    });
  } catch (err) {
    next(err);
  }
});

router.get("/courses/:id/analytics", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id: courseId } = req.params;

    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: { id: true, title: true },
    });

    if (!course) {
      res.status(404).json({ error: "Course not found" });
      return;
    }

    const [enrollmentCount, moduleStats, quizStats, recentActivity] = await Promise.all([
      prisma.enrollment.count({ where: { courseId } }),
      prisma.module.findMany({
        where: { courseId },
        orderBy: { order: "asc" },
        select: {
          id: true,
          title: true,
          order: true,
          topics: {
            select: {
              id: true,
              title: true,
              masteryRecords: {
                select: { state: true, score: true },
              },
            },
          },
        },
      }),
      prisma.quizAttempt.findMany({
        where: {
          topic: { module: { courseId } },
        },
        select: {
          score: true,
          maxScore: true,
          topicId: true,
          completedAt: true,
        },
        orderBy: { completedAt: "desc" },
        take: 100,
      }),
      prisma.activityLog.findMany({
        where: {
          topic: { module: { courseId } },
        },
        orderBy: { timestamp: "desc" },
        take: 20,
      }),
    ]);

    const moduleAnalytics = moduleStats.map((m) => {
      const allMastery = m.topics.flatMap((t) => t.masteryRecords);
      const avgScore = allMastery.length > 0
        ? Math.round(allMastery.reduce((sum, r) => sum + r.score, 0) / allMastery.length)
        : 0;

      return {
        moduleId: m.id,
        title: m.title,
        order: m.order,
        topicCount: m.topics.length,
        avgMasteryScore: avgScore,
        masteryDistribution: {
          confident: allMastery.filter((r) => r.state === MasteryState.CONFIDENT).length,
          practiced: allMastery.filter((r) => r.state === MasteryState.PRACTICED).length,
          seen: allMastery.filter((r) => r.state === MasteryState.SEEN).length,
          unseen: allMastery.filter((r) => r.state === MasteryState.UNSEEN).length,
        },
      };
    });

    const quizAnalytics = {
      totalAttempts: quizStats.length,
      avgPercentage: quizStats.length > 0
        ? Math.round(
            quizStats.reduce((sum, q) => sum + (q.maxScore > 0 ? (q.score / q.maxScore) * 100 : 0), 0) /
              quizStats.length
          )
        : 0,
    };

    res.json({
      analytics: {
        course,
        enrollmentCount,
        moduleAnalytics,
        quizAnalytics,
        recentActivity,
      },
    });
  } catch (err) {
    next(err);
  }
});

router.get("/topics/:id/stats", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id: topicId } = req.params;

    const topic = await prisma.topic.findUnique({
      where: { id: topicId },
      select: { id: true, title: true, estimatedMinutes: true },
    });

    if (!topic) {
      res.status(404).json({ error: "Topic not found" });
      return;
    }

    const [masteryRecords, quizAttempts, activityCount] = await Promise.all([
      prisma.masteryRecord.findMany({
        where: { topicId },
        select: { state: true, score: true, attempts: true },
      }),
      prisma.quizAttempt.findMany({
        where: { topicId },
        select: { score: true, maxScore: true, timeSpentSeconds: true },
      }),
      prisma.activityLog.count({ where: { topicId } }),
    ]);

    const masteryDistribution = {
      confident: masteryRecords.filter((r) => r.state === MasteryState.CONFIDENT).length,
      practiced: masteryRecords.filter((r) => r.state === MasteryState.PRACTICED).length,
      seen: masteryRecords.filter((r) => r.state === MasteryState.SEEN).length,
      unseen: masteryRecords.filter((r) => r.state === MasteryState.UNSEEN).length,
    };

    const avgMasteryScore = masteryRecords.length > 0
      ? Math.round(masteryRecords.reduce((sum, r) => sum + r.score, 0) / masteryRecords.length)
      : 0;

    const avgQuizPercentage = quizAttempts.length > 0
      ? Math.round(
          quizAttempts.reduce((sum, q) => sum + (q.maxScore > 0 ? (q.score / q.maxScore) * 100 : 0), 0) /
            quizAttempts.length
        )
      : 0;

    const avgTimeOnQuizzes = quizAttempts.length > 0
      ? Math.round(
          quizAttempts.reduce((sum, q) => sum + (q.timeSpentSeconds ?? 0), 0) / quizAttempts.length
        )
      : 0;

    res.json({
      stats: {
        topic,
        studentCount: masteryRecords.length,
        masteryDistribution,
        avgMasteryScore,
        quizAttempts: quizAttempts.length,
        avgQuizPercentage,
        avgTimeOnQuizzesSeconds: avgTimeOnQuizzes,
        totalActivityCount: activityCount,
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
