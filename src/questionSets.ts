import {
  collection, doc, setDoc, getDocs, query, orderBy, deleteDoc, Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { QuestionSet } from './types';

function setsCol(uid: string) {
  return collection(db, 'users', uid, 'questionSets');
}

export async function saveQuestionSetCloud(uid: string, set: QuestionSet): Promise<void> {
  const ref = doc(setsCol(uid), set.id);
  await setDoc(ref, {
    id: set.id,
    name: set.name,
    duration: set.duration,
    questions: set.questions,
    uploadedAt: Timestamp.fromMillis(set.uploadedAt),
  });
}

export async function loadQuestionSetsCloud(uid: string): Promise<QuestionSet[]> {
  const q = query(setsCol(uid), orderBy('uploadedAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const data = d.data();
    const uploadedAt = data.uploadedAt?.toMillis ? data.uploadedAt.toMillis() : Date.now();
    return {
      id: data.id || d.id,
      name: data.name || 'Untitled',
      duration: data.duration || 60,
      questions: Array.isArray(data.questions) ? data.questions : [],
      uploadedAt,
    } as QuestionSet;
  });
}

export async function deleteQuestionSetCloud(uid: string, id: string): Promise<void> {
  await deleteDoc(doc(setsCol(uid), id));
}

/** Estimate Firestore document size in bytes. Hard limit is 1 MB. */
export function estimateSetSize(set: QuestionSet): number {
  return new Blob([JSON.stringify(set)]).size;
}
