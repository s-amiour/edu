import cron from "node-cron";
import { logger } from "../config/logger.js";
import { prisma } from "../db/client.js";
import { generateRecommendation } from "../agents/plannerAgent.js";
import { detectLearningGaps } from "../agents/graphAgent.js";
import { buildKnowledgeGraph } from "../agents/graphBuilder.js";
import { UserRole } from "../types/index.js";

const scheduledTasks: cron.ScheduledTask[] = [];

async function runNightlyPlanning(): Promise<void> {
  logger.info("Starting nightly planning job");

  try {
    const activeStudents = await prisma.user.findMany({
      where: {
        role: UserRole.STUDENT,
        activityLogs: {
          some: {
            timestamp: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
          },
        },
      },
      select: { id: true, email: true },
    });

    logger.info("Running planner for active students", { count: activeStudents.length });

    let successCount = 0;
    let errorCount = 0;

    for (const student of activeStudents) {
      try {
        await generateRecommendation(student.id);
        successCount++;
      } catch (err) {
        errorCount++;
        logger.error("Failed to generate recommendations for student", {
          studentId: student.id,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    logger.info("Nightly planning job completed", {
      totalStudents: activeStudents.length,
      successCount,
      errorCount,
    });
  } catch (err) {
    logger.error("Nightly planning job failed", {
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

async function runGapDetection(): Promise<void> {
  logger.info("Starting learning gap detection job");

  try {
    const activeStudents = await prisma.user.findMany({
      where: {
        role: UserRole.STUDENT,
        activityLogs: {
          some: {
            timestamp: { gte: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) },
          },
        },
      },
      select: { id: true },
    });

    let totalGaps = 0;
    let errorCount = 0;

    for (const student of activeStudents) {
      try {
        const gaps = await detectLearningGaps({ studentId: student.id });
        totalGaps += gaps.length;
      } catch (err) {
        errorCount++;
        logger.error("Failed to detect gaps for student", {
          studentId: student.id,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    logger.info("Learning gap detection completed", {
      studentsProcessed: activeStudents.length,
      totalGapsFound: totalGaps,
      errorCount,
    });
  } catch (err) {
    logger.error("Learning gap detection job failed", {
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

export async function buildGraphOnDemand(): Promise<{
  nodesCreated: number;
  relationshipsCreated: number;
}> {
  logger.info("On-demand knowledge graph build triggered");

  try {
    const result = await buildKnowledgeGraph();

    logger.info("Knowledge graph build completed", {
      nodesCreated: result.nodesCreated,
      relationshipsCreated: result.relationshipsCreated,
    });

    return result;
  } catch (err) {
    logger.error("Knowledge graph build failed", {
      error: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }
}

export function startScheduler(): void {
  logger.info("Starting job scheduler");

  const nightlyPlanning = cron.schedule("0 2 * * *", runNightlyPlanning, {
    scheduled: true,
    timezone: "UTC",
  });
  nightlyPlanning.start();
  scheduledTasks.push(nightlyPlanning);
  logger.info("Scheduled nightly planning job at 02:00 UTC");

  const gapDetection = cron.schedule("0 */6 * * *", runGapDetection, {
    scheduled: true,
    timezone: "UTC",
  });
  gapDetection.start();
  scheduledTasks.push(gapDetection);
  logger.info("Scheduled gap detection job every 6 hours");

  logger.info("Job scheduler started", { taskCount: scheduledTasks.length });
}

export function stopScheduler(): void {
  logger.info("Stopping job scheduler");

  for (const task of scheduledTasks) {
    task.stop();
  }
  scheduledTasks.length = 0;

  logger.info("Job scheduler stopped");
}
