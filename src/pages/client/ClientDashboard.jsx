import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Users, FolderKanban, ShieldCheck, AlertTriangle, CheckCircle, Clock, FileText, ArrowRight } from 'lucide-react';
import api from '../../services/api';

const COLORS = ['#10b981', '#f59e0b', '#ef4444', '#6b7280'];

export default function ClientDashboard() {
  const [stats, setStats] = useState(null);
  const [compliance, setCompliance] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);

  useEffect(() => {
    Promise.all([
      api.get('/stats'),
      api.get('/compliance/dashboard'),
      api.get('/onboarding/tasks'),
      api.get('/projects'),
    ]).then(([s, c, t, p]) => {
      setStats(s.data);
      setCompliance(c.data);
      setTasks(t.data || []);
      setProjects(p.data || []);
    });
  }, []);

  if (!stats || !compliance) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" /></div>;

  const expiryData = [
    { name: 'Valid', value: compliance.expirySummary.green, color: '#10b981' },
    { name: 'Expiring', value: compliance.expirySummary.amber, color: '#f59e0b' },
    { name: 'Expired', value: compliance.expirySummary.red, color: '#ef4444' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Client Dashboard</h2>
        <p className="text-gray-500 text-sm mt-1">Real-time oversight of projects, compliance, and workforce</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={FolderKanban} label="Active Projects" value={compliance.summary.totalProjects} color="blue" />
        <StatCard icon={Users} label="Total Professionals" value={compliance.summary.totalWorkers} color="green" />
        <StatCard icon={ShieldCheck} label="Active Assignments" value={compliance.summary.activeAssignments} color="purple" />
        <StatCard icon={AlertTriangle} label="Pending Tasks" value={tasks.length} color="amber" />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Credential Expiry */}
        <div className="card p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Credential Compliance</h3>
          <div className="flex items-center justify-center">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={expiryData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" label={({name, value}) => `${name}: ${value}`}>
                  {expiryData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-6 mt-2">
            {expiryData.map(d => (
              <div key={d.name} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: d.color }} />
                <span className="text-sm text-gray-600">{d.name} ({d.value})</span>
              </div>
            ))}
          </div>
        </div>

        {/* Nationality Breakdown */}
        <div className="card p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Workforce by Nationality</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={compliance.nationalityBreakdown}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="nationality" tick={{ fontSize: 12 }} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#3b82f6" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Tasks & Projects */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Task Queue */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Task Queue</h3>
            <span className="badge-amber">{tasks.length} pending</span>
          </div>
          {tasks.length === 0 ? <p className="text-sm text-gray-500">No pending tasks</p> : (
            <div className="space-y-3">
              {tasks.map((task, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50">
                  <div className={`w-2 h-2 rounded-full ${task.priority === 'high' ? 'bg-red-500' : 'bg-amber-500'}`} />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{task.label}</p>
                    <p className="text-xs text-gray-500">{task.count} item(s) • {task.priority} priority</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-400" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Projects */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Verified Projects</h3>
            <Link to="/client/projects" className="text-sm text-primary-600 hover:text-primary-700 font-medium">View all</Link>
          </div>
          <div className="space-y-3">
            {projects.slice(0, 5).map(project => (
              <div key={project.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors">
                <div className="w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center">
                  <FolderKanban className="w-5 h-5 text-primary-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{project.title}</p>
                  <p className="text-xs text-gray-500">{project.location} • {project.worker_count || 0} professionals</p>
                </div>
                <span className={`text-xs font-semibold px-2 py-1 rounded-lg ${
                  project.status === 'active' ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-600'
                }`}>{project.status}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Project Compliance Table */}
      <div className="card p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Project Compliance Overview</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left py-3 px-4 font-medium text-gray-500">Project</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500">Sector</th>
                <th className="text-center py-3 px-4 font-medium text-gray-500">Professionals</th>
                <th className="text-center py-3 px-4 font-medium text-gray-500">Endorsed</th>
                <th className="text-center py-3 px-4 font-medium text-gray-500">Active</th>
              </tr>
            </thead>
            <tbody>
              {(compliance.projectCompliance || []).map(pc => (
                <tr key={pc.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="py-3 px-4 font-medium text-gray-900">{pc.title}</td>
                  <td className="py-3 px-4 capitalize text-gray-600">{pc.sector}</td>
                  <td className="py-3 px-4 text-center">{pc.total_workers}</td>
                  <td className="py-3 px-4 text-center"><span className="badge-green">{pc.endorsed_workers}</span></td>
                  <td className="py-3 px-4 text-center"><span className="badge-blue">{pc.active_workers}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }) {
  const colors = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
    amber: 'bg-amber-50 text-amber-600',
  };
  return (
    <div className="stat-card">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colors[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          <p className="text-sm text-gray-500">{label}</p>
        </div>
      </div>
    </div>
  );
}
