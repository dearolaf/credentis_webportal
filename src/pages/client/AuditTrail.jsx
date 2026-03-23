import React, { useState, useEffect } from 'react';
import { FileText, Link as LinkIcon, Shield, Clock, Filter, Download, Search } from 'lucide-react';
import api from '../../services/api';

export default function AuditTrail() {
  const [entries, setEntries] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filterAction, setFilterAction] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    Promise.all([
      api.get('/audit?limit=100'),
      api.get('/audit/stats'),
    ]).then(([e, s]) => {
      setEntries(e.data?.entries || []);
      setStats(s.data);
      setLoading(false);
    });
  }, []);

  const downloadCSV = () => {
    const filtered = filterAction === 'all' ? entries : entries.filter(e => e.action === filterAction);
    const headers = ['Date', 'Action', 'Entity Type', 'Actor', 'Actor Role', 'Blockchain TX', 'Hash'];
    const rows = filtered.map(e => [
      e.created_at,
      e.action,
      e.entity_type,
      `${e.actor_first_name} ${e.actor_last_name}`,
      e.actor_role,
      e.blockchain_tx || '',
      e.hash || '',
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.map(v => `"${(v || '').replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `credentis-audit-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadJSON = () => {
    const filtered = filterAction === 'all' ? entries : entries.filter(e => e.action === filterAction);
    const report = {
      generated: new Date().toISOString(),
      platform: 'Credentis PoC',
      totalEntries: filtered.length,
      blockchainAnchored: filtered.filter(e => e.blockchain_tx).length,
      entries: filtered,
    };
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `credentis-audit-report-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredByAction = filterAction === 'all' ? entries : entries.filter(e => e.action === filterAction);
  const searchLower = searchQuery.trim().toLowerCase();
  const filteredEntries = searchLower
    ? filteredByAction.filter(e => {
        const actor = `${e.actor_first_name || ''} ${e.actor_last_name || ''}`.toLowerCase();
        const action = (e.action || '').toLowerCase();
        const entity = (e.entity_type || '').toLowerCase();
        const details = (e.details && typeof e.details === 'string' ? e.details : JSON.stringify(e.details || '')).toLowerCase();
        return actor.includes(searchLower) || action.includes(searchLower) || entity.includes(searchLower) || details.includes(searchLower);
      })
    : filteredByAction;

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Audit Trail</h2>
          <p className="text-gray-500 text-sm mt-1">Blockchain-anchored, tamper-evident audit log of all platform actions</p>
        </div>
        <div className="flex gap-2">
          <button onClick={downloadCSV} className="btn-secondary flex items-center gap-2 text-sm py-2"><Download className="w-4 h-4" /> CSV</button>
          <button onClick={downloadJSON} className="btn-secondary flex items-center gap-2 text-sm py-2"><Download className="w-4 h-4" /> JSON</button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="stat-card flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center"><FileText className="w-5 h-5 text-blue-600" /></div>
          <div><p className="text-2xl font-bold">{stats?.totalEntries || 0}</p><p className="text-sm text-gray-500">Total Entries</p></div>
        </div>
        <div className="stat-card flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center"><LinkIcon className="w-5 h-5 text-green-600" /></div>
          <div><p className="text-2xl font-bold text-green-600">{stats?.blockchainAnchored || 0}</p><p className="text-sm text-gray-500">Blockchain Anchored</p></div>
        </div>
        <div className="stat-card flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center"><Shield className="w-5 h-5 text-purple-600" /></div>
          <div><p className="text-2xl font-bold text-purple-600">{stats?.actionCounts?.length || 0}</p><p className="text-sm text-gray-500">Action Types</p></div>
        </div>
      </div>

      {/* Action counts */}
      {stats?.actionCounts && (
        <div className="card p-6">
          <h3 className="font-semibold text-gray-900 mb-3">Actions by Type</h3>
          <div className="flex flex-wrap gap-2">
            {stats.actionCounts.map(ac => (
              <span key={ac.action} className="badge-blue">{ac.action.replace(/_/g, ' ')} ({ac.count})</span>
            ))}
          </div>
        </div>
      )}

      {/* Search and filter */}
      <div className="card p-4 space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by actor, action, entity type..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none"
            />
          </div>
        </div>
        {stats?.actionCounts && (
          <div className="flex flex-wrap items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <button onClick={() => setFilterAction('all')} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filterAction === 'all' ? 'bg-primary-50 text-primary-700' : 'text-gray-500 hover:bg-gray-50'}`}>All</button>
            {stats.actionCounts.slice(0, 8).map(ac => (
              <button key={ac.action} onClick={() => setFilterAction(ac.action)} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filterAction === ac.action ? 'bg-primary-50 text-primary-700' : 'text-gray-500 hover:bg-gray-50'}`}>
                {ac.action.replace(/_/g, ' ')}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Log entries */}
      <div className="card overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Audit Log Entries</h3>
          <span className="text-sm text-gray-500">{filteredEntries.length} entries</span>
        </div>
        <div className="divide-y divide-gray-50 max-h-[600px] overflow-y-auto">
          {filteredEntries.map(entry => (
            <div key={entry.id} className="px-6 py-3 hover:bg-gray-50 flex items-start gap-4">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${entry.blockchain_tx ? 'bg-green-50' : 'bg-gray-50'}`}>
                {entry.blockchain_tx ? <LinkIcon className="w-4 h-4 text-green-600" /> : <Clock className="w-4 h-4 text-gray-400" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-sm font-medium text-gray-900">{entry.action?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</span>
                  <span className="text-xs text-gray-400">•</span>
                  <span className="text-xs text-gray-500">{entry.entity_type}</span>
                </div>
                <p className="text-xs text-gray-500">
                  By: {entry.actor_first_name} {entry.actor_last_name} ({entry.actor_role})
                </p>
                {entry.blockchain_tx && (
                  <p className="text-xs text-green-600 font-mono mt-0.5">TX: {entry.blockchain_tx}</p>
                )}
                {entry.hash && (
                  <p className="text-xs text-gray-400 font-mono">Hash: {entry.hash?.substring(0, 32)}...</p>
                )}
              </div>
              <span className="text-xs text-gray-400 flex-shrink-0">{formatDate(entry.created_at)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
