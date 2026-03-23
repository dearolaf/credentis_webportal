import React, { useState, useEffect } from 'react';
import { Shield, Plus } from 'lucide-react';
import api from '../services/api';

/**
 * Compact DAR chips for VP detail (Compliance Requirements)
 */
export function ProjectDARChips({ projectId }) {
  const [list, setList] = useState([]);
  useEffect(() => {
    if (!projectId) return;
    api.get(`/projects/${projectId}/dar`).then(res => setList(res.data || [])).catch(() => {});
  }, [projectId]);
  if (list.length === 0) return <div className="flex flex-wrap gap-2"><span className="text-sm text-gray-500">No DAR requirements yet</span></div>;
  return (
    <div className="flex flex-wrap gap-2">
      {list.map(r => (
        <span key={r.id} className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-primary-50 text-primary-800 border border-primary-100">
          {r.label}
        </span>
      ))}
    </div>
  );
}

/**
 * Displays DAR (Data Access Request) requirements for a project in cascading order:
 * Client → Contractor → Subcontractors. Allows adding requirements when user has permission.
 */
export default function ProjectDARSection({ projectId, projectTitle, canAdd, onAdded }) {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [addKey, setAddKey] = useState('');
  const [addLabel, setAddLabel] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!projectId) return;
    setLoading(true);
    api.get(`/projects/${projectId}/dar`).then(res => {
      setList(res.data || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [projectId]);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!addKey.trim() || !addLabel.trim()) return;
    setSubmitting(true);
    const res = await api.post(`/projects/${projectId}/dar`, { requirement_key: addKey.trim(), label: addLabel.trim() });
    setSubmitting(false);
    if (res.success) {
      setList(prev => [...prev, res.data]);
      setAddKey('');
      setAddLabel('');
      setShowAdd(false);
      onAdded?.();
    }
  };

  const bySource = list.reduce((acc, r) => {
    const role = r.added_by_role === 'client' ? 'Client' : r.added_by_role === 'contractor' ? 'Contractor' : 'Subcontractor';
    if (!acc[role]) acc[role] = [];
    acc[role].push(r);
    return acc;
  }, {});

  const sourceOrder = ['Client', 'Contractor', 'Subcontractor'];

  if (!projectId) return null;

  return (
    <div className="mt-6 pt-4 border-t border-gray-100">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-medium text-gray-900 flex items-center gap-2">
          <Shield className="w-4 h-4 text-primary-500" />
          DAR (Chain of Authority)
        </h4>
        {canAdd && (
          <button type="button" onClick={() => setShowAdd(!showAdd)} className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1">
            <Plus className="w-4 h-4" /> Add requirement
          </button>
        )}
      </div>
      {showAdd && canAdd && (
        <form onSubmit={handleAdd} className="mb-4 p-4 rounded-xl bg-gray-50 flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[140px]">
            <label className="block text-xs font-medium text-gray-500 mb-1">Key (e.g. rtw, safepass)</label>
            <input type="text" value={addKey} onChange={e => setAddKey(e.target.value)} placeholder="e.g. manual_handling" className="w-full border border-gray-200 rounded-lg py-2 px-3 text-sm" required />
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-medium text-gray-500 mb-1">Label</label>
            <input type="text" value={addLabel} onChange={e => setAddLabel(e.target.value)} placeholder="e.g. Manual Handling" className="w-full border border-gray-200 rounded-lg py-2 px-3 text-sm" required />
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => setShowAdd(false)} className="px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-100">Cancel</button>
            <button type="submit" disabled={submitting} className="px-4 py-2 rounded-lg bg-primary-600 text-white text-sm hover:bg-primary-700 disabled:opacity-50">Add</button>
          </div>
        </form>
      )}
      {loading ? (
        <p className="text-sm text-gray-500">Loading requirements…</p>
      ) : list.length === 0 ? (
        <p className="text-sm text-gray-500">No DAR requirements yet. {canAdd && 'Add one above.'}</p>
      ) : (
        <div className="space-y-4">
          {sourceOrder.map(role => {
            const items = bySource[role] || [];
            if (items.length === 0) return null;
            const bg = role === 'Client' ? 'bg-blue-50' : role === 'Contractor' ? 'bg-green-50' : 'bg-purple-50';
            const border = role === 'Client' ? 'border-blue-100' : role === 'Contractor' ? 'border-green-100' : 'border-purple-100';
            return (
              <div key={role} className={`rounded-xl border ${border} ${bg} p-3`}>
                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">{role}</p>
                {role === 'Contractor' && items.length > 0 && (
                  <p className="text-xs text-gray-500 mb-2">EHS compliance (minimum: SafePass, Manual Handling, Working at Height)</p>
                )}
                <ul className="space-y-1.5">
                  {items.map(r => (
                    <li key={r.id} className="flex items-center gap-2 text-sm text-gray-800">
                      <span className="w-2 h-2 rounded-full bg-gray-400" />
                      <span>{r.label}</span>
                      {r.added_by_company && <span className="text-xs text-gray-500">({r.added_by_company})</span>}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
