import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

import Landing from './pages/Landing';
import Login from './pages/Login';
import PatientDashboard from './pages/PatientDashboard';
import WorkerDashboard from './pages/WorkerDashboard';
import SetPassword from './pages/SetPassword';

const SpecialistDashboard = () => <div className="p-8"><h1>Specialist Dashboard</h1></div>;

const ProtectedRoute = ({ children, allowedRoles }: { children: React.ReactNode, allowedRoles: string[] }) => {
  const { user, loading } = useAuth();
  const location = useLocation();
  
  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF7F2] text-[#23211E] flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-[#1E1E1E] flex items-center justify-center shadow-md animate-pulse">
          <span className="text-white text-xl font-bold">MV</span>
        </div>
        <p className="text-xs font-semibold text-[#706B63] tracking-wide uppercase">Securing Session & Validating Credentials…</p>
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname)}`} replace />;
  }
  
  if (!allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }
  
  return <>{children}</>;
};

const AppRoutes = () => {
  return (
    <Routes>
      {/* Public Pages */}
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/set-password" element={<SetPassword />} />

      {/* Doctor / Healthcare Worker Distinct Page Endpoints */}
      <Route path="/worker" element={<Navigate to="/worker/dashboard" replace />} />
      <Route path="/worker/dashboard" element={<ProtectedRoute allowedRoles={['HEALTHCARE_WORKER', 'ADMIN']}><WorkerDashboard /></ProtectedRoute>} />
      <Route path="/worker/screen" element={<ProtectedRoute allowedRoles={['HEALTHCARE_WORKER', 'ADMIN']}><WorkerDashboard /></ProtectedRoute>} />
      <Route path="/worker/queue" element={<ProtectedRoute allowedRoles={['HEALTHCARE_WORKER', 'ADMIN']}><WorkerDashboard /></ProtectedRoute>} />
      <Route path="/worker/patients" element={<ProtectedRoute allowedRoles={['HEALTHCARE_WORKER', 'ADMIN']}><WorkerDashboard /></ProtectedRoute>} />
      <Route path="/worker/patients/:patientId" element={<ProtectedRoute allowedRoles={['HEALTHCARE_WORKER', 'ADMIN']}><WorkerDashboard /></ProtectedRoute>} />
      <Route path="/worker/new-patient" element={<ProtectedRoute allowedRoles={['HEALTHCARE_WORKER', 'ADMIN']}><WorkerDashboard /></ProtectedRoute>} />

      {/* Patient Distinct Page Endpoints */}
      <Route path="/patient" element={<Navigate to="/patient/dashboard" replace />} />
      <Route path="/patient/dashboard" element={<ProtectedRoute allowedRoles={['PATIENT']}><PatientDashboard /></ProtectedRoute>} />
      <Route path="/patient/history" element={<ProtectedRoute allowedRoles={['PATIENT']}><PatientDashboard /></ProtectedRoute>} />
      <Route path="/patient/chat" element={<ProtectedRoute allowedRoles={['PATIENT']}><PatientDashboard /></ProtectedRoute>} />

      {/* Specialist Route */}
      <Route path="/specialist/*" element={<ProtectedRoute allowedRoles={['SPECIALIST', 'ADMIN']}><SpecialistDashboard /></ProtectedRoute>} />

      {/* Catch-all redirect to Home */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

const App = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
