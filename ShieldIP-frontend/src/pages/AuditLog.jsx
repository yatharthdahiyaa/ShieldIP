import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ClipboardList, Search, Download, Filter, Shield, Zap, Eye, FileText, Clock, ChevronDown } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { pageVariants, staggerContainer, staggerItem } from '../utils/animations';
import Papa from 'papaparse';

const SEED_LOGS = [
  { id: 'AL-001', action: 'asset_registered', actor: 'system', target: 'A-2001', details: 'brand-logo.png registered via pHash', timestamp: new Date(Date.now() - 3600000).toISOString(), severity: 'info' },
  { id: 'AL-002', action: 'violation_detected', actor: 'monitor-agent', target: 'V-1001', details: 'YouTube violation detected — 99% confidence', timestamp: new Date(Date.now() - 7200000).toISOString(), severity: 'warning' },
  { id: 'AL-003', action: 'enforcement_executed', actor: 'admin@shieldip.io', target: 'V-1001', details: 'DMCA Takedown filed via AI pipeline', timestamp: new Date(Date.now() - 10800000).toISOString(), severity: 'critical' },
  { id: 'AL-004', action: 'risk_scored', actor: 'ai-scoring-engine', target: 'V-1002', details: 'Risk score computed: 78/100 — High', timestamp: new Date(Date.now() - 14400000).toISOString(), severity: 'info' },
  { id: 'AL-005', action: 'violation_detected', actor: 'monitor-agent', target: 'V-1003', details: 'Instagram violation detected — 95% confidence', timestamp: new Date(Date.now() - 21600000).toISOString(), severity: 'warning' },
  { id: 'AL-006', action: 'settings_updated', actor: 'admin@shieldip.io', target: 'config', details: 'Confidence threshold changed from 70 to 80', timestamp: new Date(Date.now() - 43200000).toISOString(), severity: 'info' },
  { id: 'AL-007', action: 'enforcement_executed', actor: 'admin@shieldip.io', target: 'V-1003', details: 'Escalate Legal — flagged for manual review', timestamp: new Date(Date.now() - 50400000).toISOString(), severity: 'critical' },
  { id: 'AL-008', action: 'asset_registered', actor: 'system', target: 'A-2002', details: 'product-shot.jpg registered via pHash', timestamp: new Date(Date.now() - 86400000).toISOString(), severity: 'info' },
  { id: 'AL-009', action: 'violation_detected', actor: 'monitor-agent', target: 'V-1005', details: 'Twitch violation detected — 92% confidence', timestamp: new Date(Date.now() - 100800000).toISOString(), severity: 'warning' },
  { id: 'AL-010', action: 'enforcement_executed', actor: 'system', target: 'V-1005', details: 'Claim & Monetize — royalty routing enabled', timestamp: new Date(Date.now() - 115200000).toISOString(), severity: 'critical' },
];

const ACTION_ICONS = {
  asset_registered: { icon: Shield, color: '#16ff9e' },
  violation_detected: { icon: Eye, color: '#f59e0b' },
  enforcement_executed: { icon: Zap, color: '#ff2d55' },
  risk_scored: { icon: FileText, color: '#06b6d4' },
  settings_updated: { icon: FileText, color: '#888' },
};

export default function AuditLog() {
  const [search, setSearch] = useState('');
  const [filterAction, setFilterAction] = useState('all');
  const [filterSeverity, setFilterSeverity] = useState('all');

  const filtered = useMemo(() => {
    let out = SEED_LOGS;
    if (search) out = out.filter((l) => l.details.toLowerCase().includes(search.toLowerCase()) || l.target.toLowerCase().includes(search.toLowerCase()) || l.actor.toLowerCase().includes(search.toLowerCase()));
    if (filterAction !== 'all') out = out.filter((l) => l.action === filterAction);
    if (filterSeverity !== 'all') out = out.filter((l) => l.severity === filterSeverity);
    return out;
  }, [search, filterAction, filterSeverity]);

  const exportCsv = () => {
    const csv = Papa.unparse(filtered.map((l) => ({ ID: l.id, Action: l.action, Actor: l.actor, Target: l.target, Details: l.details, Timestamp: l.timestamp, Severity: l.severity })));
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `shieldip-audit-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit" className="p-8 space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="font-display font-extrabold text-[26px] text-white tracking-tight flex items-center gap-3">
            <ClipboardList size={22} className="text-cyan" /> Audit Log
          </h1>
          <p className="text-[13px] mt-1 text-[#555]">{filtered.length} entries</p>
        </div>
        <button onClick={exportCsv} className="btn-void-ghost flex items-center gap-1.5 text-[12px]">
          <Download size={13} /> Export CSV
        </button>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#444]" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search logs..." className="void-input pl-9 pr-4 py-2 text-[12px] w-full" />
        </div>
        <select value={filterAction} onChange={(e) => setFilterAction(e.target.value)} className="void-input text-[12px] px-3 py-2">
          <option value="all">All actions</option>
          <option value="asset_registered">Asset Registered</option>
          <option value="violation_detected">Violation Detected</option>
          <option value="enforcement_executed">Enforcement Executed</option>
          <option value="risk_scored">Risk Scored</option>
          <option value="settings_updated">Settings Updated</option>
        </select>
        <select value={filterSeverity} onChange={(e) => setFilterSeverity(e.target.value)} className="void-input text-[12px] px-3 py-2">
          <option value="all">All severity</option>
          <option value="critical">Critical</option>
          <option value="warning">Warning</option>
          <option value="info">Info</option>
        </select>
      </div>

      <motion.div variants={staggerContainer} initial="initial" animate="animate" className="space-y-2">
        {filtered.length === 0 && (
          <div className="py-16 text-center">
            <ClipboardList size={32} className="mx-auto text-[#333] mb-4" />
            <p className="text-[14px] text-[#555]">No log entries match your filters</p>
          </div>
        )}
        {filtered.map((log) => {
          const cfg = ACTION_ICONS[log.action] || ACTION_ICONS.settings_updated;
          const Icon = cfg.icon;
          return (
            <motion.div key={log.id} variants={staggerItem}
              className="flex items-start gap-4 p-4 rounded-xl transition-colors hover:bg-white/[0.02]"
              style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
              <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5" style={{ background: `${cfg.color}10` }}>
                <Icon size={15} style={{ color: cfg.color }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-[13px] font-semibold text-white">{log.action.replace(/_/g, ' ')}</span>
                  <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${log.severity === 'critical' ? 'bg-primary/10 text-primary' : log.severity === 'warning' ? 'bg-amber-500/10 text-amber-400' : 'bg-white/5 text-[#888]'}`}>
                    {log.severity}
                  </span>
                </div>
                <p className="text-[12px] text-[#888]">{log.details}</p>
                <div className="flex items-center gap-4 mt-1.5 text-[10px] text-[#555]">
                  <span className="flex items-center gap-1"><Clock size={9} /> {formatDistanceToNow(new Date(log.timestamp), { addSuffix: true })}</span>
                  <span>Actor: <span className="text-[#888]">{log.actor}</span></span>
                  <span>Target: <span className="font-mono text-cyan">{log.target}</span></span>
                </div>
              </div>
              <span className="font-mono text-[10px] text-[#444] shrink-0">{log.id}</span>
            </motion.div>
          );
        })}
      </motion.div>
    </motion.div>
  );
}
