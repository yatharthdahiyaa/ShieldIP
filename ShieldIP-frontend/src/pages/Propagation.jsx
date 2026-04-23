import React, { useState, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { ReactFlow, Background, Controls, MiniMap, MarkerType } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useQuery } from '@tanstack/react-query';
import { GitBranch, Activity, Shield, Eye, Zap, PieChart } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { PieChart as RechartsPie, Pie, Cell, ResponsiveContainer, Tooltip, AreaChart, Area, XAxis, YAxis } from 'recharts';
import { fetchPropagationChain } from '../services/api';
import { pageVariants } from '../utils/animations';



const PLATFORM_COLORS = {
  YouTube: '#ff0000', TikTok: '#69c9d0', Instagram: '#e1306c',
  X: '#1da1f2', Facebook: '#1877f2', Twitch: '#9146ff',
  Telegram: '#0088cc', Dailymotion: '#00d2f3',
};

const VARIANT_COLORS = {
  direct_reupload: '#ff2d55', clipped_highlight: '#f59e0b', meme_edit: '#a855f7',
  mirrored: '#06b6d4', cropped: '#10b981', colour_graded: '#6366f1', unknown: '#555',
};

function buildFlowNodes(chain, selectedId) {
  if (!chain || chain.length === 0) return { nodes: [], edges: [] };

  const nodes = chain.map((item, idx) => {
    const isOrigin = item.source_type === 'origin';
    const isSelected = item.violation_id === selectedId;
    return {
      id: item.violation_id,
      position: { x: 100 + (idx % 4) * 260, y: 80 + Math.floor(idx / 4) * 180 },
      data: { label: item.platform, item },
      style: {
        background: isOrigin ? 'rgba(255,45,85,0.15)' : 'rgba(6,182,212,0.08)',
        border: isSelected ? '2px solid #06b6d4' : isOrigin ? '2px solid #ff2d55' : '1px solid rgba(255,255,255,0.1)',
        borderRadius: '12px',
        padding: '12px 16px',
        color: '#fff',
        fontSize: '12px',
        width: 200,
      },
    };
  });

  const edges = [];
  for (let i = 1; i < chain.length; i++) {
    const prev = chain[i - 1];
    const curr = chain[i];
    const timeDiff = new Date(curr.detected_at) - new Date(prev.detected_at);
    const hours = Math.floor(timeDiff / 3600000);
    const mins = Math.floor((timeDiff % 3600000) / 60000);
    edges.push({
      id: `e-${prev.violation_id}-${curr.violation_id}`,
      source: prev.violation_id,
      target: curr.violation_id,
      animated: true,
      label: `+${hours}h ${mins}m`,
      labelStyle: { fill: '#888', fontSize: 10 },
      style: { stroke: '#333' },
      markerEnd: { type: MarkerType.ArrowClosed, color: '#555' },
    });
  }
  return { nodes, edges };
}

