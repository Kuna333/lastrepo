import { useState, useEffect, useRef } from 'react';
import { QuestionSet } from '../types';
import { loadQuestionSets, saveQuestionSets, parseQuestionFile } from '../store';
import { useAuth } from '../auth/AuthContext';
import { loadResults, deleteResult, SavedResult } from '../results';
import {
  loadQuestionSetsCloud, saveQuestionSetCloud, deleteQuestionSetCloud, estimateSetSize,
} from '../questionSets';

const FIRESTORE_DOC_LIMIT = 1024 * 1024; // 1 MB
const SAFE_SIZE_LIMIT = 900 * 1024; // 900 KB — leaves headroom for Firestore overhead

interface HomeProps {
  onStart: (set: QuestionSet) => void;
}

export default function Home({ onStart }: HomeProps) {
  const { user, logout } = useAuth();
  const [pastResults, setPastResults] = useState<SavedResult[]>([]);
  const [resultsLoading, setResultsLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    loadResults(user.uid)
      .then(setPastResults)
      .catch((err) => console.warn('Could not load past results:', err))
      .finally(() => setResultsLoading(false));
  }, [user]);

  const handleDeleteResult = async (id: string) => {
    if (!user) return;
    if (!confirm('Delete this result permanently?')) return;
    try {
      await deleteResult(user.uid, id);
      setPastResults((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      alert('Failed to delete: ' + (err instanceof Error ? err.message : 'unknown error'));
    }
  };
  const [sets, setSets] = useState<QuestionSet[]>([]);
  const [error, setError] = useState('');
  const [uploadName, setUploadName] = useState('');
  const [uploadDuration, setUploadDuration] = useState(60);
  const [uploading, setUploading] = useState(false);
  const [pendingQuestions, setPendingQuestions] = useState<ReturnType<typeof parseQuestionFile> | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [showUploadPanel, setShowUploadPanel] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const [setsLoading, setSetsLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  // Load sets from cloud; if cloud is empty, migrate any local sets up.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    // Show local sets immediately for snappy UI
    setSets(loadQuestionSets());

    (async () => {
      try {
        const cloud = await loadQuestionSetsCloud(user.uid);
        if (cancelled) return;

        if (cloud.length === 0) {
          // First-time migration: push any local sets up to cloud
          const local = loadQuestionSets();
          if (local.length > 0) {
            for (const s of local) {
              if (estimateSetSize(s) <= SAFE_SIZE_LIMIT) {
                try { await saveQuestionSetCloud(user.uid, s); } catch { /* ignore */ }
              }
            }
          }
          if (!cancelled) setSets(local);
        } else {
          if (!cancelled) {
            setSets(cloud);
            saveQuestionSets(cloud); // keep local cache in sync
          }
        }
      } catch (err) {
        console.warn('Could not load question sets from cloud:', err);
      } finally {
        if (!cancelled) setSetsLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [user]);

  const handleFile = async (file: File) => {
    setError('');
    try {
      const content = await file.text();
      const questions = parseQuestionFile(content, file.name);
      if (questions.length === 0) throw new Error('No valid questions found in file.');
      const baseName = file.name.replace(/\.[^.]+$/, '');
      setUploadName(baseName);
      setPendingQuestions(questions);
      setShowUploadPanel(true);
    } catch (e: unknown) {
      setError((e as Error).message || 'Failed to parse file.');
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleSave = async () => {
    if (!pendingQuestions || !uploadName.trim() || !user) return;
    const newSet: QuestionSet = {
      id: Date.now().toString(),
      name: uploadName.trim(),
      duration: uploadDuration,
      questions: pendingQuestions,
      uploadedAt: Date.now(),
    };
    const sizeBytes = estimateSetSize(newSet);
    if (sizeBytes > SAFE_SIZE_LIMIT) {
      const sizeKb = Math.round(sizeBytes / 1024);
      setError(
        `This question set is too large to sync to cloud (${sizeKb} KB; max ${Math.round(SAFE_SIZE_LIMIT/1024)} KB per set). ` +
        `Try splitting it into smaller files of around 1,000–2,000 questions each.`
      );
      return;
    }

    setSyncing(true);
    const updated = [newSet, ...sets];
    saveQuestionSets(updated);
    setSets(updated);
    setPendingQuestions(null);
    setUploadName('');
    setShowUploadPanel(false);
    setError('');

    try {
      await saveQuestionSetCloud(user.uid, newSet);
    } catch (err) {
      console.warn('Cloud save failed (will sync when online):', err);
    } finally {
      setSyncing(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!user) return;
    if (!confirm('Delete this question set from all your devices?')) return;
    const updated = sets.filter(s => s.id !== id);
    saveQuestionSets(updated);
    setSets(updated);
    try {
      await deleteQuestionSetCloud(user.uid, id);
    } catch (err) {
      console.warn('Cloud delete failed:', err);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'hsl(210 20% 97%)', fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, hsl(221 83% 47%) 0%, hsl(221 83% 38%) 100%)',
        color: 'white',
        padding: '0',
        boxShadow: '0 2px 12px rgba(0,0,0,0.15)'
      }}>
        <div style={{ maxWidth: 1000, margin: '0 auto', padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          <div style={{
            width: 44, height: 44, borderRadius: 10,
            background: 'rgba(255,255,255,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 22, flexShrink: 0,
          }}>📝</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, letterSpacing: '-0.3px' }}>
              CBT Exam Simulator
            </h1>
            <p style={{ margin: 0, fontSize: 13, opacity: 0.85, marginTop: 2 }}>
              BEd Entrance Preparation — Offline Practice Platform
            </p>
          </div>
          {user && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
              <span style={{
                fontSize: 12, opacity: 0.9, padding: '4px 10px',
                background: 'rgba(255,255,255,0.15)', borderRadius: 20,
                maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>{user.email}</span>
              <button
                onClick={() => logout()}
                style={{
                  padding: '6px 14px', borderRadius: 7,
                  background: 'rgba(255,255,255,0.18)',
                  border: '1px solid rgba(255,255,255,0.3)',
                  color: 'white', fontSize: 12, fontWeight: 600,
                  cursor: 'pointer', fontFamily: 'inherit',
                }}
              >Sign out</button>
            </div>
          )}
        </div>
      </div>

      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '32px 24px' }}>

        {/* Upload Zone */}
        <div style={{ marginBottom: 32 }}>
          <div
            onClick={() => fileRef.current?.click()}
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            style={{
              border: `2px dashed ${dragOver ? 'hsl(221 83% 47%)' : 'hsl(214 20% 78%)'}`,
              borderRadius: 12,
              padding: '40px 24px',
              textAlign: 'center',
              cursor: 'pointer',
              background: dragOver ? 'hsl(221 83% 97%)' : 'white',
              transition: 'all 0.2s ease',
            }}
          >
            <div style={{ fontSize: 36, marginBottom: 12 }}>📂</div>
            <p style={{ margin: 0, fontSize: 16, fontWeight: 600, color: 'hsl(220 25% 20%)' }}>
              Drop your question file here
            </p>
            <p style={{ margin: '6px 0 0', fontSize: 13, color: 'hsl(215 16% 50%)' }}>
              Supports <strong>.json</strong>, <strong>.csv</strong>, and <strong>.txt</strong> — click to browse
            </p>
            <input
              ref={fileRef}
              type="file"
              accept=".json,.csv,.txt"
              style={{ display: 'none' }}
              onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
          </div>

          {error && (
            <div style={{
              marginTop: 12, padding: '10px 16px', borderRadius: 8,
              background: 'hsl(0 84% 97%)', border: '1px solid hsl(0 84% 85%)',
              color: 'hsl(0 70% 40%)', fontSize: 13
            }}>
              ⚠️ {error}
            </div>
          )}
        </div>

        {/* Upload config panel */}
        {showUploadPanel && pendingQuestions && (
          <div style={{
            marginBottom: 28, background: 'white', borderRadius: 12,
            border: '1px solid hsl(214 20% 85%)',
            boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
            overflow: 'hidden'
          }}>
            <div style={{
              padding: '14px 20px',
              background: 'hsl(221 83% 97%)',
              borderBottom: '1px solid hsl(214 20% 88%)',
              display: 'flex', alignItems: 'center', gap: 8
            }}>
              <span style={{ fontSize: 15, fontWeight: 600, color: 'hsl(221 83% 40%)' }}>
                Configure Question Set
              </span>
              <span style={{
                marginLeft: 'auto', fontSize: 12, padding: '3px 10px',
                background: 'hsl(142 71% 92%)', color: 'hsl(142 71% 30%)',
                borderRadius: 20, fontWeight: 600
              }}>
                {pendingQuestions.length} Questions Loaded
              </span>
            </div>
            <div style={{ padding: '20px 24px', display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div style={{ flex: '1 1 200px' }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6, color: 'hsl(215 16% 40%)' }}>
                  SET NAME
                </label>
                <input
                  value={uploadName}
                  onChange={e => setUploadName(e.target.value)}
                  placeholder="e.g. BEd General Paper 2024"
                  style={{
                    width: '100%', padding: '10px 14px', borderRadius: 8,
                    border: '1.5px solid hsl(214 20% 80%)',
                    fontSize: 14, outline: 'none', fontFamily: 'inherit',
                    background: 'hsl(210 20% 98%)'
                  }}
                />
              </div>
              <div style={{ flex: '0 0 160px' }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6, color: 'hsl(215 16% 40%)' }}>
                  DURATION (MINUTES)
                </label>
                <input
                  type="number"
                  value={uploadDuration}
                  onChange={e => setUploadDuration(Math.max(5, parseInt(e.target.value) || 60))}
                  min={5} max={360}
                  style={{
                    width: '100%', padding: '10px 14px', borderRadius: 8,
                    border: '1.5px solid hsl(214 20% 80%)',
                    fontSize: 14, outline: 'none', fontFamily: 'inherit',
                    background: 'hsl(210 20% 98%)'
                  }}
                />
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={() => { setPendingQuestions(null); setShowUploadPanel(false); }}
                  style={{
                    padding: '10px 18px', borderRadius: 8, border: '1.5px solid hsl(214 20% 80%)',
                    background: 'white', cursor: 'pointer', fontSize: 14,
                    color: 'hsl(215 16% 40%)', fontWeight: 600, fontFamily: 'inherit'
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={!uploadName.trim()}
                  style={{
                    padding: '10px 22px', borderRadius: 8,
                    background: uploadName.trim() ? 'hsl(221 83% 47%)' : 'hsl(214 20% 80%)',
                    color: 'white', border: 'none', cursor: uploadName.trim() ? 'pointer' : 'not-allowed',
                    fontSize: 14, fontWeight: 700, fontFamily: 'inherit'
                  }}
                >
                  Save Set
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Question Sets */}
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: 'hsl(220 25% 20%)', marginBottom: 16, marginTop: 0 }}>
            Your Question Sets
            {sets.length > 0 && (
              <span style={{
                marginLeft: 10, fontSize: 12, padding: '2px 10px',
                background: 'hsl(221 83% 93%)', color: 'hsl(221 83% 40%)',
                borderRadius: 20, fontWeight: 600
              }}>
                {sets.length}
              </span>
            )}
            <span style={{
              marginLeft: 8, fontSize: 11, color: 'hsl(215 16% 55%)', fontWeight: 500,
            }}>
              {syncing ? '(syncing…)' : setsLoading ? '(loading…)' : '(synced across your devices)'}
            </span>
          </h2>

          {sets.length === 0 ? (
            <div style={{
              textAlign: 'center', padding: '56px 24px',
              background: 'white', borderRadius: 12,
              border: '1px solid hsl(214 20% 88%)'
            }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>📚</div>
              <p style={{ margin: 0, fontSize: 15, color: 'hsl(215 16% 50%)', fontWeight: 500 }}>
                No question sets yet
              </p>
              <p style={{ margin: '6px 0 0', fontSize: 13, color: 'hsl(215 16% 60%)' }}>
                Upload a file above to get started
              </p>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 14 }}>
              {sets.map(set => (
                <div key={set.id} style={{
                  background: 'white', borderRadius: 12,
                  border: '1px solid hsl(214 20% 88%)',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    padding: '18px 22px',
                    display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap'
                  }}>
                    <div style={{
                      width: 46, height: 46, borderRadius: 10,
                      background: 'hsl(221 83% 94%)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 22, flexShrink: 0
                    }}>
                      📋
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'hsl(220 25% 15%)' }}>
                        {set.name}
                      </h3>
                      <div style={{ display: 'flex', gap: 16, marginTop: 5, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 13, color: 'hsl(215 16% 50%)' }}>
                          📝 {set.questions.length} Questions
                        </span>
                        <span style={{ fontSize: 13, color: 'hsl(215 16% 50%)' }}>
                          ⏱ {set.duration} Minutes
                        </span>
                        <span style={{ fontSize: 13, color: 'hsl(215 16% 50%)' }}>
                          📅 {new Date(set.uploadedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                      <button
                        onClick={() => handleDelete(set.id)}
                        style={{
                          padding: '8px 14px', borderRadius: 7,
                          border: '1.5px solid hsl(0 84% 85%)',
                          background: 'white', cursor: 'pointer',
                          color: 'hsl(0 70% 50%)', fontSize: 13, fontWeight: 600, fontFamily: 'inherit'
                        }}
                      >
                        Delete
                      </button>
                      <button
                        onClick={() => onStart(set)}
                        style={{
                          padding: '9px 22px', borderRadius: 7,
                          background: 'hsl(221 83% 47%)',
                          border: 'none', cursor: 'pointer',
                          color: 'white', fontSize: 14, fontWeight: 700, fontFamily: 'inherit'
                        }}
                      >
                        Start Exam
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Past Results (synced from cloud) */}
        <div style={{ marginTop: 36 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: 'hsl(220 25% 20%)', marginBottom: 16, marginTop: 0 }}>
            Past Exam Results
            {pastResults.length > 0 && (
              <span style={{
                marginLeft: 10, fontSize: 12, padding: '2px 10px',
                background: 'hsl(142 71% 92%)', color: 'hsl(142 71% 30%)',
                borderRadius: 20, fontWeight: 600,
              }}>{pastResults.length}</span>
            )}
            <span style={{
              marginLeft: 8, fontSize: 11, color: 'hsl(215 16% 55%)', fontWeight: 500,
            }}>(synced across your devices)</span>
          </h2>

          {resultsLoading ? (
            <div style={{
              background: 'white', borderRadius: 12, padding: '24px',
              border: '1px solid hsl(214 20% 88%)', textAlign: 'center',
              color: 'hsl(215 16% 55%)', fontSize: 13,
            }}>Loading your results…</div>
          ) : pastResults.length === 0 ? (
            <div style={{
              textAlign: 'center', padding: '32px 24px',
              background: 'white', borderRadius: 12,
              border: '1px solid hsl(214 20% 88%)',
            }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>📊</div>
              <p style={{ margin: 0, fontSize: 14, color: 'hsl(215 16% 50%)' }}>
                No past results yet — finish an exam to see your history here.
              </p>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 10 }}>
              {pastResults.map((r) => (
                <div key={r.id} style={{
                  background: 'white', borderRadius: 10,
                  border: '1px solid hsl(214 20% 88%)',
                  padding: '14px 18px',
                  display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap',
                }}>
                  <div style={{
                    width: 54, height: 54, borderRadius: 10,
                    background: r.percentage >= 50 ? 'hsl(142 71% 93%)' : 'hsl(0 84% 95%)',
                    color: r.percentage >= 50 ? 'hsl(142 71% 30%)' : 'hsl(0 70% 40%)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 15, fontWeight: 800, flexShrink: 0,
                  }}>{r.percentage.toFixed(0)}%</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'hsl(220 25% 15%)', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {r.setName}
                    </div>
                    <div style={{ fontSize: 12, color: 'hsl(215 16% 50%)', marginTop: 3, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                      <span>✓ {r.correct} correct</span>
                      <span>✗ {r.incorrect} wrong</span>
                      <span>— {r.skipped} skipped</span>
                      <span>📅 {new Date(r.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteResult(r.id)}
                    style={{
                      padding: '6px 12px', borderRadius: 6,
                      border: '1px solid hsl(0 84% 88%)', background: 'white',
                      color: 'hsl(0 70% 50%)', fontSize: 12, fontWeight: 600,
                      cursor: 'pointer', fontFamily: 'inherit',
                    }}
                  >Delete</button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Format Guide */}
        <div style={{
          marginTop: 36, background: 'white', borderRadius: 12,
          border: '1px solid hsl(214 20% 88%)', overflow: 'hidden'
        }}>
          <div style={{
            padding: '14px 20px',
            borderBottom: '1px solid hsl(214 20% 90%)',
            background: 'hsl(210 20% 98%)'
          }}>
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'hsl(220 25% 25%)' }}>
              📄 File Format Guide
            </h3>
          </div>
          <div style={{ padding: '20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 20 }}>
            <div>
              <h4 style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 700, color: 'hsl(221 83% 40%)' }}>JSON Format</h4>
              <pre style={{
                margin: 0, padding: 12, background: 'hsl(220 25% 97%)',
                borderRadius: 8, fontSize: 11, lineHeight: 1.6, overflow: 'auto',
                color: 'hsl(220 25% 25%)', border: '1px solid hsl(214 20% 88%)'
              }}>{`[
  {
    "question": "Q text here",
    "options": ["A", "B", "C", "D"],
    "correctIndex": 0,
    "subject": "Science",
    "explanation": "Optional"
  }
]`}</pre>
            </div>
            <div>
              <h4 style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 700, color: 'hsl(142 71% 35%)' }}>CSV Format</h4>
              <pre style={{
                margin: 0, padding: 12, background: 'hsl(142 71% 97%)',
                borderRadius: 8, fontSize: 11, lineHeight: 1.6, overflow: 'auto',
                color: 'hsl(220 25% 25%)', border: '1px solid hsl(142 71% 85%)'
              }}>{`question,a,b,c,d,answer,subject
"Q text","Opt A","Opt B",
"Opt C","Opt D",A,Math`}</pre>
            </div>
            <div>
              <h4 style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 700, color: 'hsl(38 92% 40%)' }}>TXT Format</h4>
              <pre style={{
                margin: 0, padding: 12, background: 'hsl(38 92% 97%)',
                borderRadius: 8, fontSize: 11, lineHeight: 1.6, overflow: 'auto',
                color: 'hsl(220 25% 25%)', border: '1px solid hsl(38 92% 80%)'
              }}>{`1. What is 2+2?
A. 3
B. 4
C. 5
D. 6
Answer: B

2. Next question...`}</pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
