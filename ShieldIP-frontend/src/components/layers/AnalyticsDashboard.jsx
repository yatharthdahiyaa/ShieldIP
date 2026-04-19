import React, { useMemo } from 'react';
import { BarChart2, Globe, TrendingUp, Shield, DollarSign, Activity, AlertTriangle, ArrowUpRight, Zap } from 'lucide-react';
import { useViolations } from '../../contexts/ViolationContext';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area, Legend } from 'recharts';
import { ComposableMap, Geographies, Geography, Marker } from 'react-simple-maps';

const GEO_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';

const HOTSPOTS = [
  { name: 'New York',    coordinates: [-74.006,  40.7128], count: 42 },
  { name: 'London',     coordinates: [ -0.1278, 51.5074], count: 35 },
  { name: 'Tokyo',      coordinates: [139.6917, 35.6895], count: 58 },
  { name: 'Mumbai',     coordinates: [ 72.8777, 19.0760], count: 29 },
  { name: 'São Paulo',  coordinates: [-46.6333,-23.5505], count: 22 },
  { name: 'Sydney',     coordinates: [151.2093,-33.8688], count: 18 },
  { name: 'Berlin',     coordinates: [ 13.4050, 52.5200], count: 27 },
  { name: 'Seoul',      coordinates: [126.978,  37.566],  count: 44 },
];

const WEEKLY_DATA = [
  { day: 'Mon', violations: 12, resolved: 8  },
  { day: 'Tue', violations: 19, resolved: 13 },
  { day: 'Wed', violations: 27, resolved: 22 },
  { day: 'Thu', violations: 23, resolved: 19 },
  { day: 'Fri', violations: 34, resolved: 28 },
  { day: 'Sat', violations: 18, resolved: 15 },
  { day: 'Sun', violations: 9,  resolved: 7  },
];

const TOOLTIP = {
  contentStyle: { background:'#111111', border:'1px solid rgba(255,255,255,0.06)', borderRadius:'4px', fontFamily:'JetBrains Mono', fontSize:'11px' },
  labelStyle:   { color:'#e2e2e2', fontWeight:'bold' },
  itemStyle:    { color:'#888' },
  cursor:       { fill:'rgba(255,255,255,0.02)' },
};

function KpiCard({ icon: Icon, label, value, sub, change, accentColor }) {
  return (
    <div className="card-3d p-5 flex items-center gap-4">
      <div className="w-12 h-12 rounded-md flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-110"
           style={{ background: `${accentColor}10`, border:`1px solid ${accentColor}18`, boxShadow:`0 8px 30px ${accentColor}14` }}>
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
    </div>
  );
}

export default function AnalyticsDashboard() {
  const { violations } = useViolations();

  const platformData = useMemo(() => {
    const c = {};
    violations.forEach(v => { c[v.platform] = (c[v.platform]||0)+1; });
    return Object.entries(c).map(([platform,count]) => ({ platform, count })).sort((a,b)=>b.count-a.count);
  }, [violations]);

  const totalResolved = WEEKLY_DATA.reduce((s,d) => s+d.resolved, 0);
  const totalWeekly   = WEEKLY_DATA.reduce((s,d) => s+d.violations, 0);
  const resolveRate   = Math.round((totalResolved/totalWeekly)*100);

  return (
    <div className="space-y-5 stagger">

      {/* KPIs */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard icon={AlertTriangle} label="Total Violations" value={violations.length} sub="All time" change="+12% wk" accentColor="#ff2d55" />
        <KpiCard icon={Shield}        label="DMCA Success"    value="87%"               sub="Last 30d"  change="+3%" accentColor="#e2e2e2" />
        <KpiCard icon={DollarSign}    label="Revenue Recovered" value="$42.3K"          sub="Est. USD"  change="+$8.1K" accentColor="#16ff9e" />
        <KpiCard icon={Activity}      label="Active Monitors"  value="12"               sub="Agents online" accentColor="#888" />
      </div>

      {/* Resolution Rate */}
      <div className="card-3d px-7 py-5 flex items-center gap-6">
        <Zap size={16} style={{ color: '#ff2d55' }} />
        <div className="flex-1">
          <p className="font-display font-bold text-[14px] text-white mb-1">Weekly Resolution Rate</p>
          <p className="void-label">{totalResolved} of {totalWeekly} violations resolved</p>
        </div>
        <div className="flex items-center gap-5">
          <div className="w-48 h-[2px] rounded-full overflow-hidden" style={{ background: '#1b1b1b' }}>
            <div className="h-full rounded-full" style={{ width:`${resolveRate}%`, background:'#16ff9e', boxShadow:'0 0 8px rgba(22,255,158,0.5)' }} />
          </div>
          <span className="font-mono font-bold text-[18px]" style={{ color: '#16ff9e' }}>{resolveRate}%</span>
        </div>
      </div>

      {/* World Map */}
      <div className="card-3d overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-4"
             style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
          <Globe size={14} style={{ color: '#ff2d55' }} />
          <h3 className="font-display font-bold text-[14px] text-white">Global Violation Hotspots</h3>
          <div className="ml-auto flex items-center gap-2 text-[11px]" style={{ color: '#444' }}>
            <span className="w-2 h-2 rounded-full bg-[#ff2d55] inline-block" /> Cluster
          </div>
        </div>
        <div style={{ background: '#0a0a0a', height: 340 }}>
          <ComposableMap projectionConfig={{ scale: 148 }} style={{ width:'100%', height:'100%' }}>
            <Geographies geography={GEO_URL}>
              {({ geographies }) => geographies.map(geo => (
                <Geography key={geo.rsmKey} geography={geo}
                           fill="#1b1b1b" stroke="#111" strokeWidth={0.5}
                           style={{ default:{outline:'none'}, hover:{fill:'#252525',outline:'none'}, pressed:{outline:'none'} }} />
              ))}
            </Geographies>
            {HOTSPOTS.map(({ name, coordinates, count }) => (
              <Marker key={name} coordinates={coordinates}>
                <circle r={Math.max(5, Math.min(count/6, 16))} fill="#ff2d55" fillOpacity={0.7}
                        stroke="rgba(255,45,85,0.3)" strokeWidth={Math.max(2,count/12)} />
                <title>{name}: {count} violations</title>
              </Marker>
            ))}
          </ComposableMap>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        {/* Bar Chart */}
        <div className="card-3d p-6">
          <div className="flex items-center gap-2 mb-6">
            <BarChart2 size={14} style={{ color: '#ff2d55' }} />
            <h3 className="font-display font-bold text-[14px] text-white">Violations by Platform</h3>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={platformData} margin={{ top:4, right:4, left:-22, bottom:4 }}>
              <XAxis dataKey="platform" tick={{ fill:'#444', fontSize:11, fontFamily:'Inter' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill:'#444', fontSize:11 }} axisLine={false} tickLine={false} />
              <Tooltip {...TOOLTIP} />
              <defs>
                <linearGradient id="barVoid" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor="#ff2d55" />
                  <stop offset="100%" stopColor="#93000a" stopOpacity="0.7" />
                </linearGradient>
              </defs>
              <Bar dataKey="count" fill="url(#barVoid)" radius={[3,3,0,0]} maxBarSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Area Chart */}
        <div className="card-3d p-6">
          <div className="flex items-center gap-2 mb-6">
            <TrendingUp size={14} style={{ color: '#16ff9e' }} />
            <h3 className="font-display font-bold text-[14px] text-white">Weekly Trends</h3>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={WEEKLY_DATA} margin={{ top:4, right:4, left:-22, bottom:4 }}>
              <defs>
                <linearGradient id="areaRed" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#ff2d55" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#ff2d55" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="areaGreen" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#16ff9e" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#16ff9e" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="day" tick={{ fill:'#444', fontSize:11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill:'#444', fontSize:11 }} axisLine={false} tickLine={false} />
              <Tooltip {...TOOLTIP} />
              <Legend wrapperStyle={{ color:'#444', fontSize:11, paddingTop:8 }} />
              <Area type="monotone" dataKey="violations" stroke="#ff2d55" strokeWidth={2} fill="url(#areaRed)" dot={{ fill:'#ff2d55', r:3, strokeWidth:0 }} />
              <Area type="monotone" dataKey="resolved"   stroke="#16ff9e" strokeWidth={2} fill="url(#areaGreen)" dot={{ fill:'#16ff9e', r:3, strokeWidth:0 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
