import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { FolderKanban, Plus, MapPin, Calendar, Users, ChevronDown, ChevronRight, Shield, X, CheckCircle, XCircle, UserPlus, Send, Eye, ArrowRight, Trash2, FileText } from 'lucide-react';
import api from '../../services/api';

export default function ProjectManagement() {
  const [projects, setProjects] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDelegateModal, setShowDelegateModal] = useState(false);
  const [partners, setPartners] = useState([]);
  const [workerDetail, setWorkerDetail] = useState(null);
  const [verificationPanel, setVerificationPanel] = useState(null);

  const loadProjects = () => {
    api.get('/projects').then(res => {
      setProjects(res.data || []);
      setLoading(false);
    });
  };

  useEffect(() => { loadProjects(); }, []);

  const loadDetail = async (id) => {
    if (selected?.id === id) { setSelected(null); return; }
    const res = await api.get(`/projects/${id}`);
    if (res.success) setSelected(res.data);
  };

  const handleDelegationApproval = async (projectId, delegationId, approve) => {
    await api.put(`/projects/${projectId}/delegations/${delegationId}/status`, { status: approve ? 'approved' : 'rejected' });
    loadDetail(projectId);
  };

  const handleWorkerOverride = async (projectId, assignmentId, action) => {
    if (action === 'endorse') {
      const res = await api.put(`/projects/${projectId}/assignments/${assignmentId}/endorse`);
      if (!res.success) {
        alert(res.message || 'Endorsement failed. Professional may have unsatisfied DAR or compliance issues.');
        return;
      }
    } else {
      await api.put(`/projects/${projectId}/assignments/${assignmentId}/status`, { status: action });
    }
    loadDetail(projectId);
  };

  const openDelegateModal = async () => {
    const res = await api.get('/onboarding/partners');
    setPartners(res.data || []);
    setShowDelegateModal(true);
  };

  const loadWorkerDetail = async (workerId) => {
    const res = await api.get(`/credentials?worker_id=${workerId}`);
    setWorkerDetail({ workerId, credentials: res.data || [] });
  };

  const handleDeleteProject = async (projectId, title) => {
    if (!window.confirm(`Are you sure you want to delete "${title}"? This will remove all assignments and delegations.`)) return;
    const res = await api.delete(`/projects/${projectId}`);
    if (res.success) {
      setSelected(null);
      loadProjects();
    } else {
      alert(res.message || 'Failed to delete project');
    }
  };

  const handleVerificationUpdate = async (workerId, passportStatus, biometricStatus) => {
    if (!selected?.id) return;
    const res = await api.put(`/projects/${selected.id}/workers/${workerId}/verification-status`, {
      passport_status: passportStatus,
      biometric_status: biometricStatus,
    });
    if (res.success) {
      setVerificationPanel(null);
      loadDetail(selected.id);
    } else {
      alert(res.message || 'Failed to update verification status');
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Verified Projects</h2>
          <p className="text-gray-500 text-sm mt-1">Create, manage, and delegate projects</p>
        </div>
        <button onClick={() => setShowCreateModal(true)} className="btn-primary flex items-center gap-2"><Plus className="w-4 h-4" /> Create Project</button>
      </div>

      <div className="space-y-3">
        {projects.map(project => (
          <div key={project.id} className="card">
            <button onClick={() => loadDetail(project.id)} className="w-full p-5 text-left">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary-50 flex items-center justify-center flex-shrink-0">
                  <FolderKanban className="w-6 h-6 text-primary-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="font-semibold text-gray-900">{project.title}</h3>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-lg ${project.status === 'active' ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{project.status}</span>
                  </div>
                  <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                    <span className="flex items-center gap-1"><MapPin className="w-4 h-4" />{project.location}</span>
                    <span className="flex items-center gap-1"><Calendar className="w-4 h-4" />{project.start_date} - {project.end_date}</span>
                    <span className="flex items-center gap-1"><Users className="w-4 h-4" />{project.worker_count || 0} / {project.max_workers} professionals</span>
                    <span className="flex items-center gap-1"><Shield className="w-4 h-4 text-primary-500" />{project.sector}</span>
                  </div>
                </div>
                {selected?.id === project.id ? <ChevronDown className="w-5 h-5 text-gray-400" /> : <ChevronRight className="w-5 h-5 text-gray-400" />}
              </div>
            </button>

            {selected?.id === project.id && (
              <div className="px-5 pb-5 border-t border-gray-100 pt-4">
                {/* Action bar */}
                <div className="flex gap-2 mb-4">
                  <button onClick={openDelegateModal} className="btn-secondary flex items-center gap-2 text-sm py-2">
                    <Send className="w-4 h-4" /> Delegate to Contractor
                  </button>
                  <button onClick={() => handleDeleteProject(selected.id, selected.title)} className="flex items-center gap-2 text-sm py-2 px-4 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 transition-colors">
                    <Trash2 className="w-4 h-4" /> Delete Project
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Description</h4>
                    <p className="text-sm text-gray-600">{selected.description}</p>
                    <h4 className="font-medium text-gray-900 mt-4 mb-2">Compliance &amp; DAR</h4>
                    <p className="text-sm text-gray-600 mb-2">
                      What you require from each professional (e.g. Right-to-Work from identity verification; passport is not shared) is set at VP level and inherited. Contractor and Subcontractors add further requirements <strong>per professional</strong> and see DAR status under each professional in their portals. On <strong>Compliance</strong>, anything red is for the Contractor to fix, then down to Subcontractor and ultimately the Professional.
                    </p>

                    <h4 className="font-medium text-gray-900 mt-4 mb-2">Responsibility Chain</h4>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 p-2 rounded-lg bg-blue-50 text-sm">
                        <div className="w-6 h-6 rounded-full bg-blue-200 flex items-center justify-center text-xs font-bold text-blue-800">C</div>
                        <span className="font-medium text-blue-800">Client: {selected.client?.company_name || 'HyperDC'}</span>
                      </div>
                      {(selected.delegations || []).filter(d => d.role === 'contractor').map(d => (
                        <div key={d.id} className="ml-4 space-y-1">
                          <div className="flex items-center gap-2 p-2 rounded-lg bg-green-50 text-sm">
                            <ArrowRight className="w-4 h-4 text-green-600" />
                            <div className="w-6 h-6 rounded-full bg-green-200 flex items-center justify-center text-xs font-bold text-green-800">Co</div>
                            <span className="font-medium text-green-800">{d.company_name}</span>
                            <span className={d.status === 'approved' ? 'badge-green' : 'badge-amber'}>{d.status}</span>
                          </div>
                          {(selected.delegations || []).filter(sd => sd.role === 'subcontractor').map(sd => (
                            <div key={sd.id} className="ml-6 flex items-center gap-2 p-2 rounded-lg bg-purple-50 text-sm">
                              <ArrowRight className="w-4 h-4 text-purple-600" />
                              <div className="w-6 h-6 rounded-full bg-purple-200 flex items-center justify-center text-xs font-bold text-purple-800">S</div>
                              <span className="font-medium text-purple-800">{sd.company_name || `${sd.first_name} ${sd.last_name}`}</span>
                              <span className={sd.status === 'approved' ? 'badge-green' : 'badge-amber'}>{sd.status}</span>
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Delegations ({selected.delegations?.length || 0})</h4>
                    {(selected.delegations || []).map(d => (
                      <div key={d.id} className="flex items-center gap-3 p-2 rounded-lg bg-gray-50 mb-2">
                        <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-xs font-semibold text-primary-700">
                          {d.first_name?.[0]}{d.last_name?.[0]}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">{d.company_name || `${d.first_name} ${d.last_name}`}</p>
                          <p className="text-xs text-gray-500 capitalize">{d.role}</p>
                        </div>
                        {d.status === 'pending' ? (
                          <div className="flex gap-1">
                            <button onClick={() => handleDelegationApproval(selected.id, d.id, true)} className="p-1.5 rounded-lg hover:bg-green-50 text-green-600" title="Approve"><CheckCircle className="w-4 h-4" /></button>
                            <button onClick={() => handleDelegationApproval(selected.id, d.id, false)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-600" title="Reject"><XCircle className="w-4 h-4" /></button>
                          </div>
                        ) : (
                          <span className={d.status === 'approved' ? 'badge-green' : d.status === 'rejected' ? 'badge-red' : 'badge-amber'}>{d.status}</span>
                        )}
                      </div>
                    ))}
                    <h4 className="font-medium text-gray-900 mt-4 mb-2">Professionals ({selected.workers?.length || 0})</h4>
                    <div className="max-h-64 overflow-y-auto space-y-2">
                      {(selected.workers || []).map(w => (
                        <div key={w.id} className="flex items-center gap-3 p-2 rounded-lg bg-gray-50">
                          <div className="flex-1">
                            <p className="text-sm font-medium">{w.first_name} {w.last_name}</p>
                            <p className="text-xs text-gray-500">{w.nationality} • {w.role_on_project}</p>
                            <p className="text-[11px] text-gray-500 mt-0.5">
                              Passport: <span className="font-medium">{w.passport_status || 'none'}</span> · Biometric: <span className="font-medium">{w.biometric_status || 'none'}</span>
                            </p>
                          </div>
                          <span className={w.endorsement_status === 'endorsed' ? 'badge-green' : w.status === 'active' ? 'badge-blue' : 'badge-amber'}>{w.endorsement_status === 'endorsed' ? 'Endorsed' : w.status}</span>
                          {/* Review/Override Actions */}
                          <div className="flex gap-1">
                            <button onClick={() => loadWorkerDetail(w.worker_id)} className="p-1 rounded-lg hover:bg-blue-50 text-blue-600" title="View credentials"><Eye className="w-3.5 h-3.5" /></button>
                            <button onClick={() => setVerificationPanel(w)} className="p-1 rounded-lg hover:bg-indigo-50 text-indigo-600" title="Update verification"><Shield className="w-3.5 h-3.5" /></button>
                            {w.status === 'pending' && (
                              <>
                                <button onClick={() => handleWorkerOverride(selected.id, w.id, 'approved')} className="p-1 rounded-lg hover:bg-green-50 text-green-600" title="Approve"><CheckCircle className="w-3.5 h-3.5" /></button>
                                <button onClick={() => handleWorkerOverride(selected.id, w.id, 'rejected')} className="p-1 rounded-lg hover:bg-red-50 text-red-600" title="Reject"><XCircle className="w-3.5 h-3.5" /></button>
                              </>
                            )}
                            {w.endorsement_status !== 'endorsed' && w.status === 'active' && (
                              <button onClick={() => handleWorkerOverride(selected.id, w.id, 'endorse')} className="p-1 rounded-lg hover:bg-green-50 text-green-600" title="Endorse"><Shield className="w-3.5 h-3.5" /></button>
                            )}
                            {w.status === 'active' && (
                              <button onClick={() => handleWorkerOverride(selected.id, w.id, 'revoked')} className="p-1 rounded-lg hover:bg-red-50 text-red-600" title="Revoke"><XCircle className="w-3.5 h-3.5" /></button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Worker credential drill-down */}
                {workerDetail && (
                  <div className="mt-4 p-4 bg-blue-50 rounded-xl">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium text-blue-900">Professional &amp; Academic Credentials (VCs)</h4>
                      <button onClick={() => setWorkerDetail(null)} className="text-blue-600 text-sm">Close</button>
                    </div>
                    <p className="text-xs text-blue-800 mb-3">As the professional adds qualifications to satisfy subcontractor DAR they become Verifiable Credentials and are visible here up the chain.</p>
                    {workerDetail.credentials.length === 0 ? <p className="text-sm text-blue-700">No credentials found</p> : (
                      <div className="space-y-2">
                        {workerDetail.credentials.map(c => (
                          <div key={c.id} className="flex items-center gap-3 p-2 bg-white rounded-lg text-sm">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium">{c.title}</p>
                              <p className="text-xs text-gray-500">{c.issuer} • Exp: {c.expiry_date || 'N/A'}</p>
                              {c.dar_satisfies && c.dar_satisfies.length > 0 && (
                                <p className="text-xs text-green-700 mt-1">Satisfies DAR: {c.dar_satisfies.map(d => d.requirement_label).join('; ')}</p>
                              )}
                            </div>
                            <span className={c.status === 'valid' ? 'badge-green' : c.status === 'expired' ? 'badge-red' : 'badge-amber'}>{c.status}</span>
                            {c.is_verified ? <Shield className="w-4 h-4 text-green-500" title="Verifiable Credential" /> : null}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Create Project Modal */}
      {showCreateModal && <CreateProjectModal onClose={() => setShowCreateModal(false)} onCreated={() => { setShowCreateModal(false); loadProjects(); }} />}

      {/* Delegate Modal */}
      {showDelegateModal && selected && (
        <DelegateModal
          projectId={selected.id}
          partners={partners}
          onClose={() => setShowDelegateModal(false)}
          onDelegated={() => { setShowDelegateModal(false); loadDetail(selected.id); }}
        />
      )}

      <VerificationStatusModal
        worker={verificationPanel}
        onClose={() => setVerificationPanel(null)}
        onSave={handleVerificationUpdate}
      />
    </div>
  );
}

function CreateProjectModal({ onClose, onCreated }) {
  const [form, setForm] = useState({
    title: '', description: '', sector: 'construction', location: '', country: 'Ireland',
    start_date: '', end_date: '', max_workers: 100, compliance_requirements: ['SafePass', 'Site Induction'],
    pqq_template_id: '', pqq_due_days: 14,
    dar_base_rtw: true,
  });
  const [selectedRequirement, setSelectedRequirement] = useState('Manual Handling');
  const [templates, setTemplates] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const predefinedComplianceRules = [
    'SafePass',
    'Manual Handling',
    'Working at Heights',
    'Site Induction',
    'Fire Warden',
    'First Aid',
    'Confined Spaces',
    'Electrical Safety',
  ];

  useEffect(() => {
    api.get('/onboarding/templates').then(r => setTemplates(r.data || [])).catch(() => {});
  }, []);

  const sectors = ['construction', 'energy', 'infrastructure', 'manufacturing', 'technology', 'healthcare'];
  const countries = ['Ireland', 'Germany', 'Poland', 'Romania', 'France', 'Spain', 'UK'];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title) return;
    setSubmitting(true);
    const payload = { ...form };
    if (form.dar_base_rtw) {
      payload.dar_base = [{ key: 'rtw', label: 'Right-to-Work status (from identity verification – passport not shared)' }];
    }
    delete payload.dar_base_rtw;
    const res = await api.post('/projects', payload);
    setSubmitting(false);
    if (res.success) onCreated();
  };

  const addRequirement = () => {
    if (!selectedRequirement) return;
    if (!form.compliance_requirements.includes(selectedRequirement)) {
      setForm({ ...form, compliance_requirements: [...form.compliance_requirements, selectedRequirement] });
    }
  };

  const removeRequirement = (req) => {
    setForm({ ...form, compliance_requirements: form.compliance_requirements.filter(r => r !== req) });
  };

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">Create Verified Project</h3>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100"><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Project Title *</label>
            <input type="text" value={form.title} onChange={e => setForm({...form, title: e.target.value})} className="w-full border border-gray-200 rounded-xl py-2.5 px-3 text-sm focus:ring-2 focus:ring-primary-500 outline-none" placeholder="e.g. Dublin Data Centre Phase 2" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} rows={3} className="w-full border border-gray-200 rounded-xl py-2.5 px-3 text-sm focus:ring-2 focus:ring-primary-500 outline-none" placeholder="Project description..." />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sector</label>
              <select value={form.sector} onChange={e => setForm({...form, sector: e.target.value})} className="w-full border border-gray-200 rounded-xl py-2.5 px-3 text-sm focus:ring-2 focus:ring-primary-500 outline-none">
                {sectors.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
              <select value={form.country} onChange={e => setForm({...form, country: e.target.value})} className="w-full border border-gray-200 rounded-xl py-2.5 px-3 text-sm focus:ring-2 focus:ring-primary-500 outline-none">
                {countries.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
            <input type="text" value={form.location} onChange={e => setForm({...form, location: e.target.value})} className="w-full border border-gray-200 rounded-xl py-2.5 px-3 text-sm focus:ring-2 focus:ring-primary-500 outline-none" placeholder="e.g. Dublin, Ireland" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
              <input type="date" value={form.start_date} onChange={e => setForm({...form, start_date: e.target.value})} className="w-full border border-gray-200 rounded-xl py-2.5 px-3 text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
              <input type="date" value={form.end_date} onChange={e => setForm({...form, end_date: e.target.value})} className="w-full border border-gray-200 rounded-xl py-2.5 px-3 text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Max Professionals</label>
            <input type="number" value={form.max_workers} onChange={e => setForm({...form, max_workers: parseInt(e.target.value) || 100})} className="w-full border border-gray-200 rounded-xl py-2.5 px-3 text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">PQQ Template</label>
              <select value={form.pqq_template_id} onChange={e => setForm({...form, pqq_template_id: e.target.value})} className="w-full border border-gray-200 rounded-xl py-2.5 px-3 text-sm focus:ring-2 focus:ring-primary-500 outline-none">
                <option value="">None</option>
                {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">PQQ due (days)</label>
              <input type="number" min={1} max={90} value={form.pqq_due_days} onChange={e => setForm({...form, pqq_due_days: parseInt(e.target.value) || 14})} className="w-full border border-gray-200 rounded-xl py-2.5 px-3 text-sm focus:ring-2 focus:ring-primary-500 outline-none" placeholder="14" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="dar_base_rtw" checked={form.dar_base_rtw} onChange={e => setForm({...form, dar_base_rtw: e.target.checked})} className="rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
            <label htmlFor="dar_base_rtw" className="text-sm text-gray-700">Add base DAR: Right-to-Work status (from identity verification; client sees status only, passport not shared)</label>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Compliance Requirements</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {form.compliance_requirements.map(r => (
                <span key={r} className="badge-blue flex items-center gap-1">{r}<button type="button" onClick={() => removeRequirement(r)} className="ml-1 hover:text-red-600"><X className="w-3 h-3" /></button></span>
              ))}
            </div>
            <div className="flex gap-2">
              <select
                value={selectedRequirement}
                onChange={e => setSelectedRequirement(e.target.value)}
                className="flex-1 border border-gray-200 rounded-xl py-2 px-3 text-sm focus:ring-2 focus:ring-primary-500 outline-none"
              >
                {predefinedComplianceRules.map(rule => (
                  <option key={rule} value={rule}>{rule}</option>
                ))}
              </select>
              <button type="button" onClick={addRequirement} className="btn-secondary text-sm py-2 px-3" title="Add selected rule">
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={submitting || !form.title} className="btn-primary flex-1 flex items-center justify-center gap-2">
              {submitting ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" /> : <><FolderKanban className="w-4 h-4" /> Create Project</>}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

function DelegateModal({ projectId, partners, onClose, onDelegated }) {
  const [selectedPartner, setSelectedPartner] = useState('');
  const [scope, setScope] = useState('full');
  const [submitting, setSubmitting] = useState(false);

  const contractorPartners = partners.filter(p => p.role === 'contractor' || p.role === 'subcontractor');

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
          <h3 className="text-lg font-semibold text-gray-900">Delegate Project</h3>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100"><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Select Partner</label>
            <select value={selectedPartner} onChange={e => setSelectedPartner(e.target.value)} className="w-full border border-gray-200 rounded-xl py-2.5 px-3 text-sm focus:ring-2 focus:ring-primary-500 outline-none">
              <option value="">Choose a partner...</option>
              {contractorPartners.map(p => <option key={p.id} value={p.id}>{p.company_name} ({p.role})</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Delegation Scope</label>
            <select value={scope} onChange={e => setScope(e.target.value)} className="w-full border border-gray-200 rounded-xl py-2.5 px-3 text-sm focus:ring-2 focus:ring-primary-500 outline-none">
              <option value="full">Full Project Management</option>
              <option value="workforce">Workforce Only</option>
              <option value="compliance">Compliance Only</option>
            </select>
          </div>
          <p className="text-xs text-gray-500">The delegation will be auto-approved since you are the client. All actions are blockchain-logged.</p>
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

function VerificationStatusModal({ worker, onClose, onSave }) {
  const [passportStatus, setPassportStatus] = useState('pending');
  const [biometricStatus, setBiometricStatus] = useState('pending');
  const [saving, setSaving] = useState(false);
  const statuses = ['none', 'pending', 'accepted', 'rejected'];

  useEffect(() => {
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
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100"><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Passport</label>
            <select value={passportStatus} onChange={e => setPassportStatus(e.target.value)} className="w-full border border-gray-200 rounded-xl py-2.5 px-3 text-sm focus:ring-2 focus:ring-primary-500 outline-none">
              {statuses.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Biometric</label>
            <select value={biometricStatus} onChange={e => setBiometricStatus(e.target.value)} className="w-full border border-gray-200 rounded-xl py-2.5 px-3 text-sm focus:ring-2 focus:ring-primary-500 outline-none">
              {statuses.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <p className="text-xs text-gray-500">Professional is verified only when both passport and biometric are accepted.</p>
          <div className="flex gap-3 pt-1">
            <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button onClick={handleSave} disabled={saving} className="btn-primary flex-1">{saving ? 'Saving…' : 'Save'}</button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
