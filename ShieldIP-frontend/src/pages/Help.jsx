import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { HelpCircle, ChevronDown, ChevronUp, Github, Upload, Search, Zap, BarChart3, GitBranch, Bell, KeyRound, Shield } from 'lucide-react';
import { pageVariants } from '../utils/animations';

const SECTIONS = [
  {
    icon: Upload,
    color: '#16ff9e',
    title: 'Registering an Asset',
    content: `Go to Asset Registry → drag and drop an image or video file → click Upload. The system will fingerprint the asset using Cloud Vision / Video Intelligence and start monitoring it automatically. A fingerprint hash (pHash) is stored in Firestore and the monitor will match it against web content on every tick.`,
  },
  {
    icon: Search,
    color: '#f59e0b',
    title: 'How Violation Detection Works',
    content: `The monitor service runs on a Cloud Scheduler tick. For each registered asset it calls Cloud Vision WEB_DETECTION to find visually similar pages online. Match confidence is computed using a 4-signal fusion:\n• S1 (40 pts) — Vision WEB_DETECTION base score\n• S2 (25 pts) — web entity / label overlap with the fingerprint\n• S3 (20 pts) — dominant colour palette proximity\n• S4 (15 pts) — IP keyword label matching\nViolations above 45% confidence are written to Firestore and appear in the Violations page.`,
  },
  {
    icon: BarChart3,
    color: '#06b6d4',
    title: 'Risk Scoring',
    content: `Each violation is automatically scored 0–100 across four dimensions:\n• Severity (0–40) — based on match confidence band\n• Reach (0–30) — platform audience size, +15 for unofficial accounts on high-reach platforms\n• Repeat Offender (0–20) — prior violations from the same domain\n• License Gap (0–10) — region-specific IP enforcement difficulty\n\nGemini 2.5 Flash generates a reasoning summary, recommended action (takedown / monetize / monitor / legal), and estimated revenue loss. If Gemini is unavailable a rule-based fallback is used.`,
  },
  {
    icon: Zap,
    color: '#ff2d55',
    title: 'Enforcement Actions',
    content: `On the Violations page, click Analyze then Enforce. Four actions are available:\n• Takedown — generates a DMCA notice stored in GCS and Firestore\n• Monetize — creates a revenue-share claim record\n• Legal — packages a full evidence bundle (chain of custody, screenshots, metadata)\n• Monitor — marks the violation as under observation with no immediate action\n\nEnforcement actions are queued via Cloud Tasks and processed asynchronously by the Enforcement Service.`,
  },
  {
    icon: GitBranch,
    color: '#a78bfa',
    title: 'Traceability Chains',
    content: `Every violation is linked to a propagation chain. The traceability engine assigns:\n• parent_id — the earliest violation with the same asset on the same platform\n• chain_id — shared across all re-shares of the same original leak\n• depth — how many hops from the origin\n• spread_velocity — violations per hour across the chain\n\nView full chains on the Traceability page. Clicking a chain node shows a timeline and geographic spread map.`,
  },
  {
    icon: Bell,
    color: '#f59e0b',
    title: 'Alerts & Notifications',
    content: `Real-time alerts are written to Firestore /alerts by the Risk Scoring service whenever:\n• A critical or high threat violation is detected (threat alert)\n• More than 5 violations for one asset occur within 30 minutes (velocity alert)\n\nAlerts appear in the Notifications page with mark-as-read support. The sidebar badge shows unread count, refreshed every 15 seconds.`,
  },
  {
    icon: KeyRound,
    color: '#a78bfa',
    title: 'API Keys',
    content: `Create API keys on the API Keys page. Each key has a name, prefix (visible), and scopes (read / write / admin). The raw key value is shown only once at creation — copy it immediately.\n\nUse your key in the Authorization header:\n  Authorization: Bearer sip_xxxxxxxx…\n\nRevoke unused keys at any time. Revoked keys are soft-deleted and retained in the audit log.`,
  },
  {
    icon: Shield,
    color: '#06b6d4',
    title: 'Brand Misuse Detection',
    content: `When an asset is registered, the fingerprint service runs Cloud Vision LOGO_DETECTION. Identified brand logos are stored as protected_brands on the fingerprint document.\n\nDuring monitoring, every candidate URL is checked against this brand list. If a brand name appears in the URL (e.g. a fake account impersonating the brand), the violation is flagged as brand_misuse: true and surfaced prominently in the Violations page.`,
  },
];

function Section({ icon: Icon, color, title, content }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
      <button onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-3 px-5 py-4 text-left transition-colors hover:bg-white/[0.02]"
        style={{ background: 'rgba(255,255,255,0.02)' }}>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${color}12` }}>
          <Icon size={14} style={{ color }} />
        </div>
        <span className="flex-1 text-[13px] font-semibold text-white">{title}</span>
        {open ? <ChevronUp size={14} className="text-[#444]" /> : <ChevronDown size={14} className="text-[#444]" />}
      </button>
      {open && (
        <div className="px-5 pb-5 pt-2" style={{ background: 'rgba(0,0,0,0.2)' }}>
          {content.split('\n').map((line, i) => (
            <p key={i} className={`text-[12px] leading-relaxed ${line.startsWith('•') ? 'text-[#777] pl-2 mt-1' : 'text-[#888] mt-2'}`}>{line}</p>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Help() {
  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit" className="p-8 space-y-6 max-w-3xl">
      <div>
        <h1 className="font-display font-extrabold text-[26px] text-white tracking-tight flex items-center gap-3">
          <HelpCircle size={22} className="text-cyan" /> Help &amp; Docs
        </h1>
        <p className="text-[13px] mt-1 text-[#555]">How ShieldIP works — click any section to expand</p>
      </div>

      <div className="space-y-2">
        {SECTIONS.map((s) => <Section key={s.title} {...s} />)}
      </div>

      <div className="rounded-xl p-5 flex items-start gap-4"
        style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
        <Github size={18} className="text-[#555] mt-0.5 shrink-0" />
        <div>
          <p className="text-[13px] font-semibold text-white">Source Code</p>
          <a href="https://github.com/yatharthdahiyaa/ShieldIP" target="_blank" rel="noopener noreferrer"
            className="text-[12px] text-cyan hover:underline">
            github.com/yatharthdahiyaa/ShieldIP →
          </a>
          <p className="text-[11px] text-[#444] mt-1">Backend: Python / FastAPI / GCP Cloud Run · Frontend: React / TailwindCSS / Vite</p>
        </div>
      </div>
    </motion.div>
  );
}
