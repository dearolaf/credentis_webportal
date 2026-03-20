import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, AlertCircle } from 'lucide-react';

const demoAccounts = [
  { email: 'client@hyperdc.co', role: 'Client', company: 'HyperDC Co' },
  { email: 'contractor@buildright.ie', role: 'Contractor', company: 'BuildRight Construction Ltd' },
  { email: 'sub@elecspec.ie', role: 'Subcontractor', company: 'ElecSpec Electrical' },
  { email: 'sub@sticksandplanks.ie', role: 'Subcontractor', company: 'Sticks and Planks Scaffolding' },
];

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState('client@energycorp.ie');
  const [password, setPassword] = useState('Password123!');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const result = await login(email, password);
    if (!result.success) setError(result.message);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-600 via-primary-700 to-primary-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <img src="/logo_text.png" alt="Credentis" className="h-14 mx-auto mb-3 brightness-0 invert" />
          <p className="text-primary-200 mt-1">Digital Identity Platform</p>
        </div>

        {/* Login form */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-1">Sign in to your portal</h2>
          <p className="text-sm text-gray-500 mb-6">Client, Contractor & Subcontractor access</p>

          {error && (
            <div className="flex items-center gap-2 bg-red-50 text-red-700 px-4 py-3 rounded-xl mb-4 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none" placeholder="Enter email" required />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none" placeholder="Enter password" required />
              </div>
            </div>
            <button type="submit" disabled={loading} className="w-full btn-primary disabled:opacity-60">
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          {/* Demo accounts */}
          <div className="mt-6 pt-6 border-t border-gray-100">
            <p className="text-xs font-medium text-gray-500 mb-3">Demo Accounts (password: Password123!)</p>
            <div className="space-y-2">
              {demoAccounts.map(acc => (
                <button key={acc.email} onClick={() => { setEmail(acc.email); setPassword('Password123!'); }}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-gray-50 text-left text-sm transition-colors border border-transparent hover:border-gray-200">
                  <div>
                    <span className="font-medium text-gray-700">{acc.company}</span>
                    <span className="text-gray-400 ml-2 text-xs">{acc.email}</span>
                  </div>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded ${
                    acc.role === 'Client' ? 'bg-blue-50 text-blue-700' : acc.role === 'Contractor' ? 'bg-green-50 text-green-700' : 'bg-purple-50 text-purple-700'
                  }`}>{acc.role}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <p className="text-center text-primary-200 text-xs mt-6">
          Blockchain-anchored | W3C VCs | GDPR Compliant | EU Data Residency
        </p>
      </div>
    </div>
  );
}
