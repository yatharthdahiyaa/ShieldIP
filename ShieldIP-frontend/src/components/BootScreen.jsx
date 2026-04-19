import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useAppStore from '../store/useAppStore';

const BOOT_LINES = [
  { text: 'Initialising content fingerprint engine...', delay: 0 },
  { text: 'Connecting to monitoring network...', delay: 400 },
  { text: 'Loading AI risk scoring models...', delay: 800 },
  { text: 'Establishing enforcement pipeline...', delay: 1200 },
  { text: 'Syncing analytics dashboard...', delay: 1600 },
];

const TITLE = 'SHIELDIP';

export default function BootScreen({ onComplete }) {
  const setBootComplete = useAppStore((s) => s.setBootComplete);
  const [phase, setPhase] = useState(1);
  const [visibleLetters, setVisibleLetters] = useState(0);
  const [showSubtitle, setShowSubtitle] = useState(false);
  const [completedLines, setCompletedLines] = useState([]);
  const [activeLine, setActiveLine] = useState(-1);
  const [progress, setProgress] = useState(0);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(2), 500);
    return () => clearTimeout(t1);
  }, []);

  useEffect(() => {
    if (phase !== 2) return;
    let i = 0;
    const iv = setInterval(() => {
      i++;
      setVisibleLetters(i);
      if (i >= TITLE.length) {
        clearInterval(iv);
        setTimeout(() => setShowSubtitle(true), 300);
        setTimeout(() => setPhase(3), 1500);
      }
    }, 80);
    return () => clearInterval(iv);
  }, [phase]);

  useEffect(() => {
    if (phase !== 3) return;
    BOOT_LINES.forEach((line, idx) => {
      setTimeout(() => {
        setActiveLine(idx);
        setProgress(((idx + 0.5) / BOOT_LINES.length) * 100);
      }, line.delay);
      setTimeout(() => {
        setCompletedLines((p) => [...p, idx]);
        setProgress(((idx + 1) / BOOT_LINES.length) * 100);
      }, line.delay + 350);
    });
    const total = BOOT_LINES[BOOT_LINES.length - 1].delay + 600;
    setTimeout(() => setPhase(4), total);
    return () => {};
  }, [phase]);

  useEffect(() => {
    if (phase !== 4) return;
    setFading(true);
    const t = setTimeout(() => {
      setBootComplete(true);
      onComplete();
    }, 500);
    return () => clearTimeout(t);
  }, [phase, onComplete, setBootComplete]);

  return (
    <motion.div
      className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center"
      animate={{ opacity: fading ? 0 : 1 }}
      transition={{ duration: 0.5 }}
    >
      {phase >= 2 && (
        <div className="flex flex-col items-center gap-6 mb-12">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.5, ease: 'easeOut' }}
            className="relative"
          >
            <svg width="80" height="80" viewBox="0 0 80 80" className="boot-shield-glow">
              <defs>
                <linearGradient id="shieldGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#06b6d4" />
                  <stop offset="100%" stopColor="#0891b2" />
                </linearGradient>
              </defs>
              <path d="M40 8 L68 22 L68 42 C68 58 54 70 40 76 C26 70 12 58 12 42 L12 22 Z"
                    fill="url(#shieldGrad)" fillOpacity="0.15" stroke="#06b6d4" strokeWidth="2" />
              <path d="M40 24 L52 30 L52 40 C52 48 46 54 40 57 C34 54 28 48 28 40 L28 30 Z"
                    fill="#06b6d4" fillOpacity="0.3" stroke="#06b6d4" strokeWidth="1.5" />
            </svg>
          </motion.div>

          <div className="flex gap-1 font-display font-extrabold text-3xl tracking-widest">
            {TITLE.split('').map((char, i) => (
              <motion.span
                key={i}
                initial={{ opacity: 0 }}
                animate={{ opacity: i < visibleLetters ? 1 : 0 }}
                transition={{ duration: 0.15 }}
                className="text-white"
              >
                {char}
              </motion.span>
            ))}
          </div>

          <AnimatePresence>
            {showSubtitle && (
              <motion.p
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 0.5, y: 0 }}
                transition={{ duration: 0.5 }}
                className="text-sm tracking-widest text-white/50 uppercase"
              >
                AI Content Protection Platform
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      )}

      {phase >= 3 && (
        <div className="w-full max-w-md px-8 space-y-2 font-mono text-xs">
          {BOOT_LINES.map((line, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: activeLine >= idx ? 1 : 0, x: activeLine >= idx ? 0 : -10 }}
              transition={{ duration: 0.3 }}
              className="flex items-center justify-between"
            >
              <span className="text-white/60">&gt; {line.text}</span>
              {completedLines.includes(idx) && (
                <motion.span
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-[#16ff9e] font-bold ml-4 whitespace-nowrap"
                  style={{ textShadow: '0 0 8px rgba(22,255,158,0.6)' }}
                >
                  [OK]
                </motion.span>
              )}
            </motion.div>
          ))}

          <div className="mt-4 h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
            <motion.div
              className="h-full rounded-full"
              style={{ background: 'linear-gradient(90deg, #06b6d4, #16ff9e)' }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            />
          </div>
        </div>
      )}
    </motion.div>
  );
}
