import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { prisma } from "../db/client.js";
import { authenticate } from "../middleware/auth.js";
import { logger } from "../config/logger.js";
import { generateQuiz } from "../agents/quizAgent.js";

const router = Router();

router.use(authenticate);

const generateQuizSchema = z.object({
  topicId: z.string().uuid().optional(),
  documentId: z.string().uuid().optional(),
  questionCount: z.number().int().min(1).max(50).optional().default(10),
  difficulty: z.enum(["easy", "medium", "hard", "mixed"]).optional().default("mixed"),
}).refine((data) => data.topicId || data.documentId, {
  message: "Either topicId or documentId is required",
});

const submitAttemptSchema = z.object({
  answers: z.array(
    z.object({
      questionId: z.string().uuid(),
      answerIndex: z.number().int().min(0),
    })
  ),
  timeSpentSeconds: z.number().int().min(0).optional(),
});

router.post("/generate", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = generateQuizSchema.parse(req.body);
    const studentId = (req as any).user.id;

    logger.info("Quiz generation requested", {
      studentId,
      topicId: body.topicId,
      documentId: body.documentId,
      questionCount: body.questionCount,
    });

    const quiz = await generateQuiz({
      topicId: body.topicId,
      documentId: body.documentId,
      questionCount: body.questionCount,
      difficulty: body.difficulty,
      studentId,
    });

    res.status(201).json({ quiz });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: "Validation failed", details: err.errors });
      return;
    }
    next(err);
  }
});

router.get("/available", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const studentId = (req as any).user.id;

    const quizzes = await prisma.quiz.findMany({
      where: {
        OR: [
          { isPublic: true },
          { topic: { module: { course: { enrollments: { some: { studentId } } } } } },
        ],
      },
      select: {
        id: true,
        title: true,
        topicId: true,
        questionCount: true,
        difficulty: true,
        timeLimitMinutes: true,
        createdAt: true,
        topic: { select: { id: true, title: true } },
        _count: { select: { attempts: { where: { studentId } } } },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({ quizzes });
  } catch (err) {
    next(err);
  }
});

router.post("/:id/attempt", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const studentId = (req as any).user.id;
    const { id: quizId } = req.params;
    const body = submitAttemptSchema.parse(req.body);

    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: { questions: true },
    });

    if (!quiz) {
      res.status(404).json({ error: "Quiz not found" });
      return;
    }

    const gradedQuestions = quiz.questions.map((q) => {
      const answer = body.answers.find((a) => a.questionId === q.id);
      const isCorrect = answer?.answerIndex === q.correctOptionIndex;

      return {
        id: q.id,
        topicId: q.topicId,
        learningObjectiveId: q.learningObjectiveId,
        questionText: q.questionText,
        options: q.options,
        correctOptionIndex: q.correctOptionIndex,
        explanation: q.explanation,
        studentAnswer: answer?.answerIndex ?? -1,
        isCorrect: isCorrect ?? false,
        pointsEarned: isCorrect ? q.pointsPossible : 0,
        pointsPossible: q.pointsPossible,
      };
    });

    const totalScore = gradedQuestions.reduce((sum, q) => sum + q.pointsEarned, 0);
    const maxScore = gradedQuestions.reduce((sum, q) => sum + q.pointsPossible, 0);

    const attempt = await prisma.quizAttempt.create({
      data: {
        studentId,
        quizId,
        topicId: quiz.topicId,
        questions: { create: gradedQuestions },
        score: totalScore,
        maxScore,
        timeSpentSeconds: body.timeSpentSeconds,
        completedAt: new Date(),
      },
      include: { questions: true },
    });

    for (const q of gradedQuestions) {
      if (q.isCorrect) {
        await prisma.masteryRecord.upsert({
          where: { studentId_topicId: { studentId, topicId: q.topicId } },
          update: {
            score: { increment: 2 },
            attempts: { increment: 1 },
            lastActivityAt: new Date(),
          },
          create: {
            studentId,
            topicId: q.topicId,
            state: "PRACTICED",
            score: 2,
            attempts: 1,
          },
        });
      }
    }

    logger.info("Quiz attempt submitted", {
      studentId,
      quizId,
      score: totalScore,
      maxScore,
    });

    res.status(201).json({
      attempt: {
        id: attempt.id,
        score: attempt.score,
        maxScore: attempt.maxScore,
        percentage: maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0,
        questions: gradedQuestions,
      },
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: "Validation failed", details: err.errors });
      return;
    }
    next(err);
  }
});

router.get("/attempts", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const studentId = (req as any).user.id;

    const attempts = await prisma.quizAttempt.findMany({
      where: { studentId },
      orderBy: { startedAt: "desc" },
      select: {
        id: true,
        quizId: true,
        topicId: true,
        score: true,
        maxScore: true,
        startedAt: true,
        completedAt: true,
        timeSpentSeconds: true,
        quiz: { select: { title: true } },
        topic: { select: { id: true, title: true } },
      },
    });

    res.json({
      attempts: attempts.map((a) => ({
        ...a,
        percentage: a.maxScore > 0 ? Math.round((a.score / a.maxScore) * 100) : 0,
      })),
    });
  } catch (err) {
    next(err);
  }
});

router.get("/attempts/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const studentId = (req as any).user.id;

    const attempt = await prisma.quizAttempt.findFirst({
      where: { id: req.params.id, studentId },
      include: {
        questions: true,
        quiz: { select: { title: true } },
        topic: { select: { id: true, title: true } },
      },
    });

    if (!attempt) {
      res.status(404).json({ error: "Attempt not found" });
      return;
    }

    res.json({ attempt });
  } catch (err) {
    next(err);
  }
});

export default router;
