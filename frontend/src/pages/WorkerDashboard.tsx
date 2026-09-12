import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, useParams, Link } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { 
  Upload, Eye, FileText, UserPlus, Users, AlertTriangle, CheckCircle, 
  Trash2, Download, LogOut, Activity, Sparkles, Clock,
  ShieldAlert, RefreshCw, ChevronRight, Layers,
  Check, ShieldCheck, X, ExternalLink, Copy, AlertCircle
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell
} from 'recharts';

interface Patient { 
  id: number; 
  name: string; 
  patient_access_id: string; 
  email: string; 
  username: string; 
  account_status?: string;
  date_of_birth?: string;
  diabetes_type?: string;
}

interface ScreeningResult { 
  id: number; 
  screening_id: string; 
  patient_id?: number;
  patient_name?: string;
  patient_access_id?: string;
  prediction: string; 
  confidence: number; 
  probability_dr?: number;
  probability_no_dr?: number;
  risk_level: string; 
  recommendation: string; 
  heatmap_explanation?: string;
  ai_context?: string;
  image_url?: string;
  heatmap_url?: string;
  created_at?: string;
}

interface RecentScreeningItem {
  id: number;
  screening_id: string;
  patient_id: number;
  patient_name: string;
  patient_access_id: string;
  prediction: string;
  confidence: number;
  probability_dr?: number;
  probability_no_dr?: number;
  risk_level: string;
  recommendation: string;
  heatmap_explanation?: string;
  ai_context?: string;
  image_url?: string;
  heatmap_url?: string;
  has_report: boolean;
  is_published: boolean;
  created_at: string;
  reviewed?: boolean;
}

interface Stats {
  total_screenings: number;
  screenings_today: number;
  dr_present_count: number;
  no_dr_count: number;
}

interface DashboardStatsData {
  stats: {
    screenings_today: number;
    screenings_today_trend: string;
    total_patients: number;
    patients_trend: string;
    total_screenings: number;
    screenings_trend: string;
    dr_cases_count: number;
    dr_cases_trend: string;
  };
  volume_chart: Array<{
    date: string;
    full_date: string;
    screenings: number;
    dr_cases: number;
    no_dr_cases: number;
  }>;
  risk_distribution: Array<{
    name: string;
    value: number;
    color: string;
  }>;
  high_risk_alerts: Array<{
    id: number;
    screening_id: string;
    patient_id: number;
    patient_name: string;
    patient_access_id: string;
    prediction: string;
    confidence: number;
    risk_level: string;
    recommendation: string;
    created_at: string;
    reviewed: boolean;
  }>;
  recent_activity: Array<{
    id: number;
    screening_id: string;
    patient_id: number;
    patient_name: string;
    patient_access_id: string;
    prediction: string;
    confidence: number;
    risk_level: string;
    created_at: string;
  }>;
}

