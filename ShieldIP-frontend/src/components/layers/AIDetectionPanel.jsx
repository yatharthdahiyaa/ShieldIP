import React, { useEffect, useState } from 'react';
import { Brain, AlertCircle, TrendingDown, Crosshair, Shield, Cpu, Zap } from 'lucide-react';
import { useViolations } from '../../contexts/ViolationContext';
import { analyzeViolation } from '../../services/claude';

export default function AIDetectionPanel({ compact = false }) {
  const { selectedViolation } = useViolations();
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let m = true;
    if (selectedViolation) {
      setLoading(true); setAnalysis(null);
      analyzeViolation(selectedViolation).then(r => { if(m){ setAnalysis(r); setLoading(false); }});
    } else { setAnalysis(null); }
    return () => { m = false; };
  }, [selectedViolation]);

  if (!selectedViolation) {
    return (
      <div className={`card-3d text-center ${compact ? 'p-6' : 'p-12'} flex flex-col items-center gap-4`}>
        <div className="w-16 h-16 rounded-md flex items-center justify-center"
             style={{ background: '#1b1b1b', boxShadow: '0 20px 60px rgba(0,0,0,0.8)' }}>
          <Brain size={26} style={{ color: '#333' }} />
        </div>
        <div>
          <h3 className="font-display font-bold text-[15px] text-white">AI Triage Standing By</h3>
          <p className="text-[12px] mt-1.5 max-w-[200px] mx-auto" style={{ color: '#555' }}>
            Select a threat from the matrix to initiate analysis.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="card-float flex flex-col overflow-hidden animate-void-in">
      {/* Header */}
      <div className={`flex items-center justify-between ${compact ? 'px-4 py-3' : 'px-6 py-5'}`}
           style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', background: '#111111' }}>
        <div className="flex items-center gap-3">
          <Shield size={15} style={{ color: '#ff2d55' }} />
          <div>
            <h3 className="font-display font-bold text-[14px] text-white">AI Analysis</h3>
            {!compact && <p className="text-[10px] void-label mt-0.5">Anthropic Claude 3.5 Sonnet</p>}
          </div>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-sm void-label"
             style={{ background: 'rgba(22,255,158,0.08)', color: '#16ff9e', border: '1px solid rgba(22,255,158,0.1)' }}>
          <Cpu size={9} /> CLAUDE AI
        </div>
      </div>

      {/* Target Strip */}
      {!compact && (
        <div className="px-6 py-2.5 flex items-center gap-3" style={{ background: '#0e0e0e' }}>
          <span className="void-label">Target:</span>
          <span className="font-mono text-[11px] font-bold" style={{ color: '#ff2d55' }}>{selectedViolation.id}</span>
          <span style={{ color: '#222' }}>·</span>
          <span className="text-[11px]" style={{ color: '#444' }}>{selectedViolation.platform}</span>
          <span style={{ color: '#222' }}>·</span>
          <span className="text-[11px]" style={{ color: '#444' }}>{selectedViolation.region}</span>
        </div>
      )}

      {/* Content */}
      <div className={`${compact ? 'p-4' : 'p-6'} space-y-4`}>
        {loading ? (
          <div className="space-y-3 py-2">
            <div className="flex items-center gap-3 p-3 rounded-sm"
                 style={{ background: 'rgba(255,45,85,0.06)', border: '1px solid rgba(255,45,85,0.1)' }}>
              <div className="w-7 h-7 rounded-full border-2 animate-spin-slow"
                   style={{ borderColor: 'rgba(255,45,85,0.2)', borderTopColor: '#ff2d55' }} />
              <p className="text-[12px] font-mono animate-pulse" style={{ color: '#ff2d55' }}>
                Analyzing violation context...
              </p>
            </div>
            {[...Array(4)].map((_,i) => <div key={i} className={`void-skeleton h-12 w-full`} style={{ animationDelay: `${i*0.1}s` }} />)}
          </div>
        ) : analysis ? (
          <div className="space-y-4 animate-void-in">
            {/* Threat + Action */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Threat Level', icon: AlertCircle, value: analysis.threat_level, isLevel: true },
                { label: 'Action',       icon: Crosshair,   value: analysis.recommended_action },
              ].map(({ label, icon: Ic, value, isLevel }) => {
                const lvlColor = { critical:'#ff2d55', high:'#ff6438', medium:'#888', low:'#16ff9e' }[value] || '#fff';
                return (
                  <div key={label} className="p-4 rounded-sm"
                       style={{ background: '#111111', boxShadow: '0 8px 30px rgba(0,0,0,0.5)' }}>
                    <p className="void-label flex items-center gap-1 mb-2">
                      <Ic size={9} /> {label}
                    </p>
                    <p className="font-display font-bold text-[15px] capitalize"
                       style={{ color: isLevel ? lvlColor : '#ffffff' }}>
                      {value}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Reasoning */}
            <div className="p-4 rounded-sm" style={{ background: 'rgba(255,45,85,0.04)', border: '1px solid rgba(255,45,85,0.08)' }}>
              <p className="void-label flex items-center gap-1.5 mb-2" style={{ color: '#ff2d55' }}>
                <Brain size={9} /> Analysis Reasoning
              </p>
              <p className="text-[12px] leading-relaxed" style={{ color: '#888' }}>{analysis.reasoning}</p>
            </div>

            {/* Revenue loss */}
            <div className="flex items-center justify-between p-4 rounded-sm"
                 style={{ background: '#111111', border: '1px solid rgba(255,45,85,0.1)' }}>
              <div className="flex items-center gap-2">
                <TrendingDown size={15} style={{ color: '#ff2d55' }} />
                <p className="text-[12px] font-medium" style={{ color: '#888' }}>Est. Revenue Loss</p>
              </div>
              <span className="font-mono font-bold text-[18px] text-white">{analysis.estimated_revenue_loss}</span>
            </div>

            {/* Execute CTA */}
            {!compact && (
              <button className="btn-void-primary w-full justify-center py-3 text-[13px] uppercase tracking-widest">
                <Zap size={14} /> Execute Takedown
              </button>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
