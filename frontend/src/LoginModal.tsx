import { useState } from 'react';
import { demoCredentials } from './auth/demoCredentials';

type LoginModalProps = {
  open: boolean;
  onClose: () => void;
  isSignUp: boolean;
  setIsSignUp: (v: boolean) => void;
  onLoggedIn: () => void;
};

export default function LoginModal({ open, onClose, isSignUp, setIsSignUp, onLoggedIn }: LoginModalProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  if (!open) return null;

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (demoCredentials[username] === password) {
      onLoggedIn();
      onClose();
    } else {
      setError('Invalid username or password.');
    }
  };

  const handleSignUp = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (demoCredentials[username]) {
      setError('Username already exists.');
    } else {
      demoCredentials[username] = password;
      setSuccess('Sign-up successful! Please log in.');
      setIsSignUp(false);
      setUsername('');
      setPassword('');
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="glass-panel auth-card" onClick={(e) => e.stopPropagation()}>
        <button className="close-modal" onClick={onClose}>
          ×
        </button>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <span style={{ fontSize: 48, color: 'var(--accent-primary)' }}>₹</span>
          <h2 style={{ marginTop: 16 }}>{isSignUp ? 'Create Account' : 'Welcome Back'}</h2>
          <p className="text-muted" style={{ marginTop: 8 }}>
            {isSignUp ? 'Sign up to start tracking' : 'Login to your dashboard'}
          </p>
        </div>

        {error && (
          <div
            style={{
              color: 'var(--danger)',
              fontSize: 14,
              textAlign: 'center',
              padding: '12px',
              background: 'rgba(239,68,68,0.1)',
              borderRadius: 12,
              marginBottom: 16,
            }}
          >
            {error}
          </div>
        )}
        {success && (
          <div
            style={{
              color: 'var(--success)',
              fontSize: 14,
              textAlign: 'center',
              padding: '12px',
              background: 'rgba(16,185,129,0.1)',
              borderRadius: 12,
              marginBottom: 16,
            }}
          >
            {success}
          </div>
        )}

        <form
          onSubmit={isSignUp ? handleSignUp : handleLogin}
          style={{ display: 'flex', flexDirection: 'column', gap: 20 }}
        >
          <div>
            <label className="filter-label">Username</label>
            <input
              type="text"
              className="input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              placeholder="Enter your username"
            />
          </div>
          <div>
            <label className="filter-label">Password</label>
            <input
              type="password"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Enter your password"
            />
          </div>
          <button type="submit" className="btn btn-primary" style={{ padding: '16px', marginTop: 8 }}>
            {isSignUp ? 'Get Started' : 'Login Now'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: 24, fontSize: 14 }}>
          <span className="text-muted">{isSignUp ? 'Already have an account? ' : "Don't have an account? "}</span>
          <button
            className="btn btn-outline"
            style={{ padding: '6px 16px', fontSize: 12, marginLeft: 8 }}
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError('');
              setSuccess('');
            }}
          >
            {isSignUp ? 'Login' : 'Sign Up'}
          </button>
        </div>
      </div>
    </div>
  );
}
