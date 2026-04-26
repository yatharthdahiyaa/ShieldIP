import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { BarChart2, Globe, TrendingUp, Shield, DollarSign, Activity, AlertTriangle, ArrowUpRight, Download, Calendar } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area, Legend, PieChart, Pie, Cell } from 'recharts';
import { ComposableMap, Geographies, Geography, Marker } from 'react-simple-maps';
import { pageVariants, staggerContainer, staggerItem } from '../utils/animations';
import useViolationsQuery from '../hooks/useViolations';
import { useAnalyticsSummary, useAnalyticsByPlatform } from '../hooks/useAnalytics';

const GEO_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';

const REGION_COORDS = {
  'North America':  [-95.71, 37.09],
  'NA':             [-95.71, 37.09],
  'US':             [-95.71, 37.09],
  'United States':  [-95.71, 37.09],
  'Europe':         [10.45, 51.17],
  'EU':             [10.45, 51.17],
  'UK':             [-1.17, 52.37],
  'DE':             [10.45, 51.16],
  'FR':             [2.21, 46.23],
  'Asia Pacific':   [114.17, 22.32],
  'APAC':           [114.17, 22.32],
  'Asia':           [100.0, 34.0],
  'IN':             [78.96, 20.59],
  'JP':             [138.25, 36.20],
  'KR':             [127.77, 35.91],
  'PH':             [121.77, 12.88],
  'ID':             [113.92, -0.79],
  'South America':  [-51.93, -14.23],
  'SA':             [-51.93, -14.23],
  'Latin America':  [-65.0, -15.0],
  'BR':             [-51.93, -14.23],
  'MX':             [-102.55, 23.63],
  'Africa':         [21.76, 1.65],
  'AF':             [21.76, 1.65],
  'NG':             [8.68, 9.08],
  'ZA':             [25.08, -29.0],
  'EG':             [30.80, 26.82],
  'Middle East':    [45.0, 25.0],
  'ME':             [45.0, 25.0],
  'TR':             [35.24, 38.96],
  'AU':             [133.77, -25.27],
  'CA':             [-96.80, 56.13],
  'IT':             [12.57, 41.87],
  'ES':             [-3.74, 40.46],
  'Global':         [0, 20],
  'Unknown':        [0, 20],
};

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

  // Platform breakdown derived from real violations (fallback when API platform data empty)
  const platformChartData = useMemo(() => {
    if (vios.length === 0) return [];
    const counts = {};
    vios.forEach(v => {
      const p = v.platform || 'Unknown';
      counts[p] = (counts[p] || 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([platform, count]) => ({ platform, count }));
  }, [vios]);

  const pieData = useMemo(() => {
    // Prefer API platform data; fall back to vios-derived
    const src = platforms.length > 0
      ? platforms.map(p => ({ name: p.platform, value: p.violations || p.violation_count || 0 }))
      : platformChartData.map(p => ({ name: p.platform, value: p.count }));
    return src.slice(0, 6);
  }, [platforms, platformChartData]);
  const resolveRate = stats.violations_this_week > 0 ? Math.min(100, Math.round((stats.resolved_this_week / stats.violations_this_week) * 100)) : 0;

  const weeklyChartData = useMemo(() => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const counts = Object.fromEntries(days.map((d) => [d, { violations: 0, resolved: 0 }]));
    vios.forEach((v) => {
      const d = new Date(v.detected_at || v.created_at || Date.now());
      if (isNaN(d)) return;
      const key = days[d.getDay() === 0 ? 6 : d.getDay() - 1];
      counts[key].violations++;
      if (v.status === 'resolved') counts[key].resolved++;
    });
    return days.map((d) => ({ day: d, ...counts[d] }));
  }, [vios]);

  // Build live hotspots from violations (grouped by region)
  const hotspots = useMemo(() => {
    const byRegion = {};
    vios.forEach(v => {
      const r = v.region || 'Global';
      if (!byRegion[r]) {
        const coords = REGION_COORDS[r];
        if (!coords) console.warn(`[Analytics] Unmatched region name: "${r}" — falling back to Global`);
        byRegion[r] = { name: r, count: 0, coords: coords || REGION_COORDS['Global'] };
      }
      byRegion[r].count++;
    });
    return Object.values(byRegion);
  }, [vios]);

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
          { icon: Shield, label: 'DMCA Success', value: stats.dmca_success_rate != null ? `${Math.round(stats.dmca_success_rate * 100)}%` : 'No data', sub: stats.dmca_success_rate == null ? 'API not returning this field' : null, change: null, color: '#e2e2e2' },
          { icon: DollarSign, label: 'Revenue Recovered', value: stats.revenue_recovered != null ? `$${(stats.revenue_recovered / 1000).toFixed(1)}K` : 'No data', sub: stats.revenue_recovered == null ? 'API not returning this field' : null, change: null, color: '#16ff9e' },
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
          <h3 className="font-display font-bold text-[14px] text-white">Violation Hotspots by Region</h3>
          <span className="ml-auto text-[10px] text-[#555] font-mono">Live — from API violations data</span>
        </div>
        <div style={{ background: '#050505', height: 340 }}>
          <ComposableMap projectionConfig={{ scale: 148 }} style={{ width: '100%', height: '100%' }}>
            <Geographies geography={GEO_URL}>
              {({ geographies }) => geographies.map((geo) => (
                <Geography key={geo.rsmKey} geography={geo} fill="#141414" stroke="#222" strokeWidth={0.5}
                  style={{ default: { outline: 'none' }, hover: { fill: '#1f1f1f', outline: 'none' }, pressed: { outline: 'none' } }} />
              ))}
            </Geographies>
            {hotspots.map(({ name, count, coords }) => (
              <Marker key={name} coordinates={coords}>
                <circle r={Math.max(5, Math.min(count * 3, 18))} fill="#ff2d55" fillOpacity={0.7} stroke="rgba(255,45,85,0.3)" strokeWidth={2} />
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
            <h3 className="font-display font-bold text-[14px] text-white">Violations by Platform</h3>
            <span className="ml-auto text-[10px] text-[#555] font-mono">Live — violations data</span>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            {platformChartData.length > 0 ? (
            <BarChart data={platformChartData} margin={{ top: 4, right: 4, left: -22, bottom: 4 }}>
              <defs>
                <linearGradient id="aR" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#ff2d55" stopOpacity={0.8} /><stop offset="95%" stopColor="#ff2d55" stopOpacity={0.3} /></linearGradient>
              </defs>
              <XAxis dataKey="platform" tick={{ fill: '#444', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#444', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip {...TOOLTIP_STYLE} />
              <Bar dataKey="count" fill="url(#aR)" radius={[4, 4, 0, 0]} />
            </BarChart>
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-[12px] text-[#444]">No platform data available yet</p>
              </div>
            )}
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
          <Activity size={14} className="text-cyan" />
          <h3 className="font-display font-bold text-[14px] text-white">Risk Score Distribution</h3>
          <span className="ml-auto text-[10px] text-[#555] font-mono">All violations</span>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          {(() => {
            const buckets = [
              { range: '0–20', min: 0, max: 20, count: 0 },
              { range: '20–40', min: 20, max: 40, count: 0 },
              { range: '40–60', min: 40, max: 60, count: 0 },
              { range: '60–80', min: 60, max: 80, count: 0 },
              { range: '80–100', min: 80, max: 100, count: 0 },
            ];
            vios.forEach(v => {
              const s = Number(v.risk_score) || 0;
              const b = buckets.find(b => s >= b.min && s < b.max) || buckets[buckets.length - 1];
              b.count++;
            });
            return buckets.some(b => b.count > 0) ? (
              <BarChart data={buckets} margin={{ top: 4, right: 4, left: -22, bottom: 4 }}>
                <defs>
                  <linearGradient id="riskGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#06b6d4" />
                    <stop offset="100%" stopColor="#0891b2" stopOpacity={0.4} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="range" tick={{ fill: '#444', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#444', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip {...TOOLTIP_STYLE} />
                <Bar dataKey="count" fill="url(#riskGrad)" radius={[4, 4, 0, 0]} maxBarSize={48} />
              </BarChart>
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-[12px] text-[#444]">No risk data yet</p>
              </div>
            );
          })()}
        </ResponsiveContainer>
      </Card>
    </motion.div>
  );
}
