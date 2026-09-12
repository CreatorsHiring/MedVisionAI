import React, { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Eye, CheckCircle2, Lock, Mail, Calendar, ArrowRight, ShieldCheck, AlertCircle } from 'lucide-react';

const SetPassword = () => {
  const [searchParams] = useSearchParams();
  const initialEmail = searchParams.get('email') || '';
  const token = searchParams.get('token') || '';
  const navigate = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState(initialEmail);
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    try {
      if (token) {
        // Legacy token-based activation fallback
        await api.post('/auth/set-password', { token, new_password: password });
        setSuccess(true);
      } else {
        // Standard DOB identity verification + activation + auto-login
        const res = await api.post('/auth/set-patient-password', {
          email: email.trim(),
          date_of_birth: dateOfBirth.trim(),
          new_password: password
        });

        if (res.data?.access_token) {
          await login(res.data.access_token);
          setSuccess(true);
          setTimeout(() => {
            navigate('/patient/dashboard', { replace: true });
          }, 1200);
        } else {
          setSuccess(true);
        }
      }
    } catch (err: any) {
      setError(
        err.response?.data?.detail || 
        "We couldn't verify your details — please check with your healthcare provider."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#0F172A] flex flex-col justify-between p-4 font-sans antialiased">
      {/* Top Header */}
      <header className="max-w-md w-full mx-auto pt-6 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 text-slate-900 group">
          <div className="w-8 h-8 rounded-lg bg-[#0F766E] flex items-center justify-center shadow-xs">
            <Eye className="w-4 h-4 text-white" />
          </div>
          <span className="font-semibold text-sm tracking-tight">MedVision<span className="text-[#0F766E]">AI</span></span>
        </Link>
        <Link to="/login" className="text-xs font-medium text-slate-600 hover:text-[#0F766E] transition">
          Back to Login →
        </Link>
      </header>

      {/* Main Activation Card */}
      <div className="max-w-md w-full mx-auto my-8 p-6 sm:p-8 rounded-2xl border border-slate-200/90 bg-white shadow-xs">
        
        {success ? (
          <div className="text-center py-4 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-14 h-14 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Account Activated!</h2>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Your password has been securely configured. Logging you into your patient records…
              </p>
            </div>
            <button
              onClick={() => navigate('/patient/dashboard', { replace: true })}
              className="mt-4 w-full bg-[#0F766E] hover:bg-[#0D9488] text-white font-medium px-4 py-2.5 rounded-lg text-xs transition shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>Go to Patient Portal</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <div className="w-7 h-7 rounded-lg bg-[#0F766E]/10 border border-[#0F766E]/20 text-[#0F766E] flex items-center justify-center shrink-0">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <h1 className="text-lg font-bold text-slate-900 tracking-tight">
                First-Time Patient Activation
              </h1>
            </div>
            
            <p className="text-xs text-slate-500 font-normal mb-5 leading-relaxed">
              Verify your identity using your registered email and date of birth, then choose a password to access your eye screening reports.
            </p>

            {error && (
              <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-800 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span className="leading-snug">{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email Address */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Registered Email Address <span className="text-red-600">*</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="e.g. john.doe@example.com"
                    required
                    className="w-full pl-9 pr-3 py-2 bg-[#F8F9FA] border border-slate-300 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-[#0F766E] outline-none transition font-normal"
                  />
                </div>
              </div>

              {/* Date of Birth Verification */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Date of Birth <span className="text-red-600">*</span>
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="date"
                    value={dateOfBirth}
                    onChange={e => setDateOfBirth(e.target.value)}
                    required
                    className="w-full pl-9 pr-3 py-2 bg-[#F8F9FA] border border-slate-300 rounded-lg text-xs text-slate-900 focus:bg-white focus:border-[#0F766E] outline-none transition font-normal"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">Must match the date given during clinic registration.</p>
              </div>

              {/* New Password */}
              <div className="pt-1">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Create Password <span className="text-red-600">*</span>
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Minimum 8 characters"
                    required
                    minLength={8}
                    className="w-full pl-9 pr-3 py-2 bg-[#F8F9FA] border border-slate-300 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-[#0F766E] outline-none transition font-normal"
                  />
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Confirm Password <span className="text-red-600">*</span>
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter your password"
                    required
                    minLength={8}
                    className="w-full pl-9 pr-3 py-2 bg-[#F8F9FA] border border-slate-300 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-[#0F766E] outline-none transition font-normal"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full mt-2 bg-[#0F766E] hover:bg-[#0D9488] disabled:opacity-50 text-white font-medium py-2.5 rounded-lg text-xs shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {submitting ? (
                  <span>Verifying & Setting Password…</span>
                ) : (
                  <>
                    <span>Activate Account & Log In</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-5 pt-4 border-t border-slate-100 text-center">
              <p className="text-[11px] text-slate-500">
                Already have an active password?{' '}
                <Link to="/login" className="text-[#0F766E] hover:underline font-semibold">
                  Sign in here
                </Link>
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="text-center text-[11px] text-slate-400 py-3">
        MedVisionAI • Clinical Diabetic Retinopathy Diagnostic Platform
      </footer>
    </div>
  );
};

export default SetPassword;
