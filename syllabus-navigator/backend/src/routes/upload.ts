import { Router, Request, Response, NextFunction } from "express";
import multer from "multer";
import path from "path";
import crypto from "crypto";
import { prisma } from "../db/client.js";
import { authenticate } from "../middleware/auth.js";
import { logger } from "../config/logger.js";
import { config } from "../config/index.js";
import { generateQuizFromDocument } from "../agents/quizAgent.js";
import { generateSummary } from "../agents/contentAgent.js";
import { explainDocument } from "../agents/explainerAgent.js";

const router = Router();

router.use(authenticate);

const ALLOWED_MIMES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
];

const storage = multer.diskStorage({
  destination: config.upload.dir,
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueName = `${crypto.randomUUID()}${ext}`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: config.upload.maxFileSize },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIMES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type. Accepted: PDF, DOCX, PPTX"));
    }
  },
});

router.post("/", upload.single("file"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user.id;
    const file = req.file;

    if (!file) {
      res.status(400).json({ error: "No file uploaded" });
      return;
    }

    const courseId = req.body.courseId || undefined;

    const document = await prisma.uploadedDocument.create({
      data: {
        userId,
        courseId,
        filename: file.filename,
        originalName: file.originalname,
        mimeType: file.mimetype,
        sizeBytes: file.size,
        storageKey: file.filename,
        processingStatus: "pending",
      },
    });

    logger.info("File uploaded", {
      userId,
      documentId: document.id,
      filename: file.originalname,
      sizeBytes: file.size,
    });

    res.status(201).json({ document });
  } catch (err) {
    next(err);
  }
});

router.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user.id;

    const documents = await prisma.uploadedDocument.findMany({
      where: { userId },
      orderBy: { uploadedAt: "desc" },
      select: {
        id: true,
        originalName: true,
        mimeType: true,
        sizeBytes: true,
        processingStatus: true,
        processingError: true,
        uploadedAt: true,
        processedAt: true,
        courseId: true,
      },
    });

    res.json({ documents });
  } catch (err) {
    next(err);
  }
});

router.delete("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user.id;
    const { id } = req.params;

    const document = await prisma.uploadedDocument.findFirst({
      where: { id, userId },
    });

    if (!document) {
      res.status(404).json({ error: "Document not found" });
      return;
    }

    await prisma.uploadedDocument.delete({ where: { id } });

    try {
      const fs = await import("fs/promises");
      await fs.unlink(path.join(config.upload.dir, document.filename));
    } catch {
      logger.warn("Failed to delete file from disk", { documentId: id, filename: document.filename });
    }

    logger.info("Document deleted", { userId, documentId: id });

    res.json({ message: "Document deleted" });
  } catch (err) {
    next(err);
  }
});

router.post("/:id/quiz", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user.id;
    const { id } = req.params;
    const questionCount = parseInt(req.body.questionCount) || 10;

    const document = await prisma.uploadedDocument.findFirst({
      where: { id, userId },
    });

    if (!document) {
      res.status(404).json({ error: "Document not found" });
      return;
    }

    if (document.processingStatus !== "completed") {
      res.status(400).json({ error: "Document has not finished processing" });
      return;
    }

    const quiz = await generateQuizFromDocument({
      documentId: id,
      questionCount,
      studentId: userId,
    });

    res.status(201).json({ quiz });
  } catch (err) {
    next(err);
  }
});

router.post("/:id/summary", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user.id;
    const { id } = req.params;

    const document = await prisma.uploadedDocument.findFirst({
      where: { id, userId },
    });

    if (!document) {
      res.status(404).json({ error: "Document not found" });
      return;
    }

    if (document.processingStatus !== "completed") {
      res.status(400).json({ error: "Document has not finished processing" });
      return;
    }

    const summary = await generateSummary({ documentId: id, studentId: userId });

    res.json({ summary });
  } catch (err) {
    next(err);
  }
});

router.post("/:id/explain", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user.id;
    const { id } = req.params;
    const question = req.body.question;

    const document = await prisma.uploadedDocument.findFirst({
      where: { id, userId },
    });

    if (!document) {
      res.status(404).json({ error: "Document not found" });
      return;
    }

    if (document.processingStatus !== "completed") {
      res.status(400).json({ error: "Document has not finished processing" });
      return;
    }

    const explanation = await explainDocument({
      documentId: id,
      question,
      studentId: userId,
    });

    res.json({ explanation });
  } catch (err) {
    next(err);
  }
});

router.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      res.status(413).json({ error: "File too large. Maximum size is 50MB" });
      return;
    }
    res.status(400).json({ error: err.message });
    return;
  }
  if (err.message === "Invalid file type. Accepted: PDF, DOCX, PPTX") {
    res.status(400).json({ error: err.message });
    return;
  }
  res.status(500).json({ error: "Internal server error" });
});

export default router;
