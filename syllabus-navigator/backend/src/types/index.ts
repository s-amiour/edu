export enum MasteryState {
  UNSEEN = "UNSEEN",
  SEEN = "SEEN",
  PRACTICED = "PRACTICED",
  CONFIDENT = "CONFIDENT",
}

export enum ContentFormat {
  SUMMARY = "summary",
  FLASHCARDS = "flashcards",
  WORKED_EXAMPLE = "worked_example",
  ANALOGY = "analogy",
  QUIZ = "quiz",
}

export enum UserRole {
  STUDENT = "STUDENT",
  PROFESSOR = "PROFESSOR",
  ADMIN = "ADMIN",
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  passwordHash: string;
  avatarUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Course {
  id: string;
  title: string;
  code: string;
  description: string;
  professorId: string;
  syllabusDocumentId?: string;
  term: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Module {
  id: string;
  courseId: string;
  title: string;
  order: number;
  description: string;
  startDate?: Date;
  endDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Topic {
  id: string;
  moduleId: string;
  title: string;
  description: string;
  order: number;
  estimatedMinutes: number;
  prerequisiteTopicIds: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface LearningObjective {
  id: string;
  topicId: string;
  description: string;
  bloomLevel: string;
  assessedByDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Assessment {
  id: string;
  topicId: string;
  learningObjectiveId: string;
  type: "formative" | "summative";
  title: string;
  maxScore: number;
  passingScore: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface GraphNode {
  id: string;
  label: string;
  type: "topic" | "concept" | "objective" | "assessment";
  properties: Record<string, unknown>;
}

export interface GraphRelationship {
  id: string;
  sourceId: string;
  targetId: string;
  type: "PREREQUISITE_OF" | "ASSESSES" | "RELATES_TO" | "PART_OF" | "BUILDS_ON";
  weight: number;
  properties: Record<string, unknown>;
}

export interface MasteryRecord {
  id: string;
  studentId: string;
  topicId: string;
  state: MasteryState;
  score: number;
  attempts: number;
  lastActivityAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface QuizQuestion {
  id: string;
  quizAttemptId: string;
  topicId: string;
  learningObjectiveId: string;
  questionText: string;
  options: string[];
  correctOptionIndex: number;
  explanation: string;
  studentAnswer?: number;
  isCorrect?: boolean;
  pointsEarned: number;
  pointsPossible: number;
}

export interface QuizAttempt {
  id: string;
  studentId: string;
  topicId: string;
  questions: QuizQuestion[];
  score: number;
  maxScore: number;
  startedAt: Date;
  completedAt?: Date;
  timeSpentSeconds?: number;
}

export interface ContentRecommendation {
  id: string;
  studentId: string;
  topicId: string;
  format: ContentFormat;
  content: string;
  relevanceScore: number;
  generatedAt: Date;
  viewedAt?: Date;
  completedAt?: Date;
}

export interface UploadedDocument {
  id: string;
  userId: string;
  courseId?: string;
  filename: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  storageKey: string;
  processingStatus: "pending" | "processing" | "completed" | "failed";
  processingError?: string;
  uploadedAt: Date;
  processedAt?: Date;
}

export interface AuthenticatedRequest {
  user: {
    id: string;
    email: string;
    role: UserRole;
  };
}
