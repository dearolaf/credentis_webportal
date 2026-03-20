import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { Users, FolderKanban, ShieldCheck, Award, CheckCircle, Clock, AlertTriangle, Send, X, XCircle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import api from '../../services/api';

export default function ContractorDashboard() {
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [compliance, setCompliance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showDelegateModal, setShowDelegateModal] = useState(false);
  const [delegateProjectId, setDelegateProjectId] = useState('');
  const [partners, setPartners] = useState([]);

  const [escalated, setEscalated] = useState([]);

  const loadData = () => {
    Promise.all([
      api.get('/projects'),
      api.get('/onboarding/tasks'),
      api.get('/compliance/dashboard'),
      api.get('/compliance/escalated'),
    ]).then(([p, t, c, e]) => {
      setProjects(p.data || []);
      setTasks(t.data || []);
      setCompliance(c.data);
      setEscalated(e.data?.issues || []);
      setLoading(false);
    });
  };

  useEffect(() => { loadData(); }, []);

  const openDelegateToSub = async (projectId) => {
    setDelegateProjectId(projectId);
    const res = await api.get('/onboarding/partners');
    setPartners(res.data || []);
    setShowDelegateModal(true);
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Contractor Dashboard</h2>
        <p className="text-gray-500 text-sm mt-1">Manage delegated projects, professionals, and compliance</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={FolderKanban} label="Delegated Projects" value={projects.length} color="blue" />
        <StatCard icon={Users} label="Managed Professionals" value={compliance?.summary?.totalWorkers || 0} color="green" />
        <StatCard icon={ShieldCheck} label="Compliant" value={compliance?.expirySummary?.green || 0} color="emerald" />
        <StatCard icon={AlertTriangle} label="Pending Tasks" value={tasks.length} color="amber" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Projects with delegation actions */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Delegated Projects</h3>
          </div>
          <div className="space-y-3">
            {projects.slice(0, 6).map(project => (
              <div key={project.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50">
                <div className="w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center">
                  <FolderKanban className="w-5 h-5 text-primary-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{project.title}</p>
                  <p className="text-xs text-gray-500">{project.location} • {project.worker_count || 0} professionals</p>
                </div>
                <button onClick={() => openDelegateToSub(project.id)} className="p-1.5 rounded-lg hover:bg-purple-50 text-purple-600" title="Delegate to subcontractor">
                  <Send className="w-4 h-4" />
                </button>
                <span className="badge-green">{project.status}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Workforce actions */}
        <div className="card p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="space-y-3">
            <Link to="/contractor/workers" className="flex items-center gap-4 p-4 rounded-xl bg-primary-50 hover:bg-primary-100 transition-colors">
              <Users className="w-6 h-6 text-primary-600" />
              <div>
                <p className="font-medium text-primary-700">Manage Professionals</p>
                <p className="text-sm text-primary-600/70">Onboard, verify credentials, endorse participation</p>
              </div>
            </Link>
            <Link to="/onboarding" className="flex items-center gap-4 p-4 rounded-xl bg-green-50 hover:bg-green-100 transition-colors">
              <CheckCircle className="w-6 h-6 text-green-600" />
              <div>
                <p className="font-medium text-green-700">Partner Onboarding</p>
                <p className="text-sm text-green-600/70">Manage PQQ submissions and subcontractor onboarding</p>
              </div>
            </Link>
            <Link to="/audit" className="flex items-center gap-4 p-4 rounded-xl bg-purple-50 hover:bg-purple-100 transition-colors">
              <Award className="w-6 h-6 text-purple-600" />
              <div>
                <p className="font-medium text-purple-700">Issue Badges & Awards</p>
                <p className="text-sm text-purple-600/70">Recognise professional achievements and compliance</p>
              </div>
            </Link>
          </div>

          {/* Tasks */}
          {tasks.length > 0 && (
            <div className="mt-6">
              <h4 className="font-medium text-gray-900 mb-3">Pending Tasks</h4>
              {tasks.map((task, i) => (
                <div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-amber-50 mb-2">
                  <Clock className="w-4 h-4 text-amber-600" />
                  <span className="text-sm text-amber-800">{task.label} ({task.count})</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Red list – always visible at Contractor level; issues from Subs or your team, with who must fix */}
      <div className="card p-6 border-2 border-red-200 bg-red-50/30">
        <h3 className="font-semibold text-red-900 flex items-center gap-2 mb-2">
          <AlertTriangle className="w-5 h-5" />
          Escalated compliance issues (red list)
        </h3>
        <p className="text-sm text-red-800 mb-4">Red at Subcontractor or in your team is visible here and to the Client. Each issue shows who must fix it: <strong>Subcontractor</strong> or <strong>Professional</strong>.</p>
        {escalated.length > 0 ? (
          <div className="space-y-3">
            {escalated.filter(i => i.source_tier === 'subcontractor').map((issue, i) => (
              <div key={i} className="flex flex-wrap items-center gap-2 text-sm p-2 rounded-lg bg-white border border-red-100">
                <span className="inline-flex px-2 py-0.5 rounded bg-red-100 text-red-800 font-medium text-xs">Red</span>
                <span className="inline-flex px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-medium text-xs">For Subcontractor to fix</span>
                <span className="font-medium">{issue.worker_name}</span>
                <span className="text-gray-500">{issue.source_entity_name}</span>
                <span className="text-red-700">{issue.description}</span>
              </div>
            ))}
            {escalated.filter(i => i.source_tier === 'contractor').map((issue, i) => (
              <div key={i} className="flex flex-wrap items-center gap-2 text-sm p-2 rounded-lg bg-white border border-amber-200">
                <span className="inline-flex px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-medium text-xs">Your team</span>
                <span className="inline-flex px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-medium text-xs">For Professional to fix</span>
                <span className="font-medium">{issue.worker_name}</span>
                <span className="text-red-700">{issue.description}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-red-700/80 py-2">No red compliance issues right now. When Subs or your professionals have missing DAR or expired credentials, they appear here and are visible to the Client.</p>
        )}
      </div>

      {/* Compliance chart */}
      {compliance?.nationalityBreakdown && (
        <div className="card p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Workforce Composition</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={compliance.nationalityBreakdown}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="nationality" tick={{ fontSize: 12 }} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#10b981" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Delegate to Subcontractor Modal */}
      {showDelegateModal && (
        <DelegateToSubModal
          projectId={delegateProjectId}
          partners={partners}
          onClose={() => setShowDelegateModal(false)}
          onDelegated={() => { setShowDelegateModal(false); loadData(); }}
        />
      )}
    </div>
  );
}

function DelegateToSubModal({ projectId, partners, onClose, onDelegated }) {
  const [selectedPartner, setSelectedPartner] = useState('');
  const [scope, setScope] = useState('workforce');
  const [submitting, setSubmitting] = useState(false);

  const subPartners = partners.filter(p => p.role === 'subcontractor');

  const handleDelegate = async () => {
    if (!selectedPartner) return;
    setSubmitting(true);
    const res = await api.post(`/projects/${projectId}/delegate`, {
      delegatee_id: selectedPartner,
      scope: { type: scope },
    });
    setSubmitting(false);
    if (res.success) onDelegated();
  };

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">Delegate to Subcontractor</h3>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100"><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Select Subcontractor</label>
            {subPartners.length > 0 ? (
              <select value={selectedPartner} onChange={e => setSelectedPartner(e.target.value)} className="w-full border border-gray-200 rounded-xl py-2.5 px-3 text-sm focus:ring-2 focus:ring-primary-500 outline-none">
                <option value="">Choose a subcontractor...</option>
                {subPartners.map(p => <option key={p.id} value={p.id}>{p.company_name} - {p.first_name} {p.last_name}</option>)}
              </select>
            ) : (
              <p className="text-sm text-gray-500 p-3 bg-gray-50 rounded-lg">No subcontractors available. Invite them first via Partner Onboarding.</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Scope</label>
            <select value={scope} onChange={e => setScope(e.target.value)} className="w-full border border-gray-200 rounded-xl py-2.5 px-3 text-sm focus:ring-2 focus:ring-primary-500 outline-none">
              <option value="workforce">Workforce Management</option>
              <option value="compliance">Compliance Management</option>
              <option value="full">Full Scope</option>
            </select>
          </div>
          <p className="text-xs text-gray-500">This delegation requires client approval. It will be logged on the blockchain.</p>
          <div className="flex gap-3">
            <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button onClick={handleDelegate} disabled={!selectedPartner || submitting} className="btn-primary flex-1 flex items-center justify-center gap-2">
              {submitting ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" /> : <><Send className="w-4 h-4" /> Delegate</>}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

function StatCard({ icon: Icon, label, value, color }) {
  const bg = { blue: 'bg-blue-50 text-blue-600', green: 'bg-green-50 text-green-600', emerald: 'bg-emerald-50 text-emerald-600', amber: 'bg-amber-50 text-amber-600' };
  return (
    <div className="stat-card flex items-center gap-3">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${bg[color]}`}><Icon className="w-5 h-5" /></div>
      <div><p className="text-2xl font-bold text-gray-900">{value}</p><p className="text-sm text-gray-500">{label}</p></div>
    </div>
  );
}
