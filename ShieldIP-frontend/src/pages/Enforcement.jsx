import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Scale, FileText, Gavel, DollarSign, X, Cpu, Clock, CheckCircle2, ChevronRight, Send, AlertTriangle, Shield, Zap } from 'lucide-react';
import { pageVariants, scaleIn } from '../utils/animations';
import useViolationsQuery from '../hooks/useViolations';
import useAppStore from '../store/useAppStore';

const ACTIONS = [
  { id: 'DMCA Takedown', icon: FileText, label: 'DMCA Takedown', sub: 'AI-drafted notice, auto-filed', color: '#ff2d55', usesAI: true },
  { id: 'Claim Monetize', icon: DollarSign, label: 'Claim & Monetize', sub: 'Route ad revenue to rights holder', color: '#16ff9e', usesAI: false },
  { id: 'Flag Legal', icon: Gavel, label: 'Escalate Legal', sub: 'Flag for manual lawsuit review', color: '#e2e2e2', usesAI: true },
];

export default function Enforcement() {
  const { data: violations } = useViolationsQuery();
  const vios = violations || [];
  const addToast = useAppStore((s) => s.addToast);

  const [selected, setSelected] = useState(null);
  const [modal, setModal] = useState(false);
  const [noticeText, setNoticeText] = useState('');
  const [generating, setGenerating] = useState(false);
  const [currentAction, setCurrentAction] = useState(null);
  const [enforcementLogs, setEnforcementLogs] = useState([]);

  const handleAction = useCallback(async (action, violation) => {
    if (!violation) return;
    setCurrentAction(action);
    setModal(true);
    setGenerating(true);
    setNoticeText('');
    try {
      const { GoogleGenerativeAI } = await import('@google/generative-ai');
      const key = import.meta.env.VITE_GEMINI_API_KEY || 'AIzaSyAqbT94d9afcgGf8h11ZBA7ToDIBxXaZY0';
      if (!key || !action.usesAI) {
        setNoticeText(action.usesAI
          ? `[GENERATED] DMCA Takedown Notice\n\nPlatform: ${violation.platform}\nViolation ID: ${violation.violation_id}\nConfidence: ${Math.round((violation.match_confidence || 0.9) * 100)}%\n\nUnder 17 U.S.C. 512(c), we request immediate removal of the infringing content identified above. The intellectual property is registered and verified via pHash fingerprinting.\n\nFailure to comply within 48 hours may result in further legal action.`
          : `[AUTOMATED] Initiating monetization claim against ${violation.platform}.\n\nViolation ID: ${violation.violation_id}\nRoyalty routing pipeline enabled.\nRevenue redirection to the registered rights holder within 24-48 hours.`);
        return;
      }
      const genAI = new GoogleGenerativeAI(key);
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      const prompt = `Draft a formal ${action.label} notice for this IP violation:\n${JSON.stringify(violation)}\n\nBe professional and legally thorough.`;
      const result = await model.generateContent(prompt);
      setNoticeText(result.response.text());
    } catch { setNoticeText('Draft generation failed. Using template notice.'); }
    finally { setGenerating(false); }
  }, []);

  const submit = () => {
    if (!selected || !currentAction) return;
    const log = { id: Date.now(), action: currentAction.id, targetId: selected.violation_id, platform: selected.platform, timestamp: Date.now() };
    setEnforcementLogs((prev) => [log, ...prev]);
    addToast({ type: 'success', title: 'Enforcement Executed', message: `${currentAction.label} filed for ${selected.violation_id}` });
    setModal(false);
  };

  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit" className="p-8 space-y-6">
      <div>
        <h1 className="font-display font-extrabold text-[26px] text-white tracking-tight flex items-center gap-3">
          <Scale size={22} className="text-primary" /> Enforcement Engine
        </h1>
        <p className="text-[13px] mt-1 text-[#555]">AI-assisted legal action pipeline</p>
      </div>

      <div className="rounded-xl p-6" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
        <p className="void-label mb-3">Select a violation to enforce</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-[200px] overflow-y-auto">
          {vios.slice(0, 8).map((v) => (
            <button key={v.violation_id} onClick={() => setSelected(v)}
              className={`flex items-center gap-3 p-3 rounded-lg text-left transition-all ${selected?.violation_id === v.violation_id ? 'ring-1 ring-cyan/30 bg-cyan/5' : 'hover:bg-white/[0.02]'}`}
              style={{ border: '1px solid rgba(255,255,255,0.04)' }}>
              <span className={`w-2 h-2 rounded-full ${v.risk_score > 80 ? 'bg-primary' : 'bg-orange-400'}`} />
              <span className="text-[12px] text-white font-medium">{v.platform}</span>
              <span className="font-mono text-[10px] text-[#555]">{v.violation_id}</span>
              <span className="ml-auto font-mono text-[11px] text-[#888]">{v.risk_score}%</span>
            </button>
          ))}
        </div>
      </div>

      {!selected ? (
        <div className="rounded-xl py-16 flex flex-col items-center gap-4 text-center"
             style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
          <AlertTriangle size={28} className="text-[#333]" />
          <p className="text-[13px] text-[#555]">Select a violation above to activate enforcement options.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {ACTIONS.map((action) => {
            const Icon = action.icon;
            return (
              <motion.button key={action.id} whileHover={{ y: -4 }} whileTap={{ scale: 0.98 }}
                onClick={() => handleAction(action, selected)}
                className="group rounded-xl p-6 flex flex-col items-center gap-4 text-center transition-all duration-300"
                style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${action.color}15` }}>
                <div className="w-14 h-14 rounded-xl flex items-center justify-center transition-transform duration-200 group-hover:scale-110"
                     style={{ background: `${action.color}10`, border: `1px solid ${action.color}20` }}>
                  <Icon size={26} style={{ color: action.color }} />
                </div>
                <div>
                  <p className="font-display font-bold text-[14px]" style={{ color: action.color }}>{action.label}</p>
                  <p className="text-[11px] mt-1 text-[#555]">{action.sub}</p>
                </div>
                {action.usesAI && <span className="void-badge text-[9px] px-2 py-0.5" style={{ background: 'rgba(22,255,158,0.08)', color: '#16ff9e', border: '1px solid rgba(22,255,158,0.1)' }}><Cpu size={8} className="inline mr-1" />AI-Generated</span>}
                <div className="flex items-center gap-1 text-[11px] font-semibold opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: action.color }}>
                  Initiate <ChevronRight size={12} />
                </div>
              </motion.button>
            );
          })}
        </div>
      )}

      {enforcementLogs.length > 0 && (
        <div className="rounded-xl p-5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-center gap-2 mb-4">
            <Clock size={13} className="text-[#555]" />
            <h3 className="font-display font-bold text-[14px] text-white">Enforcement Log</h3>
            <span className="ml-auto font-mono text-[11px] px-2 py-0.5 rounded bg-white/5 text-[#888]">{enforcementLogs.length}</span>
          </div>
          <div className="space-y-2">
            {enforcementLogs.map((log) => (
              <div key={log.id} className="flex items-center justify-between py-3 px-4 rounded-lg" style={{ background: '#111' }}>
                <div className="flex items-center gap-3">
                  <CheckCircle2 size={14} className="text-secondary" />
                  <div>
                    <p className="text-[13px] font-semibold text-white">{log.action}</p>
                    <p className="font-mono text-[10px] text-[#444]">{log.targetId} | {log.platform}</p>
                  </div>
                </div>
                <span className="font-mono text-[10px] text-[#444]">{new Date(log.timestamp).toLocaleTimeString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <AnimatePresence>
        {modal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
            onClick={() => setModal(false)}>
            <motion.div variants={scaleIn} initial="initial" animate="animate" exit="exit"
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-2xl rounded-xl p-7"
              style={{ background: '#131313', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <Cpu size={15} className="text-cyan" />
                  <div>
                    <h3 className="font-display font-bold text-white">{currentAction?.label}</h3>
                    <p className="void-label mt-0.5">AI-drafted notice</p>
                  </div>
                </div>
                <button onClick={() => setModal(false)} className="p-2 rounded text-[#555] hover:text-white transition-colors"><X size={16} /></button>
              </div>
              <div className="rounded-lg p-5 font-mono text-[12px] leading-relaxed relative min-h-[160px]"
                   style={{ background: '#0e0e0e', border: '1px solid rgba(255,255,255,0.06)' }}>
                {generating ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                    <div className="w-10 h-10 rounded-full border-2 animate-spin-slow" style={{ borderColor: 'rgba(6,182,212,0.2)', borderTopColor: '#06b6d4' }} />
                    <p className="font-mono text-[12px] animate-pulse text-cyan">Generating notice...</p>
                  </div>
                ) : <p className="whitespace-pre-wrap text-[#888]">{noticeText}</p>}
              </div>
              <div className="flex items-center justify-between mt-5">
                <p className="text-[11px] text-[#444]">Review before executing</p>
                <div className="flex gap-3">
                  <button onClick={() => setModal(false)} className="btn-void-ghost text-[12px]">Cancel</button>
                  <button disabled={generating} onClick={submit}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-lg font-bold text-[12px] uppercase tracking-widest text-white transition-all hover:shadow-red-glow disabled:opacity-50"
                    style={{ background: 'linear-gradient(135deg, #ff2d55, #93000a)' }}>
                    <Send size={13} /> Execute Action
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
