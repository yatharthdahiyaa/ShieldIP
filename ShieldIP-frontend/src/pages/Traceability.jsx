import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ReactFlow, Background, Controls, MiniMap, MarkerType } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useQuery } from '@tanstack/react-query';
import {
  GitBranch, List, Network, Clock, Eye, ExternalLink,
  Zap, ChevronDown, ChevronRight, Scissors, FlipHorizontal2,
  Laugh, Copy,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import { fetchChains, fetchChain, fetchChainTimeline } from '../services/api';
import { pageVariants } from '../utils/animations';

// ─── SEED DATA (works offline) ──────────────────────
const SEED_CHAINS = [
  { chain_id: 'ch-001', asset_id: 'asset-001', origin_platform: 'YouTube', origin_url: 'https://youtube.com/watch?v=abc', origin_detected_at: new Date(Date.now() - 7200000).toISOString(), total_nodes: 8, max_depth: 3, platforms_reached: ['YouTube','TikTok','Instagram','X','Twitch'], spread_velocity: 6.4, last_updated: new Date().toISOString() },
  { chain_id: 'ch-002', asset_id: 'asset-002', origin_platform: 'TikTok', origin_url: 'https://tiktok.com/@user/video/xyz', origin_detected_at: new Date(Date.now() - 3600000).toISOString(), total_nodes: 4, max_depth: 2, platforms_reached: ['TikTok','Instagram'], spread_velocity: 3.1, last_updated: new Date().toISOString() },
  { chain_id: 'ch-003', asset_id: 'asset-003', origin_platform: 'Instagram', origin_url: 'https://instagram.com/reel/def', origin_detected_at: new Date(Date.now() - 1800000).toISOString(), total_nodes: 2, max_depth: 1, platforms_reached: ['Instagram','Facebook'], spread_velocity: 1.8, last_updated: new Date().toISOString() },
];

function makeSeedTree(chainId) {
  const now = Date.now();
  return {
    chain: SEED_CHAINS.find(c => c.chain_id === chainId) || SEED_CHAINS[0],
    tree: [
      { violation_id: 'v-origin', depth: 0, platform: 'YouTube', url: 'https://youtube.com/watch?v=abc', account_handle: 'pirate_uploads', account_type: 'unofficial', variant_type: 'direct', detected_at: new Date(now - 7200000).toISOString(), time_from_origin_minutes: 0, match_confidence: 97, enforcement_status: 'takedown', is_origin: true, children_count: 3, children: [
        { violation_id: 'v-002', depth: 1, platform: 'TikTok', url: 'https://tiktok.com/@user/video/xyz', account_handle: 'clip_master', account_type: 'unofficial', variant_type: 'clipped', detected_at: new Date(now - 5400000).toISOString(), time_from_origin_minutes: 30, match_confidence: 91, enforcement_status: 'pending', is_origin: false, children_count: 1, children: [
          { violation_id: 'v-005', depth: 2, platform: 'Telegram', url: 'https://t.me/c/102', account_handle: 'leak_channel', account_type: 'unofficial', variant_type: 'direct', detected_at: new Date(now - 2400000).toISOString(), time_from_origin_minutes: 80, match_confidence: 88, enforcement_status: 'pending', is_origin: false, children_count: 0, children: [] },
        ]},
        { violation_id: 'v-003', depth: 1, platform: 'Instagram', url: 'https://instagram.com/reel/def', account_handle: 'meme_lord', account_type: 'unofficial', variant_type: 'meme', detected_at: new Date(now - 4800000).toISOString(), time_from_origin_minutes: 40, match_confidence: 82, enforcement_status: 'pending', is_origin: false, children_count: 1, children: [
          { violation_id: 'v-006', depth: 2, platform: 'Facebook', url: 'https://facebook.com/watch/789', account_handle: 'share_page', account_type: 'unofficial', variant_type: 'direct', detected_at: new Date(now - 1800000).toISOString(), time_from_origin_minutes: 90, match_confidence: 74, enforcement_status: 'pending', is_origin: false, children_count: 0, children: [] },
        ]},
        { violation_id: 'v-004', depth: 1, platform: 'X', url: 'https://x.com/user/status/456', account_handle: 'news_official', account_type: 'official', variant_type: 'mirrored', detected_at: new Date(now - 3600000).toISOString(), time_from_origin_minutes: 60, match_confidence: 78, enforcement_status: 'pending', is_origin: false, children_count: 1, children: [
          { violation_id: 'v-007', depth: 2, platform: 'Twitch', url: 'https://twitch.tv/videos/101', account_handle: 'stream_rips', account_type: 'unofficial', variant_type: 'clipped', detected_at: new Date(now - 1200000).toISOString(), time_from_origin_minutes: 100, match_confidence: 69, enforcement_status: 'pending', is_origin: false, children_count: 0, children: [] },
        ]},
      ]},
    ],
  };
}

function flattenTree(nodes, acc = []) {
  for (const n of nodes) {
    acc.push(n);
    if (n.children?.length) flattenTree(n.children, acc);
  }
  return acc;
}

const SEED_TIMELINE = flattenTree(makeSeedTree('ch-001').tree).sort((a, b) => a.time_from_origin_minutes - b.time_from_origin_minutes);

// ─── CONSTANTS ──────────────────────────────
const DEPTH_COLORS = ['#ff2d55', '#f59e0b', '#facc15', '#6b7280'];
const VARIANT_EMOJI = { direct: '📋', clipped: '✂️', meme: '😂', mirrored: '🪞' };
const PLATFORM_COLORS = {
  YouTube: '#ff0000', TikTok: '#69c9d0', Instagram: '#e1306c',
  X: '#1da1f2', Facebook: '#1877f2', Twitch: '#9146ff',
  Telegram: '#0088cc', Dailymotion: '#00d2f3',
};

function fmtTime(mins) {
  if (mins === 0) return 'T+0';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `T+${m}m`;
  return `T+${h}h ${m}m`;
}

function fmtDelta(mins) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `+${m}m`;
  return `+${h}h ${m}m`;
}

