import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { BarChart2, Globe, TrendingUp, Shield, DollarSign, Activity, AlertTriangle, ArrowUpRight, Zap, Download, Calendar } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area, Legend, PieChart, Pie, Cell } from 'recharts';
import { ComposableMap, Geographies, Geography, Marker } from 'react-simple-maps';
import { pageVariants, staggerContainer, staggerItem } from '../utils/animations';
import useViolationsQuery from '../hooks/useViolations';
import { useAnalyticsSummary, useAnalyticsByPlatform } from '../hooks/useAnalytics';

const GEO_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';
const HOTSPOTS = [
  { name: 'New York', coordinates: [-74.006, 40.7128], count: 42 },
  { name: 'London', coordinates: [-0.1278, 51.5074], count: 35 },
  { name: 'Tokyo', coordinates: [139.6917, 35.6895], count: 58 },
  { name: 'Mumbai', coordinates: [72.8777, 19.076], count: 29 },
  { name: 'Sao Paulo', coordinates: [-46.6333, -23.5505], count: 22 },
  { name: 'Seoul', coordinates: [126.978, 37.566], count: 44 },
];

const WEEKLY_DATA = [
  { day: 'Mon', violations: 12, resolved: 8 }, { day: 'Tue', violations: 19, resolved: 13 },
  { day: 'Wed', violations: 27, resolved: 22 }, { day: 'Thu', violations: 23, resolved: 19 },
  { day: 'Fri', violations: 34, resolved: 28 }, { day: 'Sat', violations: 18, resolved: 15 },
  { day: 'Sun', violations: 9, resolved: 7 },
];

