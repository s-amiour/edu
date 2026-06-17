import { generateJSON } from "./gemini-client.js";
import { prisma, neo4jDriver } from "../db/client.js";
import { logger } from "../config/logger.js";
import neo4j from "neo4j-driver";

interface GraphNode {
  id: string;
  label: string;
  properties: Record<string, unknown>;
}

interface GraphRelationship {
  sourceId: string;
  targetId: string;
  type: string;
  properties: Record<string, unknown>;
}

interface KnowledgeGraphResult {
  nodes: GraphNode[];
  relationships: GraphRelationship[];
}

interface BuildStats {
  nodesCreated: number;
  relationshipsCreated: number;
  errors: string[];
}

const GRAPH_SCHEMA = `{
  "nodes": [
    {
      "id": "string (unique identifier)",
      "label": "Course | Module | Topic | LearningObjective | Assessment",
      "properties": { "name": "string", "description": "string", ... }
    }
  ],
  "relationships": [
    {
      "sourceId": "string",
      "targetId": "string",
      "type": "COURSE_CONTAINS_MODULE | MODULE_CONTAINS_TOPIC | TOPIC_HAS_OBJECTIVE | TOPIC_PREREQUISITE_OF_TOPIC | ASSESSMENT_EVALUATES_TOPIC | COURSE_REQUIRES_COURSE",
      "properties": { "confidence": 0.0-1.0, "reasoning": "string", "source": "string" }
    }
  ]
}`;

async function fetchSyllabusData(courseIds?: string[]) {
  const courses = await prisma.course.findMany({
    where: courseIds ? { id: { in: courseIds } } : undefined,
    include: {
      modules: {
        include: {
          topics: {
            include: {
              objectives: true,
              assessments: true,
            },
          },
        },
      },
    },
  });

  return courses;
}

function buildPrompt(syllabusData: unknown): string {
  return `You are an expert educational knowledge graph builder. Analyze the following syllabus data and extract a knowledge graph.

SYLLABUS DATA:
${JSON.stringify(syllabusData, null, 2)}

INSTRUCTIONS:
1. Create nodes for each Course, Module, Topic, LearningObjective, and Assessment found in the data.
2. Identify relationships:
   - COURSE_CONTAINS_MODULE: each course contains its modules
   - MODULE_CONTAINS_TOPIC: each module contains its topics
   - TOPIC_HAS_OBJECTIVE: each topic has its learning objectives
   - TOPIC_PREREQUISITE_OF_TOPIC: where one topic is a prerequisite for another (analyze conceptual dependencies)
   - ASSESSMENT_EVALUATES_TOPIC: which assessments evaluate which topics
   - COURSE_REQUIRES_COURSE: if one course is a prerequisite for another
3. For TOPIC_PREREQUISITE_OF_TOPIC relationships:
   - Identify foundational vs advanced concepts
   - Detect overlapping concepts across modules/courses
   - Only create relationships where there is a clear conceptual dependency
4. CRITICAL: NEVER invent concepts, topics, or courses that are not present in the provided syllabus data.
5. Every relationship MUST include:
   - confidence: a score from 0.0 to 1.0 indicating how certain this relationship is
   - reasoning: a brief explanation of why this relationship exists
   - source: reference to the syllabus data that supports this relationship

Return the knowledge graph as JSON.`;
}

async function upsertNodes(session: neo4j.Session, nodes: GraphNode[]): Promise<number> {
  let count = 0;

  for (const node of nodes) {
    try {
      await session.run(
        `MERGE (n:${node.label} {id: $id})
         SET n += $properties
         RETURN n`,
        { id: node.id, properties: neo4j.driver ? node.properties : node.properties },
      );
      count++;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error("Failed to upsert node", { nodeId: node.id, label: node.label, error: message });
    }
  }

  return count;
}

async function createRelationships(
  session: neo4j.Session,
  relationships: GraphRelationship[],
): Promise<number> {
  let count = 0;

  for (const rel of relationships) {
    try {
      await session.run(
        `MATCH (a {id: $sourceId})
         MATCH (b {id: $targetId})
         MERGE (a)-[r:${rel.type}]->(b)
         SET r += $properties
         RETURN r`,
        { sourceId: rel.sourceId, targetId: rel.targetId, properties: rel.properties },
      );
      count++;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error("Failed to create relationship", {
        source: rel.sourceId,
        target: rel.targetId,
        type: rel.type,
        error: message,
      });
    }
  }

  return count;
}

async function syncPrerequisitesToPostgres(relationships: GraphRelationship[]): Promise<void> {
  const prereqs = relationships.filter((r) => r.type === "TOPIC_PREREQUISITE_OF_TOPIC");

  for (const prereq of prereqs) {
    try {
      await prisma.topicPrerequisite.upsert({
        where: {
          prerequisiteTopicId_dependentTopicId: {
            prerequisiteTopicId: prereq.sourceId,
            dependentTopicId: prereq.targetId,
          },
        },
        update: {
          confidence: (prereq.properties.confidence as number) ?? 0.5,
          reasoning: (prereq.properties.reasoning as string) ?? "",
        },
        create: {
          prerequisiteTopicId: prereq.sourceId,
          dependentTopicId: prereq.targetId,
          confidence: (prereq.properties.confidence as number) ?? 0.5,
          reasoning: (prereq.properties.reasoning as string) ?? "",
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error("Failed to sync prerequisite to Postgres", {
        source: prereq.sourceId,
        target: prereq.targetId,
        error: message,
      });
    }
  }
}

export async function buildKnowledgeGraph(courseIds?: string[]): Promise<BuildStats> {
  const stats: BuildStats = { nodesCreated: 0, relationshipsCreated: 0, errors: [] };

  logger.info("Starting knowledge graph build", { courseIds: courseIds ?? "all" });

  const syllabusData = await fetchSyllabusData(courseIds);

  if (syllabusData.length === 0) {
    logger.warn("No syllabus data found for graph building");
    return stats;
  }

  const prompt = buildPrompt(syllabusData);

  let graphResult: KnowledgeGraphResult;
  try {
    graphResult = await generateJSON<KnowledgeGraphResult>(prompt, GRAPH_SCHEMA);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error("Failed to generate knowledge graph from Gemini", { error: message });
    stats.errors.push(`Gemini generation failed: ${message}`);
    return stats;
  }

  if (!graphResult.nodes?.length) {
    logger.warn("Gemini returned no nodes in knowledge graph");
    stats.errors.push("No nodes returned from Gemini");
    return stats;
  }

  logger.info("Knowledge graph generated", {
    nodeCount: graphResult.nodes.length,
    relationshipCount: graphResult.relationships?.length ?? 0,
  });

  const session = neo4jDriver.session();

  try {
    stats.nodesCreated = await upsertNodes(session, graphResult.nodes);
    stats.relationshipsCreated = await createRelationships(
      session,
      graphResult.relationships ?? [],
    );

    await syncPrerequisitesToPostgres(graphResult.relationships ?? []);

    logger.info("Knowledge graph build complete", {
      nodesCreated: stats.nodesCreated,
      relationshipsCreated: stats.relationshipsCreated,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error("Failed during Neo4j/Postgres sync", { error: message });
    stats.errors.push(`Database sync failed: ${message}`);
  } finally {
    await session.close();
  }

  return stats;
}
