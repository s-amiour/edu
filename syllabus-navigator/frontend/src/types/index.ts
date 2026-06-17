export enum MasteryState {
  UNSEEN = 'UNSEEN',
  SEEN = 'SEEN',
  PRACTICED = 'PRACTICED',
  CONFIDENT = 'CONFIDENT',
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'student' | 'professor';
  createdAt: string;
}

export interface Course {
  id: string;
  code: string;
  name: string;
  semester: string;
  modules: Module[];
  topicCount: number;
}

export interface Module {
  id: string;
  name: string;
  courseId: string;
  order: number;
  topics: Topic[];
}

export interface Topic {
  id: string;
  name: string;
  moduleId: string;
  description: string;
  prerequisites: string[];
  learningObjectives: LearningObjective[];
}

export interface LearningObjective {
  id: string;
  topicId: string;
  description: string;
  bloomLevel: string;
}

export interface Assessment {
  id: string;
  title: string;
  type: 'quiz' | 'exam' | 'assignment';
  courseId: string;
  dueDate: string;
  totalPoints: number;
  topicIds: string[];
}

export interface MasteryRecord {
  id: string;
  userId: string;
  topicId: string;
  state: MasteryState;
  lastUpdated: string;
  confidence: number;
}

export interface Quiz {
  id: string;
  title: string;
  topicId: string;
  topicName: string;
  questionCount: number;
  timeLimitMinutes: number;
  questions: QuizQuestion[];
}

export interface QuizQuestion {
  id: string;
  quizId: string;
  text: string;
  type: 'mcq' | 'short_answer';
  options?: string[];
  correctAnswer: string;
  explanation: string;
  points: number;
}

export interface QuizAttempt {
  id: string;
  quizId: string;
  userId: string;
  answers: Record<string, string>;
  score: number;
  totalPoints: number;
  completedAt: string;
}

export interface ContentRecommendation {
  id: string;
  topicId: string;
  topicName: string;
  reason: string;
  format: 'Summary' | 'Video' | 'Practice' | 'Reading';
  urgency: 'high' | 'medium' | 'low';
  contentUrl?: string;
}

export interface UploadedDocument {
  id: string;
  filename: string;
  courseId: string;
  uploadedBy: string;
  uploadedAt: string;
  pageCount: number;
  status: 'processing' | 'ready' | 'failed';
}

export interface ActivityLog {
  id: string;
  userId: string;
  type: 'quiz_completed' | 'topic_viewed' | 'recommendation_accepted' | 'assessment_submitted' | 'streak_milestone';
  description: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface GraphNode {
  id: string;
  label: string;
  type: 'Course' | 'Module' | 'Topic';
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
}

export interface GraphEdge {
  source: string;
  target: string;
}
