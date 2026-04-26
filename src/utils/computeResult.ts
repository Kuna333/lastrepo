import { ExamSession, ExamResult, SubjectResult } from '../types';

export function computeResult(session: ExamSession): ExamResult {
  const total = session.questions.length;
  let correct = 0;
  let incorrect = 0;
  let skipped = 0;
  let attempted = 0;
  const timeTaken = session.endTime
    ? Math.floor((session.endTime - session.startTime) / 1000)
    : session.duration * 60;

  const subjectMap = new Map<string, { total: number; correct: number; incorrect: number; attempted: number }>();

  session.questions.forEach((q, idx) => {
    const state = session.questionStates[idx];
    const subjectKey = q.subject || '__none__';

    if (!subjectMap.has(subjectKey)) {
      subjectMap.set(subjectKey, { total: 0, correct: 0, incorrect: 0, attempted: 0 });
    }
    const subData = subjectMap.get(subjectKey)!;
    subData.total++;

    if (state.selectedOption === null) {
      skipped++;
    } else {
      attempted++;
      subData.attempted++;
      if (state.selectedOption === q.correctIndex) {
        correct++;
        subData.correct++;
      } else {
        incorrect++;
        subData.incorrect++;
      }
    }
  });

  const percentage = total > 0 ? (correct / total) * 100 : 0;
  const score = correct;

  const subjectWise: SubjectResult[] = [];
  subjectMap.forEach((data, subject) => {
    if (subject === '__none__') return;
    subjectWise.push({
      subject,
      total: data.total,
      attempted: data.attempted,
      correct: data.correct,
      incorrect: data.incorrect,
      score: data.correct,
      percentage: data.total > 0 ? (data.correct / data.total) * 100 : 0,
    });
  });

  subjectWise.sort((a, b) => b.percentage - a.percentage);

  return {
    session,
    totalQuestions: total,
    attempted,
    correct,
    incorrect,
    skipped,
    score,
    percentage,
    timeTaken,
    subjectWise,
  };
}
