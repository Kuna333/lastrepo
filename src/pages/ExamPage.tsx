import { useState, useEffect, useCallback, useRef } from 'react';
import { ExamSession, QuestionStatus } from '../types';
import { saveSession } from '../store';
import SubmitDialog from '../components/SubmitDialog';

interface ExamPageProps {
  session: ExamSession;
  onSessionUpdate: (session: ExamSession) => void;
  onFinish: (session: ExamSession) => void;
}

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < 900 : false
  );
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 900);
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
    };
  }, []);
  return isMobile;
}

export default function ExamPage({ session, onSessionUpdate, onFinish }: ExamPageProps) {
  const [localSession, setLocalSession] = useState<ExamSession>(session);
  const [showSubmit, setShowSubmit] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const isMobile = useIsMobile();
  const [timeLeft, setTimeLeft] = useState<number>(() => {
    const elapsed = Math.floor((Date.now() - session.startTime) / 1000);
    return Math.max(0, session.duration * 60 - elapsed);
  });

  const lastIndexRef = useRef(localSession.currentIndex);
  const questionTimeRef = useRef<number>(Date.now());

  const updateSession = useCallback((updated: ExamSession) => {
    setLocalSession(updated);
    saveSession(updated);
    onSessionUpdate(updated);
  }, [onSessionUpdate]);

  // Timer
  useEffect(() => {
    if (localSession.finished) return;
    const tick = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(tick);
          const final = { ...localSession, finished: true, endTime: Date.now() };
          updateSession(final);
          onFinish(final);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(tick);
  }, [localSession.finished]);

  // Track time per question
  useEffect(() => {
    const prevIndex = lastIndexRef.current;
    const now = Date.now();
    const spent = Math.floor((now - questionTimeRef.current) / 1000);
    if (prevIndex !== localSession.currentIndex) {
      setLocalSession(prev => {
        const states = [...prev.questionStates];
        states[prevIndex] = { ...states[prevIndex], timeSpent: states[prevIndex].timeSpent + spent };
        return { ...prev, questionStates: states };
      });
      lastIndexRef.current = localSession.currentIndex;
      questionTimeRef.current = now;
    }
  }, [localSession.currentIndex]);

  const currentQ = localSession.questions[localSession.currentIndex];
  const currentState = localSession.questionStates[localSession.currentIndex];

  const goTo = (index: number) => {
    const states = [...localSession.questionStates];
    if (states[localSession.currentIndex].status === 'not-visited') {
      states[localSession.currentIndex] = { ...states[localSession.currentIndex], status: 'not-answered' };
    }
    if (states[index].status === 'not-visited') {
      states[index] = { ...states[index], status: 'not-answered' };
    }
    updateSession({ ...localSession, questionStates: states, currentIndex: index });
    if (isMobile) setPaletteOpen(false);
  };

  const selectOption = (optIdx: number) => {
    const states = [...localSession.questionStates];
    const cur = states[localSession.currentIndex];
    const wasMarked = cur.status === 'marked' || cur.status === 'marked-answered';
    states[localSession.currentIndex] = {
      ...cur,
      selectedOption: optIdx,
      status: wasMarked ? 'marked-answered' : 'answered',
    };
    updateSession({ ...localSession, questionStates: states });
  };

  const clearResponse = () => {
    const states = [...localSession.questionStates];
    const cur = states[localSession.currentIndex];
    const wasMarked = cur.status === 'marked' || cur.status === 'marked-answered';
    states[localSession.currentIndex] = {
      ...cur,
      selectedOption: null,
      status: wasMarked ? 'marked' : 'not-answered',
    };
    updateSession({ ...localSession, questionStates: states });
  };

  const toggleMark = () => {
    const states = [...localSession.questionStates];
    const cur = states[localSession.currentIndex];
    let newStatus: QuestionStatus;
    if (cur.status === 'marked') newStatus = 'not-answered';
    else if (cur.status === 'marked-answered') newStatus = 'answered';
    else if (cur.status === 'answered') newStatus = 'marked-answered';
    else newStatus = 'marked';
    states[localSession.currentIndex] = { ...cur, status: newStatus };
    updateSession({ ...localSession, questionStates: states });
  };

  const handleSubmit = () => {
    const now = Date.now();
    const spent = Math.floor((now - questionTimeRef.current) / 1000);
    const states = [...localSession.questionStates];
    states[localSession.currentIndex] = {
      ...states[localSession.currentIndex],
      timeSpent: states[localSession.currentIndex].timeSpent + spent,
    };
    const final: ExamSession = { ...localSession, questionStates: states, finished: true, endTime: now };
    updateSession(final);
    onFinish(final);
  };

  const formatTime = (sec: number) => {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
    return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  };

  const stats = localSession.questionStates.reduce((acc, st) => {
    if (st.status === 'answered') acc.answered++;
    if (st.status === 'not-answered') acc.notAnswered++;
    if (st.status === 'marked') acc.marked++;
    if (st.status === 'marked-answered') acc.markedAnswered++;
    if (st.status === 'not-visited') acc.notVisited++;
    return acc;
  }, { answered: 0, notAnswered: 0, marked: 0, markedAnswered: 0, notVisited: 0 });

  const isMarked = currentState.status === 'marked' || currentState.status === 'marked-answered';
  const isUrgent = timeLeft < 120;
  const subjects = Array.from(new Set(localSession.questions.map(q => q.subject).filter(Boolean)));

  // ---- Palette panel (used both as sidebar and mobile drawer) ----
  const palettePanel = (
    <div style={{
      width: isMobile ? '85vw' : 240,
      maxWidth: 320,
      background: 'white',
      borderLeft: isMobile ? 'none' : '1px solid hsl(214 20% 88%)',
      display: 'flex', flexDirection: 'column',
      height: '100%', overflow: 'hidden', flexShrink: 0,
    }}>
      <div style={{
        padding: '10px 14px', background: 'hsl(221 83% 15%)',
        color: 'white', flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <p style={{ margin: 0, fontSize: 12, fontWeight: 700, opacity: 0.9 }}>QUESTION PALETTE</p>
        {isMobile && (
          <button onClick={() => setPaletteOpen(false)} style={{
            background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white',
            width: 26, height: 26, borderRadius: 4, cursor: 'pointer', fontSize: 16, lineHeight: 1,
          }}>×</button>
        )}
      </div>

      <div style={{ padding: '10px 14px', borderBottom: '1px solid hsl(214 20% 90%)', background: 'hsl(210 20% 98%)', flexShrink: 0 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 4px' }}>
          <LegendItem color="hsl(142 71% 45%)" label={`Answered (${stats.answered})`} />
          <LegendItem color="hsl(0 84% 60%)" label={`Not Ans. (${stats.notAnswered})`} />
          <LegendItem color="hsl(38 92% 50%)" label={`Marked (${stats.marked})`} />
          <LegendItem color="hsl(38 92% 50%)" dot="hsl(142 71% 45%)" label={`Marked+Ans (${stats.markedAnswered})`} />
          <LegendItem color="hsl(215 16% 70%)" label={`Not Visited (${stats.notVisited})`} />
        </div>
        <p style={{ margin: '8px 0 0', fontSize: 10, color: 'hsl(215 16% 50%)', lineHeight: 1.4 }}>
          Marked + Answered questions ARE counted in your final score.
        </p>
      </div>

      {subjects.length > 1 && (
        <div style={{ padding: '8px 12px', borderBottom: '1px solid hsl(214 20% 90%)', flexShrink: 0 }}>
          <select style={{
            width: '100%', fontSize: 12, padding: '5px 8px',
            borderRadius: 6, border: '1px solid hsl(214 20% 80%)',
            background: 'white', fontFamily: 'inherit',
          }}>
            <option value="">All Subjects</option>
            {subjects.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      )}

      <div style={{ flex: 1, overflow: 'auto', padding: '12px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6 }}>
          {localSession.questionStates.map((state, idx) => (
            <button
              key={idx}
              onClick={() => goTo(idx)}
              className={`question-nav-btn ${state.status} ${idx === localSession.currentIndex ? 'current' : ''}`}
              title={`Q${idx + 1}: ${state.status}`}
            >
              {idx + 1}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100vh',
      background: 'hsl(210 20% 96%)', fontFamily: 'Inter, system-ui, sans-serif',
      overflow: 'hidden',
    }}>
      {/* Top Bar */}
      <div style={{
        background: 'hsl(221 83% 20%)', color: 'white',
        padding: isMobile ? '0 10px' : '0 20px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        height: isMobile ? 48 : 54, flexShrink: 0,
        boxShadow: '0 2px 8px rgba(0,0,0,0.2)', gap: 8,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 }}>
          <span style={{ fontSize: isMobile ? 15 : 18, fontWeight: 800 }}>CBT</span>
          {!isMobile && <span style={{ height: 20, width: 1, background: 'rgba(255,255,255,0.3)' }} />}
          <span style={{
            fontSize: isMobile ? 11 : 13, opacity: 0.9, overflow: 'hidden',
            textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0,
          }}>{localSession.setName}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 6 : 16, flexShrink: 0 }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 5,
            background: isUrgent ? 'hsl(0 84% 45%)' : 'rgba(255,255,255,0.12)',
            padding: isMobile ? '4px 10px' : '5px 14px', borderRadius: 20,
            animation: isUrgent ? 'pulse-red 1s infinite' : 'none',
          }}>
            <span style={{ fontSize: 13 }}>⏱</span>
            <span style={{ fontSize: isMobile ? 12 : 14, fontWeight: 700, fontFamily: 'monospace' }}>
              {formatTime(timeLeft)}
            </span>
          </div>
          {isMobile && (
            <button onClick={() => setPaletteOpen(true)} style={{
              padding: '5px 10px', borderRadius: 6,
              background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)',
              color: 'white', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
            }}>☰</button>
          )}
          <button onClick={() => setShowSubmit(true)} style={{
            padding: isMobile ? '5px 10px' : '6px 18px', borderRadius: 6,
            background: 'hsl(38 92% 50%)', border: 'none', cursor: 'pointer',
            color: 'white', fontSize: isMobile ? 11 : 13, fontWeight: 700, fontFamily: 'inherit',
          }}>{isMobile ? 'Submit' : 'Submit Exam'}</button>
        </div>
      </div>

      {/* Main layout */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', position: 'relative' }}>

        {/* Question Panel */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
          {/* Question header */}
          <div style={{
            background: 'hsl(221 83% 14%)', color: 'white',
            padding: isMobile ? '8px 12px' : '8px 20px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            flexShrink: 0, gap: 8, flexWrap: 'wrap',
          }}>
            <span style={{ fontSize: isMobile ? 12 : 13, fontWeight: 600 }}>
              Q {localSession.currentIndex + 1}/{localSession.questions.length}
              {currentQ.subject && (
                <span style={{
                  marginLeft: 8, fontSize: 10, padding: '2px 8px',
                  background: 'rgba(255,255,255,0.15)', borderRadius: 20,
                }}>{currentQ.subject}</span>
              )}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <button onClick={clearResponse} disabled={currentState.selectedOption === null} style={{
                padding: '4px 10px', borderRadius: 5,
                background: currentState.selectedOption !== null ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.2)',
                color: currentState.selectedOption !== null ? 'white' : 'rgba(255,255,255,0.4)',
                cursor: currentState.selectedOption !== null ? 'pointer' : 'not-allowed',
                fontSize: 11, fontFamily: 'inherit',
              }}>Clear</button>
              <button onClick={toggleMark} style={{
                padding: '4px 10px', borderRadius: 5,
                background: isMarked ? 'hsl(38 92% 50%)' : 'rgba(255,255,255,0.12)',
                border: '1px solid ' + (isMarked ? 'hsl(38 92% 40%)' : 'rgba(255,255,255,0.2)'),
                color: 'white', cursor: 'pointer', fontSize: 11, fontFamily: 'inherit',
                fontWeight: isMarked ? 700 : 400,
              }}>{isMarked ? '⭐ Marked' : '☆ Mark'}</button>
            </div>
          </div>

          {/* Question content */}
          <div style={{ flex: 1, overflow: 'auto', padding: isMobile ? '14px' : '24px' }}>
            <div style={{
              background: 'white', borderRadius: 10, padding: isMobile ? '14px' : '24px',
              border: '1px solid hsl(214 20% 88%)',
              boxShadow: '0 1px 4px rgba(0,0,0,0.04)', marginBottom: 16,
            }}>
              <p style={{
                margin: 0, fontSize: isMobile ? 14 : 15, lineHeight: 1.7,
                color: 'hsl(220 25% 12%)', fontWeight: 500, wordBreak: 'break-word',
              }}>
                {localSession.currentIndex + 1}. {currentQ.text}
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {currentQ.options.map((opt, idx) => {
                const isSelected = currentState.selectedOption === idx;
                const letter = ['A','B','C','D','E'][idx];
                return (
                  <label
                    key={idx}
                    className={`option-label ${isSelected ? 'selected' : ''}`}
                    onClick={() => selectOption(idx)}
                    style={{ padding: isMobile ? '12px 14px' : '14px 18px' }}
                  >
                    <span className={`option-badge ${isSelected ? 'selected' : ''}`}>{letter}</span>
                    <span style={{
                      fontSize: isMobile ? 13 : 14, lineHeight: 1.6,
                      color: 'hsl(220 25% 15%)', paddingTop: 1, wordBreak: 'break-word',
                    }}>{opt}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Navigation Footer */}
          <div style={{
            background: 'white', borderTop: '1px solid hsl(214 20% 88%)',
            padding: isMobile ? '10px 12px' : '12px 20px',
            display: 'flex', justifyContent: 'space-between',
            alignItems: 'center', flexShrink: 0, gap: 8, flexWrap: 'wrap',
          }}>
            <button
              onClick={() => localSession.currentIndex > 0 && goTo(localSession.currentIndex - 1)}
              disabled={localSession.currentIndex === 0}
              style={{
                padding: isMobile ? '8px 14px' : '9px 22px', borderRadius: 7,
                border: '1.5px solid hsl(214 20% 80%)',
                background: localSession.currentIndex > 0 ? 'white' : 'hsl(210 20% 96%)',
                cursor: localSession.currentIndex > 0 ? 'pointer' : 'not-allowed',
                color: localSession.currentIndex > 0 ? 'hsl(220 25% 25%)' : 'hsl(215 16% 60%)',
                fontSize: isMobile ? 12 : 13, fontWeight: 600, fontFamily: 'inherit',
                flexShrink: 0,
              }}
            >← Prev</button>

            <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
              <button onClick={toggleMark} style={{
                padding: isMobile ? '8px 12px' : '9px 18px', borderRadius: 7,
                border: `1.5px solid ${isMarked ? 'hsl(38 92% 45%)' : 'hsl(214 20% 80%)'}`,
                background: isMarked ? 'hsl(38 92% 50%)' : 'white',
                color: isMarked ? 'white' : 'hsl(220 25% 30%)',
                cursor: 'pointer', fontSize: isMobile ? 12 : 13,
                fontWeight: 600, fontFamily: 'inherit',
              }}>{isMobile ? (isMarked ? '⭐' : '☆') : (isMarked ? '⭐ Marked' : '☆ Mark & Next')}</button>
              {localSession.currentIndex < localSession.questions.length - 1 ? (
                <button onClick={() => goTo(localSession.currentIndex + 1)} style={{
                  padding: isMobile ? '8px 14px' : '9px 22px', borderRadius: 7,
                  background: 'hsl(221 83% 47%)', border: 'none', cursor: 'pointer',
                  color: 'white', fontSize: isMobile ? 12 : 13,
                  fontWeight: 700, fontFamily: 'inherit',
                }}>{isMobile ? 'Next →' : 'Save & Next →'}</button>
              ) : (
                <button onClick={() => setShowSubmit(true)} style={{
                  padding: isMobile ? '8px 14px' : '9px 22px', borderRadius: 7,
                  background: 'hsl(142 71% 40%)', border: 'none', cursor: 'pointer',
                  color: 'white', fontSize: isMobile ? 12 : 13,
                  fontWeight: 700, fontFamily: 'inherit',
                }}>Submit ✓</button>
              )}
            </div>
          </div>
        </div>

        {/* Right Sidebar (desktop only) */}
        {!isMobile && palettePanel}

        {/* Mobile drawer */}
        {isMobile && paletteOpen && (
          <>
            <div
              onClick={() => setPaletteOpen(false)}
              style={{
                position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)',
                zIndex: 50,
              }}
            />
            <div style={{
              position: 'absolute', top: 0, right: 0, bottom: 0, zIndex: 51,
              boxShadow: '-4px 0 16px rgba(0,0,0,0.25)',
            }}>
              {palettePanel}
            </div>
          </>
        )}
      </div>

      {showSubmit && (
        <SubmitDialog
          stats={stats}
          total={localSession.questions.length}
          onConfirm={handleSubmit}
          onCancel={() => setShowSubmit(false)}
        />
      )}
    </div>
  );
}

function LegendItem({ color, label, dot }: { color: string; label: string; dot?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div style={{
        width: 12, height: 12, borderRadius: 2, background: color, flexShrink: 0,
        position: 'relative',
      }}>
        {dot && (
          <div style={{
            position: 'absolute', bottom: -2, right: -2,
            width: 6, height: 6, background: dot, borderRadius: '50%',
            border: '1px solid white',
          }} />
        )}
      </div>
      <span style={{ fontSize: 10.5, color: 'hsl(220 25% 25%)' }}>{label}</span>
    </div>
  );
}