const WorkerDashboard = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { patientId } = useParams();

  // Determine current tab strictly from the URL path
  const currentTab = location.pathname.includes('/worker/screen')
    ? 'screen'
    : location.pathname.includes('/worker/queue')
    ? 'queue'
    : location.pathname.includes('/worker/patients')
    ? 'patients'
    : location.pathname.includes('/worker/new-patient')
    ? 'new-patient'
    : 'dashboard';

  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ScreeningResult | null>(null);
  const [reportStatus, setReportStatus] = useState<'idle' | 'generating' | 'done'>('idle');
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);
  
  // Dashboard Analytics Data
  const [dashboardData, setDashboardData] = useState<DashboardStatsData | null>(null);
  const [loadingDashboard, setLoadingDashboard] = useState(false);
  const [reviewingId, setReviewingId] = useState<string | null>(null);

  // Image comparison view mode (Desktop / Mobile)
  const [imageViewMode, setImageViewMode] = useState<'side-by-side' | 'original' | 'heatmap'>('side-by-side');

  // Queue and Patient Screening History
  const [recentScreenings, setRecentScreenings] = useState<RecentScreeningItem[]>([]);
  const [loadingQueue, setLoadingQueue] = useState(false);
  const [viewingReportItem, setViewingReportItem] = useState<RecentScreeningItem | null>(null);
  const [selectedPatientHistory, setSelectedPatientHistory] = useState<{ patient: Patient; screenings: RecentScreeningItem[] } | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // New patient form state
  const [newPatient, setNewPatient] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    date_of_birth: '',
    diabetes_type: 'Type 2',
    year_of_diagnosis: '',
    existing_eye_conditions: ''
  });
  const [createdPatient, setCreatedPatient] = useState<any>(null);
  const [registerError, setRegisterError] = useState('');
  const [submittingPatient, setSubmittingPatient] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchPatients();
    fetchStats();
    if (currentTab === 'dashboard') {
      fetchDashboardData();
    } else if (currentTab === 'queue') {
      fetchRecentQueue();
    }
  }, [currentTab]);

  // Handle direct navigation to /worker/patients/:patientId on load or refresh
  useEffect(() => {
    if (patientId && patients.length > 0) {
      const found = patients.find(p => p.id === Number(patientId));
      if (found) {
        handleViewPatientHistory(found, false);
      }
    } else if (!patientId && currentTab === 'patients') {
      setSelectedPatientHistory(null);
    }
  }, [patientId, patients]);

  const fetchPatients = async () => {
    try {
      const res = await api.get('/patients/');
      setPatients(res.data);
    } catch (e) { console.error(e); }
  };

  const fetchStats = async () => {
    try {
      const res = await api.get('/screen/stats');
      setStats(res.data);
    } catch (e) { console.error(e); }
  };

  const fetchDashboardData = async () => {
    setLoadingDashboard(true);
    try {
      const res = await api.get('/screen/dashboard-stats');
      setDashboardData(res.data);
    } catch (e) {
      console.error('Error fetching dashboard stats:', e);
    } finally {
      setLoadingDashboard(false);
    }
  };

  const handleMarkReviewed = async (screeningId: string) => {
    setReviewingId(screeningId);
    try {
      await api.patch(`/screen/${screeningId}/review`);
      if (dashboardData) {
        setDashboardData({
          ...dashboardData,
          high_risk_alerts: dashboardData.high_risk_alerts.filter(a => a.screening_id !== screeningId)
        });
      }
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to mark screening as reviewed.');
    } finally {
      setReviewingId(null);
    }
  };

  const formatRelativeTime = (isoString?: string) => {
    if (!isoString) return 'Recent';
    try {
      const date = new Date(isoString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays === 1) return 'Yesterday';
      if (diffDays < 7) return `${diffDays}d ago`;
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch {
      return 'Recent';
    }
  };

  const getValidImageUrl = (url?: string) => {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    if (url.startsWith('/uploads')) return `http://localhost:8000${url}`;
    if (url.startsWith('uploads/')) return `http://localhost:8000/${url}`;
    return `http://localhost:8000/uploads/${url}`;
  };

  const fetchRecentQueue = async () => {
    setLoadingQueue(true);
    try {
      const res = await api.get('/screen/recent');
      setRecentScreenings(res.data);
    } catch (e) { console.error(e); }
    finally { setLoadingQueue(false); }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0] || null;
    setFile(selected);
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !selectedPatientId) return;
    setLoading(true);
    setResult(null);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await api.post(`/screen/?patient_id=${selectedPatientId}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setResult(res.data);
      setReportStatus('idle');
      fetchStats();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Screening failed.');
    } finally { setLoading(false); }
  };

  const handleDirectDownloadPdf = async (screeningId: string) => {
    setDownloadingPdf(true);
    try {
      const res = await api.get(`/reports/screening/${screeningId}/download`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `MedVisionAI_Report_${screeningId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      alert('Could not generate/download PDF report.');
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handlePreviewPdf = async (screeningId: string) => {
    setDownloadingPdf(true);
    try {
      const res = await api.get(`/reports/screening/${screeningId}/download`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      window.open(url, '_blank');
    } catch {
      alert('Could not preview PDF report.');
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handleGenerateAndPublish = async () => {
    if (!result) return;
    setReportStatus('generating');
    try {
      const genRes = await api.post(`/reports/${result.id}/generate`);
      await api.post(`/reports/${genRes.data.report_id}/publish`);
      setReportStatus('done');
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to generate or publish report.');
      setReportStatus('idle');
    }
  };

  const handleViewPatientHistory = async (patient: Patient, updateUrl = true) => {
    if (updateUrl) {
      navigate(`/worker/patients/${patient.id}`);
    }
    setSelectedPatientHistory({ patient, screenings: [] });
    setLoadingHistory(true);
    try {
      const res = await api.get(`/screen/patient/${patient.id}`);
      setSelectedPatientHistory({ patient, screenings: res.data });
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleClosePatientHistory = () => {
    setSelectedPatientHistory(null);
    navigate('/worker/patients');
  };

  const handleCreatePatient = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegisterError('');
    setSubmittingPatient(true);
    try {
      const payload: any = {
        first_name: newPatient.first_name.trim(),
        last_name: newPatient.last_name.trim(),
        email: newPatient.email.trim(),
        phone: newPatient.phone.trim() || undefined,
        date_of_birth: newPatient.date_of_birth.trim(),
        diabetes_type: newPatient.diabetes_type,
        year_of_diagnosis: newPatient.year_of_diagnosis ? parseInt(newPatient.year_of_diagnosis, 10) : undefined,
        existing_eye_conditions: newPatient.existing_eye_conditions.trim() || undefined,
      };

      const res = await api.post('/patients/', payload);
      setCreatedPatient(res.data);
      fetchPatients();
      fetchStats();
      setNewPatient({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        date_of_birth: '',
        diabetes_type: 'Type 2',
        year_of_diagnosis: '',
        existing_eye_conditions: ''
      });
    } catch (err: any) {
      setRegisterError(err.response?.data?.detail || 'Failed to register patient.');
    } finally {
      setSubmittingPatient(false);
    }
  };

  const handleCopyDetails = (patient: any) => {
    const text = `MedVisionAI Patient Portal Login Details:\nPatient ID: ${patient.patient_access_id}\nEmail: ${patient.email}\nPortal URL: ${window.location.origin}/login\n\nInstructions: Go to the Patient Portal, enter your email and click "Set your password". Verify your Date of Birth (${patient.date_of_birth || 'on record'}) to activate your account.`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDeletePatient = async (id: number, name: string) => {
    if (!window.confirm(`Are you sure you want to delete patient "${name}"? This will permanently remove their profile, portal account, and all screening reports.`)) {
      return;
    }
    try {
      await api.delete(`/patients/${id}`);
      fetchPatients();
      fetchStats();
      if (selectedPatientId === String(id)) {
        setSelectedPatientId('');
        setResult(null);
      }
      if (selectedPatientHistory?.patient.id === id) {
        handleClosePatientHistory();
      }
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to delete patient.');
    }
  };

  const handleExportExcel = async () => {
    try {
      const res = await api.get('/patients/export/excel', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'MedVisionAI_Clinical_Patients_Export.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      alert('Failed to export Excel data.');
    }
  };

  // Helper for confidence visual gauge styling
  const getConfidenceGaugeProps = (prediction: string, confidence: number) => {
    const isDr = prediction === 'DR PRESENT';
    const percent = Math.round(confidence * 100);

    if (!isDr) {
      return {
        color: 'text-emerald-700',
        barColor: 'bg-emerald-600',
        bgLight: 'bg-emerald-50',
        border: 'border-emerald-200',
        label: 'Low Risk',
        badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        percent
      };
    }
    if (percent >= 80) {
      return {
        color: 'text-red-700',
        barColor: 'bg-red-600',
        bgLight: 'bg-red-50',
        border: 'border-red-200',
        label: 'High Risk (Urgent)',
        badge: 'bg-red-50 text-red-700 border-red-200',
        percent
      };
    }
    return {
      color: 'text-amber-700',
      barColor: 'bg-amber-600',
      bgLight: 'bg-amber-50',
      border: 'border-amber-200',
      label: 'Moderate Risk',
      badge: 'bg-amber-50 text-amber-700 border-amber-200',
      percent
    };
  };

  // Indian Standard Time (IST, Asia/Kolkata) dynamic greeting helper
  const getISTGreeting = () => {
    try {
      const now = new Date();
      const hourStr = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Kolkata',
        hour: 'numeric',
        hour12: false
      }).format(now);
      const hour = parseInt(hourStr, 10);

      if (hour >= 4 && hour < 12) {
        return 'Good morning';
      } else if (hour >= 12 && hour < 17) {
        return 'Good afternoon';
      } else {
        return 'Good evening';
      }
    } catch {
      return 'Good day';
    }
  };

  // Doctor name helper for personalized greeting
  const doctorName = user?.username ? (user.username.includes('.') ? user.username.split('.')[1] : user.username) : 'Doctor';
  const formattedDoctorName = doctorName.charAt(0).toUpperCase() + doctorName.slice(1);
  const istGreeting = getISTGreeting();

  return (
    <div className="min-h-screen bg-[#F7F8FA] text-[#1E293B] font-sans antialiased">
      
      {/* ========================================================================= */}
      {/* TOP NAVIGATION BAR (Clinical Segmented Tabs) */}
      {/* ========================================================================= */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200/80 py-3">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
          
          {/* Brand Logo */}
          <Link to="/worker/dashboard" className="flex items-center gap-2.5 group">
            <img src="/logo.png" alt="MedVisionAI Logo" className="w-8 h-8 object-contain group-hover:scale-105 transition-transform" />
            <div className="hidden sm:block">
              <span className="font-semibold text-sm tracking-tight text-slate-900 font-mono">MedVision<span className="text-[#0F766E]">AI</span></span>
            </div>
          </Link>

          {/* Center Segmented Nav Bar (Smooth Transitions) */}
          <nav className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg border border-slate-200/70">
            {[
              { id: 'dashboard', label: 'Dashboard', path: '/worker/dashboard' },
              { id: 'screen', label: 'Screening', path: '/worker/screen' },
              { id: 'queue', label: 'Recent Queue', path: '/worker/queue' },
              { id: 'patients', label: 'Patients', path: '/worker/patients' },
              { id: 'new-patient', label: 'Register', path: '/worker/new-patient' },
            ].map(tab => {
              const isActive = currentTab === tab.id;
              return (
                <Link
                  key={tab.id}
                  to={tab.path}
                  className={`px-3.5 py-1.5 rounded-md text-xs font-medium transition-all duration-200 ease-out active:scale-[0.97] cursor-pointer ${
                    isActive
                      ? 'bg-white text-[#0F766E] shadow-xs border border-slate-200/80 font-semibold tab-highlight-active'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                  }`}
                >
                  {tab.label}
                </Link>
              );
            })}
          </nav>

          {/* Right Action Icons & Doctor Avatar */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => { fetchStats(); fetchDashboardData(); }}
              className="w-8 h-8 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 flex items-center justify-center transition shadow-2xs cursor-pointer"
              title="Refresh Data"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>

            <div className="w-8 h-8 rounded-full bg-[#0F766E]/10 border border-[#0F766E]/20 text-[#0F766E] font-semibold text-xs flex items-center justify-center cursor-default" title={`Signed in as Dr. ${formattedDoctorName}`}>
              Dr
            </div>

            <button
              onClick={logout}
              className="w-8 h-8 rounded-lg bg-white border border-slate-200 text-slate-500 hover:text-red-600 hover:bg-slate-50 flex items-center justify-center transition shadow-2xs cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">

        {/* ========================================================================= */}
        {/* TAB 0: DASHBOARD OVERVIEW (/worker/dashboard) */}
        {/* ========================================================================= */}
        {currentTab === 'dashboard' && (
          <div key="dashboard" className="page-transition-enter space-y-6">
            
            {/* Greeting Header & Quick Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
              <div>
                <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900 tracking-tight">
                  {istGreeting}, Dr. {formattedDoctorName}!
                </h1>
                <p className="text-xs text-slate-500 font-normal mt-0.5">
                  Clinical screening overview and retinal diagnostics telemetry.
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <Link
                  to="/worker/screen"
                  className="px-4 py-2 rounded-lg bg-[#0F766E] hover:bg-[#0D9488] text-white text-xs font-medium shadow-xs transition flex items-center gap-1.5"
                >
                  <span>+ New screening</span>
                </Link>
                <Link
                  to="/worker/new-patient"
                  className="px-3.5 py-2 rounded-lg bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium shadow-2xs border border-slate-200 transition flex items-center gap-1.5"
                >
                  <UserPlus className="w-3.5 h-3.5 text-[#0F766E]" />
                  <span>Register patient</span>
                </Link>
              </div>
            </div>

            {/* Filter / Sub-Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
              <div className="flex items-center gap-2 flex-wrap">
                <div className="bg-white shadow-2xs border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-700 flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-slate-400" />
                  <span>Filter</span>
                </div>
                <div className="bg-white shadow-2xs border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-700 flex items-center gap-1.5">
                  <span>Last 14 days</span>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400 rotate-90" />
                </div>
                <button
                  onClick={handleExportExcel}
                  className="bg-white hover:bg-slate-50 shadow-2xs border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-700 flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-[#0F766E]" />
                  <span>Export</span>
                </button>
              </div>

              <div className="bg-white shadow-2xs border border-slate-200 rounded-lg px-3 py-1.5 flex items-center gap-2 text-xs text-slate-400 w-full sm:w-64">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-slate-500 font-normal">Search patient or scan ID…</span>
              </div>
            </div>

            {/* Loading State Skeleton */}
            {loadingDashboard && !dashboardData ? (
              <div className="py-20 text-center bg-white rounded-xl border border-slate-200/80 shadow-xs">
                <div className="w-8 h-8 border-2 border-[#0F766E] border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Syncing clinical records…</p>
              </div>
            ) : (
              <>
                {/* ========================================================================= */}
                {/* 3-COLUMN BENTO GRID */}
                {/* ========================================================================= */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                  
                  {/* ------------------------------------------------------------- */}
                  {/* COLUMN 1: Clinician Info Card & Stat Rows */}
                  {/* ------------------------------------------------------------- */}
                  <div className="lg:col-span-4 bg-white rounded-xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-xs font-medium uppercase tracking-wider text-slate-500">Attending Station</h3>
                        <Link to="/worker/screen" className="text-xs font-medium text-[#0F766E] hover:underline flex items-center gap-1">
                          + Add scan
                        </Link>
                      </div>

                      {/* Clinician Info Card (Professional Grotesque, No Credit Card) */}
                      <div className="rounded-lg p-4 bg-[#F8F9FA] border border-slate-200/80 mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-[#0F766E]/10 border border-[#0F766E]/20 text-[#0F766E] font-semibold text-sm flex items-center justify-center shrink-0">
                            Dr
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-slate-900 truncate">Dr. {formattedDoctorName}</p>
                            <p className="text-xs text-slate-500 font-normal">Attending Clinician • Retinal Care</p>
                          </div>
                        </div>
                      </div>

                      {/* Metric Breakdown Rows */}
                      <div className="space-y-3 pt-1">
                        <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-100">
                          <span className="font-normal text-slate-600 flex items-center gap-1.5">
                            <Activity className="w-3.5 h-3.5 text-[#0F766E]" /> Today's throughput
                          </span>
                          <span className="font-semibold text-slate-900">
                            {dashboardData?.stats.screenings_today ?? stats?.screenings_today ?? 0} scans
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-100">
                          <span className="font-normal text-slate-600 flex items-center gap-1.5">
                            <Users className="w-3.5 h-3.5 text-slate-500" /> Registered patients
                          </span>
                          <span className="font-semibold text-slate-900">
                            {dashboardData?.stats.total_patients ?? patients.length}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-100">
                          <span className="font-normal text-slate-600 flex items-center gap-1.5">
                            <AlertTriangle className="w-3.5 h-3.5 text-red-600" /> High-risk alerts
                          </span>
                          <span className={`font-semibold ${((dashboardData?.high_risk_alerts.length ?? 0) > 0) ? 'text-red-700' : 'text-slate-900'}`}>
                            {dashboardData?.high_risk_alerts.length ?? 0} pending
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-xs">
                          <span className="font-normal text-slate-600 flex items-center gap-1.5">
                            <Eye className="w-3.5 h-3.5 text-slate-400" /> Total evaluations
                          </span>
                          <span className="font-semibold text-slate-900">
                            {dashboardData?.stats.total_screenings ?? stats?.total_screenings ?? 0}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* ------------------------------------------------------------- */}
                  {/* COLUMN 2: Screening Plan & Daily Volume Telemetry */}
                  {/* ------------------------------------------------------------- */}
                  <div className="lg:col-span-4 flex flex-col gap-5">
                    
                    {/* Top: Screening Plan */}
                    <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-xs font-medium uppercase tracking-wider text-slate-500">Screening Plan</h3>
                        <Link to="/worker/queue" className="text-xs font-medium text-slate-500 hover:text-slate-800 flex items-center gap-1">
                          View details <ChevronRight className="w-3 h-3" />
                        </Link>
                      </div>

                      <div className="my-1.5">
                        <div className="flex items-baseline gap-2">
                          <span className="text-2xl font-semibold text-slate-900">
                            {dashboardData?.stats.total_screenings ?? stats?.total_screenings ?? 0}
                          </span>
                          <span className="text-xs font-normal text-slate-500">Screenings conducted</span>
                        </div>
                      </div>

                      {/* 3-bar comparative throughput */}
                      <div className="grid grid-cols-3 gap-3 items-end pt-2 h-24">
                        {/* Bar 1: Today */}
                        <div className="flex flex-col items-center gap-1.5 h-full justify-end">
                          <span className="text-[10px] font-medium text-slate-500">
                            {dashboardData?.stats.screenings_today ?? 0}
                          </span>
                          <div className="w-full bg-slate-800 rounded-md h-12 transition hover:opacity-90"></div>
                          <span className="text-[10px] font-normal text-slate-500">Today</span>
                        </div>

                        {/* Bar 2: This Week */}
                        <div className="flex flex-col items-center gap-1.5 h-full justify-end">
                          <div className="bg-[#0F766E] text-white text-[9px] font-medium px-1.5 py-0.5 rounded-md mb-0.5">
                            {dashboardData?.stats.screenings_trend ?? '+7'}
                          </div>
                          <div className="w-full bg-[#0F766E] rounded-md h-16 transition hover:opacity-90"></div>
                          <span className="text-[10px] font-normal text-slate-500">7 Days</span>
                        </div>

                        {/* Bar 3: 14 Days */}
                        <div className="flex flex-col items-center gap-1.5 h-full justify-end">
                          <span className="text-[10px] font-medium text-slate-500">
                            {dashboardData?.stats.total_screenings ?? 0}
                          </span>
                          <div className="w-full bg-slate-100 border border-dashed border-slate-300 rounded-md h-14 transition"></div>
                          <span className="text-[10px] font-normal text-slate-500">14 Days</span>
                        </div>
                      </div>
                    </div>

                    {/* Bottom: Daily Volume Telemetry (Technical High-Precision Series) */}
                    <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between">
                      <div className="flex items-center justify-between mb-1.5">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-medium uppercase tracking-wider text-slate-500">Volume Telemetry</span>
                            <span className="text-[9px] font-mono font-medium bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200">14-Day Series</span>
                          </div>
                          <p className="text-[11px] text-slate-500 font-normal">Daily examination throughput & DR positivity</p>
                        </div>
                        <div className="text-right">
                          <span className="text-2xl font-semibold text-slate-900 font-mono">
                            {dashboardData?.stats.screenings_today ?? stats?.screenings_today ?? 0}
                          </span>
                          <span className="text-[10px] text-emerald-700 font-medium block">
                            {dashboardData?.stats.screenings_today_trend ?? '+0 today'}
                          </span>
                        </div>
                      </div>

                      {/* Technical High-Precision Chart */}
                      <div className="w-full h-28 pt-1">
                        {dashboardData?.volume_chart && dashboardData.volume_chart.length > 0 ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={dashboardData.volume_chart} margin={{ top: 6, right: 2, left: -28, bottom: 0 }}>
                              <defs>
                                <linearGradient id="techVolumeGradient" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#0F766E" stopOpacity={0.25}/>
                                  <stop offset="95%" stopColor="#0F766E" stopOpacity={0.0}/>
                                </linearGradient>
                                <linearGradient id="techDrGradient" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#DC2626" stopOpacity={0.25}/>
                                  <stop offset="95%" stopColor="#DC2626" stopOpacity={0.0}/>
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                              <XAxis 
                                dataKey="date" 
                                tick={{ fontSize: 9, fill: '#64748B', fontFamily: 'monospace' }} 
                                axisLine={{ stroke: '#E2E8F0' }}
                                tickLine={false}
                              />
                              <YAxis 
                                allowDecimals={false} 
                                tick={{ fontSize: 9, fill: '#64748B', fontFamily: 'monospace' }} 
                                axisLine={false}
                                tickLine={false}
                              />
                              <Tooltip
                                content={({ active, payload, label }) => {
                                  if (active && payload && payload.length) {
                                    const total = payload[0]?.value ?? 0;
                                    const dr = payload[1]?.value ?? 0;
                                    return (
                                      <div className="bg-slate-900 text-white p-2.5 rounded-lg shadow-xl border border-slate-700 text-xs space-y-1 font-sans">
                                        <p className="font-mono text-[10px] text-slate-400 font-medium">{label}</p>
                                        <div className="flex items-center justify-between gap-3 text-teal-300 font-medium">
                                          <span>Total Scans:</span>
                                          <span className="font-mono">{total}</span>
                                        </div>
                                        <div className="flex items-center justify-between gap-3 text-red-300 font-medium">
                                          <span>DR Detected:</span>
                                          <span className="font-mono">{dr}</span>
                                        </div>
                                      </div>
                                    );
                                  }
                                  return null;
                                }}
                              />
                              <Area 
                                type="monotone" 
                                dataKey="screenings" 
                                stroke="#0F766E" 
                                strokeWidth={1.5} 
                                fillOpacity={1} 
                                fill="url(#techVolumeGradient)" 
                              />
                              <Area 
                                type="monotone" 
                                dataKey="dr_cases" 
                                stroke="#DC2626" 
                                strokeWidth={1.5} 
                                fillOpacity={1} 
                                fill="url(#techDrGradient)" 
                              />
                            </AreaChart>
                          </ResponsiveContainer>
                        ) : null}
                      </div>

                      {/* Technical Legend */}
                      <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[10px] font-medium text-slate-500">
                        <span className="flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-[#0F766E]"></span> Total Scans
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-[#DC2626]"></span> DR Detected
                        </span>
                        <span className="text-slate-400 font-normal">
                          Peak: {Math.max(...(dashboardData?.volume_chart.map(v => v.screenings) || [0]))}/day
                        </span>
                      </div>
                    </div>

                  </div>

                  {/* ------------------------------------------------------------- */}
                  {/* COLUMN 3: Unified Risk Stratification & Clinical Triage Matrix */}
                  {/* ------------------------------------------------------------- */}
                  <div className="lg:col-span-4 bg-white rounded-xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="text-xs font-medium uppercase tracking-wider text-slate-500">Risk Stratification & Triage</h3>
                        <span className="text-[10px] font-mono font-medium bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200">
                          {dashboardData?.stats.total_screenings ?? 0} Total Scans
                        </span>
                      </div>

                      {/* Semi-Circle / Gauge Chart */}
                      <div className="relative flex items-center justify-center my-3">
                        <div className="w-full h-36">
                          {dashboardData?.risk_distribution && dashboardData.risk_distribution.some(d => d.value > 0) ? (
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie
                                  data={dashboardData.risk_distribution}
                                  cx="50%"
                                  cy="75%"
                                  startAngle={180}
                                  endAngle={0}
                                  innerRadius={60}
                                  outerRadius={72}
                                  paddingAngle={2}
                                  cornerRadius={0}
                                  dataKey="value"
                                >
                                  {dashboardData.risk_distribution.map((entry, index) => {
                                    const fillClr = entry.name.toLowerCase().includes('high') 
                                      ? '#DC2626' 
                                      : entry.name.toLowerCase().includes('med') 
                                      ? '#D97706' 
                                      : '#16A34A';
                                    return <Cell key={`cell-${index}`} fill={fillClr} stroke="#FFFFFF" strokeWidth={1.5} />;
                                  })}
                                </Pie>
                              </PieChart>
                            </ResponsiveContainer>
                          ) : null}
                        </div>

                        {/* Center Value */}
                        <div className="absolute top-14 text-center">
                          <p className="text-2xl font-semibold text-slate-900">
                            {dashboardData?.stats.dr_cases_count ?? 0}
                          </p>
                          <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">DR Cases</p>
                        </div>
                      </div>

                      {/* Detailed Risk Breakdown Matrix */}
                      <div className="space-y-2.5 pt-1">
                        {(() => {
                          const total = dashboardData?.stats.total_screenings || 1;
                          const high = dashboardData?.risk_distribution.find(d => d.name.toLowerCase().includes('high'))?.value || 0;
                          const med = dashboardData?.risk_distribution.find(d => d.name.toLowerCase().includes('med'))?.value || 0;
                          const low = dashboardData?.risk_distribution.find(d => d.name.toLowerCase().includes('low'))?.value || 0;
                          const highPct = Math.round((high / total) * 100);
                          const medPct = Math.round((med / total) * 100);
                          const lowPct = Math.round((low / total) * 100);

                          return (
                            <>
                              {/* High Risk Tier */}
                              <div className="p-2.5 rounded-lg bg-red-50/50 border border-red-100 flex items-center justify-between text-xs">
                                <div className="space-y-1">
                                  <div className="flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full bg-[#DC2626]"></span>
                                    <span className="font-medium text-slate-900">High Risk (Urgent Referral)</span>
                                  </div>
                                  <div className="w-32 sm:w-36 h-1.5 bg-red-100 rounded-full overflow-hidden">
                                    <div className="h-full bg-[#DC2626] rounded-full" style={{ width: `${highPct}%` }}></div>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <span className="font-semibold text-red-700">{high}</span>
                                  <span className="text-[10px] text-slate-500 block font-normal">{highPct}% of total</span>
                                </div>
                              </div>

                              {/* Moderate Risk Tier */}
                              <div className="p-2.5 rounded-lg bg-amber-50/50 border border-amber-100 flex items-center justify-between text-xs">
                                <div className="space-y-1">
                                  <div className="flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full bg-[#D97706]"></span>
                                    <span className="font-medium text-slate-900">Moderate Risk (6-Mo Review)</span>
                                  </div>
                                  <div className="w-32 sm:w-36 h-1.5 bg-amber-100 rounded-full overflow-hidden">
                                    <div className="h-full bg-[#D97706] rounded-full" style={{ width: `${medPct}%` }}></div>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <span className="font-semibold text-amber-700">{med}</span>
                                  <span className="text-[10px] text-slate-500 block font-normal">{medPct}% of total</span>
                                </div>
                              </div>

                              {/* Low Risk Tier */}
                              <div className="p-2.5 rounded-lg bg-emerald-50/50 border border-emerald-100 flex items-center justify-between text-xs">
                                <div className="space-y-1">
                                  <div className="flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full bg-[#16A34A]"></span>
                                    <span className="font-medium text-slate-900">Low Risk (Routine Annual)</span>
                                  </div>
                                  <div className="w-32 sm:w-36 h-1.5 bg-emerald-100 rounded-full overflow-hidden">
                                    <div className="h-full bg-[#16A34A] rounded-full" style={{ width: `${lowPct}%` }}></div>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <span className="font-semibold text-emerald-700">{low}</span>
                                  <span className="text-[10px] text-slate-500 block font-normal">{lowPct}% of total</span>
                                </div>
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    </div>

                    {/* Bottom Clinical Triage Protocol Link */}
                    <div className="pt-3 border-t border-slate-100 mt-3">
                      <Link
                        to="/worker/queue"
                        className="flex items-center justify-between text-xs font-medium text-[#0F766E] hover:text-[#0D9488] transition"
                      >
                        <span className="flex items-center gap-1.5">
                          <Activity className="w-3.5 h-3.5" />
                          <span>Review Full Screening Triage Queue</span>
                        </span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>

                </div>

                {/* ========================================================================= */}
                {/* BOTTOM ROW: HIGH-RISK ALERT PANEL & RECENT ACTIVITY */}
                {/* ========================================================================= */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 pt-2">
                  
                  {/* High-Risk Action Panel (7 Columns) */}
                  <div className="lg:col-span-7 bg-white rounded-xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between overflow-hidden">
                    <div className="w-full">
                      <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-slate-100">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-semibold text-slate-900">High-Risk Action Queue</h3>
                            <span className="text-[10px] font-medium uppercase px-2 py-0.5 bg-red-50 text-red-700 rounded-md border border-red-200">
                              {dashboardData?.high_risk_alerts.length ?? 0} Pending Review
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 font-normal mt-0.5">
                            Urgent specialist referral queue (DR Present ≥80% confidence)
                          </p>
                        </div>
                      </div>

                      {dashboardData?.high_risk_alerts && dashboardData.high_risk_alerts.length > 0 ? (
                        <div className="space-y-2.5 w-full">
                          {dashboardData.high_risk_alerts.map((alertItem) => (
                            <div 
                              key={alertItem.id} 
                              className="bg-[#F8F9FA] hover:bg-slate-100/70 border border-slate-200/70 transition rounded-lg p-3 flex flex-col md:flex-row md:items-center justify-between gap-3 w-full"
                            >
                              <div className="flex items-center gap-3 min-w-0 flex-1 overflow-hidden">
                                <div className="w-7 h-7 rounded-md bg-slate-100 text-slate-700 border border-slate-200 flex items-center justify-center font-medium text-xs shrink-0">
                                  {alertItem.patient_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'PT'}
                                </div>
                                <div className="min-w-0 flex-1 overflow-hidden">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <p className="text-xs font-semibold text-slate-900 truncate">{alertItem.patient_name}</p>
                                    <span className="text-[10px] font-mono text-slate-500 bg-white px-1.5 py-0.5 rounded border border-slate-200 shrink-0">
                                      {alertItem.patient_access_id}
                                    </span>
                                    <span className="text-[10px] text-slate-400 font-normal shrink-0">
                                      {formatRelativeTime(alertItem.created_at)}
                                    </span>
                                  </div>
                                  <p className="text-xs text-red-700 font-normal mt-0.5 truncate block" title={alertItem.recommendation}>
                                    {alertItem.recommendation || 'Refer to ophthalmologist within 2 weeks'}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 shrink-0 self-end md:self-auto">
                                <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-red-50 text-red-700 border border-red-200 whitespace-nowrap">
                                  {Math.round(alertItem.confidence * 100)}%
                                </span>
                                <button
                                  onClick={() => handleDirectDownloadPdf(alertItem.screening_id)}
                                  disabled={downloadingPdf}
                                  className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-medium transition flex items-center gap-1 shadow-2xs cursor-pointer whitespace-nowrap shrink-0"
                                  title="Download PDF Diagnostic Report"
                                >
                                  <Download className="w-3.5 h-3.5 text-[#0F766E]" />
                                  <span>Report</span>
                                </button>
                                <button
                                  onClick={() => handleMarkReviewed(alertItem.screening_id)}
                                  disabled={reviewingId === alertItem.screening_id}
                                  className="px-2.5 py-1.5 rounded-lg bg-[#0F766E] hover:bg-[#0D9488] text-white text-xs font-medium transition flex items-center gap-1 shadow-xs cursor-pointer whitespace-nowrap shrink-0"
                                  title="Mark as reviewed by clinician"
                                >
                                  <Check className="w-3.5 h-3.5 text-white" />
                                  <span>{reviewingId === alertItem.screening_id ? '…' : 'Mark Reviewed'}</span>
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="py-8 text-center bg-slate-50 rounded-lg flex flex-col items-center justify-center">
                          <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center mb-1.5">
                            <ShieldCheck className="w-4 h-4" />
                          </div>
                          <p className="text-xs font-medium text-slate-800">All high-risk cases reviewed</p>
                          <p className="text-xs text-slate-500">No urgent unreviewed screenings pending action.</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Recent Activity Strip (5 Columns) */}
                  <div className="lg:col-span-5 bg-white rounded-xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-slate-100">
                        <h3 className="text-sm font-semibold text-slate-900">Recent Activity</h3>
                        <Link
                          to="/worker/queue"
                          className="text-xs font-medium text-slate-500 hover:text-[#0F766E] flex items-center gap-1 transition"
                        >
                          View queue <ChevronRight className="w-3 h-3" />
                        </Link>
                      </div>

                      {dashboardData?.recent_activity && dashboardData.recent_activity.length > 0 ? (
                        <div className="divide-y divide-slate-100">
                          {dashboardData.recent_activity.map((item) => {
                            const isDr = item.prediction === 'DR PRESENT';
                            const pct = Math.round(item.confidence * 100);
                            return (
                              <div key={item.id} className="py-2.5 flex items-center justify-between gap-3 first:pt-0 last:pb-0">
                                <div className="flex items-center gap-2.5">
                                  <div className="w-6 h-6 rounded-md bg-slate-100 text-slate-700 border border-slate-200 flex items-center justify-center font-medium text-[10px] shrink-0">
                                    {item.patient_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'PT'}
                                  </div>
                                  <div>
                                    <p className="text-xs font-medium text-slate-900">{item.patient_name}</p>
                                    <p className="text-[10px] text-slate-400 font-normal">
                                      {formatRelativeTime(item.created_at)}
                                    </p>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2">
                                  <span className={`text-xs font-medium px-1.5 py-0.5 rounded border ${
                                    isDr 
                                      ? 'bg-red-50 text-red-700 border-red-200' 
                                      : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  }`}>
                                    {pct}%
                                  </span>
                                  <button
                                    onClick={() => handleDirectDownloadPdf(item.screening_id)}
                                    disabled={downloadingPdf}
                                    className="p-1 rounded-md text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition cursor-pointer"
                                    title="Download PDF"
                                  >
                                    <Download className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="py-6 text-center text-xs text-slate-400">
                          No recent evaluations recorded.
                        </div>
                      )}
                    </div>
                  </div>

                </div>
              </>
            )}

          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 1: RUN SCREENING (/worker/screen) */}
        {/* ========================================================================= */}
        {currentTab === 'screen' && (
          <div key="screen" className="page-transition-enter space-y-6">
            
            {/* Upload & Form Container */}
            <div className="p-5 rounded-xl border border-slate-200/80 bg-white shadow-xs">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
                <h2 className="text-sm font-semibold flex items-center gap-2 text-slate-900">
                  <Upload className="w-4 h-4 text-[#0F766E]" /> Initiate Retinal Screening
                </h2>
                <span className="text-xs text-slate-500 font-normal">Supports JPEG, PNG fundus photographs</span>
              </div>
              
              <form onSubmit={handleUpload} className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium mb-1.5 text-slate-700">Select Patient Profile</label>
                    <select 
                      value={selectedPatientId} 
                      onChange={e => setSelectedPatientId(e.target.value)}
                      className="w-full border border-slate-300 bg-[#F8F9FA] text-slate-900 rounded-lg p-2.5 text-xs outline-none focus:border-[#0F766E] focus:bg-white transition font-normal" 
                      required
                    >
                      <option value="">— Choose registered patient —</option>
                      {patients.map(p => (
                        <option key={p.id} value={p.id}>{p.name} ({p.patient_access_id})</option>
                      ))}
                    </select>
                    {patients.length === 0 && (
                      <p className="text-xs text-amber-700 mt-1">
                        No patient profiles found.{' '}
                        <Link to="/worker/new-patient" className="underline font-medium">
                          Register a patient first →
                        </Link>
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-medium mb-1.5 text-slate-700">Fundus Retinal Scan File</label>
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleFileChange}
                      className="w-full border border-slate-300 bg-[#F8F9FA] text-slate-900 rounded-lg p-2 text-xs outline-none focus:border-[#0F766E] focus:bg-white transition file:mr-3 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-xs file:font-medium file:bg-[#0F766E]/10 file:text-[#0F766E] hover:file:bg-[#0F766E]/20 cursor-pointer" 
                      required 
                    />
                  </div>
                </div>

                <button 
                  type="submit" 
                  disabled={loading || !selectedPatientId || !file}
                  className="w-full bg-[#0F766E] hover:bg-[#0D9488] active:bg-[#115E59] disabled:bg-slate-100 disabled:text-slate-400 disabled:border disabled:border-slate-200 disabled:cursor-not-allowed disabled:shadow-none text-white px-5 py-2.5 rounded-lg font-medium transition shadow-xs text-xs flex items-center justify-center gap-2 cursor-pointer"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Computing EfficientNet-B0 Inference & Captum Grad-CAM Gradients…</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-teal-200" />
                      <span>Run AI Diagnostic Inference & Generate Heatmap</span>
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* OVERHAULED RESULTS SCREEN */}
            {result && (
              <div className="p-5 rounded-xl border border-slate-200/80 bg-white shadow-xs space-y-5">
                
                {/* Result Top Banner */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-semibold text-slate-900">Screening Diagnostic Assessment</h2>
                      <span className="font-mono text-xs text-slate-600 px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200">
                        {result.screening_id}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 font-normal mt-0.5">
                      Patient: <span className="font-medium text-slate-900">{result.patient_name || patients.find(p => p.id === Number(selectedPatientId))?.name || 'Registered Patient'}</span>
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleDirectDownloadPdf(result.screening_id)}
                      disabled={downloadingPdf}
                      className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white px-3.5 py-1.5 rounded-lg text-xs font-medium shadow-xs transition cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5 text-teal-300" />
                      <span>{downloadingPdf ? 'Generating PDF…' : 'Download Report'}</span>
                    </button>

                    <span className={`px-2.5 py-0.5 rounded-md text-xs font-medium border uppercase tracking-wider ${
                      result.prediction === 'DR PRESENT' 
                        ? 'bg-red-50 border-red-200 text-red-700' 
                        : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                    }`}>
                      {result.prediction}
                    </span>
                  </div>
                </div>

                {/* Visual Confidence Gauge & Risk Metrics Grid */}
                {(() => {
                  const gauge = getConfidenceGaugeProps(result.prediction, result.confidence);
                  return (
                    <div className="grid md:grid-cols-3 gap-4">
                      
                      {/* Metric 1: Finding & Status */}
                      <div className="p-4 rounded-lg border border-slate-200 bg-[#F8F9FA] flex flex-col justify-between">
                        <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider mb-1">Diagnostic Finding</p>
                        <div>
                          <p className={`text-xl font-semibold ${result.prediction === 'DR PRESENT' ? 'text-red-700' : 'text-emerald-700'}`}>
                            {result.prediction}
                          </p>
                          <span className={`inline-block mt-2 px-2 py-0.5 rounded-md text-[11px] font-medium border ${gauge.badge}`}>
                            {gauge.label}
                          </span>
                        </div>
                      </div>

                      {/* Metric 2: Visual Gauge Progress Bar */}
                      <div className="p-4 rounded-lg border border-slate-200 bg-[#F8F9FA] flex flex-col justify-between">
                        <div className="flex justify-between items-center mb-1">
                          <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Model Confidence</p>
                          <span className={`text-sm font-semibold ${gauge.color}`}>{gauge.percent}%</span>
                        </div>
                        
                        <div className="space-y-1.5 my-auto py-1">
                          <div className="h-2.5 w-full bg-slate-200 rounded-full overflow-hidden p-0.5 border border-slate-300/50">
                            <div 
                              className={`h-full rounded-full transition-all duration-700 ${gauge.barColor}`}
                              style={{ width: `${gauge.percent}%` }}
                            />
                          </div>
                          <div className="flex justify-between text-[10px] text-slate-500 font-normal">
                            <span>0% Baseline</span>
                            <span>50% Threshold</span>
                            <span>100% Certainty</span>
                          </div>
                        </div>

                        <p className="text-[10px] text-slate-500">
                          {result.prediction === 'DR PRESENT' 
                            ? `DR Probability: ${( (result.probability_dr ?? result.confidence) * 100 ).toFixed(1)}%` 
                            : `Normal Retina Score: ${( (result.probability_no_dr ?? (1 - result.confidence)) * 100 ).toFixed(1)}%`}
                        </p>
                      </div>

                      {/* Metric 3: Assessed Clinical Risk Level */}
                      <div className="p-4 rounded-lg border border-slate-200 bg-[#F8F9FA] flex flex-col justify-between">
                        <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider mb-1">Assessed Clinical Risk</p>
                        <div>
                          <p className="text-xl font-semibold text-slate-900">{result.risk_level}</p>
                          <p className="text-xs text-slate-500 mt-1 font-normal">
                            {result.risk_level === 'HIGH' ? 'Immediate ophthalmic referral indicated' : 'Standard preventative observation'}
                          </p>
                        </div>
                      </div>

                    </div>
                  );
                })()}

                {/* Interactive Retinal Scan & Grad-CAM Heatmap Viewer */}
                <div className="border border-slate-200 rounded-lg p-4 bg-[#F8F9FA] space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-[#0F766E]" /> Retinal Imaging & Grad-CAM Heatmap
                      </h3>
                      <p className="text-xs text-slate-500 font-normal">Side-by-side comparative inspection with neural attention localization</p>
                    </div>

                    <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-200 text-xs font-medium self-start sm:self-auto">
                      <button
                        type="button"
                        onClick={() => setImageViewMode('side-by-side')}
                        className={`px-2.5 py-1 rounded-md transition cursor-pointer ${imageViewMode === 'side-by-side' ? 'bg-[#0F766E] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
                      >
                        Side-by-Side
                      </button>
                      <button
                        type="button"
                        onClick={() => setImageViewMode('original')}
                        className={`px-2.5 py-1 rounded-md transition cursor-pointer ${imageViewMode === 'original' ? 'bg-[#0F766E] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
                      >
                        Scan Only
                      </button>
                      <button
                        type="button"
                        onClick={() => setImageViewMode('heatmap')}
                        className={`px-2.5 py-1 rounded-md transition cursor-pointer ${imageViewMode === 'heatmap' ? 'bg-[#0F766E] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
                      >
                        Grad-CAM Only
                      </button>
                    </div>
                  </div>

                  <div className={`grid gap-4 items-center ${
                    imageViewMode === 'side-by-side' ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1 max-w-md mx-auto'
                  }`}>
                    {(imageViewMode === 'side-by-side' || imageViewMode === 'original') && (
                      <div className="space-y-2 text-center bg-white p-3 rounded-lg border border-slate-200">
                        <div className="flex justify-between items-center px-1">
                          <span className="text-xs font-medium text-slate-600">Original Retinal Scan</span>
                          <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono">224x224 RGB</span>
                        </div>
                        <div className="overflow-hidden rounded-md bg-black aspect-square max-w-[280px] mx-auto shadow-xs border border-slate-300">
                          {result.image_url ? (
                            <img 
                              src={getValidImageUrl(result.image_url)} 
                              alt="Original Retinal Scan" 
                              className="w-full h-full object-cover" 
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = 'http://localhost:8000/uploads/sample_seed.jpg';
                              }}
                            />
                          ) : (
                            <div className="flex items-center justify-center h-full text-xs text-slate-400">Scan loading…</div>
                          )}
                        </div>
                      </div>
                    )}

                    {(imageViewMode === 'side-by-side' || imageViewMode === 'heatmap') && (
                      <div className="space-y-2 text-center bg-white p-3 rounded-lg border border-teal-200">
                        <div className="flex justify-between items-center px-1">
                          <span className="text-xs font-medium text-[#0F766E]">Grad-CAM Neural Attention</span>
                          <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                            <span className="w-2 h-2 rounded-full bg-blue-500"></span> Normal
                            <span className="w-2 h-2 rounded-full bg-red-600"></span> Focus
                          </div>
                        </div>
                        <div className="overflow-hidden rounded-md bg-black aspect-square max-w-[280px] mx-auto shadow-xs border border-[#0F766E]">
                          {result.heatmap_url ? (
                            <img 
                              src={getValidImageUrl(result.heatmap_url)} 
                              alt="Grad-CAM Heatmap" 
                              className="w-full h-full object-cover" 
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = 'http://localhost:8000/uploads/sample_seed_cam.jpg';
                              }}
                            />
                          ) : (
                            <div className="flex items-center justify-center h-full text-xs text-slate-400">Heatmap loading…</div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Natural-Language Quadrant Activation Explanation */}
                <div className="border border-teal-200 rounded-lg p-3.5 bg-teal-50/50 space-y-1.5">
                  <div className="flex items-center gap-2 text-[#0F766E]">
                    <Sparkles className="w-4 h-4 shrink-0" />
                    <h3 className="text-xs font-semibold uppercase tracking-wider">Heatmap Quadrant Activation Analysis</h3>
                  </div>
                  <p className="text-xs text-slate-800 leading-relaxed font-normal">
                    {result.heatmap_explanation || result.ai_context || "Neural activation patterns localized across retinal quadrants."}
                  </p>
                </div>

                {/* Confidence-Band Driven Clinical Recommendation */}
                <div className={`border rounded-lg p-3.5 flex items-start gap-3 text-xs ${
                  result.prediction === 'DR PRESENT'
                    ? 'bg-red-50 border-red-200 text-red-900'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-900'
                }`}>
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
                  <div className="space-y-0.5">
                    <p className="font-semibold text-xs">{result.recommendation}</p>
                    <p className="text-[11px] opacity-80 font-normal">
                      Follow standard clinical protocol for diagnostic confirmation.
                    </p>
                  </div>
                </div>

                {/* Medical Disclaimer */}
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 flex items-start gap-2.5 text-[11px] text-slate-500 leading-relaxed">
                  <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <p>
                    <strong className="text-slate-700 font-medium">Medical Disclaimer:</strong> MedVisionAI is an assistive diagnostic screening tool. This output is generated by deep learning model inference (EfficientNet-B0) and does not constitute a final clinical diagnosis. All results must be reviewed and verified by an authorized eye care specialist.
                  </p>
                </div>

                {/* Bottom Action Bar */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <div className="flex items-center gap-2.5">
                    <button
                      onClick={() => handleDirectDownloadPdf(result.screening_id)}
                      disabled={downloadingPdf}
                      className="flex items-center gap-2 bg-[#0F766E] hover:bg-[#0D9488] disabled:opacity-50 text-white px-4 py-2 rounded-lg text-xs font-medium shadow-xs transition cursor-pointer"
                    >
                      <Download className="w-4 h-4" />
                      <span>{downloadingPdf ? 'Preparing PDF Report…' : 'Download Clinical PDF Report'}</span>
                    </button>

                    {reportStatus !== 'done' ? (
                      <button 
                        onClick={handleGenerateAndPublish} 
                        disabled={reportStatus === 'generating'}
                        className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white px-4 py-2 rounded-lg text-xs font-medium shadow-xs transition cursor-pointer"
                      >
                        <FileText className="w-4 h-4" />
                        <span>{reportStatus === 'generating' ? 'Publishing…' : 'Publish to Patient Portal & Email'}</span>
                      </button>
                    ) : (
                      <div className="flex items-center gap-1.5 text-emerald-800 font-medium text-xs bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
                        <CheckCircle className="w-4 h-4 text-emerald-600" /> 
                        <span>Report published and delivered to patient portal & email.</span>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => { setResult(null); setFile(null); }}
                    className="text-xs text-slate-500 hover:text-slate-900 font-medium underline transition cursor-pointer"
                  >
                    Start New Scan
                  </button>
                </div>

              </div>
            )}

          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: DOCTOR DASHBOARD / RECENT QUEUE VIEW (/worker/queue) */}
        {/* ========================================================================= */}
        {currentTab === 'queue' && (
          <div key="queue" className="page-transition-enter rounded-xl border border-slate-200/80 bg-white shadow-xs overflow-hidden space-y-0">
            <div className="p-4 border-b border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold flex items-center gap-2 text-slate-900">
                  <Clock className="w-4 h-4 text-[#0F766E]" /> Recent Clinical Screenings & Queue
                </h2>
                <p className="text-xs text-slate-500 font-normal">Real-time history of all retinal evaluations performed across patients</p>
              </div>

              <button 
                onClick={fetchRecentQueue}
                disabled={loadingQueue}
                className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-medium transition self-start sm:self-auto cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingQueue ? 'animate-spin' : ''}`} />
                <span>Refresh Queue</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-[#F8F9FA]">
                  <tr>
                    {['Ref ID', 'Patient', 'Access Code', 'Date & Time', 'Finding', 'Confidence', 'Risk', 'Actions'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-slate-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-xs">
                  {recentScreenings.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-6 py-12 text-center text-slate-500 font-normal">
                        <Eye className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                        <p className="font-medium text-slate-700">No screening records logged yet.</p>
                        <Link to="/worker/screen" className="mt-2 inline-block text-xs text-[#0F766E] font-medium underline">
                          Run your first retinal screening →
                        </Link>
                      </td>
                    </tr>
                  )}
                  {recentScreenings.map(s => {
                    const isDr = s.prediction === 'DR PRESENT';
                    const dateStr = s.created_at ? new Date(s.created_at).toLocaleString() : 'Recent';
                    return (
                      <tr 
                        key={s.id} 
                        className="hover:bg-[#F8F9FA] transition cursor-pointer"
                        onClick={() => setViewingReportItem(s)}
                      >
                        <td className="px-4 py-3 font-mono font-medium text-[#0F766E]">{s.screening_id}</td>
                        <td className="px-4 py-3 font-medium text-slate-900">{s.patient_name}</td>
                        <td className="px-4 py-3 font-mono text-slate-500 font-normal">{s.patient_access_id}</td>
                        <td className="px-4 py-3 text-slate-500 font-normal">{dateStr}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-md text-[11px] font-medium uppercase border ${
                            isDr ? 'bg-red-50 border-red-200 text-red-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                          }`}>
                            {s.prediction}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-normal text-slate-700">{(s.confidence * 100).toFixed(1)}%</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-md text-[11px] font-medium border inline-block ${
                            s.risk_level === 'HIGH' 
                              ? 'bg-red-50 border-red-200 text-red-700' 
                              : s.risk_level === 'MODERATE' || s.risk_level === 'MEDIUM'
                              ? 'bg-amber-50 border-amber-200 text-amber-700'
                              : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                          }`}>
                            {s.risk_level}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                            <button
                              onClick={() => setViewingReportItem(s)}
                              className="flex items-center gap-1 text-[#0F766E] hover:text-[#0D9488] font-medium transition px-2.5 py-1 bg-teal-50 hover:bg-teal-100 rounded-md cursor-pointer text-xs"
                              title="View Diagnostic Evaluation & Heatmap"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>View</span>
                            </button>
                            <button
                              onClick={() => handleDirectDownloadPdf(s.screening_id)}
                              className="flex items-center gap-1 text-slate-700 hover:text-slate-900 font-medium transition px-2.5 py-1 bg-slate-100 hover:bg-slate-200 rounded-md cursor-pointer text-xs"
                              title="Download Clinical PDF Report"
                            >
                              <Download className="w-3.5 h-3.5 text-slate-500" />
                              <span>PDF</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: PATIENTS DIRECTORY (/worker/patients or /worker/patients/:patientId) */}
        {/* ========================================================================= */}
        {currentTab === 'patients' && (
          <div key="patients" className="page-transition-enter space-y-6">
            <div className="rounded-xl border border-slate-200/80 bg-white shadow-xs overflow-hidden">
              <div className="p-4 border-b border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold flex items-center gap-2 text-slate-900">
                    <Users className="w-4 h-4 text-[#0F766E]" /> Patient Directory & History
                  </h2>
                  <p className="text-xs text-slate-500 font-normal">Click any patient row to view their individual screening timeline</p>
                </div>
                
                <div className="flex gap-2 self-start sm:self-auto">
                  <button 
                    onClick={handleExportExcel} 
                    className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white px-3 py-1.5 rounded-lg text-xs font-medium shadow-xs transition cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-teal-300" /> 
                    <span>Export Excel</span>
                  </button>
                  <Link 
                    to="/worker/new-patient" 
                    className="flex items-center gap-1.5 bg-[#0F766E] hover:bg-[#0D9488] text-white px-3 py-1.5 rounded-lg text-xs font-medium shadow-xs transition"
                  >
                    <UserPlus className="w-3.5 h-3.5" /> 
                    <span>Register</span>
                  </Link>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-[#F8F9FA]">
                    <tr>
                      {['Patient ID', 'Full Name', 'Account Status', 'Email', 'Screening History', 'Actions'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-slate-500">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-xs">
                    {patients.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-6 py-8 text-center text-slate-500 font-normal">No registered patient records found.</td>
                      </tr>
                    )}
                    {patients.map(p => (
                      <tr 
                        key={p.id} 
                        className={`cursor-pointer transition hover:bg-[#F8F9FA] ${
                          selectedPatientHistory?.patient.id === p.id ? 'bg-teal-50/50' : ''
                        }`} 
                        onClick={() => handleViewPatientHistory(p)}
                      >
                        <td className="px-4 py-3 font-mono text-slate-600 font-medium">{p.patient_access_id}</td>
                        <td className="px-4 py-3 font-medium text-slate-900">{p.name}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2.5 py-1 rounded-md text-[11px] font-medium border inline-flex items-center gap-1.5 ${
                            p.account_status === 'Active'
                              ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                              : 'bg-amber-50 border-amber-200 text-amber-700'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${p.account_status === 'Active' ? 'bg-emerald-600' : 'bg-amber-500'}`}></span>
                            {p.account_status || 'Pending Activation'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-500 font-normal">{p.email || '—'}</td>
                        <td className="px-4 py-3">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleViewPatientHistory(p); }}
                            className="flex items-center gap-1 text-[#0F766E] font-medium hover:underline cursor-pointer"
                          >
                            <span>View Timeline</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                            <button
                              onClick={() => { setSelectedPatientId(String(p.id)); navigate('/worker/screen'); }}
                              className="text-xs bg-[#0F766E]/10 hover:bg-[#0F766E]/20 text-[#0F766E] px-2.5 py-1 rounded-md font-medium transition cursor-pointer"
                            >
                              New Scan
                            </button>
                            <button
                              onClick={() => handleDeletePatient(p.id, p.name)}
                              className="text-red-600 hover:text-red-800 p-1.5 rounded-md transition cursor-pointer"
                              title="Delete Patient Record"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Individual Patient Screening Timeline / History Drawer */}
            {selectedPatientHistory && (
              <div className="p-5 rounded-xl border border-teal-200/80 bg-white shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-[#0F766E]" />
                      Screening History Timeline: {selectedPatientHistory.patient.name}
                    </h3>
                    <p className="text-xs text-slate-500 font-normal">Access Code: <span className="font-mono font-medium text-slate-700">{selectedPatientHistory.patient.patient_access_id}</span></p>
                  </div>

                  <button
                    onClick={handleClosePatientHistory}
                    className="text-xs text-slate-500 hover:text-slate-900 font-medium p-1 cursor-pointer"
                  >
                    ✕ Close
                  </button>
                </div>

                {loadingHistory ? (
                  <div className="py-8 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin text-[#0F766E]" />
                    <span>Loading patient past screenings…</span>
                  </div>
                ) : selectedPatientHistory.screenings.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-500">
                    No past screenings found for this patient.{' '}
                    <button 
                      onClick={() => { setSelectedPatientId(String(selectedPatientHistory.patient.id)); navigate('/worker/screen'); }}
                      className="text-[#0F766E] font-medium underline cursor-pointer"
                    >
                      Run first screening now →
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {selectedPatientHistory.screenings.map((sc) => {
                      const isDr = sc.prediction === 'DR PRESENT';
                      const dateFormatted = sc.created_at ? new Date(sc.created_at).toLocaleString() : 'Past Evaluation';
                      return (
                        <div key={sc.id} className="p-3.5 rounded-lg border border-slate-200 bg-[#F8F9FA] flex flex-col md:flex-row md:items-center justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-medium text-[#0F766E]">{sc.screening_id}</span>
                              <span className="text-xs text-slate-500 font-normal">• {dateFormatted}</span>
                              <span className={`px-2 py-0.5 rounded-md text-[10px] font-medium uppercase border ${
                                isDr ? 'bg-red-50 border-red-200 text-red-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                              }`}>
                                {sc.prediction}
                              </span>
                            </div>
                            <p className="text-xs text-slate-600 font-normal">
                              Confidence: <strong className="text-slate-900 font-medium">{(sc.confidence * 100).toFixed(1)}%</strong> | Risk Level: <strong className="font-medium text-slate-900">{sc.risk_level}</strong>
                            </p>
                            <p className="text-xs text-slate-500 italic font-normal">{sc.recommendation}</p>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              onClick={() => setViewingReportItem(sc)}
                              className="flex items-center gap-1.5 bg-teal-50 hover:bg-teal-100 text-[#0F766E] border border-teal-200 px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>View</span>
                            </button>
                            <button
                              onClick={() => handleDirectDownloadPdf(sc.screening_id)}
                              className="flex items-center gap-1.5 bg-white border border-slate-300 hover:border-[#0F766E] text-slate-800 px-3 py-1.5 rounded-lg text-xs font-medium transition shadow-2xs cursor-pointer"
                            >
                              <Download className="w-3.5 h-3.5 text-slate-600" />
                              <span>Download PDF</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: REGISTER NEW PATIENT (/worker/new-patient) */}
        {/* ========================================================================= */}
        {currentTab === 'new-patient' && (
          <div key="new-patient" className="page-transition-enter p-6 rounded-xl border border-slate-200/80 bg-white shadow-xs max-w-xl mx-auto">
            <h2 className="text-sm font-semibold mb-4 flex items-center gap-2 text-slate-900 pb-3 border-b border-slate-100">
              <UserPlus className="w-4 h-4 text-[#0F766E]" /> Register Patient Profile & Clinical Biodata
            </h2>

            {createdPatient ? (
              <div className="bg-emerald-50/50 border border-emerald-200 rounded-xl p-6 text-center space-y-4 animate-in fade-in zoom-in-95 duration-200">
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto shadow-2xs">
                  <CheckCircle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Patient Registered Successfully</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    A linked patient portal account has been prepared for self-activation.
                  </p>
                </div>

                {/* Account Details Box */}
                <div className="text-xs space-y-2 rounded-lg p-4 text-left border bg-white border-emerald-200 text-slate-800 shadow-2xs">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <span className="text-slate-500 font-medium">Patient ID:</span>
                    <span className="font-mono font-bold text-slate-900 text-sm">{createdPatient.patient_access_id}</span>
                  </div>
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <span className="text-slate-500 font-medium">Patient Name:</span>
                    <span className="font-medium text-slate-900">{createdPatient.name}</span>
                  </div>
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <span className="text-slate-500 font-medium">Login Identifier (Email):</span>
                    <span className="font-mono font-medium text-[#0F766E]">{createdPatient.email}</span>
                  </div>
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <span className="text-slate-500 font-medium">Date of Birth:</span>
                    <span className="font-medium text-slate-800">{createdPatient.date_of_birth}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-medium">Account Status:</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
                      Pending Activation
                    </span>
                  </div>
                </div>

                {/* Share Notice */}
                <div className="p-3 bg-teal-50/70 border border-teal-200/80 rounded-lg text-xs text-teal-900 text-left flex items-start gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#0F766E] shrink-0 mt-0.5" />
                  <p className="leading-relaxed">
                    <strong>Share these login details with the patient.</strong> They will set their own secure password using their email and Date of Birth verification the first time they log in.
                  </p>
                </div>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => handleCopyDetails(createdPatient)}
                    className="w-full sm:w-1/2 flex items-center justify-center gap-1.5 bg-white border border-slate-300 hover:border-slate-400 text-slate-700 py-2.5 rounded-lg text-xs font-medium transition shadow-2xs cursor-pointer"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-700 font-semibold">Details Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-slate-500" />
                        <span>Copy details</span>
                      </>
                    )}
                  </button>

                  <button 
                    onClick={() => { 
                      setSelectedPatientId(String(createdPatient.patient_id));
                      setCreatedPatient(null); 
                      navigate('/worker/screen'); 
                    }}
                    className="w-full sm:w-1/2 bg-[#0F766E] hover:bg-[#0D9488] text-white py-2.5 rounded-lg text-xs font-medium shadow-xs transition cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <span>Proceed to Screening →</span>
                  </button>
                </div>

                <div className="pt-1">
                  <button
                    onClick={() => { setCreatedPatient(null); setRegisterError(''); }}
                    className="text-xs text-slate-500 hover:text-slate-800 underline cursor-pointer"
                  >
                    Register another patient
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleCreatePatient} className="space-y-4">
                {registerError && (
                  <div className="p-3.5 rounded-lg bg-red-50 border border-red-200 text-red-800 text-xs flex items-start gap-2 animate-in fade-in duration-150">
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                    <span className="leading-relaxed font-medium">{registerError}</span>
                  </div>
                )}

                {/* Name Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-semibold mb-1 text-slate-700">
                      First Name <span className="text-red-600">*</span>
                    </label>
                    <input 
                      value={newPatient.first_name} 
                      onChange={e => setNewPatient({ ...newPatient, first_name: e.target.value })}
                      placeholder="e.g. John"
                      className="w-full border border-slate-300 bg-[#F8F9FA] text-slate-900 rounded-lg p-2 text-xs outline-none focus:border-[#0F766E] focus:bg-white transition font-normal" 
                      required 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1 text-slate-700">
                      Last Name <span className="text-red-600">*</span>
                    </label>
                    <input 
                      value={newPatient.last_name} 
                      onChange={e => setNewPatient({ ...newPatient, last_name: e.target.value })}
                      placeholder="e.g. Doe"
                      className="w-full border border-slate-300 bg-[#F8F9FA] text-slate-900 rounded-lg p-2 text-xs outline-none focus:border-[#0F766E] focus:bg-white transition font-normal" 
                      required 
                    />
                  </div>
                </div>

                {/* Contact Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-semibold mb-1 text-slate-700">
                      Email Address <span className="text-red-600">*</span>
                    </label>
                    <input 
                      type="email" 
                      value={newPatient.email} 
                      onChange={e => setNewPatient({ ...newPatient, email: e.target.value })}
                      placeholder="e.g. patient@example.com"
                      className="w-full border border-slate-300 bg-[#F8F9FA] text-slate-900 rounded-lg p-2 text-xs outline-none focus:border-[#0F766E] focus:bg-white transition font-normal" 
                      required 
                    />
                    <p className="text-[10px] text-slate-400 mt-0.5">Used as primary login email.</p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold mb-1 text-slate-700">Phone Number (Optional)</label>
                    <input 
                      type="tel" 
                      value={newPatient.phone} 
                      onChange={e => setNewPatient({ ...newPatient, phone: e.target.value })}
                      placeholder="e.g. +1 555-0199"
                      className="w-full border border-slate-300 bg-[#F8F9FA] text-slate-900 rounded-lg p-2 text-xs outline-none focus:border-[#0F766E] focus:bg-white transition font-normal" 
                    />
                  </div>
                </div>

                {/* Clinical Eye Care Biodata */}
                <div className="pt-2 border-t border-slate-100 space-y-3.5">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Clinical Biodata for Retinal Care
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-xs font-semibold mb-1 text-slate-700">
                        Date of Birth <span className="text-red-600">*</span>
                      </label>
                      <input 
                        type="date"
                        value={newPatient.date_of_birth} 
                        onChange={e => setNewPatient({ ...newPatient, date_of_birth: e.target.value })}
                        className="w-full border border-slate-300 bg-[#F8F9FA] text-slate-900 rounded-lg p-2 text-xs outline-none focus:border-[#0F766E] focus:bg-white transition font-normal" 
                        required 
                      />
                      <p className="text-[10px] text-slate-400 mt-0.5">Used for patient identity verification.</p>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold mb-1 text-slate-700">
                        Diabetes Type <span className="text-red-600">*</span>
                      </label>
                      <select
                        value={newPatient.diabetes_type}
                        onChange={e => setNewPatient({ ...newPatient, diabetes_type: e.target.value })}
                        className="w-full border border-slate-300 bg-[#F8F9FA] text-slate-900 rounded-lg p-2 text-xs outline-none focus:border-[#0F766E] focus:bg-white transition font-normal cursor-pointer"
                        required
                      >
                        <option value="Type 2">Type 2</option>
                        <option value="Type 1">Type 1</option>
                        <option value="Gestational">Gestational</option>
                        <option value="Pre-diabetic">Pre-diabetic</option>
                        <option value="Not diabetic">Not diabetic</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-xs font-semibold mb-1 text-slate-700">
                        Year of Diagnosis <span className="text-slate-400 font-normal">(Optional)</span>
                      </label>
                      <input 
                        type="number"
                        min="1950"
                        max="2026"
                        value={newPatient.year_of_diagnosis} 
                        onChange={e => setNewPatient({ ...newPatient, year_of_diagnosis: e.target.value })}
                        placeholder="e.g. 2018"
                        className="w-full border border-slate-300 bg-[#F8F9FA] text-slate-900 rounded-lg p-2 text-xs outline-none focus:border-[#0F766E] focus:bg-white transition font-normal" 
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold mb-1 text-slate-700">
                        Existing Eye Conditions <span className="text-slate-400 font-normal">(Optional)</span>
                      </label>
                      <input 
                        type="text"
                        value={newPatient.existing_eye_conditions} 
                        onChange={e => setNewPatient({ ...newPatient, existing_eye_conditions: e.target.value })}
                        placeholder="e.g. Cataracts, Glaucoma"
                        className="w-full border border-slate-300 bg-[#F8F9FA] text-slate-900 rounded-lg p-2 text-xs outline-none focus:border-[#0F766E] focus:bg-white transition font-normal" 
                      />
                    </div>
                  </div>
                </div>

                <button 
                  type="submit" 
                  disabled={submittingPatient}
                  className="w-full mt-2 bg-[#0F766E] hover:bg-[#0D9488] disabled:opacity-50 text-white py-2.5 rounded-lg font-medium text-xs shadow-xs transition cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>{submittingPatient ? 'Registering Patient…' : 'Register Patient'}</span>
                </button>
              </form>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* CLINICAL REPORT INSPECTION MODAL */}
        {/* ========================================================================= */}
        {viewingReportItem && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
              
              {/* Modal Header */}
              <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-[#F8F9FA]">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-[#0F766E]/10 border border-[#0F766E]/20 text-[#0F766E] flex items-center justify-center font-semibold">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-slate-900">Clinical Evaluation Report</h3>
                      <span className="font-mono text-xs text-[#0F766E] bg-teal-50 px-2 py-0.5 rounded border border-teal-200 font-medium">
                        {viewingReportItem.screening_id}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 font-normal mt-0.5">
                      Patient: <strong className="text-slate-800 font-medium">{viewingReportItem.patient_name}</strong> ({viewingReportItem.patient_access_id}) • {viewingReportItem.created_at ? new Date(viewingReportItem.created_at).toLocaleString() : 'Recent'}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setViewingReportItem(null)}
                  className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 flex items-center justify-center transition cursor-pointer"
                  title="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Modal Scrollable Content */}
              <div className="p-5 overflow-y-auto space-y-4">
                
                {/* 3 Metric Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3.5 rounded-lg border border-slate-200 bg-[#F8F9FA] text-center">
                    <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wider mb-1">Diagnostic Finding</p>
                    <span className={`inline-block px-2.5 py-0.5 rounded-md text-xs font-semibold uppercase border ${
                      viewingReportItem.prediction === 'DR PRESENT'
                        ? 'bg-red-50 border-red-200 text-red-700'
                        : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                    }`}>
                      {viewingReportItem.prediction}
                    </span>
                  </div>

                  <div className="p-3.5 rounded-lg border border-slate-200 bg-[#F8F9FA] text-center">
                    <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wider mb-1">Model Confidence</p>
                    <p className="text-lg font-semibold text-slate-900">
                      {(viewingReportItem.confidence * 100).toFixed(1)}%
                    </p>
                  </div>

                  <div className="p-3.5 rounded-lg border border-slate-200 bg-[#F8F9FA] text-center">
                    <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wider mb-1">Assessed Risk</p>
                    <span className={`inline-block px-2.5 py-0.5 rounded-md text-xs font-semibold border ${
                      viewingReportItem.risk_level === 'HIGH'
                        ? 'bg-red-50 border-red-200 text-red-700'
                        : viewingReportItem.risk_level === 'MODERATE' || viewingReportItem.risk_level === 'MEDIUM'
                        ? 'bg-amber-50 border-amber-200 text-amber-700'
                        : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                    }`}>
                      {viewingReportItem.risk_level}
                    </span>
                  </div>
                </div>

                {/* Scan & Heatmap */}
                {(viewingReportItem.image_url || viewingReportItem.heatmap_url) && (
                  <div className="border border-slate-200 rounded-lg p-3.5 bg-[#F8F9FA] space-y-3">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-[#0F766E]" /> Retinal Imagery & Neural Attention
                    </h4>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                      <div className="text-center bg-white p-2.5 rounded-lg border border-slate-200">
                        <p className="text-[11px] font-medium text-slate-600 mb-1.5">Original Fundus Scan</p>
                        <div className="overflow-hidden rounded-md bg-black aspect-square max-w-[220px] mx-auto border border-slate-300">
                          <img 
                            src={getValidImageUrl(viewingReportItem.image_url)} 
                            alt="Retinal scan" 
                            className="w-full h-full object-cover" 
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = 'http://localhost:8000/uploads/sample_seed.jpg';
                            }}
                          />
                        </div>
                      </div>

                      <div className="text-center bg-white p-2.5 rounded-lg border border-teal-200">
                        <div className="flex items-center justify-between px-1 mb-1.5">
                          <span className="text-[11px] font-medium text-[#0F766E]">Grad-CAM Attention</span>
                          <span className="text-[9px] text-slate-400 font-mono">Heatmap</span>
                        </div>
                        <div className="overflow-hidden rounded-md bg-black aspect-square max-w-[220px] mx-auto border border-[#0F766E]">
                          <img 
                            src={getValidImageUrl(viewingReportItem.heatmap_url)} 
                            alt="Heatmap" 
                            className="w-full h-full object-cover" 
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = 'http://localhost:8000/uploads/sample_seed_cam.jpg';
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Heatmap Explanation */}
                <div className="border border-teal-200 rounded-lg p-3 bg-teal-50/40 space-y-1">
                  <div className="flex items-center gap-1.5 text-[#0F766E]">
                    <Sparkles className="w-3.5 h-3.5 shrink-0" />
                    <h4 className="text-[11px] font-semibold uppercase tracking-wider">Diagnostic Analysis</h4>
                  </div>
                  <p className="text-xs text-slate-800 leading-relaxed font-normal">
                    {viewingReportItem.heatmap_explanation || viewingReportItem.ai_context || "Model localized attention across fundus features to evaluate microvascular and retinal structures."}
                  </p>
                </div>

                {/* Clinical Recommendation */}
                <div className={`border rounded-lg p-3 text-xs ${
                  viewingReportItem.prediction === 'DR PRESENT'
                    ? 'bg-red-50 border-red-200 text-red-900'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-900'
                }`}>
                  <p className="font-semibold text-xs mb-0.5">Clinical Protocol Recommendation:</p>
                  <p className="font-normal leading-relaxed">{viewingReportItem.recommendation}</p>
                </div>

              </div>

              {/* Modal Footer */}
              <div className="px-5 py-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 bg-[#F8F9FA]">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handlePreviewPdf(viewingReportItem.screening_id)}
                    disabled={downloadingPdf}
                    className="flex items-center gap-1.5 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 px-3.5 py-1.5 rounded-lg text-xs font-medium shadow-2xs transition cursor-pointer"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-slate-600" />
                    <span>Open PDF in New Tab</span>
                  </button>

                  <button
                    onClick={() => handleDirectDownloadPdf(viewingReportItem.screening_id)}
                    disabled={downloadingPdf}
                    className="flex items-center gap-1.5 bg-[#0F766E] hover:bg-[#0D9488] text-white px-3.5 py-1.5 rounded-lg text-xs font-medium shadow-xs transition cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download PDF</span>
                  </button>
                </div>

                <button
                  onClick={() => setViewingReportItem(null)}
                  className="px-3.5 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-medium transition cursor-pointer"
                >
                  Close
                </button>
              </div>

            </div>
          </div>
        )}

      </main>
    </div>
  );
};

export default WorkerDashboard;
