import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ReactFlow, Background, Controls, MiniMap, MarkerType } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { GitBranch, List, Network, Clock, Eye, ExternalLink, ChevronDown, ChevronRight, AlertCircle, Zap } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { pageVariants } from '../utils/animations';
import useViolationsQuery from '../hooks/useViolations';

// ─── CONSTANTS ───────────────────────────────────────
const DEPTH_COLORS = ['#ff2d55', '#f59e0b', '#facc15', '#6b7280'];
const VARIANT_EMOJI = { direct: '📋', clipped: '✂️', meme: '😂', mirrored: '🪞', direct_reupload: '📋', clipped_highlight: '✂️', meme_edit: '😂' };
const PLATFORM_COLORS = {
  YouTube: '#ff0000', TikTok: '#69c9d0', Instagram: '#e1306c',
  X: '#1da1f2', Twitter: '#1da1f2', Facebook: '#1877f2', Twitch: '#9146ff',
  Telegram: '#0088cc', Dailymotion: '#00d2f3', WhatsApp: '#25d366',
};

// ─── DATA HELPERS ────────────────────────────────────

/** Flatten an adjacency list (violations array) into a tree using parent_id */
function buildTreeFromFlat(violations) {
  const map = {};
  violations.forEach(v => { map[v.violation_id] = { ...v, children: [] }; });
  const roots = [];
  violations.forEach(v => {
    if (v.parent_id && map[v.parent_id]) {
      map[v.parent_id].children.push(map[v.violation_id]);
    } else {
      roots.push(map[v.violation_id]);
    }
  });
  // Sort children by time
  function sortChildren(node) {
    node.children.sort((a, b) => (a.time_from_origin_minutes || 0) - (b.time_from_origin_minutes || 0));
    node.children.forEach(sortChildren);
  }
  roots.forEach(sortChildren);
  return roots;
}

/** Build chains summary from flat violations list */
function buildChainsFromViolations(violations) {
  const groups = {};
  violations.forEach(v => {
    // Use chain_id if present; otherwise fall back to asset_id as synthetic chain
    const cid = v.chain_id || `asset-chain-${v.asset_id || 'unknown'}`;
    if (!groups[cid]) groups[cid] = [];
    groups[cid].push(v);
  });
  return Object.entries(groups).map(([chain_id, vios]) => {
    const origin = vios.find(v => v.is_origin) || vios.reduce((a, b) =>
      new Date(a.detected_at) < new Date(b.detected_at) ? a : b
    );
    const ageHours = (Date.now() - new Date(origin.detected_at).getTime()) / 3600000;
    const spread_velocity = ageHours > 0 ? +(vios.length / ageHours).toFixed(1) : 0;
    const maxDepth = Math.max(0, ...vios.map(v => v.depth || 0));
    const platforms = [...new Set(vios.map(v => v.platform).filter(Boolean))];
    return {
      chain_id,
      asset_id: origin.asset_id || '',
      asset_name: origin.asset_name || origin.asset_id || 'Unknown Asset',
      origin_platform: origin.platform || 'Unknown',
      origin_url: origin.url || '',
      origin_detected_at: origin.detected_at,
      total_nodes: vios.length,
      max_depth: maxDepth,
      platforms_reached: platforms,
      spread_velocity,
      violations: vios,
    };
  }).sort((a, b) => b.spread_velocity - a.spread_velocity);
}