const TOOLTIP_STYLE = {
  contentStyle: { background: '#131313', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', fontFamily: 'JetBrains Mono', fontSize: '11px' },
  labelStyle: { color: '#e2e2e2', fontWeight: 'bold' }, itemStyle: { color: '#888' }, cursor: { fill: 'rgba(255,255,255,0.02)' },
};

const PIE_COLORS = ['#ff2d55', '#06b6d4', '#16ff9e', '#f59e0b', '#7c3aed', '#888'];

function Card({ children, className = '' }) {
  return <div className={`rounded-xl ${className}`} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>{children}</div>;
}

export default function Analytics() {
  const { data: violations } = useViolationsQuery();
  const { data: summary } = useAnalyticsSummary();
  const { data: platformData } = useAnalyticsByPlatform();

  const vios = violations || [];
  const stats = summary || {};
  const platforms = platformData || [];

  const pieData = useMemo(() => platforms.slice(0, 6).map((p) => ({ name: p.platform, value: p.violations || p.violation_count || 0 })), [platforms]);
  const resolveRate = stats.violations_this_week > 0 ? Math.round((stats.resolved_this_week / stats.violations_this_week) * 100) : 0;

  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit" className="p-8 space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="font-display font-extrabold text-[26px] text-white tracking-tight flex items-center gap-3">
            <BarChart2 size={22} className="text-cyan" /> Analytics
          </h1>
          <p className="text-[13px] mt-1 text-[#555]">Global violation intelligence & revenue recovery</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-void-ghost flex items-center gap-1.5 text-[12px]"><Calendar size={12} /> 30 Days</button>
          <button className="btn-void-ghost flex items-center gap-1.5 text-[12px]"><Download size={12} /> Export</button>
        </div>
      </div>

      <motion.div variants={staggerContainer} initial="initial" animate="animate" className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { icon: AlertTriangle, label: 'Total Violations', value: stats.total_violations ?? '—', change: null, color: '#ff2d55' },
          { icon: Shield, label: 'DMCA Success', value: stats.dmca_success_rate != null ? `${Math.round(stats.dmca_success_rate * 100)}%` : '—', change: null, color: '#e2e2e2' },
          { icon: DollarSign, label: 'Revenue Recovered', value: stats.revenue_recovered != null ? `$${(stats.revenue_recovered / 1000).toFixed(1)}K` : '—', change: null, color: '#16ff9e' },
          { icon: Activity, label: 'Active Monitors', value: '—', change: null, color: '#06b6d4' },
        ].map(({ icon: Ic, label, value, change, color }) => (
          <motion.div key={label} variants={staggerItem} className="rounded-xl p-5 flex items-center gap-4"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: `${color}10` }}>
              <Ic size={18} style={{ color }} />
            </div>
            <div>
              <p className="void-label">{label}</p>
              <p className="font-display font-extrabold text-[20px] text-white leading-none">{value}</p>
              {change && <span className="flex items-center gap-0.5 text-[10px] font-bold text-secondary mt-0.5"><ArrowUpRight size={10} />{change}</span>}
            </div>
          </motion.div>
        ))}
      </motion.div>

      <Card className="overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
          <Globe size={14} className="text-primary" />
          <h3 className="font-display font-bold text-[14px] text-white">Global Violation Hotspots</h3>
        </div>
        <div style={{ background: '#050505', height: 340 }}>
          <ComposableMap projectionConfig={{ scale: 148 }} style={{ width: '100%', height: '100%' }}>
            <Geographies geography={GEO_URL}>
              {({ geographies }) => geographies.map((geo) => (
                <Geography key={geo.rsmKey} geography={geo} fill="#141414" stroke="#222" strokeWidth={0.5}
                  style={{ default: { outline: 'none' }, hover: { fill: '#1f1f1f', outline: 'none' }, pressed: { outline: 'none' } }} />
              ))}
            </Geographies>
            {HOTSPOTS.map(({ name, coordinates, count }) => (
              <Marker key={name} coordinates={coordinates}>
                <circle r={Math.max(5, Math.min(count / 5, 16))} fill="#ff2d55" fillOpacity={0.7} stroke="rgba(255,45,85,0.3)" strokeWidth={2} />
                <title>{name}: {count} violations</title>
              </Marker>
            ))}
          </ComposableMap>
        </div>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <Card className="p-6 xl:col-span-2">
          <div className="flex items-center gap-2 mb-5">
            <TrendingUp size={14} className="text-secondary" />
            <h3 className="font-display font-bold text-[14px] text-white">Weekly Trends</h3>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={WEEKLY_DATA} margin={{ top: 4, right: 4, left: -22, bottom: 4 }}>
              <defs>
                <linearGradient id="aR" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#ff2d55" stopOpacity={0.2} /><stop offset="95%" stopColor="#ff2d55" stopOpacity={0} /></linearGradient>
                <linearGradient id="aG" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#16ff9e" stopOpacity={0.15} /><stop offset="95%" stopColor="#16ff9e" stopOpacity={0} /></linearGradient>
              </defs>
              <XAxis dataKey="day" tick={{ fill: '#444', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#444', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip {...TOOLTIP_STYLE} />
              <Legend wrapperStyle={{ color: '#444', fontSize: 11, paddingTop: 8 }} />
              <Area type="monotone" dataKey="violations" stroke="#ff2d55" strokeWidth={2} fill="url(#aR)" dot={{ fill: '#ff2d55', r: 3, strokeWidth: 0 }} />
              <Area type="monotone" dataKey="resolved" stroke="#16ff9e" strokeWidth={2} fill="url(#aG)" dot={{ fill: '#16ff9e', r: 3, strokeWidth: 0 }} />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-2 mb-5">
            <BarChart2 size={14} className="text-primary" />
            <h3 className="font-display font-bold text-[14px] text-white">Platform Split</h3>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
              </Pie>
              <Tooltip {...TOOLTIP_STYLE} />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <Card className="p-6">
        <div className="flex items-center gap-2 mb-5">
          <BarChart2 size={14} className="text-cyan" />
          <h3 className="font-display font-bold text-[14px] text-white">Violations by Platform</h3>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={platforms} margin={{ top: 4, right: 4, left: -22, bottom: 4 }}>
            <XAxis dataKey="platform" tick={{ fill: '#444', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#444', fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip {...TOOLTIP_STYLE} />
            <defs>
              <linearGradient id="bV" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#ff2d55" /><stop offset="100%" stopColor="#93000a" stopOpacity={0.7} /></linearGradient>
            </defs>
            <Bar dataKey="violations" fill="url(#bV)" radius={[4, 4, 0, 0]} maxBarSize={40} />
          </BarChart>
        </ResponsiveContainer>
      </Card>
    </motion.div>
  );
}
