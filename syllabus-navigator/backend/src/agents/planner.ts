import { generateJSON } from "./gemini-client.js";
import { prisma, neo4jDriver } from "../db/client.js";
import { logger } from "../config/logger.js";
import neo4j from "neo4j-driver";

type ContentFormat = "summary" | "flashcards" | "worked_example" | "analogy" | "quiz";
type Urgency = "low" | "medium" | "high" | "critical";

interface Recommendation {
  topic: string;
  topicId: string;
  reason: string;
  format: ContentFormat;
  urgency: Urgency;
}

interface StudentMastery {
  topicId: string;
  topicName: string;
  masteryScore: number;
  lastAssessedAt: Date;
}

interface UpcomingAssessment {
  id: string;
  title: string;
  dueDate: Date;
  topicIds: string[];
}

interface PrerequisiteChain {
  topicId: string;
  topicName: string;
  prerequisiteIds: string[];
  prerequisiteNames: string[];
}

async function fetchStudentMastery(studentId: string): Promise<StudentMastery[]> {
  const masteryRecords = await prisma.studentMastery.findMany({
    where: { studentId },
    include: { topic: true },
    orderBy: { lastAssessedAt: "desc" },
  });

  return masteryRecords.map((record) => ({
    topicId: record.topicId,
    topicName: record.topic.name,
    masteryScore: record.masteryScore,
    lastAssessedAt: record.lastAssessedAt,
  }));
}

async function fetchUpcomingAssessments(studentId: string): Promise<UpcomingAssessment[]> {
  const enrollments = await prisma.enrollment.findMany({
    where: { studentId },
    select: { courseId: true },
  });

  const courseIds = enrollments.map((e) => e.courseId);

  const assessments = await prisma.assessment.findMany({
    where: {
      courseId: { in: courseIds },
      dueDate: { gte: new Date() },
    },
    include: {
      assessmentTopics: { select: { topicId: true } },
    },
    orderBy: { dueDate: "asc" },
    take: 10,
  });

  return assessments.map((a) => ({
    id: a.id,
    title: a.title,
    dueDate: a.dueDate,
    topicIds: a.assessmentTopics.map((at) => at.topicId),
  }));
}

async function fetchPrerequisiteChains(topicIds: string[]): Promise<PrerequisiteChain[]> {
  const session = neo4jDriver.session();

  try {
    const chains: PrerequisiteChain[] = [];

    for (const topicId of topicIds) {
      const result = await session.run(
        `MATCH (target:Topic {id: $topicId})
         OPTIONAL MATCH (prereq:Topic)-[:TOPIC_PREREQUISITE_OF_TOPIC]->(target)
         RETURN target.id AS topicId, target.name AS topicName,
                collect(DISTINCT prereq.id) AS prereqIds,
                collect(DISTINCT prereq.name) AS prereqNames`,
        { topicId },
      );

      if (result.records.length > 0) {
        const record = result.records[0];
        chains.push({
          topicId: record.get("topicId"),
          topicName: record.get("topicName"),
          prerequisiteIds: record.get("prereqIds"),
          prerequisiteNames: record.get("prereqNames"),
        });
      }
    }

    return chains;
  } finally {
    await session.close();
  }
}

function buildPlannerPrompt(
  mastery: StudentMastery[],
  assessments: UpcomingAssessment[],
  chains: PrerequisiteChain[],
): string {
  return `You are an expert academic advisor AI. Analyze the following student data and recommend exactly ONE high-value learning intervention.

STUDENT MASTERY RECORDS:
${JSON.stringify(mastery, null, 2)}

UPCOMING ASSESSMENTS:
${JSON.stringify(assessments, null, 2)}

PREREQUISITE CHAINS FOR RELEVANT TOPICS:
${JSON.stringify(chains, null, 2)}

ANALYSIS FRAMEWORK:
1. Identify which class/session comes next based on upcoming assessments.
2. Determine what concepts are required for those assessments.
3. Cross-reference with mastery scores to find weak areas.
4. Check prerequisite chains - are there foundational gaps blocking progress?
5. Determine the single highest-value intervention.

RECOMMENDATION CRITERIA (in priority order):
- Upcoming assessment within 48h + weak mastery = critical urgency
- Prerequisite gap blocking current topic = high urgency
- Weak mastery on upcoming topic = medium urgency
- General improvement opportunity = low urgency

FORMAT OPTIONS:
- summary: concise overview of key concepts
- flashcards: memorization-focused Q&A pairs
- worked_example: step-by-step problem with solution
- analogy: relatable real-world comparison
- quiz: practice questions to test understanding

Return exactly ONE recommendation as JSON:`;
}

const RECOMMENDATION_SCHEMA = `{
  "topic": "string (topic name)",
  "topicId": "string (topic ID)",
  "reason": "string (explanation of why this is the highest-value intervention)",
  "format": "summary | flashcards | worked_example | analogy | quiz",
  "urgency": "low | medium | high | critical"
}`;

export async function generateRecommendation(studentId: string): Promise<Recommendation> {
  logger.info("Generating recommendation", { studentId });

  const [mastery, assessments] = await Promise.all([
    fetchStudentMastery(studentId),
    fetchUpcomingAssessments(studentId),
  ]);

  if (mastery.length === 0) {
    logger.warn("No mastery data for student", { studentId });
    throw new Error("No mastery data available for student");
  }

  const relevantTopicIds = [
    ...new Set([
      ...mastery.filter((m) => m.masteryScore < 0.7).map((m) => m.topicId),
      ...assessments.flatMap((a) => a.topicIds),
    ]),
  ];

  const chains = relevantTopicIds.length > 0
    ? await fetchPrerequisiteChains(relevantTopicIds)
    : [];

  const prompt = buildPlannerPrompt(mastery, assessments, chains);

  let recommendation: Recommendation;
  try {
    recommendation = await generateJSON<Recommendation>(prompt, RECOMMENDATION_SCHEMA);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error("Failed to generate recommendation", { studentId, error: message });
    throw new Error(`Recommendation generation failed: ${message}`);
  }

  try {
    await prisma.contentRecommendation.create({
      data: {
        studentId,
        topicId: recommendation.topicId,
        format: recommendation.format,
        urgency: recommendation.urgency,
        reason: recommendation.reason,
        generatedAt: new Date(),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error("Failed to save recommendation", { studentId, error: message });
  }

  logger.info("Recommendation generated", {
    studentId,
    topic: recommendation.topic,
    format: recommendation.format,
    urgency: recommendation.urgency,
  });

  return recommendation;
}
