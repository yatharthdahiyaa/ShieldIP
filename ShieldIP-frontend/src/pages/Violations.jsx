import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Filter, Globe, Youtube, Video, Instagram, Twitter as XIcon, Twitch as TwitchIcon, ChevronDown, X, Brain, AlertCircle, TrendingDown, Crosshair, Zap, Cpu, GitBranch, ShieldAlert, Copy, Palette } from 'lucide-react';
import { Link } from 'react-router-dom';
import { pageVariants, staggerItem, slideRight } from '../utils/animations';
import useViolationsQuery from '../hooks/useViolations';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { checkRateLimit, recordRequest, getRateLimitStats } from '../utils/rateLimiter';

const VARIANT_ICONS = { direct_reupload: Copy, clipped_highlight: Video, meme_edit: Palette, mirrored: Copy, cropped: Copy, colour_graded: Palette, unknown: AlertCircle };
const VARIANT_COLORS = { direct_reupload: '#ff2d55', clipped_highlight: '#f59e0b', meme_edit: '#a855f7', mirrored: '#06b6d4', cropped: '#10b981', colour_graded: '#6366f1', unknown: '#555' };

const PLATFORM_ICONS = { YouTube: Youtube, TikTok: Video, Instagram: Instagram, X: XIcon, Twitch: TwitchIcon };

