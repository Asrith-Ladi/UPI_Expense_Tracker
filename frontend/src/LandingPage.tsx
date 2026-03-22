import { useState, useEffect } from 'react';
import LoginModal from './LoginModal';

type LandingPageProps = {
  onLoggedIn: () => void;
};

export default function LandingPage({ onLoggedIn }: LandingPageProps) {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);

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

  return (
    <div className="landing-page">
      <nav className="navbar">
        <button
          className="btn btn-outline"
          onClick={() => {
            setIsSignUp(false);
            setShowAuthModal(true);
          }}
        >
          Login
        </button>
        <button
          className="btn btn-primary"
          onClick={() => {
            setIsSignUp(true);
            setShowAuthModal(true);
          }}
        >
          Sign Up
        </button>
      </nav>

      <section className="hero-section">
        <div className="hero-left">
          <div className="content-block">
            <h1 className="hero-title">
              Master Your <br />
              <span className="gradient-text">Expenses</span>
            </h1>
            <p className="hero-subtitle">
              Track your UPI spends, analyze your habits, and take control of your financial future with our premium
              expense tracker.
            </p>
            <button className="btn btn-primary" style={{ padding: '16px 40px', fontSize: 18 }} onClick={() => setShowAuthModal(true)}>
              Start Tracking Now
            </button>
          </div>

          <div className="content-block">
            <span className="section-label">Main Features</span>
            <h2>
              Everything you need for <br />
              Total Control
            </h2>
            <div className="features-grid">
              <div className="feature-card">
                <span className="feature-icon">📊</span>
                <h3>Automatic Analysis</h3>
                <p className="text-muted">
                  Upload your UPI statements and let our AI categorize every single spend automatically.
                </p>
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
            <div
              className="rupee-body"
              style={{
                transform: `scale(${0.8 + scrollProgress * 0.4}) rotate(${scrollProgress * 5}deg)`,
                opacity: 0.2 + scrollProgress * 0.8,
              }}
            >
              ₹
            </div>
            <div className="rupee-line-h1" style={{ left: '50%', marginLeft: '-110px' }} />
            <div className="rupee-line-h2" style={{ left: '50%', marginLeft: '-100px' }} />
          </div>
        </div>
      </section>

      <LoginModal
        open={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        isSignUp={isSignUp}
        setIsSignUp={setIsSignUp}
        onLoggedIn={onLoggedIn}
      />
    </div>
  );
}
