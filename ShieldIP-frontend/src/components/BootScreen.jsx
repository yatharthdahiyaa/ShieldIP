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

/* ── Particle canvas: dots stream from edges toward centre ── */
function ParticleCanvas() {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width  = window.innerWidth;
    const H = canvas.height = window.innerHeight;
    const cx = W / 2, cy = H / 2;
    const COLORS = ['#06b6d4', '#16ff9e', '#ffffff', '#a78bfa'];

    const particles = Array.from({ length: 140 }, () => {
      const angle = Math.random() * Math.PI * 2;
      const r = 140 + Math.random() * Math.max(W, H) * 0.55;
      return {
        sx: cx + Math.cos(angle) * r,
        sy: cy + Math.sin(angle) * r,
        tx: cx + (Math.random() - 0.5) * 110,
        ty: cy + (Math.random() - 0.5) * 110,
        t: Math.random(),
        speed: 0.0035 + Math.random() * 0.005,
        size: 0.6 + Math.random() * 1.4,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
      };
    });

    let raf;
    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      particles.forEach((p) => {
        p.t = p.t >= 1 ? 0 : p.t + p.speed;
        const ease = p.t < 0.5 ? 2 * p.t * p.t : -1 + (4 - 2 * p.t) * p.t;
        const x = p.sx + (p.tx - p.sx) * ease;
        const y = p.sy + (p.ty - p.sy) * ease;
        const alpha = p.t < 0.2 ? p.t / 0.2 : p.t > 0.75 ? (1 - p.t) / 0.25 : 1;

        /* trail */
        const tp = Math.max(0, p.t - 0.07);
        const te = tp < 0.5 ? 2 * tp * tp : -1 + (4 - 2 * tp) * tp;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(p.sx + (p.tx - p.sx) * te, p.sy + (p.ty - p.sy) * te);
        ctx.strokeStyle = p.color;
        ctx.globalAlpha = alpha * 0.18;
        ctx.lineWidth = p.size * 0.7;
        ctx.stroke();

        /* dot */
        ctx.beginPath();
        ctx.arc(x, y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = alpha * 0.55;
        ctx.fill();
      });
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, []);

  return <canvas ref={ref} className="absolute inset-0 w-full h-full" />;
}

/* ── One 3-D orbit ring ── */
function OrbitRing({ size, color, duration, tiltX, tiltY = 0, dotSize = 7 }) {
  const half = size / 2;
  return (
    <div style={{
      position: 'absolute',
      width: size, height: size,
      top: '50%', left: '50%',
      marginLeft: -half, marginTop: -half,
      transform: `rotateX(${tiltX}deg) rotateY(${tiltY}deg)`,
      transformStyle: 'preserve-3d',
    }}>
      {/* static ring border */}
      <div style={{
        position: 'absolute', inset: 0,
        borderRadius: '50%',
        border: `1px solid ${color}`,
        opacity: 0.35,
      }} />
      {/* animated dot */}
      <motion.div
        style={{ position: 'absolute', inset: 0, borderRadius: '50%' }}
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration, ease: 'linear' }}
      >
        <div style={{
          position: 'absolute',
          top: -(dotSize / 2),
          left: '50%', marginLeft: -(dotSize / 2),
          width: dotSize, height: dotSize,
          borderRadius: '50%',
          background: color,
          boxShadow: `0 0 10px 2px ${color}`,
        }} />
      </motion.div>
    </div>
  );
}

/* ── Corner bracket decoration ── */
function Corner({ pos }) {
  const t = pos.includes('t'), l = pos.includes('l');
  return (
    <div className={`absolute ${t ? 'top-5' : 'bottom-5'} ${l ? 'left-5' : 'right-5'}`}
      style={{
        width: 18, height: 18,
        borderTop:    t ? '1.5px solid rgba(6,182,212,0.35)' : 'none',
        borderBottom: t ? 'none' : '1.5px solid rgba(6,182,212,0.35)',
        borderLeft:   l ? '1.5px solid rgba(6,182,212,0.35)' : 'none',
        borderRight:  l ? 'none' : '1.5px solid rgba(6,182,212,0.35)',
      }}
    />
  );
}

