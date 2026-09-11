import React, { useState, useEffect, useRef } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { FileText, MessageSquare, Clock, Eye, LogOut, CheckCircle2, Download, Sparkles, Send } from 'lucide-react';

interface Screening {
  id: number;
  screening_id: string;
  prediction: string;
  confidence: number;
  created_at: string;
}

interface ChatMsg {
  role: 'user' | 'assistant';
  content: string;
}

const PatientDashboard = () => {
  const { user, logout } = useAuth();
  const location = useLocation();

  const currentTab = location.pathname.includes('/patient/history')
    ? 'history'
    : location.pathname.includes('/patient/chat')
    ? 'chat'
    : 'dashboard';

  const [screenings, setScreenings] = useState<Screening[]>([]);
  const [messages, setMessages] = useState<ChatMsg[]>([
    { role: 'assistant', content: 'Hello! I am your MedVisionAI Health Assistant. You can ask me any questions about your retinal screening results, medical recommendations, or what the findings mean.' }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.get('/reports/my-reports')
      .then(res => setScreenings(res.data))
      .catch(err => console.error('Failed to fetch reports', err));
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, currentTab]);

  const latestScreening = screenings[0];

  const handleDownloadReport = async (reportId: number, screeningId?: string) => {
    try {
      const res = await api.get(`/reports/${reportId}/download`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `MedVisionAI_Report_${screeningId || reportId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      alert('Could not download report.');
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || chatLoading) return;

    const userMsg = chatInput.trim();
    setChatInput('');
    const newMessages: ChatMsg[] = [...messages, { role: 'user', content: userMsg }];
    setMessages(newMessages);
    setChatLoading(true);

    const history = newMessages.slice(1, -1).map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [m.content]
    }));

    try {
      const res = await api.post('/chat/', { message: userMsg, history });
      setMessages(prev => [...prev, { role: 'assistant', content: res.data.answer }]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'I could not connect to the assistant right now. Please try again.' }]);
    } finally {
      setChatLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F8FA] text-[#1E293B] font-sans antialiased">
      
      {/* Header */}
      <header className="bg-white border-b border-slate-200/80 sticky top-0 z-40 py-3 shadow-xs">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <Link to="/patient/dashboard" className="flex items-center gap-2.5 hover:opacity-90 transition">
            <div className="w-8 h-8 rounded-lg bg-[#0F766E] text-white flex items-center justify-center shadow-xs">
              <Eye className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-semibold tracking-tight text-slate-900">Patient Health Portal</h1>
                <span className="text-[10px] font-medium uppercase tracking-wider bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded-md border border-emerald-200">
                  {user?.username}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-normal">MedVisionAI Secure Patient Record Suite</p>
            </div>
          </Link>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
            <div className="flex space-x-1 bg-slate-100 p-1 rounded-lg border border-slate-200/70 text-xs font-medium">
              <Link
                to="/patient/dashboard"
                className={`px-3 py-1.5 rounded-md whitespace-nowrap transition-all duration-200 ease-out active:scale-[0.97] flex items-center gap-1.5 ${
                  currentTab === 'dashboard' 
                    ? 'bg-white text-[#0F766E] shadow-2xs border border-slate-200/80 font-semibold tab-highlight-active' 
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Overview</span>
              </Link>

              <Link
                to="/patient/history"
                className={`px-3 py-1.5 rounded-md whitespace-nowrap transition-all duration-200 ease-out active:scale-[0.97] flex items-center gap-1.5 ${
                  currentTab === 'history' 
                    ? 'bg-white text-[#0F766E] shadow-2xs border border-slate-200/80 font-semibold tab-highlight-active' 
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Records</span>
              </Link>

              <Link
                to="/patient/chat"
                className={`px-3 py-1.5 rounded-md whitespace-nowrap transition-all duration-200 ease-out active:scale-[0.97] flex items-center gap-1.5 ${
                  currentTab === 'chat' 
                    ? 'bg-white text-[#0F766E] shadow-2xs border border-slate-200/80 font-semibold tab-highlight-active' 
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Ask AI Assistant</span>
              </Link>
            </div>

            <button
              onClick={logout}
              className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-500 hover:text-red-600 hover:bg-slate-50 transition shrink-0 cursor-pointer shadow-2xs"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        
        {/* ========================================================================= */}
        {/* VIEW 1: OVERVIEW (/patient/dashboard) */}
        {/* ========================================================================= */}
        {currentTab === 'dashboard' && (
          <div key="dashboard" className="page-transition-enter space-y-6">
            {latestScreening ? (
              <section className="rounded-xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-xs space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                  <div>
                    <h2 className="text-sm font-semibold flex items-center gap-2 text-slate-900">
                      <Clock className="w-4 h-4 text-[#0F766E]" /> Most Recent Screening Result
                    </h2>
                    <p className="text-xs text-slate-500 font-normal mt-0.5">
                      Screening Ref: <span className="font-mono font-medium text-slate-900">{latestScreening.screening_id}</span>
                      {latestScreening.created_at && (
                        <span> • Evaluated on {new Date(latestScreening.created_at).toLocaleDateString()}</span>
                      )}
                    </p>
                  </div>

                  <span className={`px-2.5 py-0.5 rounded-md text-xs font-medium uppercase border tracking-wider self-start sm:self-auto ${
                    latestScreening.prediction === 'DR PRESENT'
                      ? 'bg-red-50 border-red-200 text-red-700'
                      : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                  }`}>
                    {latestScreening.prediction}
                  </span>
                </div>

                <div className="grid md:grid-cols-3 gap-4">
                  <div className="p-4 rounded-lg border border-slate-200 bg-[#F8F9FA] text-center">
                    <p className="text-[11px] font-medium uppercase tracking-wider mb-1 text-slate-500">Diagnostic Status</p>
                    <p className={`text-xl font-semibold ${latestScreening.prediction === 'DR PRESENT' ? 'text-red-700' : 'text-emerald-700'}`}>
                      {latestScreening.prediction}
                    </p>
                  </div>

                  <div className="p-4 rounded-lg border border-slate-200 bg-[#F8F9FA] text-center">
                    <p className="text-[11px] font-medium uppercase tracking-wider mb-1 text-slate-500">Confidence Score</p>
                    <p className="text-xl font-semibold text-slate-900">{(latestScreening.confidence * 100).toFixed(1)}%</p>
                  </div>

                  <div className="p-4 rounded-lg border border-slate-200 bg-[#F8F9FA] flex flex-col justify-center items-center gap-2">
                    <button 
                      onClick={() => handleDownloadReport(latestScreening.id, latestScreening.screening_id)}
                      className="w-full flex items-center justify-center gap-2 bg-[#0F766E] hover:bg-[#0D9488] text-white px-3.5 py-1.5 rounded-lg font-medium text-xs shadow-xs transition cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" /> 
                      <span>Download PDF Report</span>
                    </button>
                    <Link 
                      to="/patient/chat"
                      className="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-3.5 py-1.5 rounded-lg font-medium text-xs transition"
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-teal-300" />
                      <span>Ask AI About Report</span>
                    </Link>
                  </div>
                </div>

                {latestScreening.prediction === 'DR PRESENT' ? (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3.5 text-red-900 text-xs space-y-1">
                    <p className="font-semibold text-xs text-red-800">⚠️ Signs of Diabetic Retinopathy Detected</p>
                    <p className="text-[11px] leading-relaxed font-normal opacity-90">
                      Your retinal fundus scan indicates features associated with diabetic retinopathy. Please consult with your ophthalmologist or specialist for a comprehensive clinical dilated eye exam.
                    </p>
                  </div>
                ) : (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3.5 text-emerald-900 text-xs space-y-1">
                    <p className="font-semibold text-xs text-emerald-800">✓ No Diabetic Retinopathy Detected</p>
                    <p className="text-[11px] leading-relaxed font-normal opacity-90">
                      No signs of diabetic retinopathy were detected in this evaluation. Please maintain regular annual diabetic eye screening with your care team.
                    </p>
                  </div>
                )}
              </section>
            ) : (
              <div className="rounded-xl border border-slate-200/80 bg-white p-12 text-center text-slate-500 space-y-3">
                <Eye className="w-10 h-10 mx-auto opacity-30 text-[#0F766E]" />
                <h3 className="text-sm font-semibold text-slate-900">No Published Screenings Yet</h3>
                <p className="text-xs max-w-sm mx-auto font-normal">
                  Your doctor will perform your retinal fundus evaluation and publish your official diagnostic report here.
                </p>
              </div>
            )}

            {/* Quick Links Card */}
            <div className="grid md:grid-cols-2 gap-4">
              <Link 
                to="/patient/history"
                className="p-4 rounded-xl border border-slate-200/80 bg-white hover:border-[#0F766E] transition shadow-xs flex items-center justify-between group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-slate-100 text-slate-800 flex items-center justify-center">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-slate-900 group-hover:text-[#0F766E] transition">Complete History Records</h4>
                    <p className="text-[11px] text-slate-500 font-normal">View and download all past screening PDF files</p>
                  </div>
                </div>
                <span className="text-xs font-medium text-[#0F766E]">View →</span>
              </Link>

              <Link 
                to="/patient/chat"
                className="p-4 rounded-xl border border-slate-200/80 bg-white hover:border-[#0F766E] transition shadow-xs flex items-center justify-between group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-teal-50 text-[#0F766E] flex items-center justify-center">
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-slate-900 group-hover:text-[#0F766E] transition">Report AI Assistant</h4>
                    <p className="text-[11px] text-slate-500 font-normal">Ask questions about your retinal screening</p>
                  </div>
                </div>
                <span className="text-xs font-medium text-[#0F766E]">Chat →</span>
              </Link>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 2: FULL RECORDS TABLE (/patient/history) */}
        {/* ========================================================================= */}
        {currentTab === 'history' && (
          <section key="history" className="page-transition-enter rounded-xl border border-slate-200/80 bg-white shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-200/80 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#0F766E]" />
                  Your Screening History & Official Reports
                </h3>
                <p className="text-xs text-slate-500 font-normal">Download complete PDF clinical records published by your doctor</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-[#F8F9FA]">
                  <tr>
                    {['Date', 'Screening ID', 'Diagnostic Finding', 'Confidence', 'Action'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-[11px] font-medium text-slate-500 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-xs">
                  {screenings.length === 0 && (
                    <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-500 font-normal">No published records found yet.</td></tr>
                  )}
                  {screenings.map(s => {
                    const isDr = s.prediction === 'DR PRESENT';
                    return (
                      <tr key={s.id} className="hover:bg-[#F8F9FA] transition">
                        <td className="px-4 py-3 font-medium text-slate-900">{new Date(s.created_at).toLocaleDateString()}</td>
                        <td className="px-4 py-3 font-mono font-medium text-[#0F766E]">{s.screening_id}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium uppercase rounded-md border ${
                            isDr
                              ? 'bg-red-50 text-red-700 border-red-200'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          }`}>
                            <CheckCircle2 className="w-3 h-3" />
                            {s.prediction}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-normal text-slate-700">{s.confidence ? (s.confidence * 100).toFixed(1) : '0'}%</td>
                        <td className="px-4 py-3">
                          <button 
                            onClick={() => handleDownloadReport(s.id, s.screening_id)}
                            className="text-[#0F766E] hover:text-[#0D9488] font-medium flex items-center gap-1 bg-teal-50 hover:bg-teal-100 px-2.5 py-1 rounded-md transition cursor-pointer"
                          >
                            <Download className="w-3.5 h-3.5" /> 
                            <span>Download PDF</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* ========================================================================= */}
        {/* VIEW 3: DEDICATED AI CHAT (/patient/chat) */}
        {/* ========================================================================= */}
        {currentTab === 'chat' && (
          <section key="chat" className="page-transition-enter rounded-xl border border-slate-200/80 bg-white shadow-xs overflow-hidden flex flex-col h-[560px]">
            <div className="p-3.5 border-b border-slate-200 bg-[#F8F9FA] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-[#0F766E] text-white flex items-center justify-center font-semibold text-xs">
                  <Sparkles className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h3 className="font-semibold text-xs text-slate-900">AI Medical Report Assistant</h3>
                  <p className="text-[10px] text-[#0F766E] font-medium">🔒 Grounded in your authorized clinical screening files</p>
                </div>
              </div>
            </div>

            <div className="flex-1 p-4 overflow-y-auto flex flex-col gap-3 bg-[#F8F9FA]">
              {messages.map((msg, i) => (
                <div 
                  key={i} 
                  className={`max-w-[85%] p-3 rounded-lg text-xs leading-relaxed whitespace-pre-wrap ${
                    msg.role === 'assistant'
                      ? 'bg-white border border-slate-200 text-slate-800 self-start rounded-tl-none shadow-xs font-normal'
                      : 'bg-slate-900 text-white self-end rounded-tr-none shadow-xs font-normal'
                  }`}
                >
                  {msg.content}
                </div>
              ))}
              {chatLoading && (
                <div className="self-start rounded-lg rounded-tl-none px-3.5 py-2 text-xs bg-white border border-slate-200 text-slate-500 flex items-center gap-2 font-normal">
                  <Sparkles className="w-3.5 h-3.5 text-[#0F766E] animate-pulse" />
                  <span>Reviewing clinical report records…</span>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            <form onSubmit={handleSendMessage} className="p-3 border-t border-slate-200 flex gap-2 bg-white">
              <input
                type="text"
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                placeholder="Ask about findings, recommendations, or terms in your report..."
                className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-xs outline-none focus:border-[#0F766E] bg-[#F8F9FA] transition font-normal text-slate-900"
                disabled={chatLoading}
              />
              <button 
                type="submit" 
                disabled={chatLoading || !chatInput.trim()}
                className="bg-[#0F766E] hover:bg-[#0D9488] disabled:opacity-40 text-white px-4 py-2 rounded-lg text-xs font-medium transition flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <span>Send</span>
                <Send className="w-3 h-3" />
              </button>
            </form>
          </section>
        )}
      </main>
    </div>
  );
};

export default PatientDashboard;
