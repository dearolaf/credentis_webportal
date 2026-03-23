import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle, XCircle, Shield, UserCheck, Eye, FileText, Send, X, BadgeCheck, Bell, ClipboardList } from 'lucide-react';
import api from '../../services/api';
import DemoResetButton from '../../components/DemoResetButton';

/**
 * Three-state DAR requirement row for Contractor/Subcontractor portals:
 *   not_issued  → grey card  → "Issue to Professional" button
 *   issued      → amber card → "Awaiting professional" + Mark Satisfied override
 *   satisfied   → green card → checkmark only
 */
/**
 * workerName is passed explicitly so handlers never rely on a stale closure.
 */
function DARRequirementRow({ requirement: r, workerId, workerName, credentials, onIssue, onSatisfy }) {
  const [selectedCred, setSelectedCred] = React.useState('');
  const [loadingIssue, setLoadingIssue] = React.useState(false);
  const [loadingSatisfy, setLoadingSatisfy] = React.useState(false);

  const handleIssue = async () => {
    setLoadingIssue(true);
    await onIssue(workerId, workerName, r.id);
    setLoadingIssue(false);
  };

  const handleSatisfy = async () => {
    setLoadingSatisfy(true);
    await onSatisfy(workerId, workerName, r.id, selectedCred || null);
    setLoadingSatisfy(false);
  };

  const cardClass =
    r.status === 'satisfied' ? 'bg-green-50 border-green-200' :
    r.status === 'issued'    ? 'bg-amber-50 border-amber-200' :
                               'bg-gray-50 border-gray-200';

  const badge =
    r.status === 'satisfied' ? <span className="badge-green">Satisfied</span> :
    r.status === 'issued'    ? <span className="badge-amber">Issued – awaiting</span> :
                               <span className="text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full text-xs font-medium">Not issued</span>;

  return (
    <div className={`p-3 rounded-xl border ${cardClass}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-800">{r.label}</span>
        {badge}
      </div>

      {r.status === 'not_issued' && (
        <button
          onClick={handleIssue}
          disabled={loadingIssue}
          className="mt-1 flex items-center gap-1.5 px-3 py-1.5 text-xs bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 font-medium"
        >
          <Bell className="w-3 h-3" />
          {loadingIssue ? 'Issuing…' : 'Issue to Professional'}
        </button>
      )}

      {r.status === 'issued' && (
        <div className="flex gap-2 mt-2">
          <select
            className="flex-1 text-xs border border-gray-300 rounded-lg px-2 py-1"
            value={selectedCred}
            onChange={e => setSelectedCred(e.target.value)}
          >
            <option value="">No credential (override)</option>
            {credentials.map(c => (
              <option key={c.id} value={c.id}>{c.title} ({c.status})</option>
            ))}
          </select>
          <button
            onClick={handleSatisfy}
            disabled={loadingSatisfy}
            className="flex items-center gap-1 px-2 py-1 text-xs bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            <BadgeCheck className="w-3 h-3" />
            {loadingSatisfy ? '…' : 'Mark satisfied'}
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * Quick-issue modal: shows all DAR requirements for the project for a specific professional.
 * Not-issued items can be toggled and issued in bulk.
 * Already issued / satisfied items are shown as read-only status chips.
 */
function IssueDARModal({ panel, onClose, onIssued, showToast }) {
  const [selected, setSelected] = React.useState(new Set());
  const [loading, setLoading] = React.useState(false);

  if (!panel) return null;
  const { workerId, workerName, requirements = [], issueOne } = panel;

  const notIssued = requirements.filter(r => r.status === 'not_issued');

  const toggle = (id) =>
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const handleSelectAll = () => {
    if (selected.size === notIssued.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(notIssued.map(r => r.id)));
    }
  };

  const handleIssue = async () => {
    if (selected.size === 0) return;
    setLoading(true);
    const results = await Promise.all(
      [...selected].map(reqId => issueOne(workerId, reqId))
    );
    setLoading(false);
    console.log('[IssueDARModal] issue results:', results);
    const failed = results.filter(r => r?.success === false);
    if (failed.length === 0) {
      showToast?.(`${results.length} DAR requirement${results.length > 1 ? 's' : ''} issued to ${workerName}`);
      onIssued();
      onClose();
    } else {
      const msg = failed[0]?.message || 'Server error';
      showToast?.(`Failed: ${msg}`, 'error');
      // Still close and refresh so any partial successes are reflected
      onIssued();
      onClose();
    }
  };

  const statusBadge = (status) => {
    if (status === 'satisfied') return <span className="badge-green text-xs">Satisfied</span>;
    if (status === 'issued')    return <span className="badge-amber text-xs">Issued – awaiting</span>;
    return null;
  };

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div>
            <h3 className="font-semibold text-gray-900">Issue DAR</h3>
            <p className="text-xs text-gray-500 mt-0.5">{workerName}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-3">
          <p className="text-sm text-gray-600">
            Select which requirements to issue to this professional. They will appear in the Credentis Professional app and the professional can submit credentials to satisfy them.
          </p>

          {notIssued.length > 0 && (
            <button
              onClick={handleSelectAll}
              className="text-xs text-indigo-600 hover:underline"
            >
              {selected.size === notIssued.length ? 'Deselect all' : 'Select all'}
            </button>
          )}

          <div className="space-y-2">
            {requirements.map(r => (
              <div
                key={r.id}
                className={`flex items-center justify-between p-3 rounded-xl border ${
                  r.status === 'satisfied' ? 'bg-green-50 border-green-200 opacity-70' :
                  r.status === 'issued'    ? 'bg-amber-50 border-amber-200 opacity-80' :
                  selected.has(r.id)       ? 'bg-indigo-50 border-indigo-300' :
                                             'bg-gray-50 border-gray-200 cursor-pointer hover:border-indigo-300'
                }`}
                onClick={() => r.status === 'not_issued' && toggle(r.id)}
              >
                <div className="flex items-center gap-3">
                  {r.status === 'not_issued' ? (
                    <input
                      type="checkbox"
                      checked={selected.has(r.id)}
                      onChange={() => toggle(r.id)}
                      onClick={e => e.stopPropagation()}
                      className="w-4 h-4 rounded accent-indigo-600"
                    />
                  ) : (
                    <div className="w-4 h-4" />
                  )}
                  <span className="text-sm text-gray-800">{r.label}</span>
                </div>
                {statusBadge(r.status)}
              </div>
            ))}
          </div>

          {notIssued.length === 0 && (
            <p className="text-sm text-gray-500 text-center py-4">All requirements have been issued or satisfied.</p>
          )}

          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="flex-1 px-4 py-2 rounded-xl border border-gray-200 text-sm text-gray-700 hover:bg-gray-50">
              Cancel
            </button>
            <button
              onClick={handleIssue}
              disabled={selected.size === 0 || loading}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Bell className="w-4 h-4" />
              {loading ? 'Issuing…' : `Issue ${selected.size > 0 ? `(${selected.size})` : ''}`}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default function WorkerManagement() {
  const [workers, setWorkers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState('');
  const [loading, setLoading] = useState(true);
  const [workerDetail, setWorkerDetail] = useState(null);
  const [darStatusPanel, setDarStatusPanel] = useState(null);
  const [issueDARPanel, setIssueDARPanel] = useState(null);
  const [verificationPanel, setVerificationPanel] = useState(null);
  const [approvePanel, setApprovePanel] = useState(null);
  const [toast, setToast] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    api.get('/projects').then(res => {
      const p = res.data || [];
      setProjects(p);
      if (p.length > 0) {
        setSelectedProject(p[0].id);
        loadWorkers(p[0].id);
      } else {
        setLoading(false);
      }
    });
  }, []);

  const loadWorkers = async (projectId) => {
    setLoading(true);
    const [assignRes, compRes] = await Promise.all([
      api.get(`/projects/${projectId}/workers`),
      api.get(`/compliance/workers?project_id=${projectId}`),
    ]);
    const assignments = assignRes.data || [];
    const complianceList = compRes.data || [];
    const byWorkerId = Object.fromEntries(complianceList.map(c => [c.id, c]));
    const merged = assignments.map(a => {
      const comp = byWorkerId[a.worker_id];
      return {
        ...a,
        complianceStatus: comp?.complianceStatus ?? 'compliant',
        issues: comp?.issues ?? [],
        darSatisfied: comp?.darSatisfied,
        darIssued: comp?.darIssued,
        darTotal: comp?.darTotal,
      };
    });
    setWorkers(merged);
    setLoading(false);
  };

  const handleEndorse = async (projectId, assignmentId) => {
    const res = await api.put(`/projects/${projectId}/assignments/${assignmentId}/endorse`);
    if (res.success) {
      loadWorkers(projectId);
    } else {
      alert(res.message || 'Endorsement failed. Professional may have unsatisfied DAR or compliance issues.');
    }
  };

  const handleStatusChange = async (projectId, assignmentId, status) => {
    const res = await api.put(`/projects/${projectId}/assignments/${assignmentId}/status`, { status });
    if (res.success) {
      showToast(`Professional status updated to ${status}`);
      loadWorkers(projectId);
    } else {
      showToast(res.message || 'Failed to update status', 'error');
    }
  };

  const handleVerificationUpdate = async (workerId, passportStatus, biometricStatus) => {
    const res = await api.put(`/projects/${selectedProject}/workers/${workerId}/verification-status`, {
      passport_status: passportStatus,
      biometric_status: biometricStatus,
    });
    if (res.success) {
      showToast('Professional verification status updated');
      setVerificationPanel(null);
      loadWorkers(selectedProject);
    } else {
      showToast(res.message || 'Failed to update verification status', 'error');
    }
  };

  const loadWorkerCredentials = async (workerId) => {
    const [credRes, darRes] = await Promise.all([
      api.get(`/credentials?worker_id=${workerId}`),
      api.get(`/projects/${selectedProject}/workers/${workerId}/dar-status`),
    ]);
    setWorkerDetail({
      workerId,
      credentials: credRes.data || [],
      darStatus: darRes.success ? darRes.data : null,
      darError: darRes.success ? null : (darRes.message || 'Could not load DAR'),
    });
  };

  const loadDarStatus = async (workerId, workerName) => {
    const [darRes, credRes] = await Promise.all([
      api.get(`/projects/${selectedProject}/workers/${workerId}/dar-status`),
      api.get(`/credentials?worker_id=${workerId}`),
    ]);
    setDarStatusPanel({ workerId, workerName, ...darRes.data, credentials: credRes.data || [] });
  };

  const openIssueDARModal = async (workerId, workerName) => {
    const darRes = await api.get(`/projects/${selectedProject}/workers/${workerId}/dar-status`);
    setIssueDARPanel({
      workerId,
      workerName,
      requirements: darRes.data?.requirements || [],
      // Returns the full response so IssueDARModal can check success
      issueOne: (wId, reqId) =>
        api.post(`/projects/${selectedProject}/workers/${wId}/dar/${reqId}/issue`),
    });
  };

  // workerName is passed explicitly to avoid stale-closure issues with darStatusPanel
  const handleDarIssue = async (workerId, workerName, darRequirementId) => {
    const res = await api.post(`/projects/${selectedProject}/workers/${workerId}/dar/${darRequirementId}/issue`);
    if (res.success) {
      showToast(`DAR requirement issued to ${workerName}`);
      await loadDarStatus(workerId, workerName);
      loadWorkers(selectedProject);
    } else {
      showToast(res.message || 'Failed to issue DAR', 'error');
    }
  };

  const handleDarSatisfy = async (workerId, workerName, darRequirementId, credentialId) => {
    const body = credentialId ? { credential_id: credentialId } : {};
    const res = await api.put(`/projects/${selectedProject}/workers/${workerId}/dar/${darRequirementId}/satisfy`, body);
    if (res.success) {
      showToast(`DAR requirement marked as satisfied`);
      await loadDarStatus(workerId, workerName);
      loadWorkers(selectedProject);
    } else {
      showToast(res.message || 'Failed to mark satisfied', 'error');
    }
  };

  const handleRowAction = async (worker, action) => {
    const workerName = `${worker.first_name} ${worker.last_name}`;
    switch (action) {
      case 'issue_dar':
        return openIssueDARModal(worker.worker_id, workerName);
      case 'view_dar':
        return loadDarStatus(worker.worker_id, workerName);
      case 'view_credentials':
        return loadWorkerCredentials(worker.worker_id);
      case 'update_verification':
        return setVerificationPanel(worker);
      case 'endorse':
        return handleEndorse(selectedProject, worker.id);
      case 'approve':
        return setApprovePanel(worker);
      case 'reject':
        return handleStatusChange(selectedProject, worker.id, 'rejected');
      default:
        return null;
    }
  };

  const confirmApproveApplication = async (worker) => {
    await handleStatusChange(selectedProject, worker.id, 'approved');
    setApprovePanel(null);
  };

  const getProfessionalStatus = (worker) => {
    if (worker.endorsement_status === 'endorsed') return 'endorsed';
    if (worker.status === 'rejected' || worker.status === 'revoked') return 'rejected';
    if (worker.status === 'approved' || worker.status === 'active' || worker.status === 'completed') return 'approved';
    return 'applied';
  };

  const pendingApplications = workers.filter(w => getProfessionalStatus(w) === 'applied');
  const searchedWorkers = workers.filter((w) => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return true;
    const fullName = `${w.first_name || ''} ${w.last_name || ''}`.trim().toLowerCase();
    const email = (w.email || '').toLowerCase();
    return fullName.includes(q) || email.includes(q);
  });
  const visibleWorkers = searchedWorkers.filter((w) =>
    statusFilter === 'all' ? true : getProfessionalStatus(w) === statusFilter
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Professional Management</h2>
          <p className="text-gray-500 text-sm mt-1">Onboard, verify, endorse, and manage professionals for your projects</p>
        </div>
        <DemoResetButton />
      </div>

      <p className="text-sm text-gray-600">
        You can <strong>issue DAR</strong> to a professional (send icon) so they receive the project&apos;s Data Access Requirements in the Credentis Professional app. Use the document icon to view DAR status and the eye icon to view credentials; details open in a dialog.
      </p>

      {/* Project filter */}
      <div className="card p-4 flex items-center gap-4">
        <label className="text-sm font-medium text-gray-700">Project:</label>
        <select
          value={selectedProject}
          onChange={e => { setSelectedProject(e.target.value); loadWorkers(e.target.value); }}
          className="flex-1 border border-gray-200 rounded-xl py-2 px-3 text-sm focus:ring-2 focus:ring-primary-500 outline-none"
        >
          {projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
        </select>
      </div>

      {!loading && workers.length > 0 && (
        <div className="card p-4">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div>
              <p className="text-sm font-semibold text-gray-900">Pending Applications</p>
              <p className="text-xs text-gray-500 mt-0.5">{pendingApplications.length} professional{pendingApplications.length === 1 ? '' : 's'} awaiting review</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name or email"
              className="md:col-span-2 border border-gray-200 rounded-xl py-2 px-3 text-sm focus:ring-2 focus:ring-primary-500 outline-none"
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border border-gray-200 rounded-xl py-2 px-3 text-sm focus:ring-2 focus:ring-primary-500 outline-none"
            >
              <option value="all">All statuses</option>
              <option value="applied">Applied</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="endorsed">Endorsed</option>
            </select>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-32"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" /></div>
      ) : workers.length === 0 ? (
        <div className="card p-12 text-center text-gray-500">No professionals assigned to this project</div>
      ) : visibleWorkers.length === 0 ? (
        <div className="card p-12 text-center text-gray-500">No professionals match your search/filter</div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left py-3 px-4 font-medium text-gray-500">Professional</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500">Nationality</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500">Role</th>
                <th className="text-center py-3 px-4 font-medium text-gray-500">Verification</th>
                <th className="text-center py-3 px-4 font-medium text-gray-500">DAR</th>
                <th className="text-center py-3 px-4 font-medium text-gray-500">Credentials</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500">Issues</th>
                <th className="text-center py-3 px-4 font-medium text-gray-500">Status</th>
                <th className="text-center py-3 px-4 font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visibleWorkers.map(w => {
                const profStatus = getProfessionalStatus(w);
                const statusLabel = profStatus === 'endorsed' ? 'Endorsed' : profStatus === 'approved' ? 'Approved' : profStatus === 'rejected' ? 'Rejected' : 'Applied';
                const statusBadgeClass = profStatus === 'endorsed' ? 'badge-blue' : profStatus === 'approved' ? 'badge-green' : profStatus === 'rejected' ? 'badge-red' : 'badge-amber';
                return (
                <tr key={w.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-xs font-semibold text-primary-700">
                        {w.first_name?.[0]}{w.last_name?.[0]}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{w.first_name} {w.last_name}</p>
                        <p className="text-xs text-gray-400">{w.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-gray-600">{w.nationality}</td>
                  <td className="py-3 px-4 text-gray-600">{w.role_on_project}</td>
                  <td className="py-3 px-4 text-center">
                    <div className="flex flex-col items-center gap-1 text-xs">
                      <span className={w.passport_status === 'accepted' ? 'badge-green' : w.passport_status === 'rejected' ? 'badge-red' : 'badge-amber'}>
                        Passport: {w.passport_status || 'none'}
                      </span>
                      <span className={w.biometric_status === 'accepted' ? 'badge-green' : w.biometric_status === 'rejected' ? 'badge-red' : 'badge-amber'}>
                        Biometric: {w.biometric_status || 'none'}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-center">
                    {w.darTotal != null && w.darTotal > 0 ? (
                      <div className="flex flex-col items-center gap-0.5">
                        <span className={w.darSatisfied === w.darTotal ? 'text-green-600 font-medium' : 'text-amber-600'}>
                          {w.darSatisfied}/{w.darTotal} satisfied
                        </span>
                        {w.darIssued > 0 && (
                          <span className="text-xs text-indigo-600">{w.darIssued} issued (awaiting)</span>
                        )}
                        {(w.darTotal - w.darSatisfied - (w.darIssued || 0)) > 0 && (
                          <span className="text-xs text-gray-400">{w.darTotal - w.darSatisfied - (w.darIssued || 0)} not issued</span>
                        )}
                      </div>
                    ) : '—'}
                  </td>
                  <td className="py-3 px-4 text-center">{w.valid_credentials || 0}</td>
                  <td className="py-3 px-4 text-xs text-gray-600 max-w-[200px]">{Array.isArray(w.issues) ? w.issues.join('; ') : (w.issues || '—')}</td>
                  <td className="py-3 px-4 text-center">
                    <span className={statusBadgeClass}>{statusLabel}</span>
                  </td>
                  <td className="py-3 px-4">
                    <select
                      defaultValue=""
                      onChange={(e) => {
                        const action = e.target.value;
                        if (!action) return;
                        handleRowAction(w, action);
                        e.target.value = '';
                      }}
                      className="border border-gray-200 rounded-lg py-1.5 px-2 text-xs text-gray-700 focus:ring-2 focus:ring-primary-500 outline-none min-w-[150px]"
                    >
                      <option value="">Actions...</option>
                      <option value="issue_dar">Issue DAR</option>
                      <option value="view_dar">View DAR status</option>
                      <option value="view_credentials">View credentials</option>
                      <option value="update_verification">Update verification</option>
                      {w.endorsement_status !== 'endorsed' && <option value="endorse">Endorse</option>}
                      {w.status === 'pending' && <option value="approve">Approve application</option>}
                      {w.status === 'pending' && <option value="reject">Reject application</option>}
                    </select>
                  </td>
                </tr>
              )})}
            </tbody>
          </table>
        </div>
      )}

      {/* Issue DAR modal */}
      <IssueDARModal
        panel={issueDARPanel}
        onClose={() => setIssueDARPanel(null)}
        onIssued={() => loadWorkers(selectedProject)}
        showToast={showToast}
      />

      <VerificationStatusModal
        worker={verificationPanel}
        onClose={() => setVerificationPanel(null)}
        onSave={handleVerificationUpdate}
      />

      <ApproveApplicationModal
        worker={approvePanel}
        onCancel={() => setApprovePanel(null)}
        onConfirm={confirmApproveApplication}
      />

      {/* DAR status dialog */}
      {darStatusPanel && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <div>
                <h3 className="font-semibold text-gray-900">DAR Status</h3>
                <p className="text-sm text-gray-500 mt-0.5">{darStatusPanel.workerName}</p>
              </div>
              <button onClick={() => setDarStatusPanel(null)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-3">
              {/* Summary bar */}
              <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-200">
                <div className="flex-1 text-sm">
                  <span className={darStatusPanel.satisfied_count === darStatusPanel.total ? 'text-green-700 font-semibold' : 'text-gray-700 font-semibold'}>
                    {darStatusPanel.satisfied_count}/{darStatusPanel.total} satisfied
                  </span>
                  {darStatusPanel.issued_count > 0 && (
                    <span className="ml-2 text-indigo-600 text-xs">· {darStatusPanel.issued_count} issued (awaiting)</span>
                  )}
                  {(darStatusPanel.total - darStatusPanel.satisfied_count - (darStatusPanel.issued_count || 0)) > 0 && (
                    <span className="ml-2 text-gray-400 text-xs">
                      · {darStatusPanel.total - darStatusPanel.satisfied_count - (darStatusPanel.issued_count || 0)} not issued
                    </span>
                  )}
                </div>
              </div>

              <p className="text-xs text-gray-500">
                Click <strong>Issue to Professional</strong> on any unissued requirement to send it to the professional&apos;s Credentis app. They can then submit credentials to satisfy it.
              </p>

              <div className="space-y-2">
                {darStatusPanel.requirements?.map((r) => (
                  <DARRequirementRow
                    key={r.id}
                    requirement={r}
                    workerId={darStatusPanel.workerId}
                    workerName={darStatusPanel.workerName}
                    credentials={darStatusPanel.credentials || []}
                    onIssue={handleDarIssue}
                    onSatisfy={handleDarSatisfy}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast notification */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-[60] flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-white text-sm font-medium transition-all ${toast.type === 'error' ? 'bg-red-600' : 'bg-green-600'}`}>
          {toast.type === 'error' ? <XCircle className="w-4 h-4 shrink-0" /> : <CheckCircle className="w-4 h-4 shrink-0" />}
          {toast.msg}
        </div>
      )}

      {/* Credentials dialog */}
      {workerDetail && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <div>
                <h3 className="font-semibold text-gray-900">Professional profile</h3>
                <p className="text-xs text-gray-500 mt-0.5">Credentials &amp; DAR for this project</p>
              </div>
              <button onClick={() => setWorkerDetail(null)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-3">
              <p className="text-sm text-gray-600">As the professional adds credentials to satisfy DAR they become Verifiable Credentials and are visible here (and to the Client) up the chain.</p>
              {workerDetail.darError && (
                <p className="text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">{workerDetail.darError}</p>
              )}
              {workerDetail.darStatus && (
                <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-4 space-y-2">
                  <h4 className="text-sm font-semibold text-gray-900">Data access requirements (DAR) — this project</h4>
                  <p className="text-xs text-gray-600">
                    <span className="font-medium">{workerDetail.darStatus.satisfied_count ?? 0}/{workerDetail.darStatus.total ?? 0}</span> satisfied
                    {workerDetail.darStatus.issued_count > 0 && (
                      <span className="text-indigo-700"> · {workerDetail.darStatus.issued_count} issued (awaiting professional)</span>
                    )}
                  </p>
                  {workerDetail.darStatus.dar_requested_at && (
                    <p className="text-xs text-gray-500">DAR notification sent: {workerDetail.darStatus.dar_requested_at}</p>
                  )}
                  <ul className="space-y-1.5">
                    {(workerDetail.darStatus.requirements || []).map((r) => (
                      <li key={r.id} className="flex justify-between gap-2 text-xs p-2 rounded-lg bg-white border border-gray-100">
                        <span className="text-gray-800">{r.label}</span>
                        <span className={
                          r.status === 'satisfied' ? 'text-green-700 font-medium' :
                          r.status === 'issued' ? 'text-amber-700 font-medium' : 'text-gray-500'
                        }>
                          {r.status === 'satisfied' ? 'Satisfied' : r.status === 'issued' ? 'Issued — awaiting' : 'Not issued'}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {workerDetail.credentials.length === 0 ? (
                <p className="text-sm text-gray-500">No credentials found for this professional</p>
              ) : (
                <div className="space-y-2">
                  {workerDetail.credentials.map(c => (
                    <div key={c.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">{c.title}</p>
                        <p className="text-xs text-gray-500">{c.issuer} • Expires: {c.expiry_date || 'N/A'}</p>
                        {c.dar_satisfies && c.dar_satisfies.length > 0 && (
                          <p className="text-xs text-green-700 mt-1">Satisfies DAR: {c.dar_satisfies.map(d => d.requirement_label).join('; ')}</p>
                        )}
                      </div>
                      <span className={c.status === 'valid' ? 'badge-green' : c.status === 'expired' ? 'badge-red' : 'badge-amber'}>{c.status}</span>
                      {c.is_verified ? <Shield className="w-4 h-4 text-green-500 flex-shrink-0" title="Verifiable Credential" /> : null}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function VerificationStatusModal({ worker, onClose, onSave }) {
  const [passportStatus, setPassportStatus] = React.useState('pending');
  const [biometricStatus, setBiometricStatus] = React.useState('pending');
  const [saving, setSaving] = React.useState(false);
  const statuses = ['none', 'pending', 'accepted', 'rejected'];

  React.useEffect(() => {
    if (worker) {
      setPassportStatus(worker.passport_status || 'pending');
      setBiometricStatus(worker.biometric_status || 'pending');
    }
  }, [worker]);

  if (!worker) return null;

  const handleSave = async () => {
    setSaving(true);
    await onSave(worker.worker_id, passportStatus, biometricStatus);
    setSaving(false);
  };

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div>
            <h3 className="font-semibold text-gray-900">Update Verification Status</h3>
            <p className="text-xs text-gray-500 mt-0.5">{worker.first_name} {worker.last_name}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Passport</label>
            <select value={passportStatus} onChange={(e) => setPassportStatus(e.target.value)} className="w-full border border-gray-200 rounded-xl py-2.5 px-3 text-sm focus:ring-2 focus:ring-primary-500 outline-none">
              {statuses.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Biometric</label>
            <select value={biometricStatus} onChange={(e) => setBiometricStatus(e.target.value)} className="w-full border border-gray-200 rounded-xl py-2.5 px-3 text-sm focus:ring-2 focus:ring-primary-500 outline-none">
              {statuses.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <p className="text-xs text-gray-500">Professional is verified only when both passport and biometric are accepted.</p>
          <div className="flex gap-3 pt-1">
            <button onClick={onClose} className="flex-1 px-4 py-2 rounded-xl border border-gray-200 text-sm text-gray-700 hover:bg-gray-50">Cancel</button>
            <button onClick={handleSave} disabled={saving} className="flex-1 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

function ApproveApplicationModal({ worker, onCancel, onConfirm }) {
  const [saving, setSaving] = React.useState(false);
  if (!worker) return null;

  const doConfirm = async () => {
    setSaving(true);
    await onConfirm(worker);
    setSaving(false);
  };

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="p-6 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">Approve Application</h3>
          <p className="text-xs text-gray-500 mt-1">{worker.first_name} {worker.last_name}</p>
        </div>
        <div className="p-6 space-y-3 text-sm">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-gray-500">Start date</p>
              <p className="font-medium text-gray-900">{worker.start_date || 'Not provided'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">End date</p>
              <p className="font-medium text-gray-900">{worker.end_date || 'Not provided'}</p>
            </div>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Supporting information</p>
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-2 text-gray-700 min-h-[56px]">
              {worker.supporting_info || 'Not provided'}
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={onCancel} className="flex-1 px-4 py-2 rounded-xl border border-gray-200 text-sm text-gray-700 hover:bg-gray-50">
              Cancel
            </button>
            <button onClick={doConfirm} disabled={saving} className="flex-1 px-4 py-2 rounded-xl bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 disabled:opacity-50">
              {saving ? 'Approving...' : 'OK'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