/* ══════════════════════════════════════════════════════ */
export default function BootScreen({ onComplete }) {
  const setBootComplete = useAppStore((s) => s.setBootComplete);
  const [phase,          setPhase]          = useState(1);
  const [visibleLetters, setVisibleLetters] = useState(0);
  const [showSubtitle,   setShowSubtitle]   = useState(false);
  const [completedLines, setCompletedLines] = useState([]);
  const [activeLine,     setActiveLine]     = useState(-1);
  const [progress,       setProgress]       = useState(0);
  const [fading,         setFading]         = useState(false);
  const [glitch,         setGlitch]         = useState(false);
  const mounted = useRef(true);

  /* single master timeline — no cleanup-vulnerable setTimeout chains */
  useEffect(() => {
    mounted.current = true;
    const s = (fn, ms) => setTimeout(() => { if (mounted.current) fn(); }, ms);

    /* phase 1 → 2 at 400ms */
    s(() => setPhase(2), 400);

    /* phase 2: type letters starting at 500ms */
    const letterStart = 500;
    const letterGap = 75;
    TITLE.split('').forEach((_, i) => {
      s(() => setVisibleLetters(i + 1), letterStart + i * letterGap);
    });
    const lastLetter = letterStart + (TITLE.length - 1) * letterGap;
    s(() => setGlitch(true),  lastLetter + 10);
    s(() => setGlitch(false), lastLetter + 290);
    s(() => setShowSubtitle(true), lastLetter + 300);
    s(() => setPhase(3), lastLetter + 1200);

    /* phase 3: boot log starting after title */
    const logStart = lastLetter + 1200;
    BOOT_LINES.forEach((line, idx) => {
      s(() => { setActiveLine(idx); setProgress(((idx + 0.5) / BOOT_LINES.length) * 100); }, logStart + line.delay);
      s(() => { setCompletedLines((p) => [...p, idx]); setProgress(((idx + 1) / BOOT_LINES.length) * 100); }, logStart + line.delay + 340);
    });
    const logEnd = logStart + BOOT_LINES[BOOT_LINES.length - 1].delay + 580;
    s(() => setPhase(4), logEnd);

    /* phase 4: fade and complete */
    s(() => setFading(true), logEnd);
    s(() => { setBootComplete(true); onComplete(); }, logEnd + 700);

    return () => { mounted.current = false; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden"
      style={{ background: '#000', opacity: fading ? 0 : 1, transition: 'opacity 0.7s' }}
    >
      {/* always-visible loading text for debug */}
      <p style={{ color: '#fff', fontSize: 24, fontWeight: 'bold', position: 'absolute', top: 32, left: 32, zIndex: 9999 }}>BOOT phase={phase}</p>

      {/* ── particle field ── */}
      <ParticleCanvas />

      {/* ── radial glow ── */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 55% 45% at 50% 42%, rgba(6,182,212,0.07) 0%, transparent 70%)' }} />

      {/* ── grid ── */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.025]"
        style={{ backgroundImage: 'linear-gradient(rgba(6,182,212,1) 1px,transparent 1px),linear-gradient(90deg,rgba(6,182,212,1) 1px,transparent 1px)', backgroundSize: '44px 44px' }} />

      {/* ── 3-D shield + orbiting rings ── */}
      {phase >= 2 && (
        <motion.div
          className="relative mb-10 flex-shrink-0"
          style={{ width: 250, height: 250, perspective: 700, perspectiveOrigin: '50% 50%' }}
          initial={{ opacity: 0, scale: 0.4, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
        >
          {/* rings share one preserve-3d container */}
          <div style={{ position: 'absolute', inset: 0, transformStyle: 'preserve-3d' }}>
            <OrbitRing size={210} color="#06b6d4" duration={4.8} tiltX={72}            />
            <OrbitRing size={175} color="#16ff9e" duration={7.2} tiltX={54} tiltY={65} dotSize={6} />
            <OrbitRing size={230} color="#a78bfa" duration={10}  tiltX={62} tiltY={130} dotSize={5} />
          </div>

          {/* shield centred on top of rings */}
          <div className="absolute inset-0 flex items-center justify-center">
            {/* ambient pulse */}
            <motion.div className="absolute" style={{ width: 72, height: 72, borderRadius: '50%', background: 'radial-gradient(circle,rgba(6,182,212,0.45)0%,transparent 70%)' }}
              animate={{ scale: [1, 1.7, 1], opacity: [0.55, 0.15, 0.55] }}
              transition={{ repeat: Infinity, duration: 2.6, ease: 'easeInOut' }}
            />

            {/* shield SVG with gentle 3-D rock */}
            <motion.div
              animate={{ rotateY: [0, 9, -9, 0], rotateX: [0, 3, -3, 0] }}
              transition={{ repeat: Infinity, duration: 7, ease: 'easeInOut' }}
              style={{ perspective: 500, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <svg width="96" height="108" viewBox="0 0 80 92">
                <defs>
                  <linearGradient id="bg1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#06b6d4" />
                    <stop offset="100%" stopColor="#0891b2" stopOpacity={0.5} />
                  </linearGradient>
                  <linearGradient id="bg2" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#16ff9e" stopOpacity={0.9} />
                    <stop offset="100%" stopColor="#06b6d4" stopOpacity={0.3} />
                  </linearGradient>
                  <filter id="gOut" x="-40%" y="-40%" width="180%" height="180%">
                    <feGaussianBlur stdDeviation="5" result="b"/>
                    <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
                  </filter>
                  <filter id="gIn" x="-30%" y="-30%" width="160%" height="160%">
                    <feGaussianBlur stdDeviation="2.5" result="b"/>
                    <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
                  </filter>
                  <clipPath id="shieldClip">
                    <path d="M40 4 L74 19 L74 44 C74 63 58 77 40 85 C22 77 6 63 6 44 L6 19 Z"/>
                  </clipPath>
                </defs>

                {/* outer glow shell */}
                <path d="M40 4 L74 19 L74 44 C74 63 58 77 40 85 C22 77 6 63 6 44 L6 19 Z"
                  fill="url(#bg1)" fillOpacity="0.09" stroke="#06b6d4" strokeWidth="1.5" filter="url(#gOut)" />
                {/* main body */}
                <path d="M40 4 L74 19 L74 44 C74 63 58 77 40 85 C22 77 6 63 6 44 L6 19 Z"
                  fill="url(#bg1)" fillOpacity="0.18" stroke="#06b6d4" strokeWidth="1.5" filter="url(#gIn)" />
                {/* inner shield */}
                <path d="M40 20 L60 29 L60 44 C60 55 51 63 40 68 C29 63 20 55 20 44 L20 29 Z"
                  fill="url(#bg2)" fillOpacity="0.22" stroke="#16ff9e" strokeWidth="1" strokeOpacity={0.5} />
                {/* core */}
                <path d="M40 33 L50 38 L50 45 C50 51 45 55 40 57 C35 55 30 51 30 45 L30 38 Z"
                  fill="#06b6d4" fillOpacity="0.55" />
                {/* holographic scanline */}
                <motion.rect x="6" width="68" height="2.5" fill="url(#bg2)" fillOpacity={0.5}
                  clipPath="url(#shieldClip)"
                  animate={{ y: [19, 85, 19] }}
                  transition={{ repeat: Infinity, duration: 2.2, ease: 'easeInOut' }}
                />
                {/* highlight edge */}
                <path d="M40 4 L74 19 L74 44 C74 63 58 77 40 85"
                  fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="1.5" />
              </svg>
            </motion.div>
          </div>
        </motion.div>
      )}

      {/* ── glitch title + subtitle ── */}
      {phase >= 2 && (
        <div className="flex flex-col items-center gap-3 mb-10 relative z-10">
          <motion.div
            className="flex gap-[3px] font-display font-extrabold tracking-[0.25em]"
            animate={glitch ? { x: [0, -3, 3, -1, 2, 0], skewX: [0, -4, 4, 0] } : { x: 0 }}
            transition={{ duration: 0.25 }}
          >
            {TITLE.split('').map((char, i) => (
              <motion.span key={i}
                initial={{ opacity: 0, y: -18, filter: 'blur(8px)' }}
                animate={{
                  opacity: i < visibleLetters ? 1 : 0,
                  y:       i < visibleLetters ? 0 : -18,
                  filter:  i < visibleLetters ? 'blur(0px)' : 'blur(8px)',
                }}
                transition={{ duration: 0.22 }}
                style={{
                  fontSize: 30,
                  color: '#ffffff',
                  textShadow: i < visibleLetters ? '0 0 22px rgba(6,182,212,0.7), 0 0 6px rgba(6,182,212,0.4)' : 'none',
                }}
              >
                {char}
              </motion.span>
            ))}
          </motion.div>

          <AnimatePresence>
            {showSubtitle && (
              <motion.p
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 0.42, y: 0 }}
                transition={{ duration: 0.55 }}
                className="text-[10px] tracking-[0.35em] text-white uppercase font-mono"
              >
                AI Content Protection Platform
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* ── boot log terminal ── */}
      {phase >= 3 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="relative z-10 w-full max-w-[360px] px-6 space-y-1.5 font-mono text-[11px]"
        >
          {BOOT_LINES.map((line, idx) => (
            <motion.div key={idx}
              initial={{ opacity: 0, x: -14 }}
              animate={{ opacity: activeLine >= idx ? 1 : 0, x: activeLine >= idx ? 0 : -14 }}
              transition={{ duration: 0.22 }}
              className="flex items-center justify-between"
            >
              <span className="text-white/45">&gt; {line.text}</span>
              {completedLines.includes(idx) && (
                <motion.span
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-[#16ff9e] font-bold ml-4 whitespace-nowrap"
                  style={{ textShadow: '0 0 8px rgba(22,255,158,0.55)' }}
                >
                  [OK]
                </motion.span>
              )}
            </motion.div>
          ))}

          <div className="mt-4 h-[2px] rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <motion.div
              className="h-full rounded-full"
              style={{ background: 'linear-gradient(90deg, #06b6d4, #16ff9e)' }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.28, ease: 'easeOut' }}
            />
          </div>

          <p className="text-[9px] text-white/20 mt-2 font-mono tracking-widest text-right">
            v2.0 — BUILD {new Date().getFullYear()}
          </p>
        </motion.div>
      )}

      {/* ── corner brackets ── */}
      {['tl','tr','bl','br'].map((p) => <Corner key={p} pos={p} />)}
    </div>
  );
}
