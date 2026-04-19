import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import useAppStore from '../store/useAppStore';
import { toastVariants } from '../utils/animations';

const ICONS = {
  success: { icon: CheckCircle2, color: '#16ff9e' },
  error:   { icon: XCircle,      color: '#ff2d55' },
  warning: { icon: AlertTriangle, color: '#f59e0b' },
  info:    { icon: Info,          color: '#06b6d4' },
};

export default function Toast() {
  const { toasts, removeToast } = useAppStore();

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      <AnimatePresence mode="popLayout">
        {toasts.map((t) => {
          const cfg = ICONS[t.type] || ICONS.info;
          const Icon = cfg.icon;
          return (
            <motion.div
              key={t.id}
              layout
              variants={toastVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-xl min-w-[300px] max-w-[400px] relative overflow-hidden"
              style={{ background: 'rgba(19,19,19,0.95)', border: `1px solid ${cfg.color}25`, backdropFilter: 'blur(16px)' }}
            >
              <Icon size={16} style={{ color: cfg.color }} className="shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                {t.title && <p className="text-[13px] font-semibold text-white truncate">{t.title}</p>}
                {t.message && <p className="text-[12px] text-[#888] mt-0.5 leading-relaxed">{t.message}</p>}
              </div>
              <button onClick={() => removeToast(t.id)} className="text-[#555] hover:text-white transition-colors shrink-0">
                <X size={14} />
              </button>
              <div className="absolute bottom-0 left-0 h-[2px] animate-drain" style={{ background: cfg.color, opacity: 0.5 }} />
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