// ═══════════════════════════════════════════════
// TAB 1 — CHAIN LIST
// ═══════════════════════════════════════════════
function ChainListTab({ chains, onSelectChain }) {
  const [expanded, setExpanded] = useState(null);
  return (
    <div className="space-y-2">
      {chains.map((c) => (
        <div key={c.chain_id} className="rounded-xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-white/[0.02] transition-colors"
            onClick={() => setExpanded(expanded === c.chain_id ? null : c.chain_id)}>
            {expanded === c.chain_id ? <ChevronDown size={14} className="text-[#555]" /> : <ChevronRight size={14} className="text-[#555]" />}
            <span className="text-[13px] font-semibold text-white w-24" style={{ color: PLATFORM_COLORS[c.origin_platform] || '#fff' }}>{c.origin_platform}</span>
            <span className="text-[12px] text-[#888] w-32">{formatDistanceToNow(new Date(c.origin_detected_at), { addSuffix: true })}</span>
            <span className="font-mono text-[13px] text-white w-16 text-center">{c.max_depth}</span>
            <div className="flex gap-1 flex-1">
              {c.platforms_reached?.map((p) => (
                <span key={p} className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: `${PLATFORM_COLORS[p] || '#555'}20`, color: PLATFORM_COLORS[p] || '#888' }}>{p}</span>
              ))}
            </div>
            <span className="font-mono text-[13px] font-bold text-cyan w-20 text-right">{c.spread_velocity}/hr</span>
          </div>
          <AnimatePresence>
            {expanded === c.chain_id && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                <div className="px-5 pb-4 flex items-center gap-4 border-t border-white/5 pt-3">
                  <a href={c.origin_url} target="_blank" rel="noreferrer" className="text-[11px] text-cyan hover:underline flex items-center gap-1 truncate">
                    <ExternalLink size={10} /> {c.origin_url}
                  </a>
                  <button onClick={() => onSelectChain(c.chain_id)}
                    className="ml-auto text-[11px] font-bold uppercase tracking-wider px-4 py-2 rounded-lg text-white transition-all hover:shadow-cyan-glow"
                    style={{ background: 'linear-gradient(135deg, #06b6d4, #0891b2)' }}>
                    View Tree
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════
// TAB 2 — TREE VIEW (react-flow)
// ═══════════════════════════════════════════════
function buildFlowFromTree(tree, selectedId) {
  const nodes = [];
  const edges = [];
  let yCounter = 0;

  function walk(node, parentFlowId, xOffset) {
    const fid = node.violation_id;
    const isOrigin = node.is_origin;
    const isSelected = fid === selectedId;
    const depthColor = DEPTH_COLORS[Math.min(node.depth, DEPTH_COLORS.length - 1)];
    const w = isOrigin ? 220 : Math.max(180, 220 - node.depth * 20);
    const h = isOrigin ? 70 : 56;

    nodes.push({
      id: fid,
      position: { x: xOffset, y: yCounter * 120 },
      data: {
        label: (
          <div className="text-left">
            <div className="flex items-center gap-1.5 mb-0.5">
              {isOrigin && <span className="text-[8px] uppercase font-bold tracking-widest text-primary">Origin</span>}
              <span className="font-semibold text-[11px]" style={{ color: PLATFORM_COLORS[node.platform] || '#fff' }}>{node.platform}</span>
              <span className="text-[10px]">{VARIANT_EMOJI[node.variant_type] || ''}</span>
            </div>
            <div className="text-[10px] text-[#888]">@{node.account_handle}</div>
            <div className="text-[10px] font-mono text-[#555]">{fmtTime(node.time_from_origin_minutes)}</div>
          </div>
        ),
      },
      style: {
        background: isOrigin ? 'rgba(255,45,85,0.12)' : `rgba(255,255,255,0.03)`,
        border: isSelected ? `2px solid #06b6d4` : `2px solid ${depthColor}`,
        borderRadius: '12px',
        padding: '10px 14px',
        color: '#fff',
        width: w,
      },
    });

    if (parentFlowId) {
      const timeDelta = node.time_from_origin_minutes;
      edges.push({
        id: `e-${parentFlowId}-${fid}`,
        source: parentFlowId,
        target: fid,
        animated: true,
        style: { stroke: depthColor, strokeDasharray: '6 3' },
        label: fmtDelta(timeDelta),
        labelStyle: { fill: '#888', fontSize: 9 },
        markerEnd: { type: MarkerType.ArrowClosed, color: depthColor },
      });
    }

    yCounter++;
    if (node.children?.length) {
      node.children.forEach((child, ci) => {
        walk(child, fid, xOffset + 280);
      });
    }
  }

  if (tree?.length) tree.forEach((root) => walk(root, null, 40));
  return { nodes, edges };
}

function TreeViewTab({ chainId }) {
  const [selectedNode, setSelectedNode] = useState(null);

  const { data: chainData } = useQuery({
    queryKey: ['chain-tree', chainId],
    queryFn: () => fetchChain(chainId),
    enabled: !!chainId,
    refetchInterval: 15000,
    placeholderData: { data: makeSeedTree(chainId) },
    select: (r) => r?.data || makeSeedTree(chainId),
  });

  const tree = chainData?.tree || [];
  const flat = useMemo(() => flattenTree(tree), [tree]);
  const { nodes, edges } = useMemo(() => buildFlowFromTree(tree, selectedNode), [tree, selectedNode]);
  const selectedItem = flat.find((n) => n.violation_id === selectedNode);

  const onNodeClick = useCallback((_, node) => setSelectedNode(node.id), []);

  return (
    <div className="flex gap-4 flex-1 min-h-0">
      <div className="flex-1 rounded-xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
        <ReactFlow nodes={nodes} edges={edges} onNodeClick={onNodeClick} fitView proOptions={{ hideAttribution: true }}>
          <Background color="#222" gap={30} size={1} />
          <Controls style={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: 8 }} />
          <MiniMap style={{ background: '#0e0e0e' }} nodeColor={(n) => n.style?.borderColor || '#06b6d4'} />
        </ReactFlow>
      </div>

      {/* Side panel */}
      <div className="w-[300px] shrink-0 overflow-y-auto space-y-3">
        {selectedItem ? (
          <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <h3 className="font-display font-bold text-[13px] text-white mb-3 flex items-center gap-2">
              <Eye size={13} className="text-cyan" /> Node Detail
            </h3>
            <div className="space-y-2 text-[12px]">
              <a href={selectedItem.url} target="_blank" rel="noreferrer" className="text-cyan hover:underline text-[11px] flex items-center gap-1 truncate"><ExternalLink size={10} />{selectedItem.url}</a>
              <div className="flex justify-between"><span className="text-[#888]">Account</span><span className="text-white font-mono">@{selectedItem.account_handle}</span></div>
              <div className="flex justify-between"><span className="text-[#888]">Type</span><span className={selectedItem.account_type === 'official' ? 'text-secondary' : 'text-primary'}>{selectedItem.account_type}</span></div>
              <div className="flex justify-between"><span className="text-[#888]">Confidence</span><span className="text-white font-mono">{selectedItem.match_confidence}%</span></div>
              <div className="flex justify-between"><span className="text-[#888]">Variant</span><span className="text-white">{VARIANT_EMOJI[selectedItem.variant_type]} {selectedItem.variant_type}</span></div>
              <div className="flex justify-between"><span className="text-[#888]">Depth</span><span className="font-mono" style={{ color: DEPTH_COLORS[Math.min(selectedItem.depth, 3)] }}>{selectedItem.depth}</span></div>
              <div className="flex justify-between"><span className="text-[#888]">Time</span><span className="font-mono text-[#888]">{fmtTime(selectedItem.time_from_origin_minutes)}</span></div>
              <div className="flex justify-between"><span className="text-[#888]">Enforcement</span><span className={selectedItem.enforcement_status === 'takedown' ? 'text-secondary font-bold' : 'text-amber-400'}>{selectedItem.enforcement_status}</span></div>
            </div>
          </div>
        ) : (
          <div className="rounded-xl p-4 text-center" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
            <p className="text-[12px] text-[#555]">Click a node to inspect</p>
          </div>
        )}
        {/* Chain summary */}
        {chainData?.chain && (
          <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="space-y-2 text-[12px]">
              <div className="flex justify-between"><span className="text-[#888]">Total Nodes</span><span className="text-white font-mono">{chainData.chain.total_nodes}</span></div>
              <div className="flex justify-between"><span className="text-[#888]">Max Depth</span><span className="text-white font-mono">{chainData.chain.max_depth}</span></div>
              <div className="flex justify-between"><span className="text-[#888]">Velocity</span><span className="text-cyan font-mono">{chainData.chain.spread_velocity}/hr</span></div>
              <div className="flex justify-between flex-wrap gap-1"><span className="text-[#888]">Platforms</span>
                <div className="flex gap-1 flex-wrap">{chainData.chain.platforms_reached?.map(p => <span key={p} className="text-[9px] px-1 rounded" style={{ background: `${PLATFORM_COLORS[p]}20`, color: PLATFORM_COLORS[p] }}>{p}</span>)}</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════
// TAB 3 — TIMELINE VIEW
// ═══════════════════════════════════════════════
function TimelineTab({ chainId }) {
  const { data: timeline } = useQuery({
    queryKey: ['chain-timeline', chainId],
    queryFn: () => fetchChainTimeline(chainId),
    enabled: !!chainId,
    refetchInterval: 15000,
    placeholderData: { data: SEED_TIMELINE },
    select: (r) => (r?.data && Array.isArray(r.data) ? r.data : SEED_TIMELINE),
  });

  const items = timeline || SEED_TIMELINE;
  const platforms = useMemo(() => [...new Set(items.map(i => i.platform))], [items]);
  const maxMinutes = useMemo(() => Math.max(1, ...items.map(i => i.time_from_origin_minutes)), [items]);
  const [visibleCount, setVisibleCount] = useState(0);

  useEffect(() => {
    setVisibleCount(0);
    const timer = setInterval(() => {
      setVisibleCount((prev) => {
        if (prev >= items.length) { clearInterval(timer); return prev; }
        return prev + 1;
      });
    }, 200);
    return () => clearInterval(timer);
  }, [items.length]);

  const [hovered, setHovered] = useState(null);

  const origin = items[0];
  const lastItem = items[items.length - 1];
  const totalMinutes = lastItem?.time_from_origin_minutes || 0;
  const totalH = Math.floor(totalMinutes / 60);
  const totalM = totalMinutes % 60;

  return (
    <div className="space-y-4">
      <div className="rounded-xl p-5 overflow-x-auto" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="relative" style={{ minWidth: Math.max(600, maxMinutes * 4 + 120), height: platforms.length * 56 + 40 }}>
          {/* Y-axis labels */}
          {platforms.map((p, pi) => (
            <div key={p} className="absolute left-0 text-[11px] font-semibold" style={{ top: pi * 56 + 30, color: PLATFORM_COLORS[p] || '#888' }}>{p}</div>
          ))}

          {/* X-axis */}
          <div className="absolute left-[90px] right-0 top-0 h-[20px] flex items-end">
            {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
              const mins = Math.round(pct * maxMinutes);
              return <span key={pct} className="absolute text-[9px] text-[#555] font-mono" style={{ left: `${pct * 100}%`, transform: 'translateX(-50%)' }}>{fmtTime(mins)}</span>;
            })}
          </div>

          {/* Grid lines */}
          {platforms.map((_, pi) => (
            <div key={pi} className="absolute left-[90px] right-0 h-[1px]" style={{ top: pi * 56 + 40, background: 'rgba(255,255,255,0.04)' }} />
          ))}

          {/* Dots + connections */}
          {items.map((item, idx) => {
            if (idx >= visibleCount) return null;
            const pi = platforms.indexOf(item.platform);
            const xPct = maxMinutes > 0 ? (item.time_from_origin_minutes / maxMinutes) * 100 : 0;
            const x = 90 + (xPct / 100) * (Math.max(600, maxMinutes * 4 + 120) - 120);
            const y = pi * 56 + 40;
            const depthColor = DEPTH_COLORS[Math.min(item.depth || 0, 3)];
            const isHovered = hovered === item.violation_id;

            // Draw line to parent
            let line = null;
            if (item.parent_id && idx > 0) {
              const parentItem = items.find(i => i.violation_id === item.parent_id);
              if (parentItem) {
                const ppi = platforms.indexOf(parentItem.platform);
                const pxPct = maxMinutes > 0 ? (parentItem.time_from_origin_minutes / maxMinutes) * 100 : 0;
                const px = 90 + (pxPct / 100) * (Math.max(600, maxMinutes * 4 + 120) - 120);
                const py = ppi * 56 + 40;
                line = (
                  <svg key={`line-${item.violation_id}`} className="absolute top-0 left-0 w-full h-full pointer-events-none" style={{ overflow: 'visible' }}>
                    <path d={`M${px},${py} C${(px+x)/2},${py} ${(px+x)/2},${y} ${x},${y}`} fill="none" stroke={depthColor} strokeWidth={1.5} strokeOpacity={0.4} strokeDasharray="4 3" />
                  </svg>
                );
              }
            }

            return (
              <React.Fragment key={item.violation_id}>
                {line}
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.3, delay: idx * 0.05 }}
                  className="absolute cursor-pointer"
                  style={{ left: x - 7, top: y - 7 }}
                  onMouseEnter={() => setHovered(item.violation_id)}
                  onMouseLeave={() => setHovered(null)}
                >
                  <div className="w-[14px] h-[14px] rounded-full border-2 transition-transform"
                    style={{
                      background: item.is_origin ? '#ff2d55' : depthColor,
                      borderColor: isHovered ? '#fff' : depthColor,
                      transform: isHovered ? 'scale(1.6)' : 'scale(1)',
                      boxShadow: `0 0 8px ${depthColor}80`,
                    }}
                  />
                  {isHovered && (
                    <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-[200px] rounded-lg p-3 text-[10px] pointer-events-none"
                      style={{ background: '#1a1a1a', border: '1px solid #333' }}>
                      <div className="font-bold text-white mb-1" style={{ color: PLATFORM_COLORS[item.platform] }}>{item.platform}</div>
                      <div className="text-[#888]">@{item.account_handle} · {item.variant_type}</div>
                      <div className="text-[#888]">{fmtTime(item.time_from_origin_minutes)} · {item.match_confidence}%</div>
                      <div className="text-[#555] truncate">{item.url}</div>
                    </div>
                  )}
                </motion.div>
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Summary text */}
      <div className="text-[13px] text-[#888] px-1">
        Spread from <span className="font-semibold" style={{ color: PLATFORM_COLORS[origin?.platform] || '#fff' }}>{origin?.platform || '?'}</span>
        {' → reached '}
        <span className="text-white font-bold">{platforms.length} platforms</span>
        {' in '}
        <span className="text-cyan font-mono">{totalH > 0 ? `${totalH}h ` : ''}{totalM}m</span>
      </div>
    </div>
  );
}


// ═══════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════
const TABS = [
  { key: 'list', label: 'Chain List', icon: List },
  { key: 'tree', label: 'Tree View', icon: Network },
  { key: 'timeline', label: 'Timeline', icon: Clock },
];

export default function Traceability() {
  const [tab, setTab] = useState('list');
  const [activeChainId, setActiveChainId] = useState(null);

  const { data: chains } = useQuery({
    queryKey: ['chains'],
    queryFn: fetchChains,
    refetchInterval: 15000,
    placeholderData: { data: SEED_CHAINS },
    select: (r) => (r?.data && Array.isArray(r.data) ? r.data : SEED_CHAINS),
  });

  const chainList = chains || SEED_CHAINS;

  const handleSelectChain = useCallback((chainId) => {
    setActiveChainId(chainId);
    setTab('tree');
  }, []);

  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit" className="p-6 h-full flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-extrabold text-[26px] text-white tracking-tight flex items-center gap-3">
            <GitBranch size={22} className="text-cyan" /> Traceability
          </h1>
          <p className="text-[13px] mt-1 text-[#555]">{chainList.length} active propagation chains</p>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 p-1 rounded-lg w-fit" style={{ background: 'rgba(255,255,255,0.03)' }}>
        {TABS.map((t) => {
          const active = tab === t.key;
          return (
            <button key={t.key} onClick={() => { setTab(t.key); if (t.key === 'list') setActiveChainId(null); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-[12px] font-medium transition-all ${active ? 'bg-white/[0.06] text-white' : 'text-[#555] hover:text-[#888]'}`}>
              <t.icon size={13} /> {t.label}
            </button>
          );
        })}
        {activeChainId && tab !== 'list' && (
          <span className="flex items-center text-[10px] text-cyan font-mono ml-3 px-2">{activeChainId}</span>
        )}
      </div>

      {/* Tab content */}
      <div className="flex-1 min-h-0 flex flex-col">
        {tab === 'list' && <ChainListTab chains={chainList} onSelectChain={handleSelectChain} />}
        {tab === 'tree' && <TreeViewTab chainId={activeChainId || chainList[0]?.chain_id} />}
        {tab === 'timeline' && <TimelineTab chainId={activeChainId || chainList[0]?.chain_id} />}
      </div>
    </motion.div>
  );
}
