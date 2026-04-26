import {
  collection, doc, setDoc, getDocs, query, orderBy, limit, deleteDoc, Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { ExamResult } from './types';

export interface SavedResult {
  id: string;
  setName: string;
  totalQuestions: number;
  attempted: number;
  correct: number;
  incorrect: number;
  skipped: number;
  score: number;
  percentage: number;
  timeTaken: number;
  duration: number;
  createdAt: number;
}

function resultsCol(uid: string) {
  return collection(db, 'users', uid, 'results');
}

export async function saveResult(uid: string, result: ExamResult): Promise<string> {
  const id = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const ref = doc(resultsCol(uid), id);
  const payload = {
    id,
    setName: result.session.setName,
    setId: result.session.setId,
    totalQuestions: result.totalQuestions,
    attempted: result.attempted,
    correct: result.correct,
    incorrect: result.incorrect,
    skipped: result.skipped,
    score: result.score,
    percentage: result.percentage,
    timeTaken: result.timeTaken,
    duration: result.session.duration,
    subjectWise: result.subjectWise,
    createdAt: Timestamp.now(),
  };
  await setDoc(ref, payload);
  return id;
}

export async function loadResults(uid: string, max = 50): Promise<SavedResult[]> {
  const q = query(resultsCol(uid), orderBy('createdAt', 'desc'), limit(max));
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const data = d.data();
    const createdAt = data.createdAt?.toMillis ? data.createdAt.toMillis() : Date.now();
    return {
      id: d.id,
      setName: data.setName || 'Untitled',
      totalQuestions: data.totalQuestions || 0,
      attempted: data.attempted || 0,
      correct: data.correct || 0,
      incorrect: data.incorrect || 0,
      skipped: data.skipped || 0,
      score: data.score || 0,
      percentage: data.percentage || 0,
      timeTaken: data.timeTaken || 0,
      duration: data.duration || 0,
      createdAt,
    };
  });
}

export async function deleteResult(uid: string, id: string): Promise<void> {
  await deleteDoc(doc(resultsCol(uid), id));
}
