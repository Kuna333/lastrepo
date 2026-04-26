import { Question, QuestionSet, ExamSession, QuestionState } from './types';

const STORAGE_KEY_SETS = 'cbt_question_sets';
const STORAGE_KEY_SESSION = 'cbt_active_session';

export function saveQuestionSets(sets: QuestionSet[]): void {
  localStorage.setItem(STORAGE_KEY_SETS, JSON.stringify(sets));
}

export function loadQuestionSets(): QuestionSet[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SETS);
    if (!raw) return [];
    return JSON.parse(raw) as QuestionSet[];
  } catch {
    return [];
  }
}

export function saveSession(session: ExamSession): void {
  localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(session));
}

export function loadSession(): ExamSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SESSION);
    if (!raw) return null;
    return JSON.parse(raw) as ExamSession;
  } catch {
    return null;
  }
}

export function clearSession(): void {
  localStorage.removeItem(STORAGE_KEY_SESSION);
}

export function createNewSession(set: QuestionSet): ExamSession {
  const questionStates: QuestionState[] = set.questions.map(() => ({
    status: 'not-visited',
    selectedOption: null,
    timeSpent: 0,
  }));

  return {
    setId: set.id,
    setName: set.name,
    questions: set.questions,
    duration: set.duration,
    startTime: Date.now(),
    questionStates,
    currentIndex: 0,
    finished: false,
  };
}

export function parseQuestionFile(content: string, filename: string): Question[] {
  const ext = filename.split('.').pop()?.toLowerCase();

  if (ext === 'json') {
    return parseJSON(content);
  } else if (ext === 'csv') {
    return parseCSV(content);
  } else if (ext === 'txt') {
    return parseTXT(content);
  }
  throw new Error('Unsupported file format. Use .json, .csv, or .txt');
}

function parseJSON(content: string): Question[] {
  const data = JSON.parse(content);
  const arr = Array.isArray(data) ? data : data.questions || data.data || [];

  return arr.map((q: Record<string, unknown>, i: number) => {
    const text = String(q.question || q.text || q.q || '');
    const subject = q.subject ? String(q.subject) : undefined;

    let options: string[] = [];
    if (Array.isArray(q.options)) {
      options = q.options.map(String);
    } else if (q.a && q.b && q.c && q.d) {
      options = [String(q.a), String(q.b), String(q.c), String(q.d)];
    }

    let correctIndex = 0;
    if (typeof q.correctIndex === 'number') {
      correctIndex = q.correctIndex;
    } else if (typeof q.answer === 'number') {
      correctIndex = q.answer;
    } else if (typeof q.correct === 'number') {
      correctIndex = q.correct;
    } else if (typeof q.answer === 'string') {
      const ans = q.answer.toUpperCase();
      correctIndex = ['A', 'B', 'C', 'D'].indexOf(ans);
      if (correctIndex === -1) correctIndex = 0;
    } else if (typeof q.correctOption === 'string') {
      const ans = (q.correctOption as string).toUpperCase();
      correctIndex = ['A', 'B', 'C', 'D'].indexOf(ans);
      if (correctIndex === -1) correctIndex = 0;
    }

    const explanation = q.explanation ? String(q.explanation) : undefined;

    return { id: i + 1, text, options, correctIndex, subject, explanation };
  }).filter((q: Question) => q.text && q.options.length >= 2);
}

function parseCSV(content: string): Question[] {
  const lines = content.split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length < 2) return [];

  const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase().trim());
  const questions: Question[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i]);
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => { row[h] = cols[idx] || ''; });

    const text = row.question || row.text || row.q || '';
    if (!text) continue;

    const options: string[] = [];
    ['a', 'b', 'c', 'd', 'e'].forEach(letter => {
      const opt = row[letter] || row[`option_${letter}`] || row[`option${letter}`] || row[`opt${letter}`];
      if (opt) options.push(opt);
    });

    if (options.length < 2) {
      ['option1', 'option2', 'option3', 'option4'].forEach(k => {
        if (row[k]) options.push(row[k]);
      });
    }

    const ansStr = (row.answer || row.correct || row.correctoption || '').toUpperCase();
    let correctIndex = ['A', 'B', 'C', 'D'].indexOf(ansStr);
    if (correctIndex === -1) {
      correctIndex = parseInt(row.correctindex || row.answerindex || '0', 10) || 0;
    }

    questions.push({
      id: i,
      text,
      options,
      correctIndex: Math.max(0, Math.min(correctIndex, options.length - 1)),
      subject: row.subject || undefined,
      explanation: row.explanation || undefined,
    });
  }

  return questions;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

function parseTXT(content: string): Question[] {
  const blocks = content.split(/\n\s*\n+/).filter(b => b.trim());
  const questions: Question[] = [];

  blocks.forEach((block, idx) => {
    const lines = block.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length < 3) return;

    const qLine = lines[0].replace(/^\d+[\.\)]\s*/, '').trim();
    const options: string[] = [];
    let correctIndex = 0;
    let explanation = '';

    lines.slice(1).forEach(line => {
      const optMatch = line.match(/^([A-Da-d])[\.\)]\s*(.+)/);
      if (optMatch) {
        options.push(optMatch[2].trim());
      }
      const ansMatch = line.match(/^(?:answer|correct|ans)[\s:]+([A-Da-d\d])/i);
      if (ansMatch) {
        const ans = ansMatch[1].toUpperCase();
        correctIndex = isNaN(parseInt(ans)) ? ['A', 'B', 'C', 'D'].indexOf(ans) : parseInt(ans) - 1;
      }
      if (/^explanation[\s:]+/i.test(line)) {
        explanation = line.replace(/^explanation[\s:]+/i, '').trim();
      }
    });

    if (qLine && options.length >= 2) {
      questions.push({
        id: idx + 1,
        text: qLine,
        options,
        correctIndex: Math.max(0, Math.min(correctIndex, options.length - 1)),
        explanation: explanation || undefined,
      });
    }
  });

  return questions;
}
