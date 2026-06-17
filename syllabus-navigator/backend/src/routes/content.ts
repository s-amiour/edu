import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { authenticate } from "../middleware/auth.js";
import { logger } from "../config/logger.js";
import { ContentFormat } from "../types/index.js";
import { generateContent } from "../agents/contentAgent.js";
import { explainDocument } from "../agents/explainerAgent.js";

const router = Router();

router.use(authenticate);

const generateSchema = z.object({
  topicId: z.string().uuid(),
  format: z.nativeEnum(ContentFormat),
});

const explainSchema = z.object({
  documentId: z.string().uuid(),
  question: z.string().max(2000).optional(),
});

router.post("/generate", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = generateSchema.parse(req.body);
    const studentId = (req as any).user.id;

    logger.info("Content generation requested", {
      studentId,
      topicId: body.topicId,
      format: body.format,
    });

    const content = await generateContent({
      topicId: body.topicId,
      format: body.format,
      studentId,
    });

    res.json({ content });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: "Validation failed", details: err.errors });
      return;
    }
    next(err);
  }
});

router.get("/generate/:topicId/:format", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { topicId, format } = req.params;
    const studentId = (req as any).user.id;

    if (!Object.values(ContentFormat).includes(format as ContentFormat)) {
      res.status(400).json({ error: `Invalid format. Must be one of: ${Object.values(ContentFormat).join(", ")}` });
      return;
    }

    const cached = await import("../db/client.js").then(({ prisma }) =>
      prisma.generatedContent.findFirst({
        where: {
          topicId,
          format: format as ContentFormat,
        },
        orderBy: { generatedAt: "desc" },
      })
    );

    if (cached) {
      res.json({ content: cached, cached: true });
      return;
    }

    logger.info("Content generation requested (cache miss)", {
      studentId,
      topicId,
      format,
    });

    const content = await generateContent({
      topicId,
      format: format as ContentFormat,
      studentId,
    });

    res.json({ content, cached: false });
  } catch (err) {
    next(err);
  }
});

router.post("/explain", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = explainSchema.parse(req.body);
    const studentId = (req as any).user.id;

    logger.info("Document explanation requested", {
      studentId,
      documentId: body.documentId,
    });

    const explanation = await explainDocument({
      documentId: body.documentId,
      question: body.question,
      studentId,
    });

    res.json({ explanation });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: "Validation failed", details: err.errors });
      return;
    }
    next(err);
  }
});

export default router;