function ThreatBadge({ score }) {
  if (score > 80) return <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-primary/10 text-primary">Critical</span>;
  if (score > 55) return <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-orange-500/10 text-orange-400">High</span>;
  return <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-white/5 text-[#888]">Moderate</span>;
}

function timeAgo(ts) {
  if (!ts) return '—';
  const ms = Date.now() - new Date(ts).getTime();
  if (isNaN(ms)) return '—';
  if (ms < 0) return 'just now'; // future timestamp guard
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}

export default function Violations() {
  const { data: violations, isLoading } = useViolationsQuery();
  const vios = violations || [];
  const [search, setSearch] = useState('');
  const [filterLevel, setFilterLevel] = useState('all');
  const [filterVariant, setFilterVariant] = useState('all');
  const [filterAccount, setFilterAccount] = useState('all');
  const [filterBrandMisuse, setFilterBrandMisuse] = useState('all');
  const [selected, setSelected] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);

  const filtered = useMemo(() => {
    let out = vios;
    if (search) out = out.filter((v) => v.platform?.toLowerCase().includes(search.toLowerCase()) || v.violation_id?.toLowerCase().includes(search.toLowerCase()));
    if (filterLevel !== 'all') out = out.filter((v) => v.threat_level === filterLevel);
    if (filterVariant !== 'all') out = out.filter((v) => v.variant_type === filterVariant);
    if (filterAccount !== 'all') out = out.filter((v) => v.account_type === filterAccount);
    if (filterBrandMisuse !== 'all') out = out.filter((v) => filterBrandMisuse === 'yes' ? v.brand_misuse : !v.brand_misuse);
    return out;
  }, [vios, search, filterLevel, filterVariant, filterAccount, filterBrandMisuse]);

  const ruleBasedAnalysis = useCallback((vio) => {
    const conf = Number(vio.match_confidence > 1 ? vio.match_confidence : (vio.match_confidence || 0.85) * 100);
    const level = conf >= 95 ? 'critical' : conf >= 78 ? 'high' : conf >= 55 ? 'medium' : 'low';
    const platform = vio.platform || 'Unknown Platform';
    const region = vio.region || 'global';
    const variant = vio.variant_type || 'direct_reupload';
    const highRiskPlatforms = ['TikTok', 'YouTube', 'Instagram', 'Facebook'];
    const isHighRisk = highRiskPlatforms.includes(platform);
    const actionMap = {
      critical: 'Immediate DMCA Takedown',
      high: 'DMCA Takedown',
      medium: isHighRisk ? 'DMCA Takedown' : 'Content Monetization Claim',
      low: 'Monitor & Flag',
    };
    const lossMap = {
      critical: '$15,000 – $50,000',
      high: '$5,000 – $15,000',
      medium: '$1,000 – $5,000',
      low: '$200 – $1,000',
    };
    const variantLabel = { direct_reupload: 'direct re-upload', clipped_highlight: 'clipped highlight', meme_edit: 'meme-format edit', mirrored: 'mirrored copy', direct: 'direct copy' }[variant] || variant;
    const reasoning = conf >= 78
      ? `${conf.toFixed(0)}% fingerprint match confirms this ${variantLabel} on ${platform} (${region}) as unauthorized redistribution of registered IP. Platform reach and engagement velocity indicate active monetisation by the infringing account — immediate enforcement action is warranted to prevent further revenue loss.`
      : `${conf.toFixed(0)}% partial fingerprint match detected on ${platform} (${region}). The ${variantLabel} pattern suggests derivative re-use rather than direct piracy. Recommend monitoring engagement growth before escalating to formal takedown.`;
    return { threat_level: level, recommended_action: actionMap[level], reasoning, estimated_revenue_loss: lossMap[level], _rule_based: true };
  }, []);

  const analyzeViolation = useCallback(async (vio) => {
    setSelected(vio);
    setAnalysis(null);
    setAnalyzing(true);
    try {
      const key = import.meta.env.VITE_GEMINI_API_KEY;
      const rl = checkRateLimit();
      if (!key || !rl.allowed) {
        const stats = getRateLimitStats();
        const result = ruleBasedAnalysis(vio);
        if (!rl.allowed) result.reasoning = `[Rate limit] ${rl.reason} — ${result.reasoning}`;
        setAnalysis({ ...result, _stats: stats });
        return;
      }
      recordRequest();
      const genAI = new GoogleGenerativeAI(key);
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
      const prompt = `Analyze this IP violation and respond ONLY with valid JSON (no markdown, no code blocks):\n${JSON.stringify(vio)}\n\nJSON format: {"threat_level":"critical|high|medium|low","recommended_action":"string","reasoning":"string","estimated_revenue_loss":"string"}`;
      const result = await model.generateContent(prompt);
      const text = result.response.text().replace(/```json\n?/g, '').replace(/```/g, '').trim();
      setAnalysis(JSON.parse(text));
    } catch (err) {
      console.error('[Gemini] Analysis failed:', err);
      setAnalysis(ruleBasedAnalysis(vio));
    } finally { setAnalyzing(false); }
  }, [ruleBasedAnalysis]);

  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit" className="flex h-full">
      <div className="flex-1 overflow-y-auto p-8">
        <div className="flex items-end justify-between mb-6">
          <div>
            <h1 className="font-display font-extrabold text-[26px] text-white tracking-tight">Violations</h1>
            <p className="text-[13px] mt-1 text-[#555]">{filtered.length} active threats across all platforms</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#444]" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search..." className="void-input pl-9 pr-4 py-2 text-[12px] w-52" />
            </div>
            <select value={filterLevel} onChange={(e) => setFilterLevel(e.target.value)} className="void-input text-[12px] px-3 py-2">
              <option value="all">All levels</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
            </select>
            <select value={filterVariant} onChange={(e) => setFilterVariant(e.target.value)} className="void-input text-[12px] px-3 py-2">
              <option value="all">All variants</option>
              <option value="direct_reupload">Direct</option>
              <option value="clipped_highlight">Clipped</option>
              <option value="meme_edit">Meme</option>
              <option value="mirrored">Mirrored</option>
              <option value="cropped">Cropped</option>
              <option value="colour_graded">Colour-graded</option>
            </select>
            <select value={filterAccount} onChange={(e) => setFilterAccount(e.target.value)} className="void-input text-[12px] px-3 py-2">
              <option value="all">All accounts</option>
              <option value="official">Official</option>
              <option value="unofficial">Unofficial</option>
              <option value="rights_holder">Rights Holder</option>
            </select>
            <select value={filterBrandMisuse} onChange={(e) => setFilterBrandMisuse(e.target.value)} className="void-input text-[12px] px-3 py-2">
              <option value="all">Brand Misuse</option>
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
          </div>
        </div>

        <div className="space-y-2">
          {filtered.map((vio, i) => {
            const Icon = PLATFORM_ICONS[vio.platform] || Globe;
            const isSelected = selected?.violation_id === vio.violation_id;
            return (
              <motion.div key={vio.violation_id} variants={staggerItem}
                onClick={() => analyzeViolation(vio)}
                className={`flex items-center gap-4 p-4 rounded-xl cursor-pointer transition-all duration-200 ${isSelected ? 'ring-1 ring-cyan/30 bg-white/[0.04]' : 'hover:bg-white/[0.02]'}`}
                style={{ background: isSelected ? 'rgba(6,182,212,0.04)' : 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}
              >
                <div className="p-2 rounded-lg shrink-0" style={{ background: '#1a1a1a' }}>
                  <Icon size={16} className="text-[#888]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[13px] font-semibold text-white">{vio.platform}</span>
                    <span className="font-mono text-[10px] text-[#444]">{vio.violation_id}</span>
                  </div>
                  <p className="font-mono text-[10px] text-[#444] truncate">{vio.url}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {vio.variant_type && (
                    <span className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded" style={{ background: `${VARIANT_COLORS[vio.variant_type] || '#555'}15`, color: VARIANT_COLORS[vio.variant_type] || '#888' }}>
                      {vio.variant_type.replace(/_/g, ' ')}
                    </span>
                  )}
                  {vio.chain_position && (
                    <Link to={`/traceability`} onClick={(e) => e.stopPropagation()} className="flex items-center gap-1 text-[10px] text-cyan hover:underline">
                      <GitBranch size={10} /> #{vio.chain_position}
                    </Link>
                  )}
                  <div className="text-right">
                    <p className="font-mono text-[15px] font-bold text-white">{((vio.match_confidence || 0.9) * 100).toFixed(1)}%</p>
                    <p className="text-[10px] text-[#555]">match</p>
                  </div>
                  <ThreatBadge score={vio.risk_score} />
                  {vio.brand_misuse && <ShieldAlert size={14} className="text-primary" title="Brand Misuse" />}
                  <span className="font-mono text-[11px] text-[#444]">{timeAgo(vio.detected_at)}</span>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      <AnimatePresence>
        {selected && (
          <motion.aside variants={slideRight} initial="initial" animate="animate" exit="exit"
            className="w-[360px] shrink-0 h-full overflow-y-auto"
            style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(20px)', borderLeft: '1px solid rgba(255,255,255,0.06)' }}
          >
            <div className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Brain size={16} className="text-cyan" />
                  <h3 className="font-display font-bold text-[14px] text-white">AI Analysis</h3>
                </div>
                <button onClick={() => setSelected(null)} className="p-1.5 rounded text-[#555] hover:text-white transition-colors"><X size={14} /></button>
              </div>

              <div className="px-4 py-2 rounded-lg font-mono text-[11px]" style={{ background: '#0e0e0e', border: '1px solid rgba(255,255,255,0.04)' }}>
                <span className="text-[#555]">Target:</span>{' '}
                <span className="text-primary font-bold">{selected.violation_id}</span>{' '}
                <span className="text-[#333]">|</span>{' '}
                <span className="text-[#555]">{selected.platform}</span>
              </div>

              {analyzing ? (
                <div className="space-y-3 py-6">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 rounded-full border-2 animate-spin-slow" style={{ borderColor: 'rgba(6,182,212,0.2)', borderTopColor: '#06b6d4' }} />
                    <p className="text-[12px] font-mono animate-pulse text-cyan">Analyzing violation...</p>
                  </div>
                  {[...Array(3)].map((_, i) => <div key={i} className="void-skeleton h-12 w-full rounded-lg" />)}
                </div>
              ) : analysis ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: 'Threat Level', icon: AlertCircle, value: analysis.threat_level },
                      { label: 'Action', icon: Crosshair, value: analysis.recommended_action },
                    ].map(({ label, icon: Ic, value }) => {
                      const c = { critical: '#ff2d55', high: '#ff6438', medium: '#888', low: '#16ff9e' }[value] || '#fff';
                      return (
                        <div key={label} className="p-3 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                          <p className="void-label flex items-center gap-1 mb-1.5"><Ic size={9} /> {label}</p>
                          <p className="font-display font-bold text-[13px] capitalize" style={{ color: label.includes('Threat') ? c : '#fff' }}>{value}</p>
                        </div>
                      );
                    })}
                  </div>
                  <div className="p-4 rounded-lg" style={{ background: 'rgba(6,182,212,0.04)', border: '1px solid rgba(6,182,212,0.1)' }}>
                    <p className="void-label flex items-center gap-1.5 mb-2 text-cyan"><Brain size={9} /> Reasoning</p>
                    <p className="text-[12px] leading-relaxed text-[#888]">{analysis.reasoning}</p>
                  </div>

                  <button className="w-full flex items-center justify-center gap-2 py-3 rounded-lg font-bold text-[12px] uppercase tracking-widest text-white transition-all duration-300 hover:shadow-red-glow"
                    style={{ background: 'linear-gradient(135deg, #ff2d55, #93000a)' }}>
                    <Zap size={14} /> Execute Takedown
                  </button>
                </div>
              ) : null}
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
