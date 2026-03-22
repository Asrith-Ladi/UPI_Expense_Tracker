import { useState, useEffect } from 'react';
import Dashboard from './Dashboard';

const CREDENTIALS: Record<string, string> = {
  "123": "123",
  "user2": "password2"
};

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      const height = window.innerHeight;
      const progress = Math.min(scrollY / height, 1);
      setScrollProgress(progress);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (CREDENTIALS[username] === password) {
      setIsLoggedIn(true);
      setShowAuthModal(false);
    } else {
      setError("Invalid username or password.");
    }
  };

  const handleSignUp = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (CREDENTIALS[username]) {
      setError("Username already exists.");
    } else {
      CREDENTIALS[username] = password;
      setSuccess("Sign-up successful! Please log in.");
      setIsSignUp(false);
      setUsername('');
      setPassword('');
    }
  };

  if (isLoggedIn) {
    return <Dashboard onLogout={() => setIsLoggedIn(false)} />;
  }

  return (
    <div className="landing-page">
      <nav className="navbar">
        <button className="btn btn-outline" onClick={() => { setIsSignUp(false); setShowAuthModal(true); }}>Login</button>
        <button className="btn btn-primary" onClick={() => { setIsSignUp(true); setShowAuthModal(true); }}>Sign Up</button>
      </nav>

      <section className="hero-section">
        <div className="hero-left">
          {/* Main Hero Block */}
          <div className="content-block">
            <h1 className="hero-title">Master Your <br /><span className="gradient-text">Expenses</span></h1>
            <p className="hero-subtitle">
              Track your UPI spends, analyze your habits, and take control of your financial future with our premium expense tracker.
            </p>
            <button className="btn btn-primary" style={{ padding: '16px 40px', fontSize: 18 }} onClick={() => setShowAuthModal(true)}>
              Start Tracking Now
            </button>
          </div>

          {/* Features Block */}
          <div className="content-block">
            <span className="section-label">Main Features</span>
            <h2>Everything you need for <br />Total Control</h2>
            <div className="features-grid">
              <div className="feature-card">
                <span className="feature-icon">📊</span>
                <h3>Automatic Analysis</h3>
                <p className="text-muted">Upload your UPI statements and let our AI categorize every single spend automatically.</p>
              </div>
              <div className="feature-card">
                <span className="feature-icon">🏷️</span>
                <h3>Smart Tagging</h3>
                <p className="text-muted">Create custom tags to track specific spending categories like "Food", "Travel", or "Rent".</p>
              </div>
              <div className="feature-card">
                <span className="feature-icon">📈</span>
                <h3>Visual Insights</h3>
                <p className="text-muted">Beautiful metrics and charts that give you a birds-eye view of your financial health.</p>
              </div>
            </div>
          </div>

          {/* Advantages Block */}
          <div className="content-block" style={{ paddingBottom: '20vh' }}>
            <span className="section-label">Our Advantages</span>
            <h2>Why choose UPI Tracker?</h2>
            <div className="advantages-grid">
              <div className="advantage-card">
                <span className="feature-icon">🔒</span>
                <h3>Privacy First</h3>
                <p className="text-muted">Your data never leaves your device. All processing happens locally for maximum security.</p>
              </div>
              <div className="advantage-card">
                <span className="feature-icon">⚡</span>
                <h3>Instant Results</h3>
                <p className="text-muted">See your spending patterns in seconds after uploading your statements.</p>
              </div>
              <div className="advantage-card">
                <span className="feature-icon">💎</span>
                <h3>Premium Experience</h3>
                <p className="text-muted">A sleek, modern interface designed for focus and clarity.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="hero-right">
          <div className="rupee-container">
            <div className="rupee-body" style={{ 
              transform: `scale(${0.8 + scrollProgress * 0.4}) rotate(${scrollProgress * 5}deg)`,
              opacity: 0.2 + scrollProgress * 0.8 // Visible earlier
            }}>₹</div>
            
            {/* Stationary horizontal bars merged into the symbol */}
            <div className="rupee-line-h1" style={{ 
              left: '50%',
              marginLeft: '-110px'
            }} />
            <div className="rupee-line-h2" style={{ 
              left: '50%',
              marginLeft: '-100px'
            }} />
          </div>
        </div>
      </section>

      {showAuthModal && (
        <div className="modal-overlay" onClick={() => setShowAuthModal(false)}>
          <div className="glass-panel auth-card" onClick={e => e.stopPropagation()}>
            <button className="close-modal" onClick={() => setShowAuthModal(false)}>×</button>
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <span style={{ fontSize: 48, color: 'var(--accent-primary)' }}>₹</span>
              <h2 style={{ marginTop: 16 }}>{isSignUp ? 'Create Account' : 'Welcome Back'}</h2>
              <p className="text-muted" style={{ marginTop: 8 }}>
                {isSignUp ? 'Sign up to start tracking' : 'Login to your dashboard'}
              </p>
            </div>

            {error && <div style={{ color: 'var(--danger)', fontSize: 14, textAlign: 'center', padding: '12px', background: 'rgba(239,68,68,0.1)', borderRadius: 12, marginBottom: 16 }}>{error}</div>}
            {success && <div style={{ color: 'var(--success)', fontSize: 14, textAlign: 'center', padding: '12px', background: 'rgba(16,185,129,0.1)', borderRadius: 12, marginBottom: 16 }}>{success}</div>}

            <form onSubmit={isSignUp ? handleSignUp : handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div>
                <label className="filter-label">Username</label>
                <input type="text" className="input" value={username} onChange={e => setUsername(e.target.value)} required placeholder="Enter your username" />
              </div>
              <div>
                <label className="filter-label">Password</label>
                <input type="password" className="input" value={password} onChange={e => setPassword(e.target.value)} required placeholder="Enter your password" />
              </div>
              <button type="submit" className="btn btn-primary" style={{ padding: '16px', marginTop: 8 }}>
                {isSignUp ? 'Get Started' : 'Login Now'}
              </button>
            </form>

            <div style={{ textAlign: 'center', marginTop: 24, fontSize: 14 }}>
              <span className="text-muted">{isSignUp ? 'Already have an account? ' : "Don't have an account? "}</span>
              <button className="btn btn-outline" style={{ padding: '6px 16px', fontSize: 12, marginLeft: 8 }}
                onClick={() => { setIsSignUp(!isSignUp); setError(''); setSuccess(''); }}>
                {isSignUp ? 'Login' : 'Sign Up'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
