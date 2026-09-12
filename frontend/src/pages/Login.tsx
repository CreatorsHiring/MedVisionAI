import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { 
  Mail, Lock, KeyRound, AlertCircle, ArrowRight, 
  Sparkles, TrendingUp, Users, ChevronRight, CheckCircle2,
  Stethoscope, User, ShieldCheck
} from 'lucide-react';

const Login: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialEmail = searchParams.get('email') || '';
  const redirectPath = searchParams.get('redirect') || '';
  const roleParam = searchParams.get('role')?.toLowerCase() || searchParams.get('type')?.toLowerCase();
  const initialRole = roleParam === 'patient' ? 'PATIENT' : 'DOCTOR';

  const [roleMode, setRoleMode] = useState<'DOCTOR' | 'PATIENT'>(initialRole);
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { user, login } = useAuth();
  const navigate = useNavigate();

  // Sync state if URL search param changes
  useEffect(() => {
    const currentParam = searchParams.get('role')?.toLowerCase() || searchParams.get('type')?.toLowerCase();
    if (currentParam === 'patient' && roleMode !== 'PATIENT') {
      setRoleMode('PATIENT');
      setEmail('');
      setPassword('');
      setError('');
    } else if (currentParam === 'doctor' && roleMode !== 'DOCTOR') {
      setRoleMode('DOCTOR');
      setEmail('');
      setPassword('');
      setError('');
    }
  }, [searchParams]);

  useEffect(() => {
    if (user) {
      if (user.role === 'PATIENT') {
        const target = (redirectPath && redirectPath.startsWith('/patient/')) ? redirectPath : '/patient/dashboard';
        navigate(target, { replace: true });
      } else {
        const target = (redirectPath && redirectPath.startsWith('/worker/')) ? redirectPath : '/worker/dashboard';
        navigate(target, { replace: true });
      }
    }
  }, [user, navigate, redirectPath]);

  const handleRoleToggle = (newRole: 'DOCTOR' | 'PATIENT') => {
    setRoleMode(newRole);
    setEmail('');
    setPassword('');
    setError('');
    setSearchParams({ role: newRole.toLowerCase() }, { replace: true });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const formData = new URLSearchParams();
      formData.append('username', email.trim());
      formData.append('password', password);

      const res = await api.post('/auth/login', formData, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });

      const token = res.data.access_token;
      await login(token);

      const meRes = await api.get('/auth/me');
      const userData = meRes.data;

      if (userData.role === 'PATIENT') {
        const target = (redirectPath && redirectPath.startsWith('/patient/')) ? redirectPath : '/patient/dashboard';
        navigate(target, { replace: true });
      } else {
        const target = (redirectPath && redirectPath.startsWith('/worker/')) ? redirectPath : '/worker/dashboard';
        navigate(target, { replace: true });
      }
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      if (err.response?.status === 403 && detail === 'ACCOUNT_PENDING_ACTIVATION') {
        navigate(`/set-password?email=${encodeURIComponent(email.trim())}`);
        return;
      }
      setError(detail || err.message || 'Invalid email or password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSetPasswordClick = () => {
    if (email.trim()) {
      navigate(`/set-password?email=${encodeURIComponent(email.trim())}`);
    } else {
      navigate('/set-password');
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-[#F7F8FA] font-sans antialiased text-[#0F172A] selection:bg-[#0F766E]/20 selection:text-[#0F766E] overflow-hidden">
      
      {/* ========================================================================= */}
      {/* LEFT PANEL: AUTHENTICATION FORM (45% width on desktop) */}
      {/* ========================================================================= */}
      <div className="w-full lg:w-[45%] xl:w-[44%] min-h-screen flex flex-col justify-between p-6 sm:p-10 lg:p-12 xl:p-16 bg-[#F8F9FA] border-r border-slate-200/80 z-10">
        
        {/* Top Header: Brand Logo */}
        <header className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 group">
            <img 
              src="/logo.png" 
              alt="MedVisionAI Logo" 
              className="w-8 h-8 object-contain group-hover:scale-105 transition-transform" 
            />
            <span className="font-bold text-sm tracking-tight text-slate-900 font-mono">
              MedVision<span className="text-[#0F766E]">AI</span>
            </span>
          </Link>

          <Link 
            to="/"
            className="text-xs font-medium text-slate-500 hover:text-slate-800 transition lg:hidden"
          >
            ← Back to Home
          </Link>
        </header>

        {/* Center: Main Form Card */}
        <main className="w-full max-w-[420px] mx-auto py-8 lg:py-0 space-y-5 animate-in fade-in duration-300">
          
          {/* Segmented Role Switcher: Doctor vs Patient */}
          <div className="p-1 bg-slate-200/80 rounded-xl grid grid-cols-2 gap-1 border border-slate-200">
            <button
              type="button"
              onClick={() => handleRoleToggle('DOCTOR')}
              className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                roleMode === 'DOCTOR'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/50'
              }`}
            >
              <Stethoscope className={`w-3.5 h-3.5 ${roleMode === 'DOCTOR' ? 'text-[#0F766E]' : 'text-slate-400'}`} />
              <span>Doctor / Clinician</span>
            </button>

            <button
              type="button"
              onClick={() => handleRoleToggle('PATIENT')}
              className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                roleMode === 'PATIENT'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/50'
              }`}
            >
              <User className={`w-3.5 h-3.5 ${roleMode === 'PATIENT' ? 'text-[#0F766E]' : 'text-slate-400'}`} />
              <span>Patient Portal</span>
            </button>
          </div>

          {/* Form Context Header */}
          <div className="space-y-1 text-left">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              {roleMode === 'DOCTOR' 
                ? 'Log in to clinical workspace' 
                : 'Log in to patient portal'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 font-normal">
              {roleMode === 'DOCTOR'
                ? 'Access diagnostic workstation, screening queues, and triage records.'
                : 'Access your retinal screening reports and medical AI assistant.'}
            </p>
          </div>

          {/* Error Message Box */}
          {error && (
            <div className="p-3.5 rounded-lg bg-red-50 border border-red-200 text-red-800 text-xs flex items-start gap-2.5 animate-in fade-in duration-200">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span className="leading-relaxed font-medium">{error}</span>
            </div>
          )}

          {/* Login Form with isolated DOM key per role to isolate autofill */}
          <form 
            key={roleMode}
            onSubmit={handleSubmit} 
            className="space-y-4 text-left"
            autoComplete="on"
          >
            
            {/* Email Field */}
            <div className="space-y-1.5">
              <label 
                htmlFor={roleMode === 'DOCTOR' ? 'clinician_email' : 'patient_email'} 
                className="block text-xs font-semibold text-slate-700"
              >
                {roleMode === 'DOCTOR' ? 'Clinician Email Address' : 'Patient Email Address'}
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  id={roleMode === 'DOCTOR' ? 'clinician_email' : 'patient_email'}
                  name={roleMode === 'DOCTOR' ? 'clinician_email' : 'patient_email'}
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={
                    roleMode === 'DOCTOR'
                      ? 'e.g. dr.screening.medvision@gmail.com'
                      : 'e.g. priya.sharma.eye@gmail.com'
                  }
                  required
                  autoFocus
                  autoComplete="username"
                  className="w-full pl-9 pr-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-[#0F766E] outline-none transition font-normal shadow-2xs"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <label 
                htmlFor={roleMode === 'DOCTOR' ? 'clinician_password' : 'patient_password'}
                className="block text-xs font-semibold text-slate-700"
              >
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  id={roleMode === 'DOCTOR' ? 'clinician_password' : 'patient_password'}
                  name={roleMode === 'DOCTOR' ? 'clinician_password' : 'patient_password'}
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  className="w-full pl-9 pr-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-[#0F766E] outline-none transition font-normal shadow-2xs"
                />
              </div>
            </div>

            {/* Options Row: Remember Me (Patient only) / Clinical Security Notice (Doctor) + Forgot Password */}
            <div className="flex items-center justify-between pt-0.5 min-h-[24px]">
              {roleMode === 'PATIENT' ? (
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-[#0F766E] focus:ring-[#0F766E] accent-[#0F766E] cursor-pointer"
                  />
                  <span className="text-xs text-slate-600 font-medium">Remember me for 30 days</span>
                </label>
              ) : (
                <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium select-none">
                  <Lock className="w-3 h-3 text-[#0F766E] shrink-0" />
                  <span>5-min session timeout upon closing browser</span>
                </div>
              )}

              <button
                type="button"
                onClick={handleSetPasswordClick}
                className="text-xs font-semibold text-[#0F766E] hover:underline hover:text-[#0D9488] transition cursor-pointer shrink-0 ml-2"
              >
                Forgot password?
              </button>
            </div>

            {/* Primary Action Button */}
            <div className="pt-1">
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#0F766E] hover:bg-[#0D9488] active:bg-[#115E59] disabled:opacity-60 text-white font-semibold py-2.5 sm:py-3 rounded-lg text-xs sm:text-sm shadow-xs transition flex items-center justify-center gap-2 cursor-pointer"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Signing in…</span>
                  </>
                ) : (
                  <>
                    <span>
                      {roleMode === 'DOCTOR' ? 'Log In to Workspace' : 'Log In to Patient Portal'}
                    </span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>

            {/* Role-specific secondary assistance footer */}
            {roleMode === 'PATIENT' ? (
              <div className="space-y-3 pt-1">
                <div className="relative flex items-center justify-center">
                  <div className="w-full border-t border-slate-200"></div>
                  <span className="absolute bg-[#F8F9FA] px-3 font-mono text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
                    OR
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleSetPasswordClick}
                  className="w-full bg-white hover:bg-slate-50 active:bg-slate-100 border border-slate-300 hover:border-slate-400 text-slate-700 hover:text-slate-900 font-semibold py-2.5 rounded-lg text-xs transition shadow-2xs flex items-center justify-center gap-2 cursor-pointer"
                >
                  <KeyRound className="w-3.5 h-3.5 text-[#0F766E]" />
                  <span>First time logging in? Activate account</span>
                </button>
              </div>
            ) : (
              <div className="pt-2">
                <p className="text-[11px] text-slate-400 text-center flex items-center justify-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
                  Authorized clinical personnel only
                </p>
              </div>
            )}

          </form>

        </main>

        {/* Bottom Fine Print: Clinical Disclaimer */}
        <footer className="pt-6">
          <p className="text-[11px] text-slate-400 leading-relaxed text-center lg:text-left max-w-[400px] mx-auto lg:mx-0 font-normal">
            This system is an AI-assisted screening tool intended for preliminary assessment support. Final clinical diagnosis must be performed by an authorized healthcare professional.
          </p>
        </footer>

      </div>

      {/* ========================================================================= */}
      {/* RIGHT PANEL: REBUILT 3D DASHBOARD COMPOSITION (Matching Sentinel Layout) */}
      {/* ========================================================================= */}
      <div className="hidden lg:flex lg:w-[55%] xl:w-[56%] relative flex-col justify-between p-10 xl:p-14 overflow-hidden bg-[#071C22]">
        
        {/* Subtle Geometric Diagonal Linework / Grid Background Pattern */}
        <div 
          className="absolute inset-0 pointer-events-none opacity-[0.08]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg stroke='%2314B8A6' stroke-width='1.2'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />

        {/* Ambient Gradient Glow Highlights */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-b from-[#0F766E]/30 to-transparent rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-20 -left-20 w-[450px] h-[450px] bg-[#0F766E]/20 rounded-full blur-3xl pointer-events-none"></div>

        {/* ------------------------------------------------------------- */}
        {/* TOP CONTENT BLOCK (Icon badge, bold headline, subtext, dots)  */}
        {/* ------------------------------------------------------------- */}
        <div className="relative z-20 space-y-3.5 text-left max-w-xl">
          
          {/* Square Brand Icon Badge (~44px, matching reference badge) */}
          <div className="w-12 h-12 rounded-xl bg-slate-900/80 border border-teal-400/40 p-1.5 flex items-center justify-center shadow-lg shadow-teal-950/40">
            <img src="/logo.png" alt="MedVisionAI Logo" className="w-full h-full object-contain" />
          </div>

          {/* Bold White Headline */}
          <h2 className="text-3xl xl:text-4xl font-extrabold text-white tracking-tight leading-[1.14]">
            Screening decisions clinicians can trust.
          </h2>

          {/* Subtext */}
          <p className="text-xs sm:text-sm text-teal-100/80 font-normal leading-relaxed max-w-md">
            AI-assisted diabetic retinopathy screening with full visual explainability.
          </p>

          {/* Pagination Dots Indicator (Matching Reference) */}
          <div className="flex items-center gap-1.5 pt-1.5">
            <div className="w-6 h-1.5 rounded-full bg-white shadow-xs"></div>
            <div className="w-1.5 h-1.5 rounded-full bg-white/35"></div>
            <div className="w-1.5 h-1.5 rounded-full bg-white/35"></div>
          </div>

        </div>

        {/* ------------------------------------------------------------- */}
        {/* LARGE TILTED / ANGLED DASHBOARD PANEL (Cropped by bottom/right) */}
        {/* ------------------------------------------------------------- */}
        <div className="relative z-10 w-full flex-1 min-h-[460px] flex items-end justify-end">
          
          {/* 3D Perspective Container with Sentinel-grade Receding Angle */}
          <div 
            className="absolute -right-12 -bottom-16 w-[820px] xl:w-[920px] pointer-events-none select-none transition-transform duration-700 ease-out"
            style={{
              transform: 'perspective(1400px) rotateX(24deg) rotateY(-18deg) rotateZ(10deg)',
              transformStyle: 'preserve-3d',
            }}
          >
            
            {/* Massive White Clinical Dashboard Card */}
            <div className="relative bg-white rounded-3xl p-6 shadow-[-30px_45px_90px_rgba(0,0,0,0.65)] border border-slate-200/90 text-slate-900 text-left">
              
              {/* Dashboard Internal Top Header */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <img src="/logo.png" alt="MedVisionAI Logo" className="w-7 h-7 object-contain" />
                  <div>
                    <span className="font-mono text-sm font-bold text-slate-900">MedVision<span className="text-[#0F766E]">AI</span></span>
                    <span className="text-[10px] text-slate-400 font-mono ml-2">/ Clinical Workspace</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg text-[10px] font-mono font-medium text-slate-600">
                    <span className="bg-white text-[#0F766E] px-2.5 py-0.5 rounded shadow-2xs font-bold">Overview</span>
                    <span className="px-2 py-0.5">Screening</span>
                    <span className="px-2 py-0.5">Patients</span>
                    <span className="px-2 py-0.5">Telemetry</span>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] font-mono text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span>Live Station</span>
                  </div>
                </div>
              </div>

              {/* Main Content: 2-Column Clinical Operations View */}
              <div className="grid grid-cols-12 gap-5 pt-4">
                
                {/* Left Mini Sidebar Column */}
                <div className="col-span-3 space-y-2 border-r border-slate-100 pr-4">
                  <div className="p-2 rounded-lg bg-teal-50/70 border border-teal-200/60 text-[#0F766E] font-semibold text-[11px] flex items-center justify-between">
                    <span>Active Session</span>
                    <span className="w-2 h-2 rounded-full bg-[#0F766E]"></span>
                  </div>
                  <div className="p-2 rounded-lg text-slate-500 text-[11px] hover:bg-slate-50">
                    <span>Screening Queue</span>
                  </div>
                  <div className="p-2 rounded-lg text-slate-500 text-[11px] hover:bg-slate-50">
                    <span>Patient Records</span>
                  </div>
                  <div className="p-2 rounded-lg text-slate-500 text-[11px] hover:bg-slate-50">
                    <span>Diagnostic Heatmaps</span>
                  </div>
                  <div className="p-2 rounded-lg text-slate-500 text-[11px] hover:bg-slate-50">
                    <span>Export Data</span>
                  </div>

                  <div className="pt-4 mt-4 border-t border-slate-100">
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
                      <p className="text-[9px] font-mono uppercase text-slate-400 font-semibold">Attending</p>
                      <p className="text-xs font-bold text-slate-900 mt-0.5">Dr. Screening</p>
                      <p className="text-[10px] text-slate-500">Retinal Care Unit</p>
                    </div>
                  </div>
                </div>

                {/* Right Main Analytics & Telemetry Column */}
                <div className="col-span-9 space-y-4">
                  
                  {/* Metric Cards Row */}
                  <div className="grid grid-cols-3 gap-3">
                    
                    {/* Card 1 */}
                    <div className="p-3.5 rounded-xl bg-[#F8F9FA] border border-slate-200/90 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono font-medium uppercase text-slate-500">Scans Today</span>
                        <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                      </div>
                      <div className="flex items-baseline gap-2 mt-1">
                        <span className="text-xl font-bold font-mono text-slate-900">18</span>
                        <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">+12.4%</span>
                      </div>
                      {/* Mini sparkline */}
                      <svg className="w-full h-5 mt-1 stroke-emerald-600 fill-none" viewBox="0 0 100 20">
                        <path d="M0 15 Q25 5 50 12 T100 4" strokeWidth="2" strokeLinecap="round" />
                      </svg>
                    </div>

                    {/* Card 2 */}
                    <div className="p-3.5 rounded-xl bg-[#F8F9FA] border border-slate-200/90 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono font-medium uppercase text-slate-500">Registered Patients</span>
                        <Users className="w-3.5 h-3.5 text-[#0F766E]" />
                      </div>
                      <div className="flex items-baseline gap-2 mt-1">
                        <span className="text-xl font-bold font-mono text-slate-900">142</span>
                        <span className="text-[10px] text-slate-500 font-mono">active</span>
                      </div>
                      {/* Mini sparkline */}
                      <svg className="w-full h-5 mt-1 stroke-[#0F766E] fill-none" viewBox="0 0 100 20">
                        <path d="M0 16 Q30 18 60 8 T100 2" strokeWidth="2" strokeLinecap="round" />
                      </svg>
                    </div>

                    {/* Card 3 */}
                    <div className="p-3.5 rounded-xl bg-red-50/60 border border-red-200 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono font-semibold uppercase text-red-700">Urgent DR Alerts</span>
                        <AlertCircle className="w-3.5 h-3.5 text-red-600" />
                      </div>
                      <div className="flex items-baseline gap-2 mt-1">
                        <span className="text-xl font-bold font-mono text-red-800">2</span>
                        <span className="text-[10px] text-red-700 font-semibold bg-red-100 px-1.5 py-0.2 rounded">Immediate Triage</span>
                      </div>
                      {/* Mini sparkline */}
                      <svg className="w-full h-5 mt-1 stroke-red-600 fill-none" viewBox="0 0 100 20">
                        <path d="M0 18 Q35 12 70 6 T100 2" strokeWidth="2" strokeLinecap="round" />
                      </svg>
                    </div>

                  </div>

                  {/* Operational Trends Chart Card */}
                  <div className="relative p-4 rounded-xl bg-white border border-slate-200 shadow-2xs">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h4 className="text-xs font-bold text-slate-900">Screening Operations & DR Trends</h4>
                        <p className="text-[10px] text-slate-400 font-normal">Real-time throughput and model positivity curve</p>
                      </div>
                      <span className="text-[9px] font-mono font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                        Last 12 Hours
                      </span>
                    </div>

                    {/* Smooth SVG Area Curve Line Chart */}
                    <div className="relative w-full h-28">
                      <svg className="w-full h-full" viewBox="0 0 500 100" preserveAspectRatio="none">
                        {/* Grid lines */}
                        <line x1="0" y1="25" x2="500" y2="25" stroke="#F1F5F9" strokeDasharray="3 3" />
                        <line x1="0" y1="50" x2="500" y2="50" stroke="#F1F5F9" strokeDasharray="3 3" />
                        <line x1="0" y1="75" x2="500" y2="75" stroke="#F1F5F9" strokeDasharray="3 3" />

                        {/* Area Gradient */}
                        <defs>
                          <linearGradient id="chartTealGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#0F766E" stopOpacity="0.25" />
                            <stop offset="100%" stopColor="#0F766E" stopOpacity="0.0" />
                          </linearGradient>
                        </defs>

                        {/* Filled Area */}
                        <path 
                          d="M0 80 Q100 65 200 40 T400 20 T500 15 L500 100 L0 100 Z" 
                          fill="url(#chartTealGrad)" 
                        />

                        {/* Main Curve Line */}
                        <path 
                          d="M0 80 Q100 65 200 40 T400 20 T500 15" 
                          fill="none" 
                          stroke="#0F766E" 
                          strokeWidth="3" 
                          strokeLinecap="round" 
                        />

                        {/* Secondary DR Alert Curve */}
                        <path 
                          d="M0 90 Q120 85 240 70 T420 50 T500 45" 
                          fill="none" 
                          stroke="#E11D48" 
                          strokeWidth="2" 
                          strokeDasharray="4 4" 
                          strokeLinecap="round" 
                        />

                        {/* Highlight data points */}
                        <circle cx="200" cy="40" r="4" fill="#0F766E" stroke="#ffffff" strokeWidth="2" />
                        <circle cx="400" cy="20" r="4" fill="#0F766E" stroke="#ffffff" strokeWidth="2" />
                        <circle cx="420" cy="50" r="3.5" fill="#E11D48" stroke="#ffffff" strokeWidth="1.5" />
                      </svg>

                      {/* X-Axis Timestamps */}
                      <div className="flex justify-between text-[8px] font-mono text-slate-400 pt-1">
                        <span>6 AM</span>
                        <span>8 AM</span>
                        <span>10 AM</span>
                        <span>12 PM</span>
                        <span>2 PM</span>
                        <span>4 PM</span>
                      </div>
                    </div>

                    {/* ----------------------------------------------------------- */}
                    {/* FLOATING POPUP CALLOUT CARD (Matching Reference 2 Effect)   */}
                    {/* ----------------------------------------------------------- */}
                    <div 
                      className="absolute right-6 top-10 bg-white/95 backdrop-blur-md rounded-xl p-3 shadow-2xl border border-slate-200/90 text-[10px] space-y-1.5 w-48 ring-1 ring-black/5"
                      style={{
                        transform: 'translateZ(30px)',
                      }}
                    >
                      <div className="flex items-center justify-between pb-1 border-b border-slate-100 font-mono">
                        <span className="font-bold text-slate-900">Sep 12, 2026</span>
                        <span className="text-emerald-700 bg-emerald-50 px-1 rounded font-semibold text-[8px]">Live</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 font-medium flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#0F766E]"></span> Total Scans:
                        </span>
                        <span className="font-mono font-bold text-slate-900">18 <span className="text-emerald-600 font-normal">+2.5%</span></span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 font-medium flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span> DR Detected:
                        </span>
                        <span className="font-mono font-bold text-red-700">94.2%</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 font-medium flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span> Urgent Triage:
                        </span>
                        <span className="font-mono font-bold text-amber-700">2 cases</span>
                      </div>
                    </div>

                  </div>

                  {/* Top Security / Clinical Insights Rows */}
                  <div className="p-3.5 rounded-xl bg-[#F8F9FA] border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between text-[10px] font-semibold text-slate-800">
                      <span className="flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5 text-[#0F766E]" /> Top Clinical Insights & Attention
                      </span>
                      <span className="text-[#0F766E] hover:underline cursor-pointer flex items-center gap-0.5 text-[9px]">
                        View all <ChevronRight className="w-2.5 h-2.5" />
                      </span>
                    </div>

                    <div className="p-2 bg-white rounded-lg border border-slate-200/80 flex items-center justify-between text-[10px]">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-md bg-red-50 text-red-600 flex items-center justify-center font-bold">
                          <AlertCircle className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">Review critical DR alert #SCR-9482</p>
                          <p className="text-[8px] text-slate-500 font-normal">High-severity microvascular dot hemorrhages near superior arcade</p>
                        </div>
                      </div>
                      <span className="font-mono text-red-700 font-bold bg-red-50 px-1.5 py-0.5 rounded text-[9px]">
                        94.2% DR
                      </span>
                    </div>

                    <div className="p-2 bg-white rounded-lg border border-slate-200/80 flex items-center justify-between text-[10px]">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">Screening validated for Arthur Miller</p>
                          <p className="text-[8px] text-slate-500 font-normal">Normal optic disc & macular architecture without lesion</p>
                        </div>
                      </div>
                      <span className="font-mono text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded text-[9px]">
                        99.1% No DR
                      </span>
                    </div>

                  </div>

                </div>

              </div>

            </div>
          </div>

        </div>

      </div>

    </div>
  );
};

export default Login;
