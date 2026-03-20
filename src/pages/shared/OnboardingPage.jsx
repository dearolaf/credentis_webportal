import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { UserPlus, Building2, CheckCircle, XCircle, Clock, X, Send, Upload, Trash2, RotateCcw } from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';

export default function OnboardingPage({ portalRole } = {}) {
  const { user } = useAuth();
  const [partners, setPartners] = useState([]);
  const [pqqs, setPqqs] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [importHistory, setImportHistory] = useState([]);
  const [projects, setProjects] = useState([]);
  const [selectedWorkflowProjectId, setSelectedWorkflowProjectId] = useState('');
  const [workflowProjectDetail, setWorkflowProjectDetail] = useState(null);
  const [workflowDar, setWorkflowDar] = useState([]);
  const [workflowComplianceWorkers, setWorkflowComplianceWorkers] = useState([]);
  const [workflowLoading, setWorkflowLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('invitations');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showPQQModal, setShowPQQModal] = useState(false);
  const [showRenewPQQModal, setShowRenewPQQModal] = useState(false);
  const [showInvitePQQModal, setShowInvitePQQModal] = useState(false);
  const [showImportTemplateModal, setShowImportTemplateModal] = useState(false);
  const [importDefaults, setImportDefaults] = useState({ templateId: '', templateName: '' });
  const [showTemplatePreviewModal, setShowTemplatePreviewModal] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState(null);
  const [previewSections, setPreviewSections] = useState([]);
  const [previewQuestions, setPreviewQuestions] = useState([]);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState('');
  const [submittingForInvitationId, setSubmittingForInvitationId] = useState(null);
  const [expiryAlertsBySubmissionId, setExpiryAlertsBySubmissionId] = useState({});
  const [expiryLoadingBySubmissionId, setExpiryLoadingBySubmissionId] = useState({});
  const [renewSubmissionContext, setRenewSubmissionContext] = useState(null);
  const [pqqActionMessage, setPqqActionMessage] = useState({ type: '', text: '' });
  const [deletingTemplateId, setDeletingTemplateId] = useState('');
  const [templateActionError, setTemplateActionError] = useState('');
  const [templateActionSuccess, setTemplateActionSuccess] = useState('');

  const isClient = user?.role === 'client';
  const isAdmin = user?.role === 'admin';
  const isPartner = user?.role === 'contractor' || user?.role === 'subcontractor';
  const isSubcontractorPortal = portalRole === 'subcontractor' || user?.role === 'subcontractor';

  const loadData = () => {
    Promise.all([
      api.get('/onboarding/partners'),
      api.get('/onboarding/pqq'),
      api.get('/onboarding/invitations').catch(() => ({ data: [] })),
      api.get('/onboarding/templates').catch(() => ({ data: [] })),
      api.get('/onboarding/templates/import-history').catch(() => ({ data: [] })),
      api.get('/projects').catch(() => ({ data: [] })),
    ]).then(([p, q, inv, tpl, history, proj]) => {
      setPartners(p.data || []);
      setPqqs(q.data || []);
      setInvitations(inv.data || []);
      setTemplates(tpl.data || []);
      setImportHistory(history.data || []);
      const loadedProjects = proj.data || [];
      setProjects(loadedProjects);
      if (!selectedWorkflowProjectId && loadedProjects.length > 0) {
        setSelectedWorkflowProjectId(loadedProjects[0].id);
      }
      setLoading(false);
    });
  };

  useEffect(() => { loadData(); }, []);
  useEffect(() => {
    if (isSubcontractorPortal) setTab('invitations');
  }, [isSubcontractorPortal]);

  useEffect(() => {
    if (tab !== 'pqq' || pqqs.length === 0) return;
    pqqs.forEach((pqq) => {
      if (expiryAlertsBySubmissionId[pqq.id] || expiryLoadingBySubmissionId[pqq.id]) return;
      loadPqqExpiryAlerts(pqq.id);
    });
  }, [tab, pqqs]);

  useEffect(() => {
    const loadWorkflowContext = async () => {
      if (!selectedWorkflowProjectId) return;
      setWorkflowLoading(true);
      const [detailRes, darRes, workersRes] = await Promise.all([
        api.get(`/projects/${selectedWorkflowProjectId}`).catch(() => ({ success: false, data: null })),
        api.get(`/projects/${selectedWorkflowProjectId}/dar`).catch(() => ({ success: false, data: [] })),
        api.get(`/compliance/workers?project_id=${selectedWorkflowProjectId}`).catch(() => ({ success: false, data: [] })),
      ]);
      setWorkflowProjectDetail(detailRes.success ? detailRes.data : null);
      setWorkflowDar(darRes.success ? (darRes.data || []) : []);
      setWorkflowComplianceWorkers(workersRes.success ? (workersRes.data || []) : []);
      setWorkflowLoading(false);
    };
    loadWorkflowContext();
  }, [selectedWorkflowProjectId]);

  const reviewPQQ = async (id, status) => {
    await api.put(`/onboarding/pqq/${id}/review`, { status, review_notes: `${status} during PoC demo` });
    loadData();
  };

  const openImportModal = (defaults = { templateId: '', templateName: '' }) => {
    setImportDefaults(defaults);
    setShowImportTemplateModal(true);
  };

  const openReimportForTemplate = (templateId) => {
    const existing = templates.find((t) => t.id === templateId);
    openImportModal({
      templateId: templateId || '',
      templateName: existing?.name || '',
    });
  };

  const openDuplicateVersionForTemplate = (templateId) => {
    const existing = templates.find((t) => t.id === templateId);
    const existingIds = new Set([
      ...templates.map((t) => t.id).filter(Boolean),
      ...importHistory.map((h) => h.template_id).filter(Boolean),
    ]);

    const makeCandidateId = () => {
      const versioned = String(templateId || '').match(/^(.*)-v(\d+)$/i);
      if (versioned) {
        const prefix = versioned[1];
        let version = Number(versioned[2]) + 1;
        let candidate = `${prefix}-v${version}`;
        while (existingIds.has(candidate)) {
          version += 1;
          candidate = `${prefix}-v${version}`;
        }
        return candidate;
      }
      let version = 2;
      let candidate = `${templateId}-v${version}`;
      while (existingIds.has(candidate)) {
        version += 1;
        candidate = `${templateId}-v${version}`;
      }
      return candidate;
    };

    const makeCandidateName = () => {
      const sourceName = existing?.name || templateId || 'Imported Template';
      const versioned = String(sourceName).match(/^(.*)\s+\(v(\d+)\)$/i);
      if (versioned) {
        return `${versioned[1]} (v${Number(versioned[2]) + 1})`;
      }
      return `${sourceName} (v2)`;
    };

    openImportModal({
      templateId: makeCandidateId(),
      templateName: makeCandidateName(),
    });
  };

  const openTemplatePreview = async (templateId) => {
    if (!templateId) return;
    setShowTemplatePreviewModal(true);
    setPreviewLoading(true);
    setPreviewError('');
    setPreviewTemplate(null);
    setPreviewSections([]);
    setPreviewQuestions([]);
    const res = await api.get(`/onboarding/templates/${templateId}`);
    setPreviewLoading(false);
    if (!res.success) {
      setPreviewError(res.message || 'Failed to load template details');
      return;
    }
    setPreviewTemplate(res.data?.template || null);
    setPreviewSections(res.data?.sections || []);
    setPreviewQuestions(res.data?.questions || []);
  };

  const loadPqqExpiryAlerts = async (submissionId) => {
    if (!submissionId) return;
    setExpiryLoadingBySubmissionId((prev) => ({ ...prev, [submissionId]: true }));
    const res = await api.get(`/onboarding/pqq/${submissionId}/expiry-alerts`);
    setExpiryLoadingBySubmissionId((prev) => ({ ...prev, [submissionId]: false }));
    if (!res.success) return;
    setExpiryAlertsBySubmissionId((prev) => ({ ...prev, [submissionId]: res.data || { alerts: [], suspend_recommended: false } }));
  };

  const openRenewPqq = (pqq) => {
    if (!pqq?.id) return;
    if (!pqq.invitation_id) {
      setPqqActionMessage({ type: 'error', text: 'Cannot edit this renewal because invitation link is missing.' });
      return;
    }
    let initialAnswers = {};
    try { initialAnswers = JSON.parse(pqq.answers_json || '{}'); } catch (_) { initialAnswers = {}; }
    setPqqActionMessage({ type: '', text: '' });
    setRenewSubmissionContext({
      submissionId: pqq.id,
      invitationId: pqq.invitation_id,
      initialAnswers,
    });
    setShowRenewPQQModal(true);
  };

  const deleteImportedTemplate = async (templateId) => {
    if (!templateId || deletingTemplateId) return;
    const confirmed = window.confirm('Delete this imported template? This cannot be undone.');
    if (!confirmed) return;

    setTemplateActionError('');
    setTemplateActionSuccess('');
    setDeletingTemplateId(templateId);
    const res = await api.delete(`/onboarding/templates/${templateId}`);
    setDeletingTemplateId('');

    if (!res.success) {
      setTemplateActionError(res.message || 'Failed to delete template');
      return;
    }

    setTemplateActionSuccess(`Template ${templateId} deleted`);
    loadData();
  };

  const workflowProject = projects.find((p) => p.id === selectedWorkflowProjectId) || null;
  const partnerRoleById = Object.fromEntries((partners || []).map((p) => [p.id, p.role]));
  const projectInvitations = invitations.filter((inv) => inv.project_id === selectedWorkflowProjectId);
  const contractorInvitations = projectInvitations.filter((inv) => partnerRoleById[inv.invitee_id] === 'contractor');
  const subcontractorInvitations = projectInvitations.filter((inv) => partnerRoleById[inv.invitee_id] === 'subcontractor');
  const approvedDelegations = (workflowProjectDetail?.delegations || []).filter((d) => d.status === 'approved');
  const approvedContractorDelegations = approvedDelegations.filter((d) => d.role === 'contractor');
  const approvedSubDelegations = approvedDelegations.filter((d) => d.role === 'subcontractor');
  const darByRole = {
    client: workflowDar.some((d) => d.added_by_role === 'client'),
    contractor: workflowDar.some((d) => d.added_by_role === 'contractor'),
    subcontractor: workflowDar.some((d) => d.added_by_role === 'subcontractor'),
  };
  const workersWithEvidence = workflowComplianceWorkers.filter((w) => Number(w.darSatisfied || 0) > 0).length;
  const workersCompliant = workflowComplianceWorkers.filter((w) => w.complianceStatus === 'compliant').length;
  const workflowSteps = [
    { id: 'vp', title: 'VP created by client', done: !!workflowProject, detail: workflowProject?.title || 'No project selected' },
    { id: 'invite-gc', title: 'Contractor invited to PQQ', done: contractorInvitations.length > 0, detail: `${contractorInvitations.length} invitation(s)` },
    { id: 'gc-approved', title: 'Contractor PQQ approved', done: contractorInvitations.some((i) => i.status === 'approved'), detail: contractorInvitations.map((i) => i.status).join(', ') || 'No status' },
    { id: 'delegated-gc', title: 'VP delegated to contractor', done: approvedContractorDelegations.length > 0, detail: `${approvedContractorDelegations.length} approved delegation(s)` },
    { id: 'invite-subs', title: 'Subcontractors invited to PQQ', done: subcontractorInvitations.length > 0, detail: `${subcontractorInvitations.length} invitation(s)` },
    { id: 'subs-approved', title: 'Subcontractor PQQ approved', done: subcontractorInvitations.length > 0 && subcontractorInvitations.every((i) => ['approved', 'under_review'].includes(i.status)), detail: subcontractorInvitations.map((i) => i.status).join(', ') || 'No status' },
    { id: 'delegated-subs', title: 'Subcontractors delegated', done: approvedSubDelegations.length > 0, detail: `${approvedSubDelegations.length} approved sub-delegation(s)` },
    { id: 'dar-chain', title: 'DAR chain in place (Client → Contractor → Sub)', done: darByRole.client && darByRole.contractor && darByRole.subcontractor, detail: `client:${darByRole.client ? 'Y' : 'N'} contractor:${darByRole.contractor ? 'Y' : 'N'} sub:${darByRole.subcontractor ? 'Y' : 'N'}` },
    { id: 'pro-evidence', title: 'Professionals submitted DAR evidence', done: workersWithEvidence > 0, detail: `${workersWithEvidence} professional(s) with evidence` },
    { id: 'pro-compliant', title: 'Professionals can be compliant/endorsed', done: workersCompliant > 0, detail: `${workersCompliant} compliant professional(s)` },
  ];

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Partner Onboarding</h2>
          <p className="text-gray-500 text-sm mt-1">
            {isSubcontractorPortal
              ? 'Submit your PQQ template from invitations and track review status'
              : 'PQQ invitations, submissions, and approvals'}
          </p>
        </div>
        <div className="flex gap-2">
          {(isClient || isAdmin) && (
            <button onClick={() => openImportModal()} className="btn-secondary flex items-center gap-2">
              <Upload className="w-4 h-4" /> Import PQQ Template
            </button>
          )}
          {(isClient || user?.role === 'contractor') && (
            <button onClick={() => setShowInvitePQQModal(true)} className="btn-primary flex items-center gap-2"><UserPlus className="w-4 h-4" /> Invite Partner</button>
          )}
        </div>
      </div>

      {isSubcontractorPortal && (
        <div className="card p-4 border border-primary-100 bg-primary-50/50">
          <h3 className="font-semibold text-primary-900 mb-1">Subcontractor onboarding</h3>
          <p className="text-sm text-primary-800">
            Open your PQQ invitation and click <span className="font-medium">Submit PQQ</span> to complete onboarding for a delegated project.
          </p>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        <button onClick={() => setTab('invitations')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === 'invitations' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>
          PQQ Invitations ({invitations.length})
        </button>
        <button onClick={() => setTab('partners')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === 'partners' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>
          Partners ({partners.length})
        </button>
        <button onClick={() => setTab('pqq')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === 'pqq' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>
          PQQ Submissions ({pqqs.length})
        </button>
      </div>

      {tab === 'pqq' && pqqActionMessage.text && (
        <div
          className={`p-3 rounded-lg text-sm ${
            pqqActionMessage.type === 'success'
              ? 'bg-green-50 text-green-700'
              : 'bg-red-50 text-red-700'
          }`}
        >
          {pqqActionMessage.text}
        </div>
      )}

      {(isClient || isAdmin) && (
        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900">PQQ Template Import History</h3>
            <span className="text-xs text-gray-500">Last {Math.min(importHistory.length, 20)} imports</span>
          </div>
          {templateActionError && <div className="mb-3 p-3 rounded-lg bg-red-50 text-red-700 text-sm">{templateActionError}</div>}
          {templateActionSuccess && <div className="mb-3 p-3 rounded-lg bg-green-50 text-green-700 text-sm">{templateActionSuccess}</div>}
          {importHistory.length === 0 ? (
            <p className="text-sm text-gray-500">No template imports yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left py-2 px-3 font-medium text-gray-500">Template</th>
                    <th className="text-left py-2 px-3 font-medium text-gray-500">Source</th>
                    <th className="text-left py-2 px-3 font-medium text-gray-500">Scope</th>
                    <th className="text-left py-2 px-3 font-medium text-gray-500">Imported By</th>
                    <th className="text-left py-2 px-3 font-medium text-gray-500">Time</th>
                    <th className="text-right py-2 px-3 font-medium text-gray-500">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {importHistory.map((row) => (
                    <tr key={row.id} className="border-b border-gray-50">
                      <td className="py-2 px-3 font-medium text-gray-900">{row.template_id}</td>
                      <td className="py-2 px-3 text-gray-600">{row.source}</td>
                      <td className="py-2 px-3 text-gray-600">{row.sections_imported ?? '-'} sections / {row.questions_imported ?? '-'} questions</td>
                      <td className="py-2 px-3 text-gray-600">{row.imported_by}</td>
                      <td className="py-2 px-3 text-gray-600">{row.imported_at}</td>
                      <td className="py-2 px-3 text-right">
                        <div className="inline-flex items-center gap-3">
                          <button onClick={() => openTemplatePreview(row.template_id)} className="text-primary-600 font-medium text-sm hover:underline">
                            View details
                          </button>
                          <button onClick={() => openReimportForTemplate(row.template_id)} className="text-gray-700 font-medium text-sm hover:underline">
                            Re-import
                          </button>
                          <button onClick={() => openDuplicateVersionForTemplate(row.template_id)} className="text-gray-700 font-medium text-sm hover:underline">
                            Duplicate as new version
                          </button>
                          <button
                            onClick={() => deleteImportedTemplate(row.template_id)}
                            disabled={deletingTemplateId === row.template_id}
                            className="inline-flex items-center gap-1 text-red-700 font-medium text-sm hover:underline disabled:opacity-60"
                            title="Delete imported template"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            {deletingTemplateId === row.template_id ? 'Deleting...' : 'Delete'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'invitations' && (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left py-3 px-4 font-medium text-gray-500">Partner / Invitee</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500">Project (VP)</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500">Due</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500">Status</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500">Overdue</th>
                <th className="text-right py-3 px-4 font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody>
              {invitations.length === 0 && (
                <tr><td colSpan={6} className="py-8 text-center text-gray-500">No PQQ invitations yet. Use &quot;Invite Partner&quot; to invite a partner to submit PQQ.</td></tr>
              )}
              {invitations.map(inv => (
                <tr key={inv.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="py-3 px-4 font-medium text-gray-900">{inv.invitee_company}</td>
                  <td className="py-3 px-4 text-gray-600">{inv.project_title}</td>
                  <td className="py-3 px-4">{inv.due_date}</td>
                  <td className="py-3 px-4">
                    <span className={
                      inv.status === 'approved' ? 'badge-green' :
                      inv.status === 'rejected' ? 'badge-red' :
                      inv.status === 'under_review' ? 'badge-amber' :
                      inv.status === 'submitted' ? 'badge-blue' : 'badge-gray'
                    }>{inv.status?.replace('_', ' ')}</span>
                  </td>
                  <td className="py-3 px-4">
                    {inv.overdue ? <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-red-100 text-red-700">Overdue</span> : '—'}
                  </td>
                  <td className="py-3 px-4 text-right">
                    {inv.invitee_id === user?.id && inv.status === 'invited' && (
                      <button onClick={() => { setSubmittingForInvitationId(inv.id); setShowPQQModal(true); }} className="text-primary-600 font-medium text-sm hover:underline">Submit PQQ</button>
                    )}
                    {inv.status === 'under_review' && inv.pqq_submission_id && inv.inviter_id === user?.id && (
                      <span className="flex gap-1 justify-end">
                        <button onClick={() => reviewPQQ(inv.pqq_submission_id, 'approved')} className="p-1.5 rounded-lg hover:bg-green-50 text-green-600" title="Approve"><CheckCircle className="w-4 h-4" /></button>
                        <button onClick={() => reviewPQQ(inv.pqq_submission_id, 'rejected')} className="p-1.5 rounded-lg hover:bg-red-50 text-red-600" title="Reject"><XCircle className="w-4 h-4" /></button>
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'partners' && (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left py-3 px-4 font-medium text-gray-500">Company</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500">Contact</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500">Role</th>
                <th className="text-center py-3 px-4 font-medium text-gray-500">Delegations</th>
                <th className="text-center py-3 px-4 font-medium text-gray-500">PQQ Status</th>
                <th className="text-center py-3 px-4 font-medium text-gray-500">Verified</th>
              </tr>
            </thead>
            <tbody>
              {partners.map(p => (
                <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-primary-50 flex items-center justify-center"><Building2 className="w-4 h-4 text-primary-600" /></div>
                      <div>
                        <p className="font-medium text-gray-900">{p.company_name}</p>
                        <p className="text-xs text-gray-500">{p.company_registration}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <p className="text-gray-900">{p.first_name} {p.last_name}</p>
                    <p className="text-xs text-gray-500">{p.email}</p>
                  </td>
                  <td className="py-3 px-4"><span className={p.role === 'contractor' ? 'badge-blue' : 'badge-purple'}>{p.role}</span></td>
                  <td className="py-3 px-4 text-center">{p.active_delegations}</td>
                  <td className="py-3 px-4 text-center">
                    <span className={
                      p.latest_pqq_status === 'approved' ? 'badge-green' :
                      p.latest_pqq_status === 'under_review' ? 'badge-amber' :
                      p.latest_pqq_status === 'rejected' ? 'badge-red' : 'badge-blue'
                    }>{p.latest_pqq_status || 'none'}</span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    {p.is_verified ? <CheckCircle className="w-4 h-4 text-green-500 mx-auto" /> : <Clock className="w-4 h-4 text-gray-300 mx-auto" />}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'pqq' && (
        <div className="space-y-4">
          {pqqs.length === 0 && (
            <div className="card p-12 text-center text-gray-500">No PQQ submissions yet. Click "Submit PQQ" to create one.</div>
          )}
          {pqqs.map(pqq => {
            let financial, compliance;
            let sectionScores;
            try { financial = JSON.parse(pqq.financial_status || '{}'); } catch { financial = {}; }
            try { compliance = JSON.parse(pqq.compliance_status || '{}'); } catch { compliance = {}; }
            try { sectionScores = JSON.parse(pqq.section_scores_json || '[]'); } catch { sectionScores = []; }
            const expiryData = expiryAlertsBySubmissionId[pqq.id];
            const expiryAlerts = expiryData?.alerts || [];
            const expiryRed = expiryAlerts.filter((a) => a.level === 'red').length;
            const expiryAmber = expiryAlerts.filter((a) => a.level === 'amber').length;
            const expiryOk = expiryAlerts.filter((a) => a.level === 'ok').length;
            const scoredPassSections = sectionScores.filter((s) => s.passed).length;
            const scoredFailSections = sectionScores.filter((s) => !s.passed).length;
            const hasScoredSummary =
              typeof financial.score === 'number' ||
              typeof compliance.requiredComplete === 'boolean' ||
              typeof compliance.hardFail === 'boolean';
            const canReviewSubmission =
              pqq.status === 'under_review' &&
              (
                isClient ||
                isAdmin ||
                invitations.some((inv) => inv.pqq_submission_id === pqq.id && inv.inviter_id === user?.id)
              );

            return (
              <div key={pqq.id} className="card p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-gray-900">{pqq.company_name || 'Company'}</h3>
                    <p className="text-sm text-gray-500">{pqq.first_name} {pqq.last_name}</p>
                    <p className="text-xs text-gray-500 mt-1">Overall: <span className="font-medium">{pqq.overall_status || 'n/a'}</span> | Score: <span className="font-medium">{pqq.total_score ?? 0}</span></p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={
                      pqq.status === 'approved' ? 'badge-green' :
                      pqq.status === 'under_review' ? 'badge-amber' :
                      pqq.status === 'rejected' ? 'badge-red' : 'badge-blue'
                    }>{pqq.status?.replace('_', ' ')}</span>
                    {expiryRed > 0 && <span className="badge-red">Expiry red: {expiryRed}</span>}
                    {expiryRed === 0 && expiryAmber > 0 && <span className="badge-amber">Expiry amber: {expiryAmber}</span>}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-3 rounded-lg bg-gray-50">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">
                      {hasScoredSummary ? 'Scoring Summary' : 'Financial Health'}
                    </h4>
                    <div className="space-y-1 text-sm text-gray-600">
                      {hasScoredSummary ? (
                        <>
                          <p>Total Score: <span className="font-medium">{financial.score ?? pqq.total_score ?? 0}</span></p>
                          <p>Sections Passed: <span className="font-medium">{scoredPassSections}</span></p>
                          <p>Sections Failed: <span className="font-medium">{scoredFailSections}</span></p>
                        </>
                      ) : (
                        <>
                          <p>Credit Score: <span className="font-medium">{financial.creditScore || 'N/A'}</span></p>
                          <p>Turnover: <span className="font-medium">{financial.turnover || 'N/A'}</span></p>
                          <p>Status: <span className={`font-medium ${financial.status === 'pass' ? 'text-green-600' : 'text-amber-600'}`}>{financial.status || 'N/A'}</span></p>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-gray-50">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">
                      {hasScoredSummary ? 'Answer Evaluation' : 'Compliance'}
                    </h4>
                    <div className="space-y-1 text-sm text-gray-600">
                      {hasScoredSummary ? (
                        <>
                          <p>Required Answers Complete: {compliance.requiredComplete ? <CheckCircle className="w-4 h-4 text-green-500 inline" /> : <XCircle className="w-4 h-4 text-red-500 inline" />}</p>
                          <p>Hard Fail Triggered: {compliance.hardFail ? <XCircle className="w-4 h-4 text-red-500 inline" /> : <CheckCircle className="w-4 h-4 text-green-500 inline" />}</p>
                          <p>Hard-fail Sections: <span className="font-medium">{compliance.hardFailSections ?? 0}</span></p>
                        </>
                      ) : (
                        <>
                          <p>Tax Compliant: {compliance.taxCompliant ? <CheckCircle className="w-4 h-4 text-green-500 inline" /> : <XCircle className="w-4 h-4 text-red-500 inline" />}</p>
                          <p>Insurance Valid: {compliance.insuranceValid ? <CheckCircle className="w-4 h-4 text-green-500 inline" /> : <XCircle className="w-4 h-4 text-red-500 inline" />}</p>
                          <p>Safety Record: <span className="font-medium">{compliance.safetyRecord || 'N/A'}</span></p>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {sectionScores.length > 0 && (
                  <div className="mt-4 p-3 rounded-lg bg-gray-50">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Section score breakdown</h4>
                    <div className="space-y-1.5">
                      {sectionScores.map((s) => (
                        <div key={s.section_id} className="flex items-center justify-between text-sm">
                          <span className="text-gray-700">{s.section_title}</span>
                          <span className={s.passed ? 'text-green-700 font-medium' : 'text-red-700 font-medium'}>
                            {s.scoring_type === 'pass_fail' ? (s.passed ? 'Pass' : 'Fail') : `${s.score}/${s.threshold}+`}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-4 p-3 rounded-lg bg-gray-50">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-medium text-gray-700">PQQ Expiry Alerts</h4>
                    <button
                      onClick={() => loadPqqExpiryAlerts(pqq.id)}
                      disabled={!!expiryLoadingBySubmissionId[pqq.id]}
                      className="text-xs text-primary-600 font-medium hover:underline disabled:opacity-60"
                    >
                      {expiryLoadingBySubmissionId[pqq.id] ? 'Checking...' : 'Refresh alerts'}
                    </button>
                  </div>
                  {expiryAlerts.length === 0 ? (
                    <p className="text-sm text-gray-500">No expiry alerts found for this submission.</p>
                  ) : (
                    <div className="space-y-1.5">
                      <p className="text-xs text-gray-600">
                        Red: <span className="font-medium">{expiryRed}</span> | Amber: <span className="font-medium">{expiryAmber}</span> | OK: <span className="font-medium">{expiryOk}</span>
                      </p>
                      {expiryAlerts.map((a) => (
                        <div key={`${pqq.id}-${a.question_id}`} className="text-sm text-gray-700 flex items-center gap-2">
                          <span className={
                            a.level === 'red' ? 'badge-red' :
                            a.level === 'amber' ? 'badge-amber' :
                            a.level === 'invalid_date' ? 'badge-gray' : 'badge-green'
                          }>
                            {a.level}
                          </span>
                          <span className="font-medium">{a.question_text || a.question_id}</span>
                          <span className="text-gray-500">({a.question_id})</span>
                          {a.item_category && <span className="text-gray-500">[{a.item_category}]</span>}
                          <span className="text-gray-500">Expiry: {a.expiry_date}</span>
                          <span className="text-gray-500">
                            {a.days_to_expiry == null ? 'Days: n/a' : `${a.days_to_expiry} day(s)`}
                          </span>
                          {a.thresholds && (
                            <span className="text-gray-500">
                              Rule: {a.thresholds.source} (R:{a.thresholds.red_days ?? '-'} / A:{a.thresholds.amber_days ?? '-'})
                            </span>
                          )}
                        </div>
                      ))}
                      {expiryData?.suspend_recommended && (
                        <p className="text-xs text-red-700 font-medium">Suspension recommended based on expiry policy.</p>
                      )}
                    </div>
                  )}
                </div>

                {pqq.review_notes && (
                  <div className="mt-4 p-3 rounded-lg bg-blue-50">
                    <p className="text-sm text-blue-800"><span className="font-medium">Review Notes:</span> {pqq.review_notes}</p>
                  </div>
                )}

                {isPartner && pqq.company_id === user?.id && (
                  <div className="flex gap-3 mt-4 pt-4 border-t border-gray-100">
                    <button
                      onClick={() => openRenewPqq(pqq)}
                      disabled={pqq.status === 'under_review'}
                      className="btn-secondary flex items-center gap-2 text-sm py-2"
                    >
                      <RotateCcw className="w-4 h-4" />
                      {pqq.status === 'under_review' ? 'Under Review' : 'Renew PQQ'}
                    </button>
                  </div>
                )}

                {canReviewSubmission && (
                  <div className="flex gap-3 mt-4 pt-4 border-t border-gray-100">
                    <button onClick={() => reviewPQQ(pqq.id, 'approved')} className="btn-primary flex items-center gap-2 text-sm py-2">
                      <CheckCircle className="w-4 h-4" /> Approve
                    </button>
                    <button onClick={() => reviewPQQ(pqq.id, 'rejected')} className="btn-secondary flex items-center gap-2 text-sm py-2 text-red-600 border-red-200 hover:bg-red-50">
                      <XCircle className="w-4 h-4" /> Reject
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add new partner (create account) – opened from Invite Partner modal when partner not in list */}
      {showInviteModal && <InvitePartnerModal onClose={() => setShowInviteModal(false)} onInvited={() => { setShowInviteModal(false); loadData(); }} />}

      {/* Invite Partner Modal – sends PQQ invitation */}
      {showInvitePQQModal && (
        <InvitePQQModal
          inviterRole={user?.role}
          projects={projects}
          partners={partners}
          templates={templates}
          onClose={() => setShowInvitePQQModal(false)}
          onInvited={() => { setShowInvitePQQModal(false); loadData(); }}
          onAddNewPartner={() => { setShowInvitePQQModal(false); setShowInviteModal(true); }}
        />
      )}

      {/* Import template modal */}
      {showImportTemplateModal && (
        <ImportPQQTemplateModal
          initialTemplateId={importDefaults.templateId}
          initialTemplateName={importDefaults.templateName}
          onClose={() => {
            setShowImportTemplateModal(false);
            setImportDefaults({ templateId: '', templateName: '' });
          }}
          onImported={() => {
            setShowImportTemplateModal(false);
            setImportDefaults({ templateId: '', templateName: '' });
            loadData();
          }}
        />
      )}

      {showTemplatePreviewModal && (
        <TemplatePreviewModal
          template={previewTemplate}
          sections={previewSections}
          questions={previewQuestions}
          loading={previewLoading}
          error={previewError}
          onClose={() => {
            setShowTemplatePreviewModal(false);
            setPreviewTemplate(null);
            setPreviewSections([]);
            setPreviewQuestions([]);
            setPreviewError('');
          }}
        />
      )}

      {/* PQQ Submission Modal (partner: requires invitation_id) */}
      {showPQQModal && (
        <PQQSubmissionModal
          invitationId={submittingForInvitationId}
          mode="submit"
          onClose={() => { setShowPQQModal(false); setSubmittingForInvitationId(null); }}
          onSubmitted={() => { setShowPQQModal(false); setSubmittingForInvitationId(null); loadData(); }}
        />
      )}

      {showRenewPQQModal && (
        <PQQSubmissionModal
          mode="renew"
          submissionId={renewSubmissionContext?.submissionId}
          invitationId={renewSubmissionContext?.invitationId}
          initialAnswers={renewSubmissionContext?.initialAnswers || {}}
          onClose={() => {
            setShowRenewPQQModal(false);
            setRenewSubmissionContext(null);
          }}
          onSubmitted={() => {
            setShowRenewPQQModal(false);
            setRenewSubmissionContext(null);
            setPqqActionMessage({ type: 'success', text: 'PQQ renewal submitted for review.' });
            loadData();
            setTab('pqq');
          }}
        />
      )}
    </div>
  );
}

function InvitePartnerModal({ onClose, onInvited }) {
  const [form, setForm] = useState({
    email: '', first_name: '', last_name: '', company_name: '', company_registration: '',
    role: 'contractor', phone: '', nationality: 'Irish',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.first_name || !form.last_name) {
      setError('Name and email are required');
      return;
    }
    setSubmitting(true);
    setError('');

    // Register the partner as a new user
    const res = await api.post('/auth/register', {
      ...form,
      password: 'Password123!', // Default password for invited partners
    });

    setSubmitting(false);
    if (res.success) {
      onInvited();
    } else {
      setError(res.message || 'Failed to invite partner');
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">Add new partner</h3>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100"><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg">{error}</div>}
          <p className="text-sm text-gray-500">Register a new partner (contractor or subcontractor). After adding, use Invite Partner to send them a PQQ invitation.</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
              <input type="text" value={form.first_name} onChange={e => setForm({...form, first_name: e.target.value})} className="w-full border border-gray-200 rounded-xl py-2.5 px-3 text-sm focus:ring-2 focus:ring-primary-500 outline-none" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
              <input type="text" value={form.last_name} onChange={e => setForm({...form, last_name: e.target.value})} className="w-full border border-gray-200 rounded-xl py-2.5 px-3 text-sm focus:ring-2 focus:ring-primary-500 outline-none" required />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
            <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="w-full border border-gray-200 rounded-xl py-2.5 px-3 text-sm focus:ring-2 focus:ring-primary-500 outline-none" placeholder="partner@company.com" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
            <input type="text" value={form.company_name} onChange={e => setForm({...form, company_name: e.target.value})} className="w-full border border-gray-200 rounded-xl py-2.5 px-3 text-sm focus:ring-2 focus:ring-primary-500 outline-none" placeholder="Company Ltd." />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Company Registration</label>
              <input type="text" value={form.company_registration} onChange={e => setForm({...form, company_registration: e.target.value})} className="w-full border border-gray-200 rounded-xl py-2.5 px-3 text-sm focus:ring-2 focus:ring-primary-500 outline-none" placeholder="IE12345" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
              <select value={form.role} onChange={e => setForm({...form, role: e.target.value})} className="w-full border border-gray-200 rounded-xl py-2.5 px-3 text-sm focus:ring-2 focus:ring-primary-500 outline-none">
                <option value="contractor">Contractor</option>
                <option value="subcontractor">Subcontractor</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
            <input type="tel" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className="w-full border border-gray-200 rounded-xl py-2.5 px-3 text-sm focus:ring-2 focus:ring-primary-500 outline-none" placeholder="+353 1 234 5678" />
          </div>
          <p className="text-xs text-gray-500">The partner will be registered with a default password (Password123!) and can log in immediately.</p>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={submitting} className="btn-primary flex-1 flex items-center justify-center gap-2">
              {submitting ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" /> : <><UserPlus className="w-4 h-4" /> Add partner</>}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

function InvitePQQModal({ inviterRole, projects, partners, templates, onClose, onInvited, onAddNewPartner }) {
  const [projectId, setProjectId] = useState('');
  const [inviteeId, setInviteeId] = useState('');
  const [templateId, setTemplateId] = useState('');
  const [dueDays, setDueDays] = useState(14);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const selectedProject = projects.find(p => p.id === projectId);
  useEffect(() => {
    if (selectedProject?.pqq_template_id) setTemplateId(selectedProject.pqq_template_id);
    if (selectedProject?.pqq_due_days != null) setDueDays(selectedProject.pqq_due_days);
  }, [selectedProject?.id, selectedProject?.pqq_template_id, selectedProject?.pqq_due_days]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!projectId || !inviteeId || !templateId) { setError('Select project, partner, and template'); return; }
    setSubmitting(true);
    setError('');
    const res = await api.post('/onboarding/invite-pqq', { project_id: projectId, invitee_id: inviteeId, pqq_template_id: templateId, due_days: dueDays });
    setSubmitting(false);
    if (res.success) onInvited();
    else setError(res.message || 'Failed to invite');
  };

  const contractorPartners = inviterRole === 'contractor'
    ? partners.filter(p => p.role === 'subcontractor')
    : partners.filter(p => p.role === 'contractor' || p.role === 'subcontractor');

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">Invite Partner</h3>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100"><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg">{error}</div>}
          <p className="text-sm text-gray-500">Invite a partner to submit a PQQ for a Verified Project. They will receive the invitation and can submit from this portal.</p>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Verified Project (VP) *</label>
            <select value={projectId} onChange={e => setProjectId(e.target.value)} className="w-full border border-gray-200 rounded-xl py-2.5 px-3 text-sm focus:ring-2 focus:ring-primary-500 outline-none" required>
              <option value="">Select project...</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Partner *</label>
            <select value={inviteeId} onChange={e => setInviteeId(e.target.value)} className="w-full border border-gray-200 rounded-xl py-2.5 px-3 text-sm focus:ring-2 focus:ring-primary-500 outline-none" required>
              <option value="">Select partner...</option>
              {contractorPartners.map(p => <option key={p.id} value={p.id}>{p.company_name} ({p.role})</option>)}
            </select>
            {onAddNewPartner && (
              <button type="button" onClick={onAddNewPartner} className="mt-1.5 text-xs text-primary-600 hover:text-primary-700 font-medium">Partner not in list? Add new partner</button>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">PQQ Template *</label>
            <select value={templateId} onChange={e => setTemplateId(e.target.value)} className="w-full border border-gray-200 rounded-xl py-2.5 px-3 text-sm focus:ring-2 focus:ring-primary-500 outline-none" required>
              <option value="">Select template...</option>
              {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Due (days from now)</label>
            <input type="number" min={1} max={90} value={dueDays} onChange={e => setDueDays(Number(e.target.value) || 14)} className="w-full border border-gray-200 rounded-xl py-2.5 px-3 text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={submitting} className="btn-primary flex-1 flex items-center justify-center gap-2">
              {submitting ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" /> : <><UserPlus className="w-4 h-4" /> Invite Partner</>}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

function PQQSubmissionModal({ mode = 'submit', submissionId = null, invitationId, initialAnswers = null, onClose, onSubmitted }) {
  const [invitation, setInvitation] = useState(null);
  const [template, setTemplate] = useState(null);
  const [sections, setSections] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      if (!invitationId) {
        setLoading(false);
        if (mode === 'renew') {
          setError('This submission cannot be renewed in form mode because invitation link is missing.');
        }
        return;
      }
      setLoading(true);
      setError('');
      if (mode === 'renew') {
        setAnswers(typeof initialAnswers === 'object' && initialAnswers ? initialAnswers : {});
      } else {
        setAnswers({});
      }
      const invRes = await api.get(`/onboarding/invitations/${invitationId}`);
      if (!invRes.success || !invRes.data?.pqq_template_id) {
        setError(invRes.message || 'Unable to load invitation');
        setLoading(false);
        return;
      }
      setInvitation(invRes.data);
      const tplRes = await api.get(`/onboarding/templates/${invRes.data.pqq_template_id}`);
      if (!tplRes.success) {
        setError(tplRes.message || 'Unable to load PQQ template');
        setLoading(false);
        return;
      }
      setTemplate(tplRes.data?.template || null);
      setSections(tplRes.data?.sections || []);
      setQuestions(tplRes.data?.questions || []);
      setLoading(false);
    };
    load();
  }, [invitationId, mode, submissionId]);

  const setAnswer = (questionId, value) => setAnswers(prev => ({ ...prev, [questionId]: value }));

  const autoFillDemoAnswers = () => {
    const next = {};
    const futureDate = '2027-12-31';
    questions.forEach((q) => {
      const type = String(q.question_type || '').toLowerCase();
      const rule = String(q.validation_rule || '').toLowerCase();
      const validationValue = Number(q.validation_value);

      if (type === 'yes_no') {
        next[q.question_id] = false;
        return;
      }
      if (type === 'yes_no_text') {
        next[q.question_id] = 'No';
        return;
      }
      if (type === 'number_input') {
        if (rule === 'min_value' && Number.isFinite(validationValue)) {
          next[q.question_id] = String(Math.max(validationValue, 1));
        } else if (rule === 'max_value' && Number.isFinite(validationValue)) {
          next[q.question_id] = String(Math.max(validationValue - 1, 0));
        } else {
          next[q.question_id] = '1';
        }
        return;
      }
      if (type === 'insurance_input') {
        const minCoverage = Number.isFinite(validationValue) ? validationValue : 10000000;
        next[q.question_id] = {
          policy_number: `POL-${q.question_id}`,
          coverage: String(minCoverage),
          expiry_date: futureDate,
        };
        return;
      }
      if (type.startsWith('file_upload')) {
        if (type === 'file_upload_cert' || type === 'file_upload_dated' || /(cert|certificate|policy|insurance|iso)/i.test(q.question_text || '')) {
          next[q.question_id] = {
            file_ref: `${q.question_id}.pdf`,
            certificate_number: `CERT-${q.question_id}`,
            expiry_date: futureDate,
          };
        } else {
          next[q.question_id] = `${q.question_id}.pdf`;
        }
        return;
      }
      if (type === 'textarea') {
        next[q.question_id] = 'Demo response for client walkthrough.';
        return;
      }
      next[q.question_id] = 'Demo value';
    });
    setAnswers(next);
  };

  const renderQuestionInput = (q) => {
    const v = answers[q.question_id];
    const required = Number(q.required) === 1;
    const commonClass = 'w-full border border-gray-200 rounded-xl py-2.5 px-3 text-sm focus:ring-2 focus:ring-primary-500 outline-none';
    const needsExpiryForUpload = q.question_type === 'file_upload_cert' || /(cert|certificate|policy|insurance|iso)/i.test(q.question_text || '');

    if (q.question_type === 'yes_no') {
      const selectValue = v === true ? 'yes' : v === false ? 'no' : '';
      return (
        <select
          value={selectValue}
          onChange={(e) => setAnswer(q.question_id, e.target.value === 'yes')}
          className={commonClass}
          required={required}
        >
          <option value="">Select...</option>
          <option value="yes">Yes</option>
          <option value="no">No</option>
        </select>
      );
    }

    if (q.question_type === 'number_input') {
      return (
        <input
          type="number"
          value={v ?? ''}
          onChange={(e) => setAnswer(q.question_id, e.target.value)}
          className={commonClass}
          required={required}
        />
      );
    }

    if (q.question_type === 'textarea') {
      return (
        <textarea
          rows={3}
          value={v ?? ''}
          onChange={(e) => setAnswer(q.question_id, e.target.value)}
          className={commonClass}
          required={required}
        />
      );
    }

    if (q.question_type === 'insurance_input') {
      const current = typeof v === 'object' && v ? v : { policy_number: '', coverage: '', expiry_date: '' };
      return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <input
            type="text"
            placeholder="Policy number"
            value={current.policy_number}
            onChange={(e) => setAnswer(q.question_id, { ...current, policy_number: e.target.value })}
            className={commonClass}
            required={required}
          />
          <input
            type="number"
            placeholder="Coverage (EUR)"
            value={current.coverage}
            onChange={(e) => setAnswer(q.question_id, { ...current, coverage: e.target.value })}
            className={commonClass}
            required={required}
          />
          <input
            type="date"
            value={current.expiry_date}
            onChange={(e) => setAnswer(q.question_id, { ...current, expiry_date: e.target.value })}
            className={commonClass}
            required={required}
          />
        </div>
      );
    }

    if (q.question_type.startsWith('file_upload')) {
      if (needsExpiryForUpload) {
        const current = typeof v === 'object' && v
          ? v
          : { file_ref: '', certificate_number: '', expiry_date: '' };
        return (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <input
              type="text"
              value={current.file_ref || ''}
              onChange={(e) => setAnswer(q.question_id, { ...current, file_ref: e.target.value })}
              className={commonClass}
              placeholder="File reference / URL"
              required={required}
            />
            <input
              type="text"
              value={current.certificate_number || ''}
              onChange={(e) => setAnswer(q.question_id, { ...current, certificate_number: e.target.value })}
              className={commonClass}
              placeholder="Certificate number (optional)"
            />
            <input
              type="date"
              value={current.expiry_date || ''}
              onChange={(e) => setAnswer(q.question_id, { ...current, expiry_date: e.target.value })}
              className={commonClass}
              required={required}
            />
          </div>
        );
      }
      return (
        <input
          type="text"
          value={v ?? ''}
          onChange={(e) => setAnswer(q.question_id, e.target.value)}
          className={commonClass}
          placeholder="Mock upload reference (file name or URL)"
          required={required}
        />
      );
    }

    return (
      <input
        type="text"
        value={v ?? ''}
        onChange={(e) => setAnswer(q.question_id, e.target.value)}
        className={commonClass}
        required={required}
      />
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!invitationId) return;
    setSubmitting(true);
    setError('');
    const res = mode === 'renew'
      ? await api.post(`/onboarding/pqq/${submissionId}/renew`, { answers })
      : await api.post('/onboarding/pqq', { invitation_id: invitationId, answers });
    setSubmitting(false);
    if (res.success) onSubmitted();
    else setError(res.message || (mode === 'renew' ? 'Failed to renew PQQ' : 'Failed to submit PQQ'));
  };

  if (!invitationId) {
    return createPortal(
      <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6">
          <p className="text-gray-600 text-sm">Select an invitation from the PQQ Invitations table and click &quot;Submit PQQ&quot;.</p>
          <button onClick={onClose} className="mt-4 w-full btn-secondary">Close</button>
        </div>
      </div>,
      document.body
    );
  }

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">{mode === 'renew' ? 'Renew PQQ' : 'Submit PQQ'}</h3>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100"><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg">{error}</div>}
          {loading && <p className="text-sm text-gray-500">Loading invitation and template...</p>}
          {!loading && template && (
            <>
              <div className="p-3 rounded-lg bg-gray-50 text-sm text-gray-700">
                <p><span className="font-medium">Template:</span> {template.name}</p>
                {invitation?.project_title && <p><span className="font-medium">Project:</span> {invitation.project_title}</p>}
                <p><span className="font-medium">Due date:</span> {invitation?.due_date}</p>
              </div>
              <div className="flex justify-end">
                <button type="button" onClick={autoFillDemoAnswers} className="btn-secondary text-sm py-2 px-3">
                  Auto-fill demo answers
                </button>
              </div>
              {sections.map((section) => (
                <div key={section.section_id} className="rounded-xl border border-gray-200 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-gray-900">{section.section_number}. {section.section_title}</h4>
                    <span className={section.scoring_type === 'pass_fail' ? 'badge-red' : 'badge-blue'}>
                      {section.scoring_type === 'pass_fail' ? 'Pass / Fail Gate' : `${section.max_points || 0} pts`}
                    </span>
                  </div>
                  {(questions.filter(q => q.section_id === section.section_id)).map((q) => (
                    <div key={q.question_id} className="space-y-1.5">
                      <label className="block text-sm font-medium text-gray-700">
                        {q.question_number ? `${q.question_number} ` : ''}{q.question_text}
                        {Number(q.required) === 1 && <span className="text-red-500 ml-1">*</span>}
                      </label>
                      {renderQuestionInput(q)}
                    </div>
                  ))}
                </div>
              ))}
            </>
          )}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={submitting || loading || !!error} className="btn-primary flex-1 flex items-center justify-center gap-2">
              {submitting ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" /> : <><Send className="w-4 h-4" /> {mode === 'renew' ? 'Renew PQQ' : 'Submit PQQ'}</>}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

function ImportPQQTemplateModal({ initialTemplateId = '', initialTemplateName = '', onClose, onImported }) {
  const [fileName, setFileName] = useState('');
  const [workbookBase64, setWorkbookBase64] = useState('');
  const [templateId, setTemplateId] = useState(initialTemplateId);
  const [templateName, setTemplateName] = useState(initialTemplateName);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    setTemplateId(initialTemplateId);
    setTemplateName(initialTemplateName);
  }, [initialTemplateId, initialTemplateName]);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    setError('');
    setSuccess('');
    if (!file) {
      setFileName('');
      setWorkbookBase64('');
      return;
    }
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || '');
      const b64 = result.includes(',') ? result.split(',')[1] : result;
      setWorkbookBase64(b64);
    };
    reader.onerror = () => {
      setError('Failed to read file');
      setWorkbookBase64('');
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!workbookBase64) {
      setError('Please choose an .xlsx file first');
      return;
    }
    setSubmitting(true);
    const res = await api.post('/onboarding/templates/import-xlsx', {
      workbook_base64: workbookBase64,
      template_id: templateId.trim() || undefined,
      template_name: templateName.trim() || undefined,
    });
    setSubmitting(false);
    if (!res.success) {
      setError(res.message || 'Import failed');
      return;
    }
    setSuccess(`Imported template ${res.data?.template_id || ''} (${res.data?.parsed_sections ?? 0} sections, ${res.data?.parsed_questions ?? 0} questions)`);
    setTimeout(() => onImported(), 500);
  };

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">Import PQQ Template (.xlsx)</h3>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100"><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg">{error}</div>}
          {success && <div className="p-3 bg-green-50 text-green-700 text-sm rounded-lg">{success}</div>}
          <p className="text-sm text-gray-500">Upload the Excel template to import sections, questions, scoring, and expiry rules.</p>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Template file (.xlsx) *</label>
            <input type="file" accept=".xlsx" onChange={handleFileChange} className="w-full border border-gray-200 rounded-xl py-2.5 px-3 text-sm focus:ring-2 focus:ring-primary-500 outline-none" required />
            {fileName && <p className="text-xs text-gray-500 mt-1">Selected: {fileName}</p>}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Override Template ID (optional)</label>
              <input type="text" value={templateId} onChange={(e) => setTemplateId(e.target.value)} className="w-full border border-gray-200 rounded-xl py-2.5 px-3 text-sm focus:ring-2 focus:ring-primary-500 outline-none" placeholder="tpl-construction-14-v2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Override Template Name (optional)</label>
              <input type="text" value={templateName} onChange={(e) => setTemplateName(e.target.value)} className="w-full border border-gray-200 rounded-xl py-2.5 px-3 text-sm focus:ring-2 focus:ring-primary-500 outline-none" placeholder="Construction PQQ v2" />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={submitting} className="btn-primary flex-1 flex items-center justify-center gap-2">
              {submitting ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" /> : <><Upload className="w-4 h-4" /> Import template</>}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

function TemplatePreviewModal({ template, sections, questions, loading, error, onClose }) {
  const questionsBySection = sections.map((s) => ({
    ...s,
    questions: questions.filter((q) => q.section_id === s.section_id),
  }));

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">Imported Template Details</h3>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100"><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <div className="p-6 space-y-4">
          {loading && <p className="text-sm text-gray-500">Loading template details...</p>}
          {error && <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg">{error}</div>}
          {!loading && !error && template && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3 rounded-lg bg-gray-50 text-sm">
                <p><span className="font-medium">Template:</span> {template.name}</p>
                <p><span className="font-medium">Version:</span> {template.template_version || 'n/a'}</p>
                <p><span className="font-medium">Pass Threshold:</span> {template.pass_threshold ?? 70}</p>
                <p><span className="font-medium">Sections:</span> {sections.length}</p>
                <p><span className="font-medium">Questions:</span> {questions.length}</p>
                <p><span className="font-medium">Status:</span> {template.status || 'active'}</p>
              </div>
              {questionsBySection.map((section) => (
                <div key={section.section_id} className="rounded-xl border border-gray-200 p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-gray-900">{section.section_number}. {section.section_title}</h4>
                    <span className={section.scoring_type === 'pass_fail' ? 'badge-red' : 'badge-blue'}>
                      {section.scoring_type === 'pass_fail' ? 'Pass / Fail' : `${section.max_points || 0} pts`}
                    </span>
                  </div>
                  {section.questions.length === 0 ? (
                    <p className="text-sm text-gray-500">No questions in this section.</p>
                  ) : (
                    <div className="space-y-1.5">
                      {section.questions.map((q) => (
                        <div key={q.question_id} className="text-sm text-gray-700">
                          <span className="font-medium">{q.question_number || q.question_id}.</span> {q.question_text}
                          <span className="ml-2 text-xs text-gray-500">[{q.question_type}{q.required ? ', required' : ''}{q.points ? `, ${q.points} pts` : ''}]</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </>
          )}
          <div className="pt-2">
            <button onClick={onClose} className="btn-secondary w-full">Close</button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