function flattenTree(nodes, acc = []) {
  if (!nodes) return acc;
  for (const n of nodes) {
    acc.push(n);
    if (n.children?.length) flattenTree(n.children, acc);
  }
  return acc;
}

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

  if (!chains.length) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <AlertCircle size={28} className="text-[#333] mb-3" />
        <p className="text-[13px] text-[#555]">No violation chains detected yet.</p>
        <p className="text-[11px] text-[#444] mt-1">Chains appear once violations share an asset_id or chain_id.</p>
      </div>
    );
  }

  return (
    <div className="overflow-y-auto space-y-1">
      {/* Column headers */}
      <div className="flex items-center gap-4 px-5 py-2 text-[10px] uppercase tracking-widest text-[#444]">
        <span className="w-4" />
        <span className="w-36">Asset</span>
        <span className="w-28">Origin Platform</span>
        <span className="w-28">First Seen</span>
        <span className="w-12 text-center">Depth</span>
        <span className="w-14 text-center">Nodes</span>
        <span className="flex-1">Platforms Reached</span>
        <span className="w-20 text-right">Velocity</span>
      </div>
      {chains.map((c) => {
        const originColor = PLATFORM_COLORS[c.origin_platform] || '#888';
        const detectedAt = c.origin_detected_at ? new Date(c.origin_detected_at) : null;
        const timeAgo = detectedAt && !isNaN(detectedAt) ? formatDistanceToNow(detectedAt, { addSuffix: true }) : '—';
        return (
          <div key={c.chain_id} className="rounded-xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="flex items-center gap-4 px-5 py-3 cursor-pointer hover:bg-white/[0.02] transition-colors"
              onClick={() => setExpanded(expanded === c.chain_id ? null : c.chain_id)}>
              {expanded === c.chain_id
                ? <ChevronDown size={13} className="text-[#555] shrink-0" />
                : <ChevronRight size={13} className="text-[#555] shrink-0" />}

              {/* Asset name */}
              <div className="w-36 min-w-0">
                <span className="text-[12px] font-semibold text-white block truncate">{c.asset_name || c.asset_id || '—'}</span>
                <span className="text-[9px] text-[#444] font-mono">{c.chain_id?.slice(0, 10)}</span>
              </div>

              {/* Origin platform */}
              <div className="w-28 min-w-0">
                <span className="text-[12px] font-semibold truncate block" style={{ color: originColor }}>
                  {c.origin_platform || 'Unknown'}
                </span>
              </div>

              {/* Time */}
              <span className="text-[11px] text-[#666] w-28 truncate">{timeAgo}</span>

              {/* Depth */}
              <span className="font-mono text-[12px] text-white w-12 text-center">{c.max_depth}</span>

              {/* Nodes */}
              <span className="font-mono text-[12px] text-white w-14 text-center">{c.total_nodes}</span>

              {/* Platforms */}
              <div className="flex gap-1 flex-1 flex-wrap">
                {c.platforms_reached?.slice(0, 6).map((p) => (
                  <span key={p} className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: `${PLATFORM_COLORS[p] || '#555'}20`, color: PLATFORM_COLORS[p] || '#777' }}>{p}</span>
                ))}
                {c.platforms_reached?.length > 6 && <span className="text-[9px] text-[#555]">+{c.platforms_reached.length - 6}</span>}
              </div>

              {/* Velocity */}
              <span className="font-mono text-[12px] font-bold text-cyan w-20 text-right">{c.spread_velocity}/hr</span>
            </div>

            <AnimatePresence>
              {expanded === c.chain_id && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                  <div className="px-5 pb-4 pt-3 border-t border-white/5 space-y-3">
                    {c.origin_url && (
                      <a href={c.origin_url} target="_blank" rel="noreferrer" className="text-[11px] text-cyan hover:underline flex items-center gap-1 truncate">
                        <ExternalLink size={10} /> {c.origin_url}
                      </a>
                    )}
                    <div className="flex items-center gap-2">
                      <button onClick={() => onSelectChain(c.chain_id, 'tree')}
                        className="text-[11px] font-bold uppercase tracking-wider px-4 py-2 rounded-lg text-white"
                        style={{ background: 'linear-gradient(135deg, #06b6d4, #0891b2)' }}>
                        Tree View
                      </button>
                      <button onClick={() => onSelectChain(c.chain_id, 'timeline')}
                        className="text-[11px] font-bold uppercase tracking-wider px-4 py-2 rounded-lg text-white"
                        style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
                        Timeline
                      </button>
                      <span className="ml-auto text-[10px] text-[#555] font-mono">{c.total_nodes} violation{c.total_nodes !== 1 ? 's' : ''} · {c.platforms_reached?.length} platform{c.platforms_reached?.length !== 1 ? 's' : ''}</span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════
// TAB 2 — TREE VIEW (react-flow)
// ═══════════════════════════════════════════════

/** Proper left-to-right tree layout: depth→x, subtree position→y */
function buildFlowFromTree(tree, selectedId) {
  const nodes = [];
  const edges = [];
  const X_GAP = 280;
  const Y_GAP = 110;

  function countLeaves(node) {
    if (!node.children?.length) return 1;
    return node.children.reduce((s, c) => s + countLeaves(c), 0);
  }

  function walk(node, parentId, depth, yStart) {
    const fid = node.violation_id;
    const isOrigin = node.is_origin || depth === 0;
    const isSelected = fid === selectedId;
    const depthColor = DEPTH_COLORS[Math.min(depth, DEPTH_COLORS.length - 1)];
    const leaves = countLeaves(node);
    const nodeY = yStart + ((leaves - 1) * Y_GAP) / 2;

    nodes.push({
      id: fid,
      position: { x: depth * X_GAP + 40, y: nodeY },
      data: {
        label: (
          <div className="text-left">
            <div className="flex items-center gap-1.5 mb-1">
              {isOrigin && <span className="text-[8px] uppercase font-bold tracking-widest" style={{ color: '#ff2d55' }}>Origin</span>}
              <span className="font-semibold text-[11px]" style={{ color: PLATFORM_COLORS[node.platform] || '#fff' }}>
                {node.platform || 'Unknown'}
              </span>
              <span className="text-[10px]">{VARIANT_EMOJI[node.variant_type] || ''}</span>
            </div>
            {node.account_handle && <div className="text-[10px] text-[#888]">@{node.account_handle}</div>}
            <div className="text-[10px] font-mono text-[#555]">
              {node.time_from_origin_minutes != null ? fmtTime(node.time_from_origin_minutes) : formatDistanceToNow(new Date(node.detected_at || Date.now()), { addSuffix: true })}
            </div>
            <div className="text-[10px] font-mono" style={{ color: depthColor }}>
              {Number(node.match_confidence > 1 ? node.match_confidence : (node.match_confidence || 0) * 100).toFixed(0)}% match
            </div>
          </div>
        ),
      },
      style: {
        background: isOrigin ? 'rgba(255,45,85,0.10)' : 'rgba(255,255,255,0.03)',
        border: isSelected ? '2px solid #06b6d4' : `2px solid ${depthColor}`,
        borderRadius: '12px',
        padding: '10px 14px',
        color: '#fff',
        width: 200,
        fontSize: 11,
      },
    });

    if (parentId) {
      edges.push({
        id: `e-${parentId}-${fid}`,
        source: parentId,
        target: fid,
        animated: true,
        style: { stroke: depthColor, strokeDasharray: '5 3' },
        label: node.time_from_origin_minutes != null ? fmtDelta(node.time_from_origin_minutes) : '',
        labelStyle: { fill: '#555', fontSize: 9 },
        markerEnd: { type: MarkerType.ArrowClosed, color: depthColor },
      });
    }

    let childY = yStart;
    node.children?.forEach((child) => {
      walk(child, fid, depth + 1, childY);
      childY += countLeaves(child) * Y_GAP;
    });
  }

  let yStart = 0;
  tree?.forEach((root) => {
    walk(root, null, 0, yStart);
    yStart += countLeaves(root) * Y_GAP;
  });
  return { nodes, edges };
}

function TreeViewTab({ chainViolations, chain }) {
  const [selectedNode, setSelectedNode] = useState(null);
  const onNodeClick = useCallback((_, node) => setSelectedNode(node.id), []);

  const tree = useMemo(() => buildTreeFromFlat(chainViolations || []), [chainViolations]);
  const flat = useMemo(() => flattenTree(tree), [tree]);
  const { nodes, edges } = useMemo(() => buildFlowFromTree(tree, selectedNode), [tree, selectedNode]);
  const selectedItem = flat.find((n) => n.violation_id === selectedNode);

  if (!chainViolations?.length) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center">
        <AlertCircle size={28} className="text-[#333] mb-3" />
        <p className="text-[13px] text-[#555]">Select a chain from the Chain List tab to view its tree.</p>
      </div>
    );
  }

  return (
    <div className="flex gap-4 flex-1 min-h-0">
      <div className="flex-1 rounded-xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
        {nodes.length > 0 ? (
          <ReactFlow nodes={nodes} edges={edges} onNodeClick={onNodeClick} fitView proOptions={{ hideAttribution: true }}>
            <Background color="#222" gap={30} size={1} />
            <Controls style={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: 8 }} />
            <MiniMap style={{ background: '#0e0e0e' }} nodeColor={(n) => n.style?.borderColor || '#06b6d4'} />
          </ReactFlow>
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-[12px] text-[#555]">No tree data available for this chain.</p>
          </div>
        )}
      </div>

      {/* Side panel */}
      <div className="w-[280px] shrink-0 overflow-y-auto space-y-3">
        {selectedItem ? (
          <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <h3 className="font-display font-bold text-[13px] text-white mb-3 flex items-center gap-2">
              <Eye size={13} className="text-cyan" /> Node Detail
            </h3>
            <div className="space-y-2 text-[12px]">
              {selectedItem.url && (
                <a href={selectedItem.url} target="_blank" rel="noreferrer" className="text-cyan hover:underline text-[11px] flex items-center gap-1 truncate">
                  <ExternalLink size={10} />{selectedItem.url}
                </a>
              )}
              <div className="flex justify-between"><span className="text-[#888]">Platform</span><span className="font-semibold" style={{ color: PLATFORM_COLORS[selectedItem.platform] || '#fff' }}>{selectedItem.platform}</span></div>
              {selectedItem.account_handle && <div className="flex justify-between"><span className="text-[#888]">Account</span><span className="text-white font-mono">@{selectedItem.account_handle}</span></div>}
              <div className="flex justify-between"><span className="text-[#888]">Status</span><span className={selectedItem.status === 'resolved' ? 'text-secondary' : 'text-amber-400'}>{selectedItem.status || '—'}</span></div>
              <div className="flex justify-between"><span className="text-[#888]">Confidence</span><span className="text-white font-mono">{Number(selectedItem.match_confidence > 1 ? selectedItem.match_confidence : (selectedItem.match_confidence || 0) * 100).toFixed(0)}%</span></div>
              {selectedItem.depth != null && <div className="flex justify-between"><span className="text-[#888]">Depth</span><span className="font-mono" style={{ color: DEPTH_COLORS[Math.min(selectedItem.depth, 3)] }}>{selectedItem.depth}</span></div>}
              {selectedItem.region && <div className="flex justify-between"><span className="text-[#888]">Region</span><span className="text-white">{selectedItem.region}</span></div>}
              {selectedItem.enforcement_status && <div className="flex justify-between"><span className="text-[#888]">Enforcement</span><span className={selectedItem.enforcement_status === 'takedown' ? 'text-secondary font-bold' : 'text-amber-400'}>{selectedItem.enforcement_status}</span></div>}
            </div>
          </div>
        ) : (
          <div className="rounded-xl p-4 text-center" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
            <p className="text-[12px] text-[#555]">Click a node to inspect</p>
          </div>
        )}
        {chain && (
          <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <p className="void-label mb-2">Chain Summary</p>
            <div className="space-y-1.5 text-[12px]">
              <div className="flex justify-between"><span className="text-[#888]">Asset</span><span className="text-white truncate max-w-[160px]">{chain.asset_name || chain.asset_id}</span></div>
              <div className="flex justify-between"><span className="text-[#888]">Nodes</span><span className="text-white font-mono">{chain.total_nodes}</span></div>
              <div className="flex justify-between"><span className="text-[#888]">Max Depth</span><span className="text-white font-mono">{chain.max_depth}</span></div>
              <div className="flex justify-between"><span className="text-[#888]">Velocity</span><span className="text-cyan font-mono">{chain.spread_velocity}/hr</span></div>
              <div className="flex flex-wrap gap-1 mt-1">
                {chain.platforms_reached?.map(p => (
                  <span key={p} className="text-[9px] px-1 rounded" style={{ background: `${PLATFORM_COLORS[p] || '#555'}20`, color: PLATFORM_COLORS[p] || '#888' }}>{p}</span>
                ))}
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
function TimelineTab({ chainViolations }) {
  // Sort by time_from_origin_minutes if present, else by detected_at
  const items = useMemo(() => {
    if (!chainViolations?.length) return [];
    const sorted = [...chainViolations].sort((a, b) => {
      if (a.time_from_origin_minutes != null && b.time_from_origin_minutes != null)
        return a.time_from_origin_minutes - b.time_from_origin_minutes;
      return new Date(a.detected_at) - new Date(b.detected_at);
    });
    // Assign synthetic time_from_origin_minutes if missing
    const originTime = new Date(sorted[0]?.detected_at).getTime();
    return sorted.map(v => ({
      ...v,
      time_from_origin_minutes: v.time_from_origin_minutes != null
        ? v.time_from_origin_minutes
        : Math.round((new Date(v.detected_at).getTime() - originTime) / 60000),
    }));
  }, [chainViolations]);

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

  if (!items.length) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center">
        <AlertCircle size={28} className="text-[#333] mb-3" />
        <p className="text-[13px] text-[#555]">Select a chain from the Chain List tab to view its timeline.</p>
      </div>
    );
  }

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

  // ── Real violations data ─────────────────────
  const { data: violations, isLoading } = useViolationsQuery();
  const vios = violations || [];

  // Build chains from real violations
  const chainList = useMemo(() => buildChainsFromViolations(vios), [vios]);

  // Active chain object + its violations
  const activeChain = useMemo(
    () => chainList.find(c => c.chain_id === activeChainId) || chainList[0] || null,
    [chainList, activeChainId]
  );
  const activeViolations = activeChain?.violations || [];

  const handleSelectChain = useCallback((chainId, nextTab = 'tree') => {
    setActiveChainId(chainId);
    setTab(nextTab);
  }, []);

  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit" className="p-6 h-full flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-extrabold text-[26px] text-white tracking-tight flex items-center gap-3">
            <GitBranch size={22} className="text-cyan" /> Traceability
          </h1>
          <p className="text-[13px] mt-1 text-[#555]">
            {isLoading ? 'Loading…' : `${chainList.length} propagation chain${chainList.length !== 1 ? 's' : ''} · ${vios.length} total violation${vios.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        {activeChain && tab !== 'list' && (
          <div className="text-right">
            <p className="text-[11px] text-white font-semibold">{activeChain.asset_name || activeChain.asset_id}</p>
            <p className="text-[10px] text-[#555] font-mono">{activeChain.chain_id}</p>
          </div>
        )}
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 p-1 rounded-lg w-fit" style={{ background: 'rgba(255,255,255,0.03)' }}>
        {TABS.map((t) => {
          const active = tab === t.key;
          return (
            <button key={t.key}
              onClick={() => { setTab(t.key); if (t.key === 'list') setActiveChainId(null); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-[12px] font-medium transition-all ${active ? 'bg-white/[0.06] text-white' : 'text-[#555] hover:text-[#888]'}`}>
              <t.icon size={13} /> {t.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div className="flex-1 min-h-0 flex flex-col">
        {tab === 'list' && (
          <ChainListTab chains={chainList} onSelectChain={handleSelectChain} />
        )}
        {tab === 'tree' && (
          <TreeViewTab chainViolations={activeViolations} chain={activeChain} />
        )}
        {tab === 'timeline' && (
          <TimelineTab chainViolations={activeViolations} />
        )}
      </div>
    </motion.div>
  );
}
