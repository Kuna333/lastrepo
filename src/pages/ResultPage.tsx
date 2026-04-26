import { useState } from 'react';
import { ExamResult } from '../types';

interface ResultPageProps {
  result: ExamResult;
  onRetake: () => void;
  onHome: () => void;
}

export default function ResultPage({ result, onRetake, onHome }: ResultPageProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'review' | 'subjects'>('overview');

  const { session, totalQuestions, attempted, correct, incorrect, skipped, percentage, timeTaken, subjectWise } = result;

  const formatTime = (sec: number) => {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    if (h > 0) return `${h}h ${m}m ${s}s`;
    return `${m}m ${s}s`;
  };

  const getGrade = (pct: number) => {
    if (pct >= 90) return { grade: 'A+', label: 'Outstanding', color: 'hsl(142 71% 40%)' };
    if (pct >= 80) return { grade: 'A', label: 'Excellent', color: 'hsl(142 71% 45%)' };
    if (pct >= 70) return { grade: 'B+', label: 'Very Good', color: 'hsl(152 60% 45%)' };
    if (pct >= 60) return { grade: 'B', label: 'Good', color: 'hsl(210 70% 50%)' };
    if (pct >= 50) return { grade: 'C', label: 'Average', color: 'hsl(38 92% 50%)' };
    return { grade: 'F', label: 'Needs Improvement', color: 'hsl(0 84% 55%)' };
  };

  const gradeInfo = getGrade(percentage);

  return (
    <div style={{
      minHeight: '100vh', background: 'hsl(210 20% 96%)',
      fontFamily: 'Inter, system-ui, sans-serif'
    }}>
      {/* Header */}
      <div style={{
        background: 'hsl(221 83% 20%)',
        color: 'white', padding: '16px 24px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        boxShadow: '0 2px 12px rgba(0,0,0,0.2)'
      }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Exam Report</h1>
          <p style={{ margin: '2px 0 0', fontSize: 13, opacity: 0.8 }}>{session.setName}</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onRetake} style={{
            padding: '7px 16px', borderRadius: 7,
            background: 'rgba(255,255,255,0.15)',
            border: '1px solid rgba(255,255,255,0.25)',
            color: 'white', cursor: 'pointer',
            fontSize: 13, fontWeight: 600, fontFamily: 'inherit'
          }}>Retake</button>
          <button onClick={onHome} style={{
            padding: '7px 16px', borderRadius: 7,
            background: 'hsl(38 92% 50%)',
            border: 'none', color: 'white',
            cursor: 'pointer', fontSize: 13, fontWeight: 700, fontFamily: 'inherit'
          }}>Home</button>
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '28px 20px' }}>

        {/* Score Card */}
        <div style={{
          background: 'white', borderRadius: 14,
          border: '1px solid hsl(214 20% 85%)',
          overflow: 'hidden', marginBottom: 24,
          boxShadow: '0 2px 16px rgba(0,0,0,0.06)'
        }}>
          <div style={{
            display: 'flex', flexWrap: 'wrap', gap: 0
          }}>
            {/* Score circle */}
            <div style={{
              flex: '0 0 auto', width: 220,
              background: 'linear-gradient(135deg, hsl(221 83% 47%) 0%, hsl(221 83% 35%) 100%)',
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              padding: '36px 24px', color: 'white'
            }}>
              <div style={{
                width: 110, height: 110, borderRadius: '50%',
                background: 'rgba(255,255,255,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexDirection: 'column', border: '3px solid rgba(255,255,255,0.3)'
              }}>
                <span style={{ fontSize: 30, fontWeight: 800, lineHeight: 1 }}>{percentage.toFixed(1)}%</span>
                <span style={{ fontSize: 12, opacity: 0.8, marginTop: 3 }}>Score</span>
              </div>
              <div style={{ marginTop: 16, textAlign: 'center' }}>
                <div style={{
                  fontSize: 22, fontWeight: 800,
                  color: gradeInfo.color === 'hsl(142 71% 40%)' ? 'hsl(120 100% 80%)' : 'hsl(38 100% 80%)'
                }}>
                  Grade {gradeInfo.grade}
                </div>
                <div style={{ fontSize: 12, opacity: 0.85, marginTop: 3 }}>{gradeInfo.label}</div>
              </div>
            </div>

            {/* Stats grid */}
            <div style={{ flex: 1, padding: '24px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 14, alignContent: 'center' }}>
              <BigStat label="Total Questions" value={totalQuestions} color="hsl(220 25% 30%)" />
              <BigStat label="Attempted" value={attempted} color="hsl(221 83% 47%)" />
              <BigStat label="Correct" value={correct} color="hsl(142 71% 40%)" />
              <BigStat label="Incorrect" value={incorrect} color="hsl(0 84% 55%)" />
              <BigStat label="Skipped" value={skipped} color="hsl(215 16% 55%)" />
              <BigStat label="Marks" value={`${correct}/${totalQuestions}`} color="hsl(38 92% 45%)" small />
              <BigStat label="Time Taken" value={formatTime(timeTaken)} color="hsl(221 83% 47%)" small />
              <BigStat label="Accuracy" value={attempted > 0 ? `${((correct / attempted) * 100).toFixed(1)}%` : '—'} color="hsl(142 71% 40%)" small />
            </div>
          </div>

          {/* Progress bar */}
          <div style={{
            padding: '14px 24px', borderTop: '1px solid hsl(214 20% 90%)',
            background: 'hsl(210 20% 98%)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'hsl(215 16% 50%)', marginBottom: 6 }}>
              <span>Performance Breakdown</span>
              <span>{correct} correct, {incorrect} incorrect, {skipped} skipped</span>
            </div>
            <div style={{ height: 10, borderRadius: 5, background: 'hsl(214 20% 88%)', display: 'flex', overflow: 'hidden' }}>
              <div style={{ height: '100%', background: 'hsl(142 71% 45%)', width: `${(correct / totalQuestions) * 100}%`, transition: 'width 0.5s ease' }} />
              <div style={{ height: '100%', background: 'hsl(0 84% 60%)', width: `${(incorrect / totalQuestions) * 100}%`, transition: 'width 0.5s ease' }} />
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{
          display: 'flex', gap: 0, marginBottom: 18,
          background: 'white', borderRadius: 10,
          border: '1px solid hsl(214 20% 85%)',
          overflow: 'hidden'
        }}>
          {(['overview', 'review', 'subjects'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                flex: 1, padding: '12px', border: 'none',
                background: activeTab === tab ? 'hsl(221 83% 47%)' : 'transparent',
                color: activeTab === tab ? 'white' : 'hsl(215 16% 45%)',
                cursor: 'pointer', fontSize: 13, fontWeight: 600,
                fontFamily: 'inherit', transition: 'all 0.15s'
              }}
            >
              {tab === 'overview' ? '📊 Overview' : tab === 'review' ? '📋 Question Review' : '📚 Subject-wise'}
            </button>
          ))}
        </div>

        {/* Tab: Overview */}
        {activeTab === 'overview' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
            <InfoCard title="Performance Analysis">
              <InfoRow label="Total Questions" value={totalQuestions} />
              <InfoRow label="Attempted" value={`${attempted} (${((attempted/totalQuestions)*100).toFixed(1)}%)`} />
              <InfoRow label="Correct" value={correct} highlight="green" />
              <InfoRow label="Wrong" value={incorrect} highlight="red" />
              <InfoRow label="Skipped" value={skipped} />
              <InfoRow label="Score" value={`${correct} / ${totalQuestions}`} />
              <InfoRow label="Percentage" value={`${percentage.toFixed(2)}%`} highlight={percentage >= 50 ? 'green' : 'red'} />
            </InfoCard>
            <InfoCard title="Time Analysis">
              <InfoRow label="Total Duration" value={`${session.duration} min`} />
              <InfoRow label="Time Used" value={formatTime(timeTaken)} />
              <InfoRow label="Time Saved" value={formatTime(Math.max(0, session.duration * 60 - timeTaken))} highlight="green" />
              <InfoRow label="Avg per Question" value={attempted > 0 ? `${(timeTaken / attempted).toFixed(0)}s` : '—'} />
            </InfoCard>
          </div>
        )}

        {/* Tab: Question Review */}
        {activeTab === 'review' && (
          <div style={{ background: 'white', borderRadius: 10, border: '1px solid hsl(214 20% 85%)', overflow: 'hidden' }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid hsl(214 20% 90%)', background: 'hsl(210 20% 98%)' }}>
              <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'hsl(220 25% 25%)' }}>
                Question-by-Question Review
              </h3>
            </div>
            <div style={{ overflow: 'auto', maxHeight: 520 }}>
              {session.questions.map((q, idx) => {
                const state = session.questionStates[idx];
                const isCorrect = state.selectedOption === q.correctIndex;
                const wasAttempted = state.selectedOption !== null;
                let status: 'correct' | 'incorrect' | 'skipped' = 'skipped';
                if (wasAttempted) status = isCorrect ? 'correct' : 'incorrect';

                return (
                  <div key={idx} style={{
                    padding: '16px 20px', borderBottom: '1px solid hsl(214 20% 92%)',
                    background: idx % 2 === 0 ? 'white' : 'hsl(210 20% 99%)'
                  }}>
                    <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: 6, flexShrink: 0,
                        background: status === 'correct' ? 'hsl(142 71% 92%)' : status === 'incorrect' ? 'hsl(0 84% 95%)' : 'hsl(215 16% 92%)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 13, fontWeight: 700,
                        color: status === 'correct' ? 'hsl(142 71% 35%)' : status === 'incorrect' ? 'hsl(0 84% 45%)' : 'hsl(215 16% 50%)'
                      }}>
                        {idx + 1}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: '0 0 8px', fontSize: 13, color: 'hsl(220 25% 20%)', lineHeight: 1.5, fontWeight: 500 }}>
                          {q.text}
                        </p>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                          {q.options.map((opt, oIdx) => {
                            const letter = ['A','B','C','D','E'][oIdx];
                            const isCorrectOpt = oIdx === q.correctIndex;
                            const isChosen = oIdx === state.selectedOption;
                            let bg = 'hsl(210 20% 95%)';
                            let border = 'hsl(214 20% 85%)';
                            let textColor = 'hsl(215 16% 45%)';
                            if (isCorrectOpt) { bg = 'hsl(142 71% 93%)'; border = 'hsl(142 71% 55%)'; textColor = 'hsl(142 50% 30%)'; }
                            if (isChosen && !isCorrectOpt) { bg = 'hsl(0 84% 95%)'; border = 'hsl(0 84% 65%)'; textColor = 'hsl(0 60% 40%)'; }
                            return (
                              <span key={oIdx} style={{
                                display: 'inline-flex', alignItems: 'center', gap: 4,
                                padding: '3px 10px', borderRadius: 5, fontSize: 12,
                                background: bg, border: `1px solid ${border}`, color: textColor,
                                fontWeight: (isCorrectOpt || isChosen) ? 700 : 400
                              }}>
                                {letter}. {opt}
                                {isCorrectOpt && ' ✓'}
                                {isChosen && !isCorrectOpt && ' ✗'}
                              </span>
                            );
                          })}
                        </div>
                        {q.explanation && (
                          <p style={{
                            margin: '8px 0 0', fontSize: 12, color: 'hsl(215 16% 45%)',
                            padding: '6px 10px', background: 'hsl(221 83% 97%)',
                            borderRadius: 6, borderLeft: '3px solid hsl(221 83% 60%)'
                          }}>
                            💡 {q.explanation}
                          </p>
                        )}
                      </div>
                      <div style={{
                        flexShrink: 0, fontSize: 11, fontWeight: 700,
                        padding: '3px 10px', borderRadius: 20,
                        background: status === 'correct' ? 'hsl(142 71% 92%)' : status === 'incorrect' ? 'hsl(0 84% 95%)' : 'hsl(215 16% 92%)',
                        color: status === 'correct' ? 'hsl(142 50% 35%)' : status === 'incorrect' ? 'hsl(0 60% 45%)' : 'hsl(215 16% 45%)'
                      }}>
                        {status === 'correct' ? '✓ Correct' : status === 'incorrect' ? '✗ Wrong' : '— Skipped'}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab: Subject-wise */}
        {activeTab === 'subjects' && (
          <div>
            {subjectWise.length === 0 ? (
              <div style={{
                background: 'white', borderRadius: 10, padding: '40px',
                textAlign: 'center', border: '1px solid hsl(214 20% 85%)',
                color: 'hsl(215 16% 55%)', fontSize: 14
              }}>
                No subject-wise data available (questions didn't have subject tags)
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {subjectWise.map(sub => (
                  <div key={sub.subject} style={{
                    background: 'white', borderRadius: 10, padding: '18px 22px',
                    border: '1px solid hsl(214 20% 85%)',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.04)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
                      <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'hsl(220 25% 20%)' }}>
                        {sub.subject}
                      </h3>
                      <div style={{ display: 'flex', gap: 16 }}>
                        <span style={{ fontSize: 13, color: 'hsl(215 16% 50%)' }}>Total: <b>{sub.total}</b></span>
                        <span style={{ fontSize: 13, color: 'hsl(142 71% 40%)' }}>✓ {sub.correct}</span>
                        <span style={{ fontSize: 13, color: 'hsl(0 84% 55%)' }}>✗ {sub.incorrect}</span>
                        <span style={{ fontSize: 13, fontWeight: 700, color: sub.percentage >= 50 ? 'hsl(142 71% 40%)' : 'hsl(0 84% 55%)' }}>
                          {sub.percentage.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                    <div style={{ height: 8, borderRadius: 4, background: 'hsl(214 20% 90%)', display: 'flex', overflow: 'hidden' }}>
                      <div style={{
                        height: '100%', background: 'hsl(142 71% 45%)',
                        width: `${(sub.correct / sub.total) * 100}%`,
                        transition: 'width 0.5s ease'
                      }} />
                      <div style={{
                        height: '100%', background: 'hsl(0 84% 60%)',
                        width: `${(sub.incorrect / sub.total) * 100}%`,
                        transition: 'width 0.5s ease'
                      }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}

function BigStat({ label, value, color, small }: { label: string; value: string | number; color: string; small?: boolean }) {
  return (
    <div style={{
      padding: '10px 14px', borderRadius: 8,
      background: 'hsl(210 20% 98%)', border: '1px solid hsl(214 20% 88%)'
    }}>
      <div style={{
        fontSize: small ? 18 : 28, fontWeight: 800, color,
        lineHeight: 1, marginBottom: 4
      }}>
        {value}
      </div>
      <div style={{ fontSize: 11, color: 'hsl(215 16% 55%)' }}>{label}</div>
    </div>
  );
}

function InfoCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: 'white', borderRadius: 10, border: '1px solid hsl(214 20% 85%)',
      overflow: 'hidden'
    }}>
      <div style={{
        padding: '12px 18px', borderBottom: '1px solid hsl(214 20% 90%)',
        background: 'hsl(210 20% 98%)'
      }}>
        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'hsl(220 25% 25%)' }}>{title}</h3>
      </div>
      <div style={{ padding: '6px 0' }}>{children}</div>
    </div>
  );
}

function InfoRow({ label, value, highlight }: { label: string; value: string | number; highlight?: 'green' | 'red' }) {
  const color = highlight === 'green' ? 'hsl(142 71% 35%)' : highlight === 'red' ? 'hsl(0 70% 45%)' : 'hsl(220 25% 20%)';
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '8px 18px', borderBottom: '1px solid hsl(214 20% 94%)'
    }}>
      <span style={{ fontSize: 13, color: 'hsl(215 16% 45%)' }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 700, color }}>{value}</span>
    </div>
  );
}
