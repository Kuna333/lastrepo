import { useState, useEffect } from 'react';
import Home from './pages/Home';
import ExamPage from './pages/ExamPage';
import ResultPage from './pages/ResultPage';
import LoginPage from './pages/LoginPage';
import { QuestionSet, ExamSession, ExamResult } from './types';
import { createNewSession, loadSession, clearSession } from './store';
import { computeResult } from './utils/computeResult';
import { saveResult } from './results';
import { useAuth } from './auth/AuthContext';

type AppView = 'home' | 'exam' | 'result';

export default function App() {
  const { user, loading } = useAuth();
  const [view, setView] = useState<AppView>('home');
  const [session, setSession] = useState<ExamSession | null>(null);
  const [result, setResult] = useState<ExamResult | null>(null);
  const [resumeChecked, setResumeChecked] = useState(false);

  // Restore unfinished session on mount (only after auth is known)
  useEffect(() => {
    if (loading || !user || resumeChecked) return;
    const saved = loadSession();
    if (saved && !saved.finished) {
      const resume = confirm(`You have an unfinished exam: "${saved.setName}". Resume it?`);
      if (resume) {
        setSession(saved);
        setView('exam');
      } else {
        clearSession();
      }
    } else if (saved && saved.finished) {
      clearSession();
    }
    setResumeChecked(true);
  }, [loading, user, resumeChecked]);

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'hsl(221 83% 20%)', color: 'white',
        fontFamily: 'Inter, system-ui, sans-serif', fontSize: 14,
      }}>
        Loading…
      </div>
    );
  }

  if (!user) return <LoginPage />;

  const handleStart = (set: QuestionSet) => {
    const newSession = createNewSession(set);
    setSession(newSession);
    setResult(null);
    setView('exam');
  };

  const handleSessionUpdate = (updated: ExamSession) => setSession(updated);

  const handleFinish = (finished: ExamSession) => {
    const examResult = computeResult(finished);
    setResult(examResult);
    clearSession();
    // Save to Firestore (fire and forget; offline cache will queue if no internet)
    saveResult(user.uid, examResult).catch((err) => {
      console.warn('Failed to save result to cloud:', err);
    });
    setView('result');
  };

  const handleRetake = () => {
    if (!result) return;
    handleStart({
      id: result.session.setId,
      name: result.session.setName,
      duration: result.session.duration,
      questions: result.session.questions,
      uploadedAt: Date.now(),
    });
  };

  const handleHome = () => {
    setView('home');
    setSession(null);
    setResult(null);
  };

  if (view === 'exam' && session) {
    return <ExamPage session={session} onSessionUpdate={handleSessionUpdate} onFinish={handleFinish} />;
  }
  if (view === 'result' && result) {
    return <ResultPage result={result} onRetake={handleRetake} onHome={handleHome} />;
  }
  return <Home onStart={handleStart} />;
}
