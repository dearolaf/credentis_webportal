import React, { useState, useEffect } from 'react';
import { ShieldCheck, AlertTriangle, CheckCircle, XCircle, Search, ArrowUpCircle } from 'lucide-react';
import api from '../../services/api';

export default function ComplianceMonitoring() {
  const [workers, setWorkers] = useState([]);
  const [escalated, setEscalated] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    Promise.all([
      api.get('/compliance/workers'),
      api.get('/compliance/escalated'),
    ]).then(([w, e]) => {
      setWorkers(w.data || []);
      setEscalated(e.data?.issues || []);
      setLoading(false);
    });
  }, []);

  const fromSubs = escalated.filter(i => i.source_tier === 'subcontractor');
  const fromContractor = escalated.filter(i => i.source_tier === 'contractor');

  // Partner-level view (contractor + subs) grouped from escalated issues
  const partnerGroups = escalated.reduce((acc, issue) => {
    if (issue.source_tier !== 'contractor' && issue.source_tier !== 'subcontractor') return acc;
    const key = `${issue.source_tier}:${issue.source_entity_name || 'Unknown'}`;
    if (!acc[key]) {
      acc[key] = {
        name: issue.source_entity_name || 'Unknown',
        tier: issue.source_tier,
        issueCount: 0,
        workers: new Set(),
      };
    }
    acc[key].issueCount += 1;
    acc[key].workers.add(issue.worker_id);
    return acc;
  }, {});
  const partnerList = Object.values(partnerGroups).map(p => ({
    name: p.name,
    tier: p.tier,
    issueCount: p.issueCount,
    workerCount: p.workers.size,
  }));

  const filtered = workers.filter(w => {
    if (filter !== 'all' && w.complianceStatus !== filter) return false;
    if (search && !`${w.first_name} ${w.last_name}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const compliant = workers.filter(w => w.complianceStatus === 'compliant').length;
  const atRisk = workers.filter(w => w.complianceStatus === 'at_risk').length;
  const nonCompliant = workers.filter(w => w.complianceStatus === 'non_compliant').length;

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Compliance Monitoring</h2>
        <p className="text-gray-500 text-sm mt-1">Track professional compliance, credential expiry, and safety status</p>
      </div>

      {/* Red list – always visible at Client level; red at bottom (Sub → Contractor) is visible at top */}
      <div className="card border-2 border-red-200 bg-red-50/50 p-6">
        <h3 className="font-semibold text-red-900 flex items-center gap-2 mb-3">
          <ArrowUpCircle className="w-5 h-5" />
          Escalated compliance issues (red list)
        </h3>
        <p className="text-sm text-red-800 mb-4">Red compliance at Subcontractor or Contractor level is visible here. Each issue is <strong>for the Contractor to fix</strong> (or ensure the Sub/Professional fixes). Same red list is visible at Contractor and Subcontractor level so problems at the bottom are visible at the top.</p>
        {escalated.length > 0 ? (
          <div className="space-y-4">
            {fromSubs.length > 0 && (
              <div className="rounded-xl border border-red-200 bg-white p-4">
                <p className="text-xs font-semibold text-red-700 uppercase tracking-wide mb-2">From Subcontractors</p>
                <ul className="space-y-2">
                  {fromSubs.map((issue, i) => (
                    <li key={i} className={`flex flex-wrap items-center gap-2 text-sm p-2 rounded-lg ${issue.unresolved_over_24h ? 'bg-red-100 border border-red-300' : ''}`}>
                      <span className="inline-flex items-center px-2 py-0.5 rounded bg-red-100 text-red-800 font-medium">Red</span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-medium text-xs">For Contractor to fix</span>
                      {issue.unresolved_over_24h && <span className="inline-flex items-center px-2 py-0.5 rounded bg-red-200 text-red-900 font-semibold text-xs">Unresolved &gt; 24h</span>}
                      <span className="font-medium">{issue.worker_name}</span>
                      <span className="text-gray-500">· {issue.project_title}</span>
                      <span className="text-gray-500">· {issue.source_entity_name}</span>
                      <span className="text-red-700">{issue.description}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {fromContractor.length > 0 && (
              <div className="rounded-xl border border-red-200 bg-white p-4">
                <p className="text-xs font-semibold text-red-700 uppercase tracking-wide mb-2">From Contractor</p>
                <ul className="space-y-2">
                  {fromContractor.map((issue, i) => (
                    <li key={i} className={`flex flex-wrap items-center gap-2 text-sm p-2 rounded-lg ${issue.unresolved_over_24h ? 'bg-red-100 border border-red-300' : ''}`}>
                      <span className="inline-flex items-center px-2 py-0.5 rounded bg-red-100 text-red-800 font-medium">Red</span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-medium text-xs">For Contractor to fix</span>
                      {issue.unresolved_over_24h && <span className="inline-flex items-center px-2 py-0.5 rounded bg-red-200 text-red-900 font-semibold text-xs">Unresolved &gt; 24h</span>}
                      <span className="font-medium">{issue.worker_name}</span>
                      <span className="text-gray-500">· {issue.project_title}</span>
                      <span className="text-red-700">{issue.description}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-red-700/80 py-2">No red compliance issues right now. When there are issues in the supply chain they appear here and are visible at Contractor and Subcontractor level too.</p>
        )}
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="stat-card flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center"><CheckCircle className="w-5 h-5 text-green-600" /></div>
          <div><p className="text-2xl font-bold text-green-600">{compliant}</p><p className="text-sm text-gray-500">Compliant</p></div>
        </div>
        <div className="stat-card flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center"><AlertTriangle className="w-5 h-5 text-amber-600" /></div>
          <div><p className="text-2xl font-bold text-amber-600">{atRisk}</p><p className="text-sm text-gray-500">At Risk</p></div>
        </div>
        <div className="stat-card flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center"><XCircle className="w-5 h-5 text-red-600" /></div>
          <div><p className="text-2xl font-bold text-red-600">{nonCompliant}</p><p className="text-sm text-gray-500">Non-Compliant</p></div>
        </div>
      </div>

      {/* Partner-level compliance (Contractor + Subcontractors) */}
      {partnerList.length > 0 && (
        <div className="card p-4">
          <h3 className="font-semibold text-gray-900 mb-2">Partner compliance overview</h3>
          <p className="text-sm text-gray-600 mb-3">
            View red compliance aggregated by partner. Issues here roll up into the red list above and are <strong>for the Contractor to fix</strong> (ensuring Subs and Professionals resolve them).
          </p>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left py-2 px-3 font-medium text-gray-500">Partner</th>
                <th className="text-left py-2 px-3 font-medium text-gray-500">Role</th>
                <th className="text-center py-2 px-3 font-medium text-gray-500">Red issues</th>
                <th className="text-center py-2 px-3 font-medium text-gray-500">Affected professionals</th>
              </tr>
            </thead>
            <tbody>
              {partnerList.map((p, i) => (
                <tr key={i} className="border-b border-gray-50">
                  <td className="py-2 px-3 text-gray-900">{p.name}</td>
                  <td className="py-2 px-3 text-gray-600 capitalize">{p.tier}</td>
                  <td className="py-2 px-3 text-center text-red-700 font-semibold">{p.issueCount}</td>
                  <td className="py-2 px-3 text-center text-gray-700">{p.workerCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Filters */}
      <div className="card p-4 flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" placeholder="Search professionals..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
        </div>
        <div className="flex gap-2">
          {['all', 'compliant', 'at_risk', 'non_compliant'].map(f => (
            <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filter === f ? 'bg-primary-50 text-primary-700' : 'text-gray-500 hover:bg-gray-50'}`}>
              {f === 'all' ? 'All' : f.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}
            </button>
          ))}
        </div>
      </div>

      {/* Workers table */}
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="text-left py-3 px-4 font-medium text-gray-500">Professional</th>
              <th className="text-left py-3 px-4 font-medium text-gray-500">Nationality</th>
              <th className="text-center py-3 px-4 font-medium text-gray-500">Credentials</th>
              <th className="text-center py-3 px-4 font-medium text-gray-500">Badges</th>
              <th className="text-center py-3 px-4 font-medium text-gray-500">Verified</th>
              <th className="text-left py-3 px-4 font-medium text-gray-500">Status</th>
              <th className="text-left py-3 px-4 font-medium text-gray-500">Issues</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(w => (
              <tr key={w.id} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="py-3 px-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-xs font-semibold text-primary-700">
                      {w.first_name?.[0]}{w.last_name?.[0]}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{w.first_name} {w.last_name}</p>
                      <p className="text-xs text-gray-500 font-mono">{w.did?.substring(0, 20)}...</p>
                    </div>
                  </div>
                </td>
                <td className="py-3 px-4 text-gray-600">{w.nationality}</td>
                <td className="py-3 px-4 text-center">{w.credentialCount}</td>
                <td className="py-3 px-4 text-center">{w.badgeCount}</td>
                <td className="py-3 px-4 text-center">{w.is_verified ? <CheckCircle className="w-4 h-4 text-green-500 mx-auto" /> : <XCircle className="w-4 h-4 text-gray-300 mx-auto" />}</td>
                <td className="py-3 px-4">
                  <span className={
                    w.complianceStatus === 'compliant' ? 'badge-green' :
                    w.complianceStatus === 'at_risk' ? 'badge-amber' : 'badge-red'
                  }>{w.complianceStatus?.replace('_', ' ')}</span>
                </td>
                <td className="py-3 px-4 text-xs text-gray-500">{w.issues?.join(', ') || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <div className="p-8 text-center text-gray-500">No professionals match the current filters</div>}
      </div>
    </div>
  );
}
