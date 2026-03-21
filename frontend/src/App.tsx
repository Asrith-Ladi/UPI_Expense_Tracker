import { useState } from 'react';
import Dashboard from './Dashboard';

const CREDENTIALS: Record<string, string> = {
  "123": "123",
  "user2": "password2"
};

// Realistic Indian currency note data
const NOTES = [
  { denom: '₹500',  color1: '#1a5c3a', color2: '#0d3321', stripe: '#28a16a', tag: '500' },
  { denom: '₹2000', color1: '#9b2d6e', color2: '#5c1a40', stripe: '#d43f8f', tag: '2K'  },
  { denom: '₹200',  color1: '#c16a1a', color2: '#7a3f0a', stripe: '#e0882a', tag: '200' },
  { denom: '₹100',  color1: '#2060a0', color2: '#0d3560', stripe: '#3080d0', tag: '100' },
  { denom: '₹50',   color1: '#7a5c1a', color2: '#453209', stripe: '#b08020', tag: '50'  },
];

const CURRENCY_NOTES = Array.from({ length: 14 }, (_, i) => {
  const note = NOTES[i % NOTES.length];
  return {
    id: i,
    ...note,
    left: `${(i % 7) * 14 + (i * 1.3) % 6}%`,
    top: `${Math.floor(i / 7) * 48 + (i * 2.7) % 20}%`,
    rotate: (i * 11.3 % 36) - 18,
    delay: `${(i * 0.6) % 5}s`,
    duration: `${(i % 4) + 8}s`,
    driftX: (i * 7 % 24) - 12,
    driftY: (i * 5 % 30) + 15,
  };
});

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (CREDENTIALS[username] === password) {
      setIsLoggedIn(true);
    } else {
      setError("Invalid username or password.");
    }
  };

  const handleSignUp = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (CREDENTIALS[username]) {
      setError("Username already exists. Please choose a different username.");
    } else {
      CREDENTIALS[username] = password;
      setSuccess("Sign-up successful! You can now log in.");
      setIsSignUp(false);
      setUsername('');
      setPassword('');
    }
  };

  if (isLoggedIn) {
    return <Dashboard onLogout={() => setIsLoggedIn(false)} />;
  }

  return (
    <div className="auth-container">
      {/* Animated Indian Currency Notes Background */}
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
        {CURRENCY_NOTES.map(note => (
          <div
            key={note.id}
            className="currency-note"
            style={{
              position: 'absolute',
              left: note.left,
              top: note.top,
              background: `linear-gradient(135deg, ${note.color1} 0%, ${note.color2} 100%)`,
              '--rotate': `${note.rotate}deg`,
              '--drift-x': `${note.driftX}px`,
              '--drift-y': `${note.driftY}px`,
              '--stripe-color': note.stripe,
              animationDuration: note.duration,
              animationDelay: note.delay,
            } as React.CSSProperties}
          >
            {/* Security stripe */}
            <div className="note-stripe" />
            <div className="note-left">
              <span className="note-symbol">₹</span>
              <span className="note-tag">{note.tag}</span>
            </div>
            <div className="note-center-text">{note.denom}</div>
            <div className="note-right">
              <span className="note-tag">{note.tag}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="glass-panel auth-card">
        <div style={{ textAlign: 'center', marginBottom: 8 }}>
          <span style={{ fontSize: 36 }}>₹</span>
          <h1 style={{ marginTop: 8 }}>{isSignUp ? 'Create Account' : 'UPI Expense Tracker'}</h1>
          <p className="text-muted" style={{ marginTop: 4 }}>
            {isSignUp ? 'Sign up to track your expenses' : 'Login to your UPI Expense Tracker'}
          </p>
        </div>

        {error && <div style={{ color: 'var(--danger)', fontSize: 14, textAlign: 'center', padding: '8px 12px', background: 'rgba(239,68,68,0.1)', borderRadius: 8 }}>{error}</div>}
        {success && <div style={{ color: 'var(--success)', fontSize: 14, textAlign: 'center' }}>{success}</div>}

        <form onSubmit={isSignUp ? handleSignUp : handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label className="filter-label">Username</label>
            <input type="text" className="input" value={username} onChange={e => setUsername(e.target.value)} required />
          </div>
          <div>
            <label className="filter-label">Password</label>
            <input type="password" className="input" value={password} onChange={e => setPassword(e.target.value)} required />
          </div>
          <button type="submit" className="btn btn-primary" style={{ marginTop: 8, padding: '14px' }}>
            {isSignUp ? 'Sign Up' : 'Login'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: 8, fontSize: 14 }}>
          <span className="text-muted">{isSignUp ? 'Already have an account? ' : "Don't have an account? "}</span>
          <button className="btn btn-outline" style={{ padding: '4px 12px', fontSize: 12, marginLeft: 8 }}
            onClick={() => { setIsSignUp(!isSignUp); setError(''); setSuccess(''); setUsername(''); setPassword(''); }}>
            {isSignUp ? 'Login' : 'Sign Up'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;
