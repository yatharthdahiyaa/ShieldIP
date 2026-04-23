import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Bell, CheckCircle2, AlertTriangle, Shield, Clock, Eye, Archive, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { pageVariants, staggerContainer, staggerItem } from '../utils/animations';
import useAppStore from '../store/useAppStore';
import useViolationsQuery from '../hooks/useViolations';

export default function Notifications() {
  const { readNotificationIds, markNotificationRead } = useAppStore();
  const { data: violations } = useViolationsQuery();
  const vios = violations || [];
  const [filter, setFilter] = useState('all');

  const notifications = vios.map((v) => ({
    id: v.violation_id,
    type: v.risk_score > 80 ? 'critical' : v.risk_score > 55 ? 'warning' : 'info',
    title: `${v.platform} violation detected`,
    message: `${v.violation_id} — ${Math.round((v.match_confidence || 0.9) * 100)}% confidence match in ${v.region || 'Unknown'}`,
    timestamp: v.detected_at,
    read: readNotificationIds.has(v.violation_id),
    platform: v.platform,
    riskScore: v.risk_score,
  }));

  const filtered = filter === 'all' ? notifications : filter === 'unread' ? notifications.filter((n) => !n.read) : notifications.filter((n) => n.type === filter);

  const markAllRead = () => notifications.forEach((n) => markNotificationRead(n.id));

  const ICON_MAP = { critical: AlertTriangle, warning: Shield, info: Bell };
  const COLOR_MAP = { critical: '#ff2d55', warning: '#f59e0b', info: '#06b6d4' };

  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit" className="p-8 space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="font-display font-extrabold text-[26px] text-white tracking-tight flex items-center gap-3">
            <Bell size={22} className="text-cyan" /> Notifications
          </h1>
          <p className="text-[13px] mt-1 text-[#555]">{notifications.filter((n) => !n.read).length} unread notifications</p>
        </div>
        <button onClick={markAllRead} className="btn-void-ghost text-[12px] flex items-center gap-1.5"><CheckCircle2 size={13} /> Mark all read</button>
      </div>

      <div className="flex items-center gap-2">
        {['all', 'unread', 'critical', 'warning', 'info'].map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors ${filter === f ? 'bg-white/10 text-white' : 'text-[#555] hover:text-[#888] hover:bg-white/[0.03]'}`}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      <motion.div variants={staggerContainer} initial="initial" animate="animate" className="space-y-2">
        {filtered.length === 0 && (
          <div className="py-16 text-center">
            <Bell size={32} className="mx-auto text-[#333] mb-4" />
            <p className="text-[14px] text-[#555]">No notifications to show</p>
          </div>
        )}
        {filtered.map((n) => {
          const Icon = ICON_MAP[n.type] || Bell;
          const color = COLOR_MAP[n.type] || '#06b6d4';
          return (
            <motion.div key={n.id} variants={staggerItem}
              className={`flex items-start gap-4 p-4 rounded-xl transition-all cursor-pointer ${n.read ? 'opacity-60' : ''}`}
              style={{ background: n.read ? 'rgba(255,255,255,0.01)' : 'rgba(255,255,255,0.03)', border: `1px solid ${n.read ? 'rgba(255,255,255,0.04)' : `${color}15`}` }}
              onClick={() => markNotificationRead(n.id)}>
              <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${color}10` }}>
                <Icon size={16} style={{ color }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="text-[13px] font-semibold text-white">{n.title}</p>
                  {!n.read && <span className="w-2 h-2 rounded-full bg-cyan" />}
                </div>
                <p className="text-[12px] text-[#888]">{n.message}</p>
                <div className="flex items-center gap-3 mt-1.5">
                  <span className="text-[10px] text-[#555] flex items-center gap-1"><Clock size={9} /> {formatDistanceToNow(new Date(n.timestamp), { addSuffix: true })}</span>
                  <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded`} style={{ background: `${color}10`, color }}>{n.type}</span>
                </div>
              </div>
              <span className="font-mono text-[12px] font-bold shrink-0" style={{ color }}>{n.riskScore}%</span>
            </motion.div>
          );
        })}
      </motion.div>
    </motion.div>
  );
}
