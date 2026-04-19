import React, { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Shield, LayoutDashboard, Radio, Search, Zap, BarChart3, Bell, Settings, FolderOpen, ClipboardList, User, KeyRound, HelpCircle, ChevronLeft, ChevronRight, GitBranch } from 'lucide-react';
import { motion } from 'framer-motion';
import useAppStore from '../store/useAppStore';
import { fetchHealth } from '../services/api';

const MAIN_NAV = [
  { to: '/dashboard',    icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/monitor',      icon: Radio,           label: 'Live Monitor' },
  { to: '/violations',   icon: Search,          label: 'Violations' },
  { to: '/enforcement',  icon: Zap,             label: 'Enforcement' },
  { to: '/analytics',    icon: BarChart3,        label: 'Analytics' },
  { to: '/traceability',  icon: GitBranch,        label: 'Traceability' },
];

const SYSTEM_NAV = [
  { to: '/notifications', icon: Bell,           label: 'Notifications', badge: true },
  { to: '/settings',      icon: Settings,       label: 'Settings' },
  { to: '/assets',        icon: FolderOpen,     label: 'Asset Registry' },
  { to: '/audit',         icon: ClipboardList,  label: 'Audit Log' },
];

const ACCOUNT_NAV = [
  { to: '/profile',  icon: User,       label: 'Profile' },
  { to: '/api-keys', icon: KeyRound,   label: 'API Keys' },
  { to: '/help',     icon: HelpCircle, label: 'Help & Docs' },
];

function NavItem({ to, icon: Icon, label, collapsed, badge }) {
  const unreadCount = useAppStore((s) => s.unreadCount);
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `group relative flex items-center gap-3 transition-all duration-150 ${collapsed ? 'px-0 justify-center py-3' : 'px-5 py-2.5'} ${
          isActive
            ? 'text-white bg-white/[0.04]'
            : 'text-[#555] hover:text-on_surface hover:bg-white/[0.02]'
        }`
      }
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <span className="absolute left-0 top-[15%] bottom-[15%] w-[3px] rounded-r bg-cyan shadow-cyan-glow" />
          )}
          <Icon size={16} className={`shrink-0 transition-colors ${isActive ? 'text-cyan' : 'group-hover:text-cyan/60'}`} />
          {!collapsed && <span className="text-[13px] font-medium truncate">{label}</span>}
          {badge && unreadCount > 0 && (
            <span className={`${collapsed ? 'absolute top-1 right-1' : 'ml-auto'} min-w-[18px] h-[18px] flex items-center justify-center rounded-full text-[9px] font-bold bg-primary text-white`}>
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
          {collapsed && (
            <span className="absolute left-full ml-2 px-2 py-1 rounded text-xs bg-surface_mid text-white whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 shadow-lg">
              {label}
            </span>
          )}
        </>
      )}
    </NavLink>
  );
}

function SectionLabel({ text, collapsed }) {
  if (collapsed) return <div className="my-2 mx-auto w-4 h-px bg-white/10" />;
  return <p className="void-label px-5 mb-1 mt-4">{text}</p>;
}

export default function Sidebar() {
  const { sidebarCollapsed, setSidebarCollapsed } = useAppStore();
  const [isLive, setIsLive] = useState(true);

  useEffect(() => {
    const check = () => fetchHealth().then(() => setIsLive(true)).catch(() => setIsLive(false));
    check();
    const iv = setInterval(check, 30000);
    return () => clearInterval(iv);
  }, []);

  return (
    <motion.aside
      animate={{ width: sidebarCollapsed ? 60 : 240 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      className="shrink-0 h-full flex flex-col relative z-20 overflow-hidden"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(20px)', borderRight: '1px solid rgba(255,255,255,0.06)' }}
    >
      <div className={`flex items-center gap-3 py-5 ${sidebarCollapsed ? 'justify-center px-2' : 'px-5'}`}
           style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="logo-hex shrink-0">
          <Shield size={14} color="#fff" strokeWidth={2.5} />
        </div>
        {!sidebarCollapsed && (
          <div className="min-w-0">
            <p className="font-display font-extrabold text-[15px] text-white tracking-tight leading-none truncate">ShieldIP</p>
            <p className="void-label mt-0.5 truncate">AI Protection</p>
          </div>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto py-2">
        <SectionLabel text="Main" collapsed={sidebarCollapsed} />
        {MAIN_NAV.map((item) => <NavItem key={item.to} {...item} collapsed={sidebarCollapsed} />)}
        <SectionLabel text="System" collapsed={sidebarCollapsed} />
        {SYSTEM_NAV.map((item) => <NavItem key={item.to} {...item} collapsed={sidebarCollapsed} />)}
        <SectionLabel text="Account" collapsed={sidebarCollapsed} />
        {ACCOUNT_NAV.map((item) => <NavItem key={item.to} {...item} collapsed={sidebarCollapsed} />)}
      </nav>

      <div className={`border-t border-white/[0.06] py-3 ${sidebarCollapsed ? 'px-2' : 'px-4'}`}>
        <div className={`flex items-center gap-2 ${sidebarCollapsed ? 'justify-center' : ''}`}>
          <span className={`w-2 h-2 rounded-full ${isLive ? 'bg-[#16ff9e] animate-pulse-green' : 'bg-red-500'}`} />
          {!sidebarCollapsed && (
            <span className="text-[11px] font-semibold" style={{ color: isLive ? '#16ff9e' : '#ff2d55' }}>
              {isLive ? 'Live' : 'Offline'}
            </span>
          )}
          <button
            onClick={() => setSidebarCollapsed((c) => !c)}
            className={`${sidebarCollapsed ? '' : 'ml-auto'} p-1.5 rounded transition-colors text-[#555] hover:text-white hover:bg-white/5`}
          >
            {sidebarCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>
        </div>
      </div>
    </motion.aside>
  );
}
