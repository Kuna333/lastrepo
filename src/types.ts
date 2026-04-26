export interface Question {
  id: number;
  subject?: string;
  text: string;
  options: string[];
  correctIndex: number;
  explanation?: string;
}

export interface QuestionSet {
  id: string;
  name: string;
  duration: number; // in minutes
  questions: Question[];
  uploadedAt: number;
}

export type QuestionStatus =
  | 'not-visited'
  | 'not-answered'
  | 'answered'
  | 'marked'
  | 'marked-answered';

export interface QuestionState {
  status: QuestionStatus;
  selectedOption: number | null;
  timeSpent: number; // seconds
}

export interface ExamSession {
  setId: string;
  setName: string;
  questions: Question[];
  duration: number; // minutes
  startTime: number;
  questionStates: QuestionState[];
  currentIndex: number;
  finished: boolean;
  endTime?: number;
}

export interface ExamResult {
  session: ExamSession;
  totalQuestions: number;
  attempted: number;
  correct: number;
  incorrect: number;
  skipped: number;
  score: number;
  percentage: number;
  timeTaken: number; // seconds
  subjectWise: SubjectResult[];
}

export interface SubjectResult {
  subject: string;
  total: number;
  attempted: number;
  correct: number;
  incorrect: number;
  score: number;
  percentage: number;
}
