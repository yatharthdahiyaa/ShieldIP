import React, { useState } from 'react';
import { Scale, FileText, Gavel, DollarSign, X, Cpu, Clock, CheckCircle2, ChevronRight, Send, AlertTriangle, Shield } from 'lucide-react';
import { useViolations } from '../../contexts/ViolationContext';
import { generateDMCA } from '../../services/claude';

const ACTIONS = [
  {
    id: 'DMCA Takedown',
    icon: FileText,
    label: 'DMCA Takedown',
    sub: 'AI-drafted notice, auto-filed',
    color: '#ff2d55',
    usesAI: true,
  },
  {
    id: 'Claim Monetize',
    icon: DollarSign,
    label: 'Claim & Monetize',
    sub: 'Route ad revenue to rights holder',
    color: '#16ff9e',
    usesAI: false,
  },
  {
    id: 'Flag Legal',
    icon: Gavel,
    label: 'Escalate Legal',
    sub: 'Flag for manual lawsuit review',
    color: '#e2e2e2',
    usesAI: true,
  },
];

export default function EnforcementEngine() {
  const { selectedViolation, enforcementLogs, recordEnforcement } = useViolations();
  const [modal, setModal] = useState(false);
  const [noticeText, setNoticeText] = useState('');
  const [generating, setGenerating] = useState(false);
  const [currentAction, setCurrentAction] = useState(null);

  const handleAction = async (action) => {
    if (!selectedViolation) return;
    setCurrentAction(action);
    setModal(true);
    if (action.usesAI) {
      setGenerating(true); setNoticeText('');
      const text = await generateDMCA(selectedViolation);
      setNoticeText(text); setGenerating(false);
    } else {
      setNoticeText(`[AUTOMATED] Initiating monetization claim against ${selectedViolation.platform} — Asset ID: ${selectedViolation.id}.\n\nRoyalty routing pipeline enabled. Revenue redirection to the registered rights holder within 24–48 hours.`);
    }
  };

  const submit = () => { recordEnforcement(currentAction.id, selectedViolation); setModal(false); };

  return (
    <div className="space-y-5">
      {/* Action Grid */}
      <div className="card-3d p-7">
        <div className="flex items-center justify-between mb-7">
          <div className="flex items-center gap-3">
            <Scale size={16} style={{ color: '#ff2d55' }} />
            <div>
              <h2 className="font-display font-bold text-[18px] text-white">Enforcement Engine</h2>
              <p className="void-label mt-0.5">AI-assisted legal action pipeline</p>
            </div>
          </div>
          {selectedViolation && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-sm"
                 style={{ background: '#1b1b1b', border: '1px solid rgba(255,255,255,0.06)' }}>
              <Shield size={11} style={{ color: '#555' }} />
              <span className="void-label">Target:</span>
              <span className="font-mono text-[11px] font-bold" style={{ color: '#ff2d55' }}>{selectedViolation.id}</span>
            </div>
          )}
        </div>

        {!selectedViolation ? (
          <div className="py-14 flex flex-col items-center gap-4 text-center">
            <div className="w-14 h-14 rounded-md flex items-center justify-center"
                 style={{ background: '#1b1b1b', boxShadow: '0 20px 60px rgba(0,0,0,0.8)' }}>
              <AlertTriangle size={22} style={{ color: '#333' }} />
            </div>
            <p className="text-[13px]" style={{ color: '#555' }}>Select a violation from the feed to activate enforcement options.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {ACTIONS.map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.id}
                  onClick={() => handleAction(action)}
                  className="group card-3d p-6 flex flex-col items-center gap-4 text-center cursor-pointer"
                  style={{ boxShadow: 'none' }}
                  onMouseEnter={e => {
                    e.currentTarget.style.boxShadow = `0 20px 60px rgba(0,0,0,0.8), 0 0 0 1px ${action.color}20`;
                  }}
                  onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; }}
                >
                  <div className="w-14 h-14 rounded-md flex items-center justify-center transition-transform duration-200 group-hover:scale-110"
                       style={{ background: `${action.color}10`, border: `1px solid ${action.color}20` }}>
                    <Icon size={26} style={{ color: action.color }} />
                  </div>
                  <div>
                    <p className="font-display font-bold text-[14px]" style={{ color: action.color }}>{action.label}</p>
                    <p className="text-[11px] mt-1" style={{ color: '#555' }}>{action.sub}</p>
                  </div>
                  {action.usesAI && (
                    <span className="void-badge void-badge-secure text-[9px]"><Cpu size={8} />AI-Generated</span>
                  )}
                  <div className="flex items-center gap-1 text-[11px] font-semibold opacity-0 group-hover:opacity-100 transition-opacity"
                       style={{ color: action.color }}>
                    Initiate <ChevronRight size={12} />
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Enforcement Log */}
      {enforcementLogs.length > 0 && (
        <div className="card-3d p-5">
          <div className="flex items-center gap-2 mb-4">
            <Clock size={13} style={{ color: '#555' }} />
            <h3 className="font-display font-bold text-[14px] text-white">Enforcement Log</h3>
            <span className="ml-auto void-badge void-badge-moderate">{enforcementLogs.length}</span>
          </div>
          <div className="space-y-2">
            {enforcementLogs.map(log => (
              <div key={log.id} className="flex items-center justify-between py-3 px-4 rounded-sm"
                   style={{ background: '#111111' }}>
                <div className="flex items-center gap-3">
                  <CheckCircle2 size={14} style={{ color: '#16ff9e' }} />
                  <div>
                    <p className="text-[13px] font-semibold text-white">{log.action}</p>
                    <p className="font-mono text-[10px]" style={{ color: '#444' }}>{log.targetId}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="void-badge void-badge-secure text-[9px]">Pending</span>
                  <span className="font-mono text-[10px]" style={{ color: '#444' }}>
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 void-modal-backdrop flex items-center justify-center p-4 z-50">
          <div className="card-float w-full max-w-2xl p-7 animate-void-in">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <Cpu size={15} style={{ color: '#ff2d55' }} />
                <div>
                  <h3 className="font-display font-bold text-white">{currentAction?.label}</h3>
                  <p className="void-label mt-0.5">Drafting via Claude 3.5 Sonnet</p>
                </div>
              </div>
              <button onClick={() => setModal(false)}
                      className="p-2 rounded-sm transition-colors"
                      style={{ color: '#555' }}
                      onMouseEnter={e => e.currentTarget.style.color='#e2e2e2'}
                      onMouseLeave={e => e.currentTarget.style.color='#555'}>
                <X size={16} />
              </button>
            </div>

            <div className="rounded-sm p-5 font-mono text-[12px] leading-relaxed relative min-h-[160px]"
                 style={{ background: '#0e0e0e', border: '1px solid rgba(255,255,255,0.06)' }}>
              {generating ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                  <div className="w-10 h-10 rounded-full border-2 animate-spin-slow"
                       style={{ borderColor: 'rgba(255,45,85,0.2)', borderTopColor: '#ff2d55' }} />
                  <p className="font-mono text-[12px] animate-pulse" style={{ color: '#ff2d55' }}>
                    Generating legal notice...
                  </p>
                </div>
              ) : (
                <p className="whitespace-pre-wrap" style={{ color: '#888' }}>{noticeText}</p>
              )}
            </div>

            <div className="flex items-center justify-between mt-5">
              <p className="text-[11px]" style={{ color: '#444' }}>Review before executing enforcement action</p>
              <div className="flex gap-3">
                <button onClick={() => setModal(false)} className="btn-void-ghost text-[12px]">Cancel</button>
                <button disabled={generating} onClick={submit}
                        className="btn-void-primary flex items-center gap-2 text-[12px] uppercase tracking-widest px-5">
                  <Send size={13} /> Execute Action
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
