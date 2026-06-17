import { neo4jDriver } from "../db/client.js";
import { prisma } from "../db/client.js";
import { logger } from "../config/logger.js";
import neo4j from "neo4j-driver";

interface GapReport {
  weakDependencyTopics: WeakDependencyTopic[];
  orphanTopics: OrphanTopic[];
  brokenChains: BrokenChain[];
  summary: {
    totalTopicsAnalyzed: number;
    topicsWithGaps: number;
    criticalGaps: number;
  };
}

interface WeakDependencyTopic {
  topicId: string;
  topicName: string;
  courseId: string;
  courseName: string;
  dependentStudentCount: number;
  averageMasteryScore: number;
  prerequisiteGaps: string[];
}

interface OrphanTopic {
  topicId: string;
  topicName: string;
  courseId: string;
  courseName: string;
  moduleName: string;
  reason: string;
}

interface BrokenChain {
  topicId: string;
  topicName: string;
  expectedPrerequisite: string;
  chainBreakReason: string;
}

async function fetchPrerequisiteChainsFromNeo4j() {
  const session = neo4jDriver.session();

  try {
    const result = await session.run(
      `MATCH (t:Topic)
       OPTIONAL MATCH (t)-[:TOPIC_PREREQUISITE_OF_TOPIC]->(dependent:Topic)
       OPTIONAL MATCH (prereq:Topic)-[:TOPIC_PREREQUISITE_OF_TOPIC]->(t)
       RETURN t.id AS topicId, t.name AS topicName,
              collect(DISTINCT dependent.id) AS dependentIds,
              collect(DISTINCT prereq.id) AS prereqIds`,
    );

    return result.records.map((record) => ({
      topicId: record.get("topicId"),
      topicName: record.get("topicName"),
      dependentIds: record.get("dependentIds") as string[],
      prereqIds: record.get("prereqIds") as string[],
    }));
  } finally {
    await session.close();
  }
}

async function findWeakDependencyTopics(): Promise<WeakDependencyTopic[]> {
  const session = neo4jDriver.session();

  try {
    const result = await session.run(
      `MATCH (t:Topic)<-[:TOPIC_PREREQUISITE_OF_TOPIC]-(prereq:Topic)
       RETURN t.id AS topicId, t.name AS topicName,
              count(DISTINCT prereq) AS prereqCount`,
    );

    const topicPrereqCounts = result.records.map((record) => ({
      topicId: record.get("topicId"),
      topicName: record.get("topicName"),
      prereqCount: record.get("prereqCount").toNumber?.() ?? Number(record.get("prereqCount")),
    }));

    const weakTopics: WeakDependencyTopic[] = [];

    for (const tp of topicPrereqCounts) {
      const masteryRecords = await prisma.studentMastery.findMany({
        where: { topicId: tp.topicId },
        select: { masteryScore: true },
      });

      if (masteryRecords.length === 0) continue;

      const avgMastery =
        masteryRecords.reduce((sum, r) => sum + r.masteryScore, 0) / masteryRecords.length;

      const weakStudents = masteryRecords.filter((r) => r.masteryScore < 0.6).length;

      if (weakStudents >= 3 || (masteryRecords.length > 0 && avgMastery < 0.5)) {
        const topicDetails = await prisma.topic.findUnique({
          where: { id: tp.topicId },
          include: { module: { include: { course: true } } },
        });

        if (!topicDetails) continue;

        weakTopics.push({
          topicId: tp.topicId,
          topicName: tp.topicName,
          courseId: topicDetails.module.course.id,
          courseName: topicDetails.module.course.name,
          dependentStudentCount: weakStudents,
          averageMasteryScore: Math.round(avgMastery * 100) / 100,
          prerequisiteGaps: [`Low mastery (${avgMastery.toFixed(2)}) with ${tp.prereqCount} prerequisites`],
        });
      }
    }

    return weakTopics;
  } finally {
    await session.close();
  }
}

