import { Router, Request, Response, NextFunction } from "express";
import { prisma } from "../db/client.js";
import { authenticate } from "../middleware/auth.js";
import { logger } from "../config/logger.js";
import { getGraphVisualization, traverseGraph, detectLearningGaps } from "../agents/graphAgent.js";

const router = Router();

router.use(authenticate);

router.get("/visualization", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const courseId = req.query.courseId as string | undefined;

    const graphData = await getGraphVisualization({ courseId });

    res.json({
      nodes: graphData.nodes.map((n) => ({
        id: n.id,
        label: n.label,
        type: n.type,
        properties: n.properties,
      })),
      edges: graphData.relationships.map((r) => ({
        id: r.id,
        source: r.sourceId,
        target: r.targetId,
        type: r.type,
        weight: r.weight,
      })),
    });
  } catch (err) {
    next(err);
  }
});

router.get("/traverse/:nodeId", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { nodeId } = req.params;
    const depth = Math.min(parseInt(req.query.depth as string) || 3, 10);
    const direction = (req.query.direction as string) || "both";

    const traversal = await traverseGraph({
      nodeId,
      depth,
      direction: direction as "incoming" | "outgoing" | "both",
    });

    res.json({
      root: nodeId,
      depth,
      nodes: traversal.nodes,
      edges: traversal.edges,
    });
  } catch (err) {
    next(err);
  }
});

router.get("/prerequisites/:topicId", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { topicId } = req.params;

    const topic = await prisma.topic.findUnique({
      where: { id: topicId },
      select: { id: true, title: true },
    });

    if (!topic) {
      res.status(404).json({ error: "Topic not found" });
      return;
    }

    const chain = await traverseGraph({
      nodeId: topicId,
      depth: 10,
      direction: "incoming",
    });

    const orderedChain = chain.nodes.map((n) => ({
      id: n.id,
      label: n.label,
      depth: n.depth,
    }));

    logger.info("Prerequisite chain retrieved", { topicId, chainLength: orderedChain.length });

    res.json({
      topic,
      prerequisites: orderedChain,
      totalPrerequisites: orderedChain.length,
    });
  } catch (err) {
    next(err);
  }
});

router.get("/gaps", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const studentId = (req as any).user.id;
    const courseId = req.query.courseId as string | undefined;

    const gaps = await detectLearningGaps({ studentId, courseId });

    res.json({
      gaps: gaps.map((g) => ({
        topicId: g.topicId,
        topicTitle: g.topicTitle,
        severity: g.severity,
        missingPrerequisites: g.missingPrerequisites,
        affectedDownstream: g.affectedDownstream,
        recommendation: g.recommendation,
      })),
      totalGaps: gaps.length,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
