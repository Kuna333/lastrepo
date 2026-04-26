import { useState } from 'react';
import { useAuth } from '../auth/AuthContext';

export default function LoginPage() {
  const { login, signup } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === 'login') await login(email, password);
      else await signup(email, password);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Authentication failed';
      setError(friendlyError(msg));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, hsl(221 83% 20%), hsl(221 60% 35%))',
      fontFamily: 'Inter, system-ui, sans-serif', padding: 16,
    }}>
      <div style={{
        background: 'white', borderRadius: 12, padding: 32,
        width: '100%', maxWidth: 400,
        boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: 'hsl(221 83% 20%)' }}>
            CBT Exam Simulator
          </h1>
          <p style={{ margin: '6px 0 0', fontSize: 13, color: 'hsl(215 16% 50%)' }}>
            {mode === 'login' ? 'Sign in to continue' : 'Create a new account'}
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={labelStyle}>Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Password</label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              style={inputStyle}
            />
          </div>

          {error && (
            <div style={{
              padding: '10px 12px', borderRadius: 6,
              background: 'hsl(0 84% 96%)', border: '1px solid hsl(0 84% 85%)',
              color: 'hsl(0 84% 35%)', fontSize: 13,
            }}>{error}</div>
          )}

          <button
            type="submit"
            disabled={busy}
            style={{
              padding: '12px', borderRadius: 8, border: 'none',
              background: busy ? 'hsl(221 30% 60%)' : 'hsl(221 83% 47%)',
              color: 'white', fontSize: 14, fontWeight: 700,
              cursor: busy ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
              marginTop: 4,
            }}
          >
            {busy ? 'Please wait…' : mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <div style={{ marginTop: 18, textAlign: 'center', fontSize: 13, color: 'hsl(215 16% 50%)' }}>
          {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}{' '}
          <button
            onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(null); }}
            style={{
              background: 'none', border: 'none', padding: 0,
              color: 'hsl(221 83% 47%)', fontWeight: 600, cursor: 'pointer',
              fontSize: 13, fontFamily: 'inherit',
            }}
          >
            {mode === 'login' ? 'Sign up' : 'Sign in'}
          </button>
        </div>
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 12, fontWeight: 600,
  color: 'hsl(220 25% 35%)', marginBottom: 6,
};

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 12px', borderRadius: 7,
  border: '1.5px solid hsl(214 20% 80%)', fontSize: 14,
  fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
};

function friendlyError(raw: string): string {
  if (raw.includes('user-not-found')) return 'No account found with that email.';
  if (raw.includes('wrong-password') || raw.includes('invalid-credential'))
    return 'Incorrect email or password.';
  if (raw.includes('email-already-in-use')) return 'That email is already registered. Sign in instead.';
  if (raw.includes('weak-password')) return 'Password should be at least 6 characters.';
  if (raw.includes('invalid-email')) return 'Please enter a valid email address.';
  if (raw.includes('network-request-failed')) return 'Network error. Check your internet connection.';
  if (raw.includes('too-many-requests')) return 'Too many attempts. Please wait a moment.';
  return raw.replace(/^Firebase:\s*/, '').replace(/\(auth\/[^)]+\)\.?$/, '').trim() || 'Authentication failed.';
}
