import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, LayoutDashboard, Radio, Zap, BarChart3, Settings, User, FolderOpen, ClipboardList, Bell, Shield, GitBranch } from 'lucide-react';
import { scaleIn } from '../utils/animations';

const COMMANDS = [
  { label: 'Dashboard',     path: '/dashboard',     icon: LayoutDashboard },
  { label: 'Live Monitor',  path: '/monitor',       icon: Radio },
  { label: 'Violations',    path: '/violations',    icon: Shield },
  { label: 'Enforcement',   path: '/enforcement',   icon: Zap },
  { label: 'Analytics',     path: '/analytics',     icon: BarChart3 },
  { label: 'Traceability',  path: '/traceability',  icon: GitBranch },
  { label: 'Notifications', path: '/notifications', icon: Bell },
  { label: 'Settings',      path: '/settings',      icon: Settings },
  { label: 'Asset Registry', path: '/assets',       icon: FolderOpen },
  { label: 'Audit Log',     path: '/audit',         icon: ClipboardList },
  { label: 'Profile',       path: '/profile',       icon: User },
];

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(0);
  const navigate = useNavigate();
  const inputRef = useRef(null);

  const filtered = COMMANDS.filter((c) => c.label.toLowerCase().includes(query.toLowerCase()));

  const handleKey = useCallback((e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      setOpen((o) => !o);
    }
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [handleKey]);

  useEffect(() => {
    if (open) {
      setQuery('');
      setSelected(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const go = (path) => {
    navigate(path);
    setOpen(false);
  };

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelected((s) => Math.min(s + 1, filtered.length - 1)); }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setSelected((s) => Math.max(s - 1, 0)); }
    if (e.key === 'Enter' && filtered[selected]) { go(filtered[selected].path); }
    if (e.key === 'Escape') { setOpen(false); }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[60] flex items-start justify-center pt-[20vh]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={() => setOpen(false)}
          style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
        >
          <motion.div
            variants={scaleIn}
            initial="initial"
            animate="animate"
            exit="exit"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg rounded-xl overflow-hidden"
            style={{ background: 'rgba(19,19,19,0.98)', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 25px 60px rgba(0,0,0,0.8)' }}
          >
            <div className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <Search size={16} className="text-[#555] shrink-0" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => { setQuery(e.target.value); setSelected(0); }}
                onKeyDown={onKeyDown}
                placeholder="Search pages and actions..."
                className="flex-1 bg-transparent outline-none text-sm text-white placeholder:text-[#444]"
              />
              <kbd className="text-[10px] text-[#555] bg-white/5 px-1.5 py-0.5 rounded">ESC</kbd>
            </div>
            <div className="max-h-[300px] overflow-y-auto py-1">
              {filtered.length === 0 && (
                <p className="text-center text-[13px] text-[#555] py-8">No results found</p>
              )}
              {filtered.map((cmd, i) => {
                const Icon = cmd.icon;
                return (
                  <button
                    key={cmd.path}
                    onClick={() => go(cmd.path)}
                    onMouseEnter={() => setSelected(i)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                      i === selected ? 'bg-white/[0.04] text-white' : 'text-[#888] hover:bg-white/[0.02]'
                    }`}
                  >
                    <Icon size={15} className={i === selected ? 'text-cyan' : ''} />
                    <span className="text-[13px] font-medium">{cmd.label}</span>
                  </button>
                );
              })}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
