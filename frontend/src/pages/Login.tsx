import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Eye, ShieldCheck, UserCheck, Lock, User, ArrowRight, CheckCircle2, Sparkles, Activity, MessageSquare } from 'lucide-react';
import './Login.css';

const Login = () => {
  const [mode, setMode] = useState<'doctor' | 'patient'>('doctor');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { user, login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      if (user.role === 'PATIENT') {
        navigate('/patient/dashboard', { replace: true });
      } else {
        navigate('/worker/dashboard', { replace: true });
      }
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const formData = new URLSearchParams();
      formData.append('username', username.trim());
      formData.append('password', password);

      const res = await api.post('/auth/login', formData, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });

      const token = res.data.access_token;
      await login(token);

      const meRes = await api.get('/auth/me');
      const userData = meRes.data;

      if (userData.role === 'PATIENT') {
        navigate('/patient/dashboard', { replace: true });
      } else {
        navigate('/worker/dashboard', { replace: true });
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Invalid username or password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="cream-theme-container">
      
      {/* Header */}
      <header className="cream-navbar">
        <Link to="/" className="nav-brand">
          <div className="nav-logo-box">
            <Eye className="w-5 h-5 text-white" />
          </div>
          <span className="nav-brand-text">MedVision<span>AI</span></span>
        </Link>
      </header>

      {/* Main Content Area */}
      <main className="cream-hero-section">
        
        {/* LEFT COLUMN: Content & Form */}
        <div className="hero-left-column">
          
          {/* Pill Switcher Toggle (Doctor vs Patient) */}
          <div className="portal-pill-toggle">
            <div className={`pill-glider ${mode === 'patient' ? 'slide-right' : ''}`}></div>
            <button
              type="button"
              className={`pill-tab ${mode === 'doctor' ? 'active' : ''}`}
              onClick={() => { setMode('doctor'); setError(''); }}
            >
              <ShieldCheck className="w-4 h-4" /> DOCTOR PORTAL
            </button>
            <button
              type="button"
              className={`pill-tab ${mode === 'patient' ? 'active' : ''}`}
              onClick={() => { setMode('patient'); setError(''); }}
            >
              <UserCheck className="w-4 h-4" /> PATIENT PORTAL
            </button>
          </div>

          {/* Dynamic Main Heading (Natural Professional Text) */}
          <div className="hero-heading-container" key={mode}>
            {mode === 'doctor' ? (
              <h1 className="cream-hero-title">
                Diabetic Retinopathy <span>Screening System</span>
              </h1>
            ) : (
              <h1 className="cream-hero-title">
                Patient Eye Health <span>Portal & Records</span>
              </h1>
            )}
            <p className="hero-subtext">
              {mode === 'doctor' 
                ? 'Upload retinal fundus images, review diagnostic heatmap overlays, and publish official clinical reports for your patients.'
                : 'Sign in to view your screening results, download PDF diagnostic reports, and ask questions about your eye test.'}
            </p>
          </div>

          {/* Feature Checklist (Human Language) */}
          <div className="hero-feature-checklist" key={`list-${mode}`}>
            {mode === 'doctor' ? (
              <>
                <div className="feature-check-item">
                  <div className="check-icon-box warm">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <span>Retinal image analysis & severity grading</span>
                </div>
                <div className="feature-check-item">
                  <div className="check-icon-box warm">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <span>Visual Grad-CAM heatmap overlays for doctor review</span>
                </div>
                <div className="feature-check-item">
                  <div className="check-icon-box warm">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <span>Exportable PDF patient reports & Excel (.xlsx) database download</span>
                </div>
              </>
            ) : (
              <>
                <div className="feature-check-item">
                  <div className="check-icon-box sage">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <span>View your latest eye screening status & findings</span>
                </div>
                <div className="feature-check-item">
                  <div className="check-icon-box sage">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <span>Download official PDF diagnostic reports anytime</span>
                </div>
                <div className="feature-check-item">
                  <div className="check-icon-box sage">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <span>Ask questions about your screening report details</span>
                </div>
              </>
            )}
          </div>

          {/* Inline Integrated Login Form */}
          <div className="cream-form-card" key={`form-${mode}`}>
            {error && <div className="error-banner-box">{error}</div>}

            <form onSubmit={handleSubmit} className="cream-login-form">
              <div className="form-row-group">
                <div className="form-field">
                  <label>{mode === 'doctor' ? 'Doctor / Admin Username' : 'Patient Username'}</label>
                  <div className="field-input-box">
                    <User className="w-4 h-4 field-icon" />
                    <input
                      type="text"
                      className="field-input"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder={mode === 'doctor' ? 'e.g. dr.screening or medvision.admin' : 'Enter patient username'}
                      required
                    />
                  </div>
                </div>

                <div className="form-field">
                  <label>Password</label>
                  <div className="field-input-box">
                    <Lock className="w-4 h-4 field-icon" />
                    <input
                      type="password"
                      className="field-input"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter password"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="form-action-row">
                <button type="submit" className="cream-submit-btn" disabled={loading}>
                  <Sparkles className="w-4 h-4" />
                  {loading ? 'Signing in...' : `Sign In to ${mode === 'doctor' ? 'Doctor Portal' : 'Patient Portal'}`}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>

            <div className="cream-hint">
              {mode === 'doctor'
                ? '🔒 Admin credentials (`medvision.admin`) provide complete system access & Excel data export.'
                : '🔑 Patients sign in using credentials sent to their email.'}
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: Dynamic Portal Image Showcase */}
        <div className="hero-right-column">
          <div className="hero-image-frame-card">
            
            {/* Display relevant image based on selected portal */}
            <div className="image-wrapper" key={`img-${mode}`}>
              <img
                src={mode === 'doctor' ? '/assets/doctor_portal_hero.jpg' : '/assets/patient_portal_hero.jpg'}
                alt={mode === 'doctor' ? 'Doctor Workspace' : 'Patient Portal'}
                className="portal-showcase-img"
              />

              {/* Floating Overlay Badge */}
              <div className="floating-portal-badge">
                <div className="badge-icon-wrap">
                  {mode === 'doctor' ? <Activity className="w-4 h-4 text-[#0F766E]" /> : <MessageSquare className="w-4 h-4 text-[#047857]" />}
                </div>
                <div className="badge-content-text">
                  <span className="badge-title">{mode === 'doctor' ? 'Clinical Workspace' : 'Patient Portal App'}</span>
                  <span className="badge-subtitle">{mode === 'doctor' ? 'Grad-CAM DR Heatmaps' : 'Health Assistant'}</span>
                </div>
              </div>
            </div>

          </div>
        </div>

      </main>

    </div>
  );
};

export default Login;




