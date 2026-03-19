import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LayoutDashboard, FolderKanban, ShieldCheck, FileText, Users, Building2, LogOut, Menu, X, ChevronDown, Bell, UserPlus } from 'lucide-react';

const navConfig = {
  client: [
    { to: '/client', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/client/projects', icon: FolderKanban, label: 'Projects' },
    { to: '/client/compliance', icon: ShieldCheck, label: 'Compliance' },
    { to: '/onboarding', icon: UserPlus, label: 'Onboarding' },
    { to: '/client/audit', icon: FileText, label: 'Audit Trail' },
  ],
  contractor: [
    { to: '/contractor', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/contractor/workers', icon: Users, label: 'Professionals' },
    { to: '/contractor/compliance', icon: ShieldCheck, label: 'Compliance' },
    { to: '/onboarding', icon: UserPlus, label: 'Onboarding' },
    { to: '/audit', icon: FileText, label: 'Audit Trail' },
  ],
  subcontractor: [
    { to: '/subcontractor', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/subcontractor/workers', icon: Users, label: 'Professionals' },
    { to: '/subcontractor/compliance', icon: ShieldCheck, label: 'Compliance' },
    { to: '/subcontractor/onboarding', icon: UserPlus, label: 'Onboarding' },
    { to: '/audit', icon: FileText, label: 'Audit Trail' },
  ],
};

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);

  const items = navConfig[user?.role] || navConfig.client;

  const handleLogout = () => { logout(); navigate('/login'); };

  const Sidebar = ({ mobile = false }) => (
    <div className={`flex flex-col h-full bg-white border-r border-gray-100 ${mobile ? 'w-72' : sidebarOpen ? 'w-64' : 'w-20'} transition-all duration-300`}>
      {/* Logo */}
      <div className="flex items-center justify-center px-5 py-5 border-b border-gray-100">
        {(sidebarOpen || mobile)
          ? <img src="/logo_text.png" alt="Credentis" className="h-9" />
          : <img src="/logo.png" alt="Credentis" className="w-10 h-10" />
        }
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-3 space-y-1">
        {items.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/client' || to === '/contractor' || to === '/subcontractor'}
            onClick={() => mobile && setMobileOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                isActive ? 'bg-primary-50 text-primary-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`
            }
          >
            <Icon className="w-5 h-5 flex-shrink-0" />
            {(sidebarOpen || mobile) && <span>{label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* User */}
      <div className="p-4 border-t border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-semibold text-sm flex-shrink-0">
            {user?.first_name?.[0]}{user?.last_name?.[0]}
          </div>
          {(sidebarOpen || mobile) && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{user?.first_name} {user?.last_name}</p>
              <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
            </div>
          )}
          <button onClick={handleLogout} className="p-1.5 rounded-lg hover:bg-gray-100" title="Sign out">
            <LogOut className="w-4 h-4 text-gray-400" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Desktop sidebar */}
      <div className="hidden lg:flex">
        <Sidebar />
      </div>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/30" onClick={() => setMobileOpen(false)} />
          <div className="relative z-10 h-full">
            <Sidebar mobile />
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="bg-white border-b border-gray-100 px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button className="lg:hidden p-2 rounded-lg hover:bg-gray-100" onClick={() => setMobileOpen(true)}>
              <Menu className="w-5 h-5" />
            </button>
            <button className="hidden lg:block p-2 rounded-lg hover:bg-gray-100" onClick={() => setSidebarOpen(!sidebarOpen)}>
              <Menu className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">
                {user?.company_name || `${user?.first_name}'s Portal`}
              </h1>
              <p className="text-xs text-gray-500">{user?.role?.charAt(0).toUpperCase() + user?.role?.slice(1)} Portal</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button className="p-2 rounded-lg hover:bg-gray-100 relative">
              <Bell className="w-5 h-5 text-gray-500" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
