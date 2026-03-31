// RepairmanLayout.js
import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FiActivity, FiGrid, FiInbox, FiTool } from 'react-icons/fi';
import UserService from '../services/UserService';
import Topbar from './ui/Topbar';
import LogoutConfirmationModal from './ui/LogoutConfirmationModal';

const RepairmanLayout = ({ children }) => {
  const location = useLocation();
  const user = JSON.parse(sessionStorage.getItem('user') || '{}');
  const [displayName, setDisplayName] = useState('');
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const mobile = (user && (user.phone || user.mobile || user.MobileNo || user.Mobile || user.mobileNo || '')).toString().replace(/\D/g, '');

  useEffect(() => {
    let mounted = true;
    const isAuto = (n) => typeof n === 'string' && (/^user\d{2,}$/.test(n) || /^u\d{2,}$/.test(n));

    const raw = user || {};
    const setFromLocal = () => {
      const candidate = raw.UserName || raw.username || raw.name || raw.displayName || raw.fullName || '';
      if (candidate && !isAuto(candidate)) setDisplayName(candidate);
    };

    setFromLocal();

    if (!mobile) return undefined;

    (async () => {
      try {
        const res = await UserService.testGetUserRole(mobile);
        if (!mounted || !res || !res.data) return;
        const maybe = (res.data.ResultSet && res.data.ResultSet[0]) || res.data.Result || res.data;
        const name = (maybe && (maybe.UserName || maybe.User || maybe.Name || maybe.name || maybe.displayName || maybe.fullName)) || '';
        if (name && !isAuto(name)) setDisplayName(String(name));
      } catch (err) {
        // ignore
      }
    })();

    return () => { mounted = false; };
  }, [mobile]);

  const getSiteTitle = () => {
    try {
      const s = JSON.parse(localStorage.getItem('appSettings') || 'null');
      return (s && s.siteTitle) ? String(s.siteTitle) : 'TekniCity';
    } catch (e) { return 'TekniCity'; }
  };
  const siteTitle = getSiteTitle();

  const navigation = [
    { name: 'Dashboard', href: '/repairman/dashboard', icon: FiGrid },
    { name: 'Available Repairs', href: '/repairman/available-repairs', icon: FiInbox },
    { name: 'My Repairs', href: '/repairman/assigned-repairs', icon: FiTool },
    { name: 'Performing task', href: '/repairman/performing-task', icon: FiActivity },
  ];

  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') setMobileOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const handleLogoutClick = () => {
    setShowLogoutModal(true);
  };

  const handleConfirmLogout = () => {
    sessionStorage.removeItem('user');
    window.location.href = '/login';
  };

  const handleCancelLogout = () => {
    setShowLogoutModal(false);
  };

  return (
    <div className="flex flex-col md:flex-row h-screen bg-slate-100">
      {/* Sidebar (collapsible to icons-only) */}
      <div className={`hidden md:flex md:flex-col ${sidebarCollapsed ? 'md:w-20' : 'md:w-64'}`}>
        <div className="flex flex-col flex-grow pt-6 overflow-y-auto bg-white/90 backdrop-blur border-r border-slate-200">
          <div className="flex items-center flex-shrink-0 px-4">
            {!sidebarCollapsed && (
              <div className={`h-9 w-9 rounded-xl bg-blue-600/10 text-blue-700 flex items-center justify-center mr-3`}>
                <FiTool className="h-4 w-4" aria-hidden />
              </div>
            )}
            {!sidebarCollapsed && <h1 className="text-lg font-semibold text-slate-900 tracking-tight">{siteTitle}</h1>}
            <button
              onClick={() => setSidebarCollapsed((s) => !s)}
              aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              className="ml-auto p-2 rounded-md text-slate-500 hover:bg-slate-100"
            >
              {sidebarCollapsed ? (
                <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              ) : (
                <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              )}
            </button>
          </div>

          <div className="mt-6 flex-grow flex flex-col">
            <nav className="flex-1 px-2 pb-6 space-y-1">
              {navigation.map((item) => {
                const isActive = location.pathname === item.href;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    title={item.name}
                    aria-label={item.name}
                    aria-current={isActive ? 'page' : undefined}
                    className={`group flex items-center ${sidebarCollapsed ? 'justify-center' : 'gap-3 px-3'} px-1 py-2.5 text-sm font-medium rounded-lg transition-colors duration-150 border ${
                      isActive
                        ? 'bg-blue-50 text-blue-700 border-blue-100 shadow-sm'
                        : 'text-slate-600 hover:bg-slate-100/70 hover:text-slate-900 border-transparent'
                    }`}
                  >
                    <Icon className={`h-4 w-4 ${isActive ? 'text-blue-600' : 'text-slate-500 group-hover:text-blue-600'}`} aria-hidden />
                    {!sidebarCollapsed && <span className="truncate">{item.name}</span>}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="flex-shrink-0 flex border-t border-slate-200 p-3">
            <div className={`flex items-center w-full ${sidebarCollapsed ? 'justify-center' : ''}`}>
              <div className={`${sidebarCollapsed ? '' : 'ml-3'}`}>
                <p className={`text-sm font-medium text-slate-800 ${sidebarCollapsed ? 'sr-only' : ''}`}>{displayName || (user.username && !(/^user\d{2,}$/.test(user.username)) ? user.username : '')}</p>
                {!sidebarCollapsed && <p className="text-xs font-medium text-slate-500">Repair Technician</p>}
              </div>
              {!sidebarCollapsed ? (
                <button 
                  onClick={handleLogoutClick}
                  className="ml-auto text-sm text-slate-600 hover:text-slate-800"
                >
                  Logout
                </button>
              ) : (
                <button onClick={handleLogoutClick} className="ml-auto p-2 rounded-md text-slate-600 hover:bg-slate-100" title="Logout">
                  <svg className="h-4 w-4 text-slate-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile topbar */}
      <div className="md:hidden w-full">
        <Topbar title={siteTitle} onOpenMobile={() => setMobileOpen(true)} />
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="fixed inset-0 bg-black bg-opacity-25" onClick={() => setMobileOpen(false)} />
          <div className="fixed top-0 left-0 bottom-0 z-50 flex">
            <div className="w-64 sm:w-72 bg-white shadow-xl pb-4 flex flex-col overflow-y-auto h-full">
              <div className="px-4 pt-5 pb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-blue-600/10 text-blue-700 flex items-center justify-center">
                    <FiTool className="h-4 w-4" aria-hidden />
                  </div>
                  <h1 className="text-base font-semibold text-slate-900">{siteTitle}</h1>
                </div>
                <button onClick={() => setMobileOpen(false)} className="p-2 text-slate-600 hover:bg-slate-100 rounded">
                  <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <nav className="px-3 pb-4 space-y-1">
                {navigation.map((item) => {
                  const isActive = location.pathname === item.href;
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      onClick={() => setMobileOpen(false)}
                      aria-current={isActive ? 'page' : undefined}
                      className={`group flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors duration-150 border ${
                        isActive
                          ? 'bg-blue-50 text-blue-700 border-blue-100 shadow-sm'
                          : 'text-slate-600 hover:bg-slate-100/70 hover:text-slate-900 border-transparent'
                      }`}
                    >
                      <Icon className={`h-4 w-4 ${isActive ? 'text-blue-600' : 'text-slate-500 group-hover:text-blue-600'}`} aria-hidden />
                      <span className="truncate">{item.name}</span>
                    </Link>
                  );
                })}
              </nav>

              <div className="mt-auto border-t border-slate-200 p-4">
                <div className="flex items-center w-full">
                  <div>
                    <p className="text-sm font-medium text-slate-800">{displayName || (user.username && !(/^user\d{2,}$/.test(user.username)) ? user.username : '')}</p>
                    <p className="text-xs text-slate-500">Repair Technician</p>
                  </div>
                  <div className="ml-auto">
                    <button
                      onClick={handleLogoutClick}
                      className="text-sm text-slate-600 hover:text-slate-800"
                    >
                      Logout
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex flex-col flex-1 w-full overflow-hidden">
        <main className="flex-1 relative overflow-y-auto focus:outline-none">
          <div className="dashboard-main h-full px-4 md:px-6 py-4 md:py-6">
            {children}
          </div>
        </main>
      </div>

      {/* Logout Confirmation Modal */}
      <LogoutConfirmationModal
        isOpen={showLogoutModal}
        onClose={handleCancelLogout}
        onConfirm={handleConfirmLogout}
      />
    </div>
  );
};

export default RepairmanLayout;