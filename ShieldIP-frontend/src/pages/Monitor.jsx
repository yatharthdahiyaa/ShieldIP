import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Globe, Radio, Wifi, AlertTriangle, WifiOff } from 'lucide-react';
import { ComposableMap, Geographies, Geography, Marker, ZoomableGroup } from 'react-simple-maps';
import { pageVariants } from '../utils/animations';
import useViolationsQuery from '../hooks/useViolations';

const GEO_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';

const REGION_COORDS = {
  'North America': [-95.71, 37.09],
  'Europe':        [10.45, 51.17],
  'Asia Pacific':  [114.17, 22.32],
  'South America': [-51.93, -14.23],
  'Global':        [0, 20],
  'Africa':        [21.76, 1.65],
};

export default function Monitor() {
  const { data: violations, isLoading, isError, dataUpdatedAt } = useViolationsQuery();
  const vios = violations || [];
  const [hoveredMarker, setHoveredMarker] = useState(null);

  const hotspots = useMemo(() => {
    const byRegion = {};
    vios.forEach((v) => {
      const region = v.region || 'Global';
      if (!byRegion[region]) byRegion[region] = { name: region, count: 0, violations: [] };
      byRegion[region].count++;
      byRegion[region].violations.push(v);
    });
    return Object.values(byRegion).map((r) => ({
      ...r,
      coordinates: REGION_COORDS[r.name] || REGION_COORDS['Global'],
    }));
  }, [vios]);

  const criticalCount = vios.filter((v) => v.risk_score > 80).length;

  const lastUpdated = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleTimeString()
    : null;

  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit" className="p-8 space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="font-display font-extrabold text-[26px] text-white tracking-tight flex items-center gap-3">
            <Radio size={22} className="text-cyan" /> Global Monitor
          </h1>
          <p className="text-[13px] mt-1" style={{ color: '#555' }}>
            Violation hotspot map — data from backend API (polls every 10s)
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-[12px]"
               style={{ background: 'rgba(255,45,85,0.06)', border: '1px solid rgba(255,45,85,0.12)', color: '#ff2d55' }}>
            <AlertTriangle size={13} />
            <span className="font-bold">{criticalCount}</span> Critical
          </div>
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-[12px]"
               style={{ background: 'rgba(22,255,158,0.06)', border: '1px solid rgba(22,255,158,0.12)', color: '#16ff9e' }}>
            <Wifi size={13} />
            <span className="font-bold">{vios.length}</span> Active
          </div>
        </div>
      </div>

      {/* Connection status banner */}
      {isError ? (
        <div className="flex items-center gap-3 px-4 py-3 rounded-lg text-[12px]"
             style={{ background: 'rgba(255,45,85,0.06)', border: '1px solid rgba(255,45,85,0.15)', color: '#ff2d55' }}>
          <WifiOff size={14} />
          <span className="font-semibold">Live monitoring not connected</span>
          <span className="text-[#888] font-normal">— backend API unreachable. Configure your API endpoint in Settings.</span>
        </div>
      ) : !isLoading && vios.length === 0 ? (
        <div className="flex items-center gap-3 px-4 py-3 rounded-lg text-[12px]"
             style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', color: '#888' }}>
          <WifiOff size={14} />
          <span className="font-semibold">No violations detected</span>
          <span className="text-[#555]">— monitoring is active but no data returned from the API.</span>
        </div>
      ) : lastUpdated && (
        <div className="flex items-center gap-2 px-4 py-2 rounded-lg text-[11px]"
             style={{ background: 'rgba(6,182,212,0.04)', border: '1px solid rgba(6,182,212,0.1)', color: '#555' }}>
          <span className="w-1.5 h-1.5 rounded-full bg-[#16ff9e] animate-pulse" />
          Data last fetched from API at <span className="text-[#888] font-mono ml-1">{lastUpdated}</span>
          <span className="ml-auto text-[#444]">Auto-refreshes every 10s</span>
        </div>
      )}

      <div className="rounded-xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-3 px-6 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
          <Globe size={14} className="text-primary" />
          <h3 className="font-display font-bold text-[14px] text-white">Violation Hotspots</h3>
          <div className="ml-auto flex items-center gap-4 text-[11px] text-[#555]">
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-primary" /> Critical</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-orange-400" /> High</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-cyan" /> Active</span>
          </div>
        </div>
        <div style={{ background: '#050505', height: 440 }}>
          <ComposableMap projectionConfig={{ scale: 148 }} style={{ width: '100%', height: '100%' }}>
            <ZoomableGroup>
              <Geographies geography={GEO_URL}>
                {({ geographies }) => geographies.map((geo) => (
                  <Geography key={geo.rsmKey} geography={geo}
                    fill="#141414" stroke="#222" strokeWidth={0.5}
                    style={{ default: { outline: 'none' }, hover: { fill: '#1f1f1f', outline: 'none' }, pressed: { outline: 'none' } }} />
                ))}
              </Geographies>
              {hotspots.map(({ name, coordinates, count }) => {
                const r = Math.max(6, Math.min(count * 4, 20));
                return (
                  <Marker key={name} coordinates={coordinates}
                    onMouseEnter={() => setHoveredMarker(name)}
                    onMouseLeave={() => setHoveredMarker(null)}>
                    <circle r={r + 4} fill="rgba(255,45,85,0.15)" className={hoveredMarker === name ? '' : 'animate-pulse-red'} />
                    <circle r={r} fill="#ff2d55" fillOpacity={0.7} stroke="rgba(255,45,85,0.4)" strokeWidth={2} />
                    <text textAnchor="middle" y={r + 14} fill="#888" fontSize={9} fontFamily="Inter">
                      {name} ({count})
                    </text>
                    <title>{name}: {count} violations</title>
                  </Marker>
                );
              })}
            </ZoomableGroup>
          </ComposableMap>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {hotspots.map((spot) => (
          <div key={spot.name} className="rounded-xl p-5 hover:bg-white/[0.04] transition-colors"
               style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-display font-bold text-[14px] text-white">{spot.name}</h4>
              <span className="font-mono text-[11px] font-bold text-primary">{spot.count} threats</span>
            </div>
            <div className="space-y-1.5">
              {spot.violations.slice(0, 3).map((v) => (
                <div key={v.violation_id} className="flex items-center justify-between text-[11px]">
                  <span className="text-[#888]">{v.platform} — {v.violation_id}</span>
                  <span className={`font-bold ${v.risk_score > 80 ? 'text-primary' : v.risk_score > 55 ? 'text-orange-400' : 'text-[#888]'}`}>{Number(v.risk_score).toFixed(1)}%</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
