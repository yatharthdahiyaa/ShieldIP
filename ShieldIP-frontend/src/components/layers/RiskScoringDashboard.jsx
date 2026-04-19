import React from 'react';
import { AlertTriangle, ShieldCheck, XCircle, Target, Activity } from 'lucide-react';
import { useViolations } from '../../contexts/ViolationContext';

function GaugeSVG({ score }) {
  const pct   = Math.max(0, Math.min(100, score));
  const R     = 88;
  const circ  = Math.PI * R;          // half-circle ≈ 276.5
  const offset = circ * (1 - pct / 100);
  const color  = pct > 80 ? '#ff2d55' : pct > 55 ? '#ff6438' : '#16ff9e';

  return (
    <svg viewBox="0 0 200 108" className="w-full max-w-[230px]" aria-label={`Risk ${score}`}>
      <defs>
        <filter id="voidGlow">
          <feGaussianBlur stdDeviation="4" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <filter id="voidGlowInner" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>

      {/* Track */}
      <path d="M 12 100 A 88 88 0 0 1 188 100"
            fill="none" stroke="#1f1f1f" strokeWidth="12" strokeLinecap="round"
            filter="url(#voidGlowInner)" />

      {/* Fill */}
      <path d="M 12 100 A 88 88 0 0 1 188 100"
            fill="none"
            stroke={color}
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={offset}
            className="gauge-arc-animated"
            style={{ '--dash-offset': offset, filter: `drop-shadow(0 0 8px ${color})` }}
      />

      {/* Score number */}
      <text x="100" y="86" textAnchor="middle"
            fontFamily="JetBrains Mono, monospace" fontWeight="800"
            fontSize="34" fill={color} filter="url(#voidGlow)">
        {pct}
      </text>
      <text x="100" y="104" textAnchor="middle"
            fontFamily="Inter, sans-serif" fontWeight="600"
            fontSize="9" fill="#333" letterSpacing="3">
        RISK SCORE
      </text>
    </svg>
  );
}

function MetricRow({ label, value, valueColor }) {
  return (
    <div className="flex items-center justify-between py-3"
         style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
      <span className="text-[12px]" style={{ color: '#555' }}>{label}</span>
      <span className="font-mono font-bold text-[13px]" style={{ color: valueColor || '#e2e2e2' }}>{value}</span>
    </div>
  );
}

export default function RiskScoringDashboard({ compact = false }) {
  const { selectedViolation } = useViolations();

  if (!selectedViolation) {
    return (
      <div className={`card-3d flex flex-col items-center justify-center gap-4 text-center ${compact ? 'p-6' : 'p-12'}`}>
        <div className="w-14 h-14 rounded-md flex items-center justify-center"
             style={{ background: '#1b1b1b', boxShadow: '0 20px 60px rgba(0,0,0,0.8)' }}>
          <Target size={24} style={{ color: '#333' }} />
        </div>
        <div>
          <h3 className="font-display font-bold text-[15px] text-white">No Target Selected</h3>
          <p className="text-[12px] mt-1" style={{ color: '#444' }}>Select a violation to score risk</p>
        </div>
      </div>
    );
  }

  const score = selectedViolation.riskScore || 0;
  const scoreLabel = score > 80 ? 'Critical Risk' : score > 55 ? 'Elevated Risk' : 'Moderate Risk';
  const scoreColor = score > 80 ? '#ff2d55' : score > 55 ? '#ff6438' : '#16ff9e';

  return (
    <div className="card-float flex flex-col overflow-hidden animate-void-in">
      {/* Header */}
      <div className={`flex items-center justify-between ${compact ? 'px-4 py-3' : 'px-6 py-5'}`}
           style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', background: '#111111' }}>
        <div className="flex items-center gap-3">
          <Activity size={15} style={{ color: '#ff2d55' }} />
          <div>
            <h3 className="font-display font-bold text-[14px] text-white">Risk Scoring</h3>
            {!compact && <p className="void-label mt-0.5">Threat severity gauge</p>}
          </div>
        </div>
        <span className="void-badge font-mono text-[10px] px-2.5 py-1"
              style={{ background: `${scoreColor}12`, color: scoreColor, boxShadow: `inset 0 0 0 1px ${scoreColor}25` }}>
          {scoreLabel}
        </span>
      </div>

      {/* Gauge */}
      <div className={`flex flex-col items-center ${compact ? 'px-4 py-4' : 'px-6 py-6'}`}
           style={{ background: '#0e0e0e' }}>
        <div className="card-3d-wrapper w-full flex justify-center">
          <GaugeSVG score={score} />
        </div>
        <div className="flex items-center gap-2 mt-2">
          <span className="w-2 h-2 rounded-full animate-pulse-red"
                style={{ background: scoreColor, boxShadow: `0 0 8px ${scoreColor}` }} />
          <span className="font-mono text-[11px] font-bold" style={{ color: scoreColor }}>{scoreLabel}</span>
        </div>
      </div>

      {/* Metrics */}
      <div className={`${compact ? 'px-4 pb-4' : 'px-6 pb-6'}`}>
        <MetricRow
          label="Domain Authority"
          value={selectedViolation.domainAuth}
          valueColor={selectedViolation.domainAuth === 'High' ? '#ff6438' : '#888'}
        />
        <MetricRow
          label="Prior Offender"
          value={selectedViolation.priorFlag ? '⚠ Yes' : 'No'}
          valueColor={selectedViolation.priorFlag ? '#ff2d55' : '#555'}
        />
        <MetricRow
          label="License Status"
          value={selectedViolation.licensed ? 'Licensed' : 'Unlicensed'}
          valueColor={selectedViolation.licensed ? '#16ff9e' : '#ff2d55'}
        />
        {!compact && (
          <MetricRow
            label="Match Confidence"
            value={`${selectedViolation.confidence}%`}
            valueColor="#e2e2e2"
          />
        )}
      </div>
    </div>
  );
}
