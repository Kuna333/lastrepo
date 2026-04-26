interface SubmitDialogProps {
  stats: {
    answered: number;
    notAnswered: number;
    marked: number;
    markedAnswered: number;
    notVisited: number;
  };
  total: number;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function SubmitDialog({ stats, total, onConfirm, onCancel }: SubmitDialogProps) {
  const attempted = stats.answered + stats.markedAnswered;
  const unattempted = total - attempted;

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, fontFamily: 'Inter, system-ui, sans-serif'
    }}>
      <div style={{
        background: 'white', borderRadius: 14,
        width: 440, maxWidth: '95vw',
        boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          padding: '18px 24px',
          background: 'hsl(221 83% 47%)',
          color: 'white'
        }}>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>
            Submit Exam?
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: 13, opacity: 0.85 }}>
            Review your attempt before submitting
          </p>
        </div>

        {/* Stats */}
        <div style={{ padding: '20px 24px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
            <StatCard
              label="Answered"
              value={stats.answered + stats.markedAnswered}
              color="hsl(142 71% 45%)"
              bg="hsl(142 71% 95%)"
            />
            <StatCard
              label="Not Answered"
              value={stats.notAnswered}
              color="hsl(0 84% 55%)"
              bg="hsl(0 84% 97%)"
            />
            <StatCard
              label="Marked for Review"
              value={stats.marked}
              color="hsl(38 92% 45%)"
              bg="hsl(38 92% 96%)"
            />
            <StatCard
              label="Not Visited"
              value={stats.notVisited}
              color="hsl(215 16% 55%)"
              bg="hsl(215 16% 95%)"
            />
          </div>

          <div style={{
            padding: '12px 16px', borderRadius: 8,
            background: unattempted > 0 ? 'hsl(38 92% 96%)' : 'hsl(142 71% 96%)',
            border: `1px solid ${unattempted > 0 ? 'hsl(38 92% 80%)' : 'hsl(142 71% 80%)'}`,
            fontSize: 13, color: unattempted > 0 ? 'hsl(38 50% 35%)' : 'hsl(142 50% 30%)',
            fontWeight: 500
          }}>
            {unattempted > 0
              ? `⚠️ You have ${unattempted} unattempted question${unattempted > 1 ? 's' : ''}. They will be marked as skipped.`
              : `✅ You have attempted all ${total} questions!`
            }
          </div>
        </div>

        {/* Actions */}
        <div style={{
          padding: '14px 24px 20px',
          display: 'flex', gap: 12, justifyContent: 'flex-end',
          borderTop: '1px solid hsl(214 20% 90%)'
        }}>
          <button
            onClick={onCancel}
            style={{
              padding: '10px 22px', borderRadius: 8,
              border: '1.5px solid hsl(214 20% 80%)',
              background: 'white', cursor: 'pointer',
              fontSize: 14, fontWeight: 600, fontFamily: 'inherit',
              color: 'hsl(215 16% 35%)'
            }}
          >
            Continue Exam
          </button>
          <button
            onClick={onConfirm}
            style={{
              padding: '10px 24px', borderRadius: 8,
              background: 'hsl(221 83% 47%)',
              border: 'none', cursor: 'pointer',
              color: 'white', fontSize: 14, fontWeight: 700, fontFamily: 'inherit'
            }}
          >
            Submit Now
          </button>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, color, bg }: { label: string; value: number; color: string; bg: string }) {
  return (
    <div style={{
      padding: '12px 16px', borderRadius: 8, background: bg,
      border: '1px solid ' + color.replace(')', ' / 0.3)').replace('hsl', 'hsl'),
      textAlign: 'center'
    }}>
      <div style={{ fontSize: 26, fontWeight: 800, color }}>{value}</div>
      <div style={{ fontSize: 12, color: 'hsl(215 16% 45%)', marginTop: 2 }}>{label}</div>
    </div>
  );
}