async function findOrphanTopics(): Promise<OrphanTopic[]> {
  const session = neo4jDriver.session();

  try {
    const result = await session.run(
      `MATCH (t:Topic)
       WHERE NOT (t)<-[:TOPIC_PREREQUISITE_OF_TOPIC]-()
         AND NOT (t)-[:TOPIC_PREREQUISITE_OF_TOPIC]->()
       OPTIONAL MATCH (m:Module)-[:MODULE_CONTAINS_TOPIC]->(t)
       OPTIONAL MATCH (c:Course)-[:COURSE_CONTAINS_MODULE]->(m)
       RETURN t.id AS topicId, t.name AS topicName,
              c.id AS courseId, c.name AS courseName,
              m.name AS moduleName`,
    );

    return result.records.map((record) => ({
      topicId: record.get("topicId"),
      topicName: record.get("topicName"),
      courseId: record.get("courseId") ?? "unknown",
      courseName: record.get("courseName") ?? "unknown",
      moduleName: record.get("moduleName") ?? "unknown",
      reason: "No prerequisite relationships found (neither prerequisite of nor dependent on any topic)",
    }));
  } finally {
    await session.close();
  }
}

async function findBrokenChains(): Promise<BrokenChain[]> {
  const chains = await fetchPrerequisiteChainsFromNeo4j();
  const broken: BrokenChain[] = [];

  for (const chain of chains) {
    if (chain.dependentIds.length === 0 && chain.prereqIds.length === 0) continue;

    if (chain.prereqIds.length > 0) {
      for (const prereqId of chain.prereqIds) {
        const prereqExists = await prisma.topic.findUnique({
          where: { id: prereqId },
          select: { id: true },
        });

        if (!prereqExists) {
          broken.push({
            topicId: chain.topicId,
            topicName: chain.topicName,
            expectedPrerequisite: prereqId,
            chainBreakReason: `Prerequisite topic ${prereqId} referenced in Neo4j but not found in PostgreSQL`,
          });
        }
      }
    }
  }

  return broken;
}

export async function detectLearningGaps(courseId?: string): Promise<GapReport> {
  logger.info("Starting learning gap detection", { courseId: courseId ?? "all" });

  const [weakDependencyTopics, orphanTopics, brokenChains] = await Promise.all([
    findWeakDependencyTopics(),
    findOrphanTopics(),
    findBrokenChains(),
  ]);

  let filteredWeak = weakDependencyTopics;
  let filteredOrphans = orphanTopics;
  let filteredBroken = brokenChains;

  if (courseId) {
    filteredWeak = weakDependencyTopics.filter((t) => t.courseId === courseId);
    filteredOrphans = orphanTopics.filter((t) => t.courseId === courseId);
    filteredBroken = brokenChains;
  }

  const session = neo4jDriver.session();
  let totalTopics = 0;
  try {
    const result = await session.run(`MATCH (t:Topic) RETURN count(t) AS total`);
    totalTopics = result.records[0]?.get("total").toNumber?.() ?? 0;
  } finally {
    await session.close();
  }

  const topicsWithGaps = new Set([
    ...filteredWeak.map((t) => t.topicId),
    ...filteredOrphans.map((t) => t.topicId),
    ...filteredBroken.map((t) => t.topicId),
  ]).size;

  const report: GapReport = {
    weakDependencyTopics: filteredWeak,
    orphanTopics: filteredOrphans,
    brokenChains: filteredBroken,
    summary: {
      totalTopicsAnalyzed: totalTopics,
      topicsWithGaps,
      criticalGaps: filteredWeak.filter((t) => t.averageMasteryScore < 0.4).length + filteredBroken.length,
    },
  };

  logger.info("Gap detection complete", {
    courseId: courseId ?? "all",
    totalTopics: report.summary.totalTopicsAnalyzed,
    topicsWithGaps: report.summary.topicsWithGaps,
    criticalGaps: report.summary.criticalGaps,
  });

  return report;
}
