import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Users, FolderKanban, ShieldCheck, CheckCircle, Clock, AlertTriangle, ArrowUpCircle } from 'lucide-react';
import api from '../../services/api';

export default function SubcontractorDashboard() {
  const [projects, setProjects] = useState([]);
  const [compliance, setCompliance] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [escalated, setEscalated] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/projects'),
      api.get('/compliance/dashboard'),
      api.get('/onboarding/tasks'),
      api.get('/compliance/escalated'),
    ]).then(([p, c, t, e]) => {
      setProjects(p.data || []);
      setCompliance(c.data);
      setTasks(t.data || []);
      setEscalated(e.data?.issues || []);
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Subcontractor Dashboard</h2>
        <p className="text-gray-500 text-sm mt-1">Manage assigned professionals and compliance for delegated projects</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="stat-card flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center"><FolderKanban className="w-5 h-5 text-blue-600" /></div>
          <div><p className="text-2xl font-bold">{projects.length}</p><p className="text-sm text-gray-500">Assigned Projects</p></div>
        </div>
        <div className="stat-card flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center"><Users className="w-5 h-5 text-green-600" /></div>
          <div><p className="text-2xl font-bold">{compliance?.summary?.totalWorkers || 0}</p><p className="text-sm text-gray-500">Professionals</p></div>
        </div>
        <div className="stat-card flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center"><ShieldCheck className="w-5 h-5 text-emerald-600" /></div>
          <div><p className="text-2xl font-bold text-emerald-600">{compliance?.expirySummary?.green || 0}</p><p className="text-sm text-gray-500">Valid Creds</p></div>
        </div>
        <div className="stat-card flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center"><AlertTriangle className="w-5 h-5 text-amber-600" /></div>
          <div><p className="text-2xl font-bold text-amber-600">{(compliance?.expirySummary?.amber || 0) + (compliance?.expirySummary?.red || 0)}</p><p className="text-sm text-gray-500">Issues</p></div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="space-y-3">
            <Link to="/subcontractor/workers" className="flex items-center gap-4 p-4 rounded-xl bg-primary-50 hover:bg-primary-100 transition-colors">
              <Users className="w-6 h-6 text-primary-600" />
              <div>
                <p className="font-medium text-primary-700">Manage Professionals</p>
                <p className="text-sm text-primary-600/70">View and manage professionals assigned to your projects</p>
              </div>
            </Link>
            <Link to="/subcontractor/onboarding" className="flex items-center gap-4 p-4 rounded-xl bg-emerald-50 hover:bg-emerald-100 transition-colors">
              <CheckCircle className="w-6 h-6 text-emerald-600" />
              <div>
                <p className="font-medium text-emerald-700">Submit PQQ</p>
                <p className="text-sm text-emerald-600/70">Complete onboarding from your PQQ invitation</p>
              </div>
            </Link>
            <Link to="/audit" className="flex items-center gap-4 p-4 rounded-xl bg-purple-50 hover:bg-purple-100 transition-colors">
              <ShieldCheck className="w-6 h-6 text-purple-600" />
              <div>
                <p className="font-medium text-purple-700">Audit Trail</p>
                <p className="text-sm text-purple-600/70">View blockchain-anchored action log</p>
              </div>
            </Link>
          </div>
        </div>

        {/* Projects */}
        <div className="card p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Assigned Projects</h3>
          <div className="space-y-3">
            {projects.length === 0 ? <p className="text-gray-500">No projects assigned yet</p> : projects.map(project => (
              <div key={project.id} className="flex items-center gap-4 p-4 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors">
                <div className="w-12 h-12 rounded-xl bg-primary-50 flex items-center justify-center">
                  <FolderKanban className="w-6 h-6 text-primary-600" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{project.title}</p>
                  <p className="text-sm text-gray-500">{project.location} • {project.sector}</p>
                </div>
                <div className="text-right">
                  <span className="badge-green">{project.status}</span>
                  <p className="text-xs text-gray-500 mt-1">{project.worker_count || 0} professionals</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Task queue */}
      {tasks.length > 0 && (
        <div className="card p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Outstanding Tasks</h3>
          <div className="space-y-2">
            {tasks.map((task, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-amber-50">
                <Clock className="w-5 h-5 text-amber-600" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-amber-800">{task.label}</p>
                  <p className="text-xs text-amber-600">{task.count} item(s) • {task.priority} priority</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Red list – always visible at Subcontractor level; same escalation concept as Client and Contractor */}
      <div className="card p-6 border-2 border-red-200 bg-red-50/30">
        <h3 className="font-semibold text-red-900 flex items-center gap-2 mb-2">
          <AlertTriangle className="w-5 h-5" />
          Escalated compliance issues (red list)
        </h3>
        <p className="text-sm text-red-800 mb-4">
          Red compliance here is visible to the Contractor and Client. Issues below are <strong>for the Professional to fix</strong> (e.g. complete DAR or renew credentials). The same red list appears at Contractor and Client level so problems at the bottom of the chain are visible at the top.
        </p>
        {escalated.length > 0 ? (
          <ul className="space-y-2">
            {escalated.map((issue, i) => (
              <li key={i} className="flex flex-wrap items-center gap-2 text-sm p-2 rounded-lg bg-white border border-red-100">
                <span className="inline-flex px-2 py-0.5 rounded bg-red-100 text-red-800 font-medium text-xs">Red</span>
                <span className="inline-flex px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-medium text-xs">For Professional to fix</span>
                <span className="font-medium">{issue.worker_name}</span>
                <span className="text-gray-500">{issue.project_title}</span>
                <span className="text-red-700">{issue.description}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-red-700/80 py-2">No red compliance issues right now. When professionals have missing DAR or expired credentials, they will appear here and be visible up the chain.</p>
        )}
      </div>

      {/* Info */}
      <div className="card p-6 bg-blue-50/50">
        <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
          <ArrowUpCircle className="w-4 h-4" /> Visibility up the chain
        </h3>
        <p className="text-sm text-gray-600">
          Red compliance here is automatically visible on the Contractor dashboard and the Client VP compliance overview. 
          Resolve issues (e.g. missing SafePass or DAR) before endorsement; the system blocks endorsement until requirements are met.
        </p>
      </div>
    </div>
  );
}
