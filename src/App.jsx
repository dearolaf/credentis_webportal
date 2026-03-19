import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import ClientDashboard from './pages/client/ClientDashboard';
import ProjectManagement from './pages/client/ProjectManagement';
import ComplianceMonitoring from './pages/client/ComplianceMonitoring';
import AuditTrail from './pages/client/AuditTrail';
import ContractorDashboard from './pages/contractor/ContractorDashboard';
import WorkerManagement from './pages/contractor/WorkerManagement';
import SubcontractorDashboard from './pages/subcontractor/SubcontractorDashboard';
import SubWorkerManagement from './pages/subcontractor/SubWorkerManagement';
import SubcontractorOnboardingPage from './pages/subcontractor/SubcontractorOnboardingPage';
import OnboardingPage from './pages/shared/OnboardingPage';
import PartnerCompliancePage from './pages/shared/PartnerCompliancePage';

function ProtectedRoute({ children, roles }) {
  const { user, isAuthenticated, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div></div>;
  if (!isAuthenticated) return <Navigate to="/login" />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" />;
  return children;
}

function DashboardRedirect() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" />;
  switch (user.role) {
    case 'client': return <Navigate to="/client" />;
    case 'contractor': return <Navigate to="/contractor" />;
    case 'subcontractor': return <Navigate to="/subcontractor" />;
    default: return <Navigate to="/login" />;
  }
}

export default function App() {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={isAuthenticated ? <Navigate to="/" /> : <Login />} />
      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<DashboardRedirect />} />
        {/* Client routes */}
        <Route path="client" element={<ProtectedRoute roles={['client', 'admin']}><ClientDashboard /></ProtectedRoute>} />
        <Route path="client/projects" element={<ProtectedRoute roles={['client', 'admin']}><ProjectManagement /></ProtectedRoute>} />
        <Route path="client/compliance" element={<ProtectedRoute roles={['client', 'admin']}><ComplianceMonitoring /></ProtectedRoute>} />
        <Route path="client/audit" element={<ProtectedRoute roles={['client', 'admin']}><AuditTrail /></ProtectedRoute>} />
        {/* Contractor routes */}
        <Route path="contractor" element={<ProtectedRoute roles={['contractor']}><ContractorDashboard /></ProtectedRoute>} />
        <Route path="contractor/workers" element={<ProtectedRoute roles={['contractor']}><WorkerManagement /></ProtectedRoute>} />
        <Route path="contractor/compliance" element={<ProtectedRoute roles={['contractor']}><PartnerCompliancePage portal="contractor" /></ProtectedRoute>} />
        {/* Subcontractor routes */}
        <Route path="subcontractor" element={<ProtectedRoute roles={['subcontractor']}><SubcontractorDashboard /></ProtectedRoute>} />
        <Route path="subcontractor/workers" element={<ProtectedRoute roles={['subcontractor']}><SubWorkerManagement /></ProtectedRoute>} />
        <Route path="subcontractor/compliance" element={<ProtectedRoute roles={['subcontractor']}><PartnerCompliancePage portal="subcontractor" /></ProtectedRoute>} />
        <Route path="subcontractor/onboarding" element={<ProtectedRoute roles={['subcontractor']}><SubcontractorOnboardingPage /></ProtectedRoute>} />
        {/* Shared routes */}
        <Route path="onboarding" element={<ProtectedRoute roles={['client', 'contractor', 'subcontractor', 'admin']}><OnboardingPage /></ProtectedRoute>} />
        <Route path="audit" element={<ProtectedRoute><AuditTrail /></ProtectedRoute>} />
      </Route>
    </Routes>
  );
}