export default function Propagation() {
  const [selectedAsset, setSelectedAsset] = useState('');
  const [selectedNode, setSelectedNode] = useState(null);

  const { data: chainData } = useQuery({
    queryKey: ['propagation-chain', selectedAsset],
    queryFn: () => fetchPropagationChain(selectedAsset),
    refetchInterval: 15000,
    placeholderData: { data: { chain: [] } },
    select: (r) => r?.data || { chain: [] },
  });

  const chain = chainData?.chain || [];
  const { nodes, edges } = useMemo(() => buildFlowNodes(chain, selectedNode), [chain, selectedNode]);

  const onNodeClick = useCallback((_, node) => {
    setSelectedNode(node.id);
  }, []);

  const selectedItem = chain.find((c) => c.violation_id === selectedNode);

  const variantPie = useMemo(() => {
    const counts = {};
    chain.forEach((c) => { counts[c.variant_type] = (counts[c.variant_type] || 0) + 1; });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [chain]);

  const velocitySpark = useMemo(() => {
    return chain.map((c, i) => ({
      t: i + 1,
      v: Math.max(1, chain.length - i) + Math.random() * 2,
    }));
  }, [chain]);

  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit" className="p-6 h-full flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-extrabold text-[26px] text-white tracking-tight flex items-center gap-3">
            <GitBranch size={22} className="text-cyan" /> Propagation Map
          </h1>
          <p className="text-[13px] mt-1 text-[#555]">{chain.length} nodes in chain</p>
        </div>
        <select value={selectedAsset} onChange={(e) => { setSelectedAsset(e.target.value); setSelectedNode(null); }}
          className="void-input text-[12px] px-3 py-2 w-52">
          <option value="">Select an asset...</option>
        </select>
      </div>

      <div className="flex-1 flex gap-4 min-h-0">
        {/* Flow Graph */}
        <div className="flex-1 rounded-xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodeClick={onNodeClick}
            fitView
            proOptions={{ hideAttribution: true }}
          >
            <Background color="#222" gap={30} size={1} />
            <Controls style={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: 8 }} />
            <MiniMap style={{ background: '#0e0e0e' }} nodeColor="#06b6d4" />
          </ReactFlow>
        </div>

        {/* Right Panel */}
        <div className="w-[320px] space-y-4 overflow-y-auto shrink-0">
          {/* Node detail */}
          {selectedItem ? (
            <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <h3 className="font-display font-bold text-[14px] text-white mb-3 flex items-center gap-2">
                <Eye size={14} className="text-cyan" /> Node Detail
              </h3>
              <div className="space-y-2 text-[12px]">
                <div className="flex justify-between"><span className="text-[#888]">Platform</span><span className="font-semibold" style={{ color: PLATFORM_COLORS[selectedItem.platform] || '#fff' }}>{selectedItem.platform}</span></div>
                <div className="flex justify-between"><span className="text-[#888]">Account Type</span><span className={`font-semibold ${selectedItem.account_type === 'unofficial' ? 'text-primary' : 'text-secondary'}`}>{selectedItem.account_type}</span></div>
                <div className="flex justify-between"><span className="text-[#888]">Variant</span><span className="font-semibold" style={{ color: VARIANT_COLORS[selectedItem.variant_type] || '#888' }}>{selectedItem.variant_type}</span></div>
                <div className="flex justify-between"><span className="text-[#888]">Confidence</span><span className="text-white font-mono">{selectedItem.match_confidence}%</span></div>
                <div className="flex justify-between"><span className="text-[#888]">Enforcement</span><span className={`font-semibold ${selectedItem.enforcement_status === 'takedown' ? 'text-secondary' : 'text-amber-400'}`}>{selectedItem.enforcement_status}</span></div>
                <div className="flex justify-between"><span className="text-[#888]">Region</span><span className="text-white">{selectedItem.region}</span></div>
                <div className="flex justify-between"><span className="text-[#888]">Detected</span><span className="text-[#888]">{formatDistanceToNow(new Date(selectedItem.detected_at), { addSuffix: true })}</span></div>
              </div>
            </div>
          ) : (
            <div className="rounded-xl p-4 text-center" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
              <p className="text-[12px] text-[#555]">Click a node to view details</p>
            </div>
          )}

          {/* Stats */}
          <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <h3 className="font-display font-bold text-[14px] text-white mb-3 flex items-center gap-2">
              <Activity size={14} className="text-cyan" /> Chain Stats
            </h3>
            <div className="space-y-2 text-[12px]">
              <div className="flex justify-between"><span className="text-[#888]">Origin</span><span className="text-white">{chainData?.origin?.platform || 'YouTube'}</span></div>
              <div className="flex justify-between"><span className="text-[#888]">Origin Detected</span><span className="text-[#888]">{chainData?.origin ? formatDistanceToNow(new Date(chainData.origin.detected_at), { addSuffix: true }) : '—'}</span></div>
              <div className="flex justify-between"><span className="text-[#888]">Total Reach</span><span className="text-white font-mono">{(chain.length * 45000).toLocaleString()} est.</span></div>
              <div className="flex justify-between"><span className="text-[#888]">Spread Velocity</span><span className="text-cyan font-mono">{chainData?.spread_velocity || 0}/hr</span></div>
            </div>
          </div>

          {/* Velocity Sparkline */}
          <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <h3 className="font-display font-bold text-[12px] text-white mb-2 flex items-center gap-2">
              <Zap size={12} className="text-amber-400" /> Velocity
            </h3>
            <ResponsiveContainer width="100%" height={60}>
              <AreaChart data={velocitySpark}>
                <defs>
                  <linearGradient id="velGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area type="monotone" dataKey="v" stroke="#06b6d4" fill="url(#velGrad)" strokeWidth={1.5} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Variant Pie */}
          <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <h3 className="font-display font-bold text-[12px] text-white mb-2 flex items-center gap-2">
              <PieChart size={12} className="text-violet" /> Variant Breakdown
            </h3>
            <ResponsiveContainer width="100%" height={120}>
              <RechartsPie>
                <Pie data={variantPie} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={25} outerRadius={50} paddingAngle={2}>
                  {variantPie.map((entry) => (
                    <Cell key={entry.name} fill={VARIANT_COLORS[entry.name] || '#555'} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: 8, fontSize: 11, color: '#fff' }} />
              </RechartsPie>
            </ResponsiveContainer>
            <div className="flex flex-wrap gap-2 mt-2">
              {variantPie.map((v) => (
                <span key={v.name} className="flex items-center gap-1 text-[10px] text-[#888]">
                  <span className="w-2 h-2 rounded-full" style={{ background: VARIANT_COLORS[v.name] || '#555' }} />
                  {v.name}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
