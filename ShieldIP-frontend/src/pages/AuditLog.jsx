import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ClipboardList, Search, Download, Shield, Zap, Eye, FileText, Clock, KeyRound } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { pageVariants, staggerContainer, staggerItem } from '../utils/animations';
import Papa from 'papaparse';
import { useQuery } from '@tanstack/react-query';
import { fetchAuditEvents } from '../services/api';

const ACTION_CFG = {
  asset_registered:   { icon: Shield,    color: '#16ff9e', label: 'Asset Registered',    severity: 'info'     },
  violation_detected: { icon: Eye,       color: '#f59e0b', label: 'Violation Detected',  severity: 'warning'  },
  risk_scored:        { icon: FileText,  color: '#06b6d4', label: 'Risk Scored',          severity: 'info'     },
  enforcement_queued: { icon: Zap,       color: '#ff2d55', label: 'Enforcement Queued',  severity: 'critical' },
  api_key_created:    { icon: KeyRound,  color: '#a78bfa', label: 'API Key Created',      severity: 'info'     },
  api_key_revoked:    { icon: KeyRound,  color: '#888',    label: 'API Key Revoked',      severity: 'warning'  },
};

const SEV_COLOR = { critical: '#ff2d55', warning: '#f59e0b', info: '#888' };

export default function AuditLog() {
  const [search, setSearch]           = useState('');
  const [filterAction, setFilterAction] = useState('all');

  const { data: eventsData, isLoading } = useQuery({
    queryKey: ['audit-events'],
    queryFn: () => fetchAuditEvents({ limit: 200 }),
    refetchInterval: 20000,
    select: (d) => d?.data?.events || d?.events || [],
  });

  const rawLogs = useMemo(() => {
    return (eventsData || []).map((e) => {
      const cfg = ACTION_CFG[e.action] || { icon: FileText, color: '#888', label: e.action, severity: 'info' };
      const det = e.details || {};
      let details = '';
      if (e.action === 'asset_registered')   details = `File '${det.filename || e.entity_id}' (${det.media_type || ''}) registered`;
      else if (e.action === 'violation_detected') details = `Violation on ${det.platform || 'unknown'} — asset ${det.asset_id?.slice(0,8) || e.entity_id?.slice(0,8)}`;
      else if (e.action === 'risk_scored')   details = `Risk scored ${det.risk_score}/100 — threat: ${det.threat_level}`;
      else if (e.action === 'enforcement_queued') details = `Enforcement action '${det.action}' queued for ${e.entity_id?.slice(0,8)}`;
      else details = JSON.stringify(det);

      return {
        id:        e.event_id,
        action:    e.action,
        label:     cfg.label,
        color:     cfg.color,
        icon:      cfg.icon,
        severity:  cfg.severity,
        details,
        entity_id: e.entity_id,
        timestamp: e.created_at,
      };
    });
  }, [eventsData]);

  const filtered = useMemo(() => {
    let out = rawLogs;
    if (search) {
      const q = search.toLowerCase();
      out = out.filter((l) => l.details?.toLowerCase().includes(q) || l.entity_id?.toLowerCase().includes(q) || l.action?.toLowerCase().includes(q));
    }
    if (filterAction !== 'all') out = out.filter((l) => l.action === filterAction);
    return out;
  }, [search, filterAction, rawLogs]);

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
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search logs…" className="void-input pl-9 pr-4 py-2 text-[12px] w-full" />
        </div>
        <select value={filterAction} onChange={(e) => setFilterAction(e.target.value)} className="void-input text-[12px] px-3 py-2">
          <option value="all">All actions</option>
          <option value="asset_registered">Asset Registered</option>
          <option value="violation_detected">Violation Detected</option>
          <option value="risk_scored">Risk Scored</option>
          <option value="enforcement_queued">Enforcement Queued</option>
          <option value="api_key_created">API Key Created</option>
          <option value="api_key_revoked">API Key Revoked</option>
        </select>
      </div>

      {isLoading ? (
        <div className="py-16 text-center">
          <div className="w-6 h-6 border-2 border-cyan/30 border-t-cyan rounded-full animate-spin mx-auto mb-3" />
          <p className="text-[13px] text-[#555]">Loading audit events…</p>
        </div>
      ) : (
        <motion.div variants={staggerContainer} initial="initial" animate="animate" className="space-y-2">
          {filtered.length === 0 && (
            <div className="py-16 text-center">
              <ClipboardList size={32} className="mx-auto text-[#333] mb-4" />
              <p className="text-[14px] text-[#555]">No log entries match your filters</p>
              <p className="text-[12px] text-[#444] mt-1">Events are written when assets are registered, violations detected, or enforcement triggered</p>
            </div>
          )}
          {filtered.map((log) => {
            const Icon = log.icon || FileText;
            const sevColor = SEV_COLOR[log.severity] || '#888';
            return (
              <motion.div key={log.id} variants={staggerItem}
                className="flex items-start gap-4 p-4 rounded-xl transition-colors hover:bg-white/[0.02]"
                style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
                <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5" style={{ background: `${log.color}10` }}>
                  <Icon size={15} style={{ color: log.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[13px] font-semibold text-white">{log.label}</span>
                    <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded" style={{ background: `${sevColor}12`, color: sevColor }}>
                      {log.severity}
                    </span>
                  </div>
                  <p className="text-[12px] text-[#888] leading-relaxed">{log.details}</p>
                  <div className="flex items-center gap-4 mt-1.5 text-[10px] text-[#555] flex-wrap">
                    {log.timestamp && (
                      <span className="flex items-center gap-1">
                        <Clock size={9} /> {formatDistanceToNow(new Date(log.timestamp), { addSuffix: true })}
                      </span>
                    )}
                    <span>ID: <span className="font-mono text-cyan">{log.entity_id?.slice(0, 12)}…</span></span>
                  </div>
                </div>
                <span className="font-mono text-[9px] text-[#333] shrink-0 hidden md:block">{log.id?.slice(0, 8)}</span>
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </motion.div>
  );
}
