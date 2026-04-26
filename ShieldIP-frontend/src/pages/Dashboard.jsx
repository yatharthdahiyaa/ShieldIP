import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Shield, DollarSign, Activity, ArrowUpRight, Zap, Globe, TrendingUp, GitBranch, Target, TreePine, MapPin, ExternalLink } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { pageVariants, staggerContainer, staggerItem } from '../utils/animations';
import useViolationsQuery from '../hooks/useViolations';
import { useAnalyticsSummary, useAnalyticsByPlatform } from '../hooks/useAnalytics';
import { Link } from 'react-router-dom';
import { fetchTraceabilitySummary } from '../services/api';
import { SkeletonCard } from '../components/Skeleton';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const SEED_TRACE = {
  origin_sources: 6, deepest_chain: 4, fastest_spread_velocity: 8.2,
  fastest_chain: { chain_id: 'ch-001', origin_platform: 'YouTube', total_nodes: 8, spread_velocity: 8.2, platforms_reached: ['YouTube', 'TikTok', 'Instagram', 'X'] },
  platforms_reached_today: ['YouTube', 'TikTok', 'Instagram', 'X', 'Twitch'],
};

const TOOLTIP_STYLE = {
  contentStyle: { background: '#131313', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', fontFamily: 'JetBrains Mono', fontSize: '11px' },
  labelStyle: { color: '#e2e2e2', fontWeight: 'bold' },
  itemStyle: { color: '#888' },
  cursor: { fill: 'rgba(255,255,255,0.02)' },
};

function KpiCard({ icon: Icon, label, value, sub, change, accentColor }) {
  return (
    <motion.div variants={staggerItem} className="group relative rounded-xl p-5 flex items-center gap-4 overflow-hidden transition-all duration-300 hover:translate-y-[-2px]"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', backdropFilter: 'blur(12px)' }}
    >
      <div className="w-12 h-12 rounded-lg flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-110"
           style={{ background: `${accentColor}10`, border: `1px solid ${accentColor}18` }}>
        <Icon size={20} style={{ color: accentColor }} />
      </div>
      <div className="min-w-0">
        <p className="void-label mb-1">{label}</p>
        <p className="font-display font-extrabold text-[24px] text-white leading-none tracking-tight">{value}</p>
        <div className="flex items-center gap-2 mt-1">
          {sub && <p className="text-[11px]" style={{ color: '#444' }}>{sub}</p>}
          {change && (
            <span className="flex items-center gap-0.5 text-[11px] font-bold" style={{ color: '#16ff9e' }}>
              <ArrowUpRight size={11} />{change}
            </span>
          )}
        </div>
      </div>
      <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
           style={{ boxShadow: `inset 0 0 40px ${accentColor}08, 0 0 0 1px ${accentColor}15` }} />
    </motion.div>
  );
}



export default function Dashboard() {
  const { data: violations, isLoading: vLoading } = useViolationsQuery();
  const { data: summary, isLoading: sLoading } = useAnalyticsSummary();
  const { data: platformData, isLoading: pLoading } = useAnalyticsByPlatform();
  const { data: traceData } = useQuery({
    queryKey: ['traceability-summary'],
    queryFn: fetchTraceabilitySummary,
    refetchInterval: 10000,
    select: (r) => r?.data || SEED_TRACE,
  });
  const trace = traceData || SEED_TRACE;

  const vios = violations || [];
  const stats = summary || {};
  const platforms = platformData || [];

  const weeklyChartData = useMemo(() => {
    const counts = Object.fromEntries(DAYS.map((d) => [d, { violations: 0, resolved: 0 }]));
    vios.forEach((v) => {
      const d = new Date(v.detected_at || v.created_at || Date.now());
      if (isNaN(d)) return;
      const key = DAYS[d.getDay() === 0 ? 6 : d.getDay() - 1];
      counts[key].violations++;
      if (v.status === 'resolved') counts[key].resolved++;
    });
    return DAYS.map((d) => ({ day: d, ...counts[d] }));
  }, [vios]);

  const totalResolved = weeklyChartData.reduce((s, d) => s + d.resolved, 0);
  const totalWeekly = weeklyChartData.reduce((s, d) => s + d.violations, 0);
  const resolveRate = totalWeekly > 0 ? Math.round((totalResolved / totalWeekly) * 100) : 0;

  if (vLoading && sLoading) return <div className="p-10"><SkeletonCard count={4} /></div>;

  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit" className="p-8 space-y-6">
      <div>
        <h1 className="font-display font-extrabold text-[26px] text-white tracking-tight">Command Center</h1>
        <p className="text-[13px] mt-1" style={{ color: '#555' }}>Real-time IP protection overview</p>
      </div>

      <motion.div variants={staggerContainer} initial="initial" animate="animate" className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard icon={AlertTriangle} label="Active Violations" value={vios.length} sub="All platforms" change="+12% wk" accentColor="#ff2d55" />
        <KpiCard icon={Shield} label="DMCA Success" value={stats.dmca_success_rate != null ? `${Math.round(Math.min(100, stats.dmca_success_rate * 100))}%` : 'No data'} sub={stats.dmca_success_rate != null ? 'Last 30d' : 'API not returning this field'} change={stats.dmca_success_rate != null ? '+3%' : null} accentColor="#e2e2e2" />
        <KpiCard icon={DollarSign} label="Revenue Recovered" value={stats.revenue_recovered != null ? `$${(stats.revenue_recovered / 1000).toFixed(1)}K` : 'No data'} sub={stats.revenue_recovered != null ? 'Est. USD' : 'API not returning this field'} change={stats.revenue_recovered != null ? '+$8.1K' : null} accentColor="#16ff9e" />
        <KpiCard icon={Activity} label="Protected Assets" value={stats.total_assets ?? '—'} sub="Registered" accentColor="#06b6d4" />
      </motion.div>

      <div className="rounded-xl px-6 py-4 flex items-center gap-5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
        <Zap size={16} className="text-primary shrink-0" />
        <div className="flex-1">
          <p className="font-display font-bold text-[14px] text-white">Weekly Resolution Rate</p>
          <p className="void-label">{totalResolved} of {totalWeekly} resolved</p>
        </div>
        <div className="flex items-center gap-5">
          <div className="w-48 h-[3px] rounded-full overflow-hidden" style={{ background: '#1b1b1b' }}>
            <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${resolveRate}%`, background: '#16ff9e', boxShadow: '0 0 8px rgba(22,255,158,0.5)' }} />
          </div>
          <span className="font-mono font-bold text-[18px]" style={{ color: '#16ff9e' }}>{resolveRate}%</span>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <div className="rounded-xl p-6" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-center gap-2 mb-5">
            <TrendingUp size={14} className="text-secondary" />
            <h3 className="font-display font-bold text-[14px] text-white">Weekly Trends</h3>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            {weeklyChartData.length > 0 ? (
            <AreaChart data={weeklyChartData} margin={{ top: 4, right: 4, left: -22, bottom: 4 }}>
              <defs>
                <linearGradient id="areaRed2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ff2d55" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#ff2d55" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="areaGreen2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#16ff9e" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#16ff9e" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="day" tick={{ fill: '#444', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#444', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip {...TOOLTIP_STYLE} />
              <Area type="monotone" dataKey="violations" stroke="#ff2d55" strokeWidth={2} fill="url(#areaRed2)" dot={{ fill: '#ff2d55', r: 3, strokeWidth: 0 }} />
              <Area type="monotone" dataKey="resolved" stroke="#16ff9e" strokeWidth={2} fill="url(#areaGreen2)" dot={{ fill: '#16ff9e', r: 3, strokeWidth: 0 }} />
            </AreaChart>
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-[12px] text-[#444]">No trend data yet</p>
              </div>
            )}
          </ResponsiveContainer>
        </div>

        <div className="rounded-xl p-6" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-center gap-2 mb-5">
            <Globe size={14} className="text-primary" />
            <h3 className="font-display font-bold text-[14px] text-white">By Platform</h3>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={platforms} margin={{ top: 4, right: 4, left: -22, bottom: 4 }}>
              <XAxis dataKey="platform" tick={{ fill: '#444', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#444', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip {...TOOLTIP_STYLE} />
              <defs>
                <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#06b6d4" />
                  <stop offset="100%" stopColor="#0891b2" stopOpacity={0.5} />
                </linearGradient>
              </defs>
              <Bar dataKey="violations" fill="url(#barGrad)" radius={[4, 4, 0, 0]} maxBarSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Traceability Summary */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <GitBranch size={14} className="text-cyan" />
          <h3 className="font-display font-bold text-[14px] text-white">Traceability Summary</h3>
        </div>
        <motion.div variants={staggerContainer} initial="initial" animate="animate" className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          <KpiCard icon={Target} label="Origin Sources" value={trace.origin_sources} sub="Identified" accentColor="#ff2d55" />
          <KpiCard icon={TreePine} label="Deepest Chain" value={`${trace.deepest_chain} hops`} sub="Max depth" accentColor="#16ff9e" />
          <KpiCard icon={Zap} label="Fastest Spread" value={`${trace.fastest_spread_velocity}/hr`} sub="Nodes per hour" accentColor="#f59e0b" />
          <KpiCard icon={MapPin} label="Platforms Today" value={trace.platforms_reached_today?.length || 0} sub="Distinct platforms" accentColor="#06b6d4" />
        </motion.div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        {/* Active Chain widget */}
        <div className="rounded-xl p-5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-center gap-2 mb-4">
            <GitBranch size={14} className="text-cyan" />
            <h3 className="font-display font-bold text-[14px] text-white">Fastest Active Chain</h3>
            <span className="ml-auto text-[10px] font-mono text-[#555]">Auto-refresh 10s</span>
          </div>
          {trace.fastest_chain ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="w-3 h-3 rounded-full bg-primary animate-pulse" />
                <span className="text-[13px] text-white font-semibold">{trace.fastest_chain.origin_platform}</span>
                <span className="text-[11px] text-[#888] font-mono">→ {trace.fastest_chain.total_nodes} nodes</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {trace.fastest_chain.platforms_reached?.map(p => (
                  <span key={p} className="text-[10px] px-2 py-0.5 rounded bg-white/5 text-[#aaa]">{p}</span>
                ))}
              </div>
              <div className="flex items-center gap-4 text-[12px]">
                <span className="text-[#888]">Velocity: <span className="text-cyan font-mono font-bold">{trace.fastest_chain.spread_velocity}/hr</span></span>
              </div>
              <Link to="/traceability" className="inline-flex items-center gap-1.5 text-[11px] font-bold text-cyan hover:underline mt-1">
                View Full Chain <ExternalLink size={10} />
              </Link>
            </div>
          ) : (
            <p className="text-[12px] text-[#555]">No active chains detected</p>
          )}
        </div>

        {/* Recent Threats */}
        <div className="rounded-xl p-5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle size={14} className="text-primary" />
            <h3 className="font-display font-bold text-[14px] text-white">Recent Threats</h3>
            <span className="ml-auto text-[11px] font-mono text-[#555]">Last 10</span>
          </div>
          <div className="space-y-2">
            {vios.slice(0, 6).map((v) => (
              <div key={v.violation_id} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-white/[0.02] transition-colors">
                <div className="flex items-center gap-3">
                  <span className={`w-2 h-2 rounded-full ${v.risk_score > 80 ? 'bg-primary' : v.risk_score > 55 ? 'bg-orange-400' : 'bg-secondary'}`} />
                  <span className="text-[13px] text-white font-medium">{v.platform}</span>
                  <span className="font-mono text-[10px] text-[#444]">{v.violation_id}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-mono text-[12px] text-[#888]">{Number(v.risk_score).toFixed(1)}%</span>
                  <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${v.threat_level === 'critical' ? 'bg-primary/10 text-primary' : v.threat_level === 'high' ? 'bg-orange-500/10 text-orange-400' : 'bg-white/5 text-[#888]'}`}>
                    {v.threat_level}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
