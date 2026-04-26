import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Bell, CheckCircle2, AlertTriangle, Shield, Clock, Zap, Activity } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { pageVariants, staggerContainer, staggerItem } from '../utils/animations';
import useAlertsQuery, { useMarkAlertRead, useMarkAllRead } from '../hooks/useAlerts';

const TYPE_MAP = {
  velocity: { icon: Activity,      color: '#f59e0b', label: 'Velocity' },
  threat:   { icon: AlertTriangle, color: '#ff2d55', label: 'Threat'   },
  brand:    { icon: Shield,        color: '#a78bfa', label: 'Brand'    },
  info:     { icon: Bell,          color: '#06b6d4', label: 'Info'     },
};

export default function Notifications() {
  const [filter, setFilter] = useState('all');
  const { data: alerts = [], isLoading } = useAlertsQuery();
  const markRead   = useMarkAlertRead();
  const markAllMut = useMarkAllRead();

  const filtered = filter === 'all'    ? alerts
    : filter === 'unread' ? alerts.filter((a) => !a.read)
    : alerts.filter((a) => a.type === filter);

  const unreadCount = alerts.filter((a) => !a.read).length;

  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit" className="p-8 space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="font-display font-extrabold text-[26px] text-white tracking-tight flex items-center gap-3">
            <Bell size={22} className="text-cyan" /> Notifications
          </h1>
          <p className="text-[13px] mt-1 text-[#555]">{unreadCount} unread alert{unreadCount !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => markAllMut.mutate()}
          disabled={markAllMut.isPending || unreadCount === 0}
          className="btn-void-ghost text-[12px] flex items-center gap-1.5 disabled:opacity-40">
          <CheckCircle2 size={13} /> Mark all read
        </button>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {['all', 'unread', 'velocity', 'threat', 'brand'].map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors ${filter === f ? 'bg-white/10 text-white' : 'text-[#555] hover:text-[#888] hover:bg-white/[0.03]'}`}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      <motion.div variants={staggerContainer} initial="initial" animate="animate" className="space-y-2">
        {isLoading && (
          <div className="py-16 text-center">
            <div className="w-6 h-6 border-2 border-cyan/30 border-t-cyan rounded-full animate-spin mx-auto mb-3" />
            <p className="text-[13px] text-[#555]">Loading alerts…</p>
          </div>
        )}
        {!isLoading && filtered.length === 0 && (
          <div className="py-16 text-center">
            <Bell size={32} className="mx-auto text-[#333] mb-4" />
            <p className="text-[14px] text-[#555]">No alerts to show</p>
            <p className="text-[12px] text-[#444] mt-1">Alerts appear here when critical/high threats or rapid spread is detected</p>
          </div>
        )}
        {filtered.map((alert) => {
          const cfg   = TYPE_MAP[alert.type] || TYPE_MAP.info;
          const Icon  = cfg.icon;
          const color = cfg.color;
          const ts    = alert.created_at ? new Date(alert.created_at) : null;
          return (
            <motion.div key={alert.alert_id} variants={staggerItem}
              className={`flex items-start gap-4 p-4 rounded-xl transition-all cursor-pointer ${alert.read ? 'opacity-60' : ''}`}
              style={{ background: alert.read ? 'rgba(255,255,255,0.01)' : 'rgba(255,255,255,0.03)', border: `1px solid ${alert.read ? 'rgba(255,255,255,0.04)' : `${color}20`}` }}
              onClick={() => !alert.read && markRead.mutate(alert.alert_id)}>
              <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${color}12` }}>
                <Icon size={16} style={{ color }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="text-[13px] font-semibold text-white">{alert.title}</p>
                  {!alert.read && <span className="w-2 h-2 rounded-full bg-cyan shrink-0" />}
                </div>
                <p className="text-[12px] text-[#888] leading-relaxed">{alert.message}</p>
                <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                  {ts && (
                    <span className="text-[10px] text-[#555] flex items-center gap-1">
                      <Clock size={9} /> {formatDistanceToNow(ts, { addSuffix: true })}
                    </span>
                  )}
                  <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded" style={{ background: `${color}12`, color }}>
                    {cfg.label}
                  </span>
                  {alert.metadata?.risk_score && (
                    <span className="text-[9px] font-mono text-[#555]">risk {alert.metadata.risk_score}/100</span>
                  )}
                  {alert.metadata?.spread_velocity && (
                    <span className="text-[9px] font-mono text-[#555] flex items-center gap-1">
                      <Zap size={8} /> {alert.metadata.spread_velocity}/hr
                    </span>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </motion.div>
    </motion.div>
  );
}
