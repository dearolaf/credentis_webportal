import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ShieldCheck, Users } from 'lucide-react';
import api from '../../services/api';

export default function PartnerCompliancePage({ portal = 'contractor' }) {
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState('');
  const [workers, setWorkers] = useState([]);
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadProjectsAndData = async () => {
    const pRes = await api.get('/projects');
    const list = pRes.data || [];
    setProjects(list);
    if (list.length > 0) {
      const pid = list[0].id;
      setSelectedProject(pid);
      await loadCompliance(pid);
    } else {
      setLoading(false);
    }
  };

  const loadCompliance = async (projectId) => {
    setLoading(true);
    const [wRes, eRes] = await Promise.all([
      api.get(`/compliance/workers?project_id=${projectId}`),
      api.get(`/compliance/escalated?project_id=${projectId}`),
    ]);
    setWorkers(wRes.data || []);
    setIssues(eRes.data?.issues || []);
    setLoading(false);
  };

  useEffect(() => {
    loadProjectsAndData();
  }, []);

  const stats = useMemo(() => {
    const total = workers.length;
    const compliant = workers.filter(w => w.complianceStatus === 'compliant').length;
    const atRisk = workers.filter(w => w.complianceStatus === 'at_risk').length;
    const nonCompliant = workers.filter(w => w.complianceStatus === 'non_compliant').length;
    return { total, compliant, atRisk, nonCompliant };
  }, [workers]);

  const title = portal === 'subcontractor' ? 'Subcontractor Compliance' : 'Contractor Compliance';
  const subtitle = portal === 'subcontractor'
    ? 'Red issues here are visible up the chain to Contractor and Client.'
    : 'Red issues from your team and subcontractors are visible to the Client.';

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
        <p className="text-gray-500 text-sm mt-1">{subtitle}</p>
      </div>

      <div className="card p-4 flex items-center gap-4">
        <label className="text-sm font-medium text-gray-700">Project:</label>
        <select
          value={selectedProject}
          onChange={async (e) => {
            const pid = e.target.value;
            setSelectedProject(pid);
            await loadCompliance(pid);
          }}
          className="flex-1 border border-gray-200 rounded-xl py-2 px-3 text-sm focus:ring-2 focus:ring-primary-500 outline-none"
        >
          {projects.map(p => (
            <option key={p.id} value={p.id}>{p.title}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users} label="Professionals" value={stats.total} color="blue" />
        <StatCard icon={ShieldCheck} label="Compliant" value={stats.compliant} color="green" />
        <StatCard icon={AlertTriangle} label="At Risk" value={stats.atRisk} color="amber" />
        <StatCard icon={AlertTriangle} label="Non-compliant" value={stats.nonCompliant} color="red" />
      </div>

      <div className="card p-6 border-2 border-red-200 bg-red-50/30">
        <h3 className="font-semibold text-red-900 flex items-center gap-2 mb-2">
          <AlertTriangle className="w-5 h-5" />
          Escalated compliance issues (red list)
        </h3>
        {issues.length > 0 ? (
          <div className="space-y-2">
            {issues.map((issue, idx) => (
              <div key={idx} className="flex flex-wrap items-center gap-2 text-sm p-2 rounded-lg bg-white border border-red-100">
                <span className="inline-flex px-2 py-0.5 rounded bg-red-100 text-red-800 font-medium text-xs">Red</span>
                <span className="font-medium">{issue.worker_name}</span>
                <span className="text-gray-500">{issue.project_title}</span>
                <span className="text-red-700">{issue.description}</span>
                {issue.action_required_by && (
                  <span className="inline-flex px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-medium text-xs">
                    For {issue.action_required_by} to fix
                  </span>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-red-700/80 py-2">No red compliance issues for this project.</p>
        )}
      </div>

      <div className="card overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">Professional Compliance</h3>
        </div>
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading…</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left py-3 px-4 font-medium text-gray-500">Professional</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500">Role</th>
                <th className="text-center py-3 px-4 font-medium text-gray-500">DAR</th>
                <th className="text-center py-3 px-4 font-medium text-gray-500">Status</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500">Issues</th>
              </tr>
            </thead>
            <tbody>
              {workers.map(w => (
                <tr key={w.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="py-3 px-4">
                    <p className="font-medium text-gray-900">{w.first_name} {w.last_name}</p>
                    <p className="text-xs text-gray-400">{w.nationality || '—'}</p>
                  </td>
                  <td className="py-3 px-4 text-gray-600">{w.role_on_project || '—'}</td>
                  <td className="py-3 px-4 text-center">
                    {w.darTotal > 0 ? (
                      <div className="flex flex-col items-center gap-0.5">
                        <span className={w.darSatisfied === w.darTotal ? 'text-green-600 font-medium' : 'text-amber-600'}>
                          {w.darSatisfied}/{w.darTotal} satisfied
                        </span>
                        {w.darIssued > 0 && <span className="text-xs text-indigo-600">{w.darIssued} issued (awaiting)</span>}
                      </div>
                    ) : '—'}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className={
                      w.complianceStatus === 'compliant' ? 'badge-green' :
                      w.complianceStatus === 'at_risk' ? 'badge-amber' : 'badge-red'
                    }>
                      {w.complianceStatus === 'compliant' ? 'Compliant' : w.complianceStatus === 'at_risk' ? 'At risk' : 'Non-compliant'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-xs text-gray-600 max-w-[260px]">
                    {Array.isArray(w.issues) && w.issues.length > 0 ? w.issues.join('; ') : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }) {
  const bg = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    amber: 'bg-amber-50 text-amber-600',
    red: 'bg-red-50 text-red-600',
  };
  return (
    <div className="stat-card flex items-center gap-3">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${bg[color] || bg.blue}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-sm text-gray-500">{label}</p>
      </div>
    </div>
  );
}
