import React, { useState } from 'react';
import { RotateCcw } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const ALLOWED_EMAILS = new Set([
  'client@hyperdc.co',
  'contractor@buildright.ie',
  'sub@elecspec.ie',
  'sub@sticksandplanks.ie',
]);

/**
 * PoC: full database re-seed (same as worker app demo reset). Server must allow demo reset.
 */
export default function DemoResetButton({ className = '' }) {
  const { user, logout } = useAuth();
  const [busy, setBusy] = useState(false);
  const email = (user?.email || '').toLowerCase();
  if (!ALLOWED_EMAILS.has(email)) return null;

  const run = async () => {
    if (!window.confirm(
      'Reset the entire PoC database to the original seed?\n\n'
      + 'All users, projects, DAR, PQQ, and credentials will be recreated. You will be signed out and must log in again (Password123!).'
    )) return;
    setBusy(true);
    const res = await api.post('/demo/reset-database', {});
    setBusy(false);
    if (res.success) {
      logout();
      window.location.href = '/login';
    } else {
      window.alert(res.message || 'Reset failed. If this is production, set DEMO_RESET_ENABLED=true on the server.');
    }
  };

  return (
    <button
      type="button"
      onClick={run}
      disabled={busy}
      className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium border border-orange-200 bg-orange-50 text-orange-900 hover:bg-orange-100 disabled:opacity-60 ${className}`}
    >
      <RotateCcw className={`w-4 h-4 ${busy ? 'animate-spin' : ''}`} />
      {busy ? 'Resetting demo…' : 'Reset demo database'}
    </button>
  );
}
