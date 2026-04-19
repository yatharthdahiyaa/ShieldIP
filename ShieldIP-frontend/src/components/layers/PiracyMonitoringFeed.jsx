import React, { useRef, useEffect } from 'react';
import { Globe, Link as LinkIcon, Youtube, Twitch, Twitter, Instagram, Video, Search, Filter } from 'lucide-react';
import { useViolations } from '../../contexts/ViolationContext';

const PLATFORM = {
  YouTube:   { icon: Youtube,   color: '#e2e2e2' },
  Twitch:    { icon: Twitch,    color: '#e2e2e2' },
  X:         { icon: Twitter,   color: '#e2e2e2' },
  Instagram: { icon: Instagram, color: '#e2e2e2' },
  TikTok:    { icon: Video,     color: '#e2e2e2' },
};

function ThreatBadge({ score }) {
  if (score > 80) return <span className="void-badge void-badge-critical">Critical</span>;
  if (score > 55) return <span className="void-badge void-badge-high">High</span>;
  return <span className="void-badge void-badge-moderate">Moderate</span>;
}

function ConfidenceBar({ value }) {
  const color = value > 90 ? '#ff2d55' : value > 75 ? '#ff6438' : '#888';
  return (
    <div>
      <p className="font-mono text-[20px] font-bold text-white leading-none mb-1.5">{value}<span className="text-[11px] text-[#555] ml-0.5">%</span></p>
      <div className="h-[2px] w-24 rounded-full overflow-hidden" style={{ background: '#1f1f1f' }}>
        <div className="h-full rounded-full transition-all duration-700"
             style={{ width: `${value}%`, background: color, boxShadow: `0 0 6px ${color}` }} />
      </div>
    </div>
  );
}

function timeAgo(ts) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s/60)}m`;
  return `${Math.floor(s/3600)}h`;
}

export default function PiracyMonitoringFeed() {
  const { violations, selectedViolation, setSelectedViolation } = useViolations();

  return (
    <div className="space-y-6">
      {/* Header row */}
      <div className="flex items-end justify-between">
        <div>
          <p className="void-label mb-1">Live Intelligence Feed</p>
          <h2 className="font-display font-bold text-[26px] text-white tracking-tight">
            {violations.length} <span style={{ color: '#333' }}>active threats</span>
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#444' }} />
            <input placeholder="Search source or ID…" className="void-input pl-9 pr-4 py-2 text-[12px] w-56" />
          </div>
          <button className="btn-void-ghost flex items-center gap-1.5 text-[12px]">
            <Filter size={12} /> Filter
          </button>
        </div>
      </div>

      {/* Sentinel Grid */}
      <div className="scan-container overflow-x-auto">
        <table className="sentinel-table">
          <thead>
            <tr>
              <th style={{ width: '35%' }}>Threat Source</th>
              <th style={{ width: '15%' }}>Confidence</th>
              <th style={{ width: '15%' }}>Tier</th>
              <th style={{ width: '15%' }}>Region</th>
              <th style={{ width: '12%' }}>Time</th>
              <th style={{ width: '8%' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {violations.map((vio, i) => {
              const Cfg = PLATFORM[vio.platform] || { icon: Globe, color: '#e2e2e2' };
              const Icon = Cfg.icon;
              const isSelected = selectedViolation?.id === vio.id;
              return (
                <tr
                  key={vio.id}
                  className={isSelected ? 'row-selected' : ''}
                  onClick={() => setSelectedViolation(vio)}
                  style={{ animationDelay: `${i * 0.04}s` }}
                >
                  <td>
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-md shrink-0"
                           style={{ background: '#252525' }}>
                        <Icon size={16} color={Cfg.color} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-semibold text-[13px] text-white">{vio.platform}</p>
                          {vio.priorFlag && (
                            <span className="void-badge void-badge-critical text-[8px] px-1.5 py-0.5">REPEAT</span>
                          )}
                        </div>
                        <p className="font-mono text-[10px] truncate max-w-[200px]" style={{ color: '#444' }}>
                          <LinkIcon size={9} className="inline mr-1" />
                          {vio.url}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td><ConfidenceBar value={vio.confidence} /></td>
                  <td><ThreatBadge score={vio.riskScore} /></td>
                  <td>
                    <span className="text-[12px]" style={{ color: '#555' }}>
                      <Globe size={10} className="inline mr-1" />{vio.region}
                    </span>
                  </td>
                  <td>
                    <span className="font-mono text-[12px]" style={{ color: '#444' }}>
                      {timeAgo(vio.timestamp)} ago
                    </span>
                  </td>
                  <td>
                    <button className="btn-void-ghost text-[11px] px-3 py-1.5 uppercase tracking-wider">
                      Review
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
