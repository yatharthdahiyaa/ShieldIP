import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { KeyRound, Plus, Copy, Trash2, CheckCircle2, Eye, EyeOff, ShieldCheck, AlertTriangle } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { pageVariants, staggerContainer, staggerItem } from '../utils/animations';
import { fetchApiKeys, createApiKey, revokeApiKey } from '../services/api';
import useAppStore from '../store/useAppStore';

const SCOPE_OPTS = ['read', 'write', 'admin'];

export default function ApiKeys() {
  const qc = useQueryClient();
  const addToast = useAppStore((s) => s.addToast);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName]       = useState('');
  const [newScopes, setNewScopes]   = useState(['read']);
  const [revealedKey, setRevealedKey] = useState(null);
  const [copiedId, setCopiedId]     = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['api-keys'],
    queryFn: fetchApiKeys,
    select: (d) => d?.data?.keys || d?.keys || [],
  });
  const keys = data || [];

  const createMut = useMutation({
    mutationFn: createApiKey,
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['api-keys'] });
      const raw = res?.data?.key;
      if (raw) setRevealedKey({ key: raw, name: res?.data?.name });
      setShowCreate(false);
      setNewName('');
      setNewScopes(['read']);
      addToast({ type: 'success', title: 'API key created', message: 'Copy it now — it won\'t be shown again.' });
    },
    onError: () => addToast({ type: 'error', title: 'Failed to create key' }),
  });

  const revokeMut = useMutation({
    mutationFn: revokeApiKey,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['api-keys'] });
      addToast({ type: 'success', title: 'Key revoked' });
    },
    onError: () => addToast({ type: 'error', title: 'Failed to revoke key' }),
  });

  const copy = (text, id) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  const toggleScope = (s) =>
    setNewScopes((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]);

  const activeKeys  = keys.filter((k) => k.status === 'active');
  const revokedKeys = keys.filter((k) => k.status === 'revoked');

  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit" className="p-8 space-y-6 max-w-4xl">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="font-display font-extrabold text-[26px] text-white tracking-tight flex items-center gap-3">
            <KeyRound size={22} className="text-cyan" /> API Keys
          </h1>
          <p className="text-[13px] mt-1 text-[#555]">{activeKeys.length} active key{activeKeys.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="btn-void-ghost text-[12px] flex items-center gap-1.5">
          <Plus size={13} /> New Key
        </button>
      </div>

      {/* One-time reveal banner */}
      <AnimatePresence>
        {revealedKey && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="rounded-xl p-4 space-y-2"
            style={{ background: 'rgba(22,255,158,0.06)', border: '1px solid rgba(22,255,158,0.2)' }}>
            <div className="flex items-center gap-2">
              <ShieldCheck size={14} className="text-[#16ff9e]" />
              <p className="text-[13px] font-semibold text-[#16ff9e]">Key created — copy it now, it won't be shown again</p>
            </div>
            <p className="text-[11px] text-[#555] font-semibold mb-1">{revealedKey.name}</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-[12px] font-mono text-white bg-black/40 px-3 py-2 rounded-lg break-all">{revealedKey.key}</code>
              <button onClick={() => copy(revealedKey.key, 'revealed')}
                className="p-2 rounded-lg text-[#555] hover:text-white hover:bg-white/5 transition-colors shrink-0">
                {copiedId === 'revealed' ? <CheckCircle2 size={14} className="text-[#16ff9e]" /> : <Copy size={14} />}
              </button>
            </div>
            <button onClick={() => setRevealedKey(null)} className="text-[11px] text-[#444] hover:text-[#888] mt-1">Dismiss</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Create form */}
      <AnimatePresence>
        {showCreate && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="rounded-xl p-5 space-y-4"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <p className="text-[14px] font-semibold text-white">New API Key</p>
            <div className="space-y-1">
              <label className="text-[11px] text-[#555] font-semibold uppercase tracking-wide">Key name</label>
              <input value={newName} onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Production Monitor"
                className="w-full bg-black/30 border border-white/[0.06] rounded-lg px-3 py-2 text-[13px] text-white placeholder-[#444] focus:outline-none focus:border-cyan/40" />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] text-[#555] font-semibold uppercase tracking-wide">Scopes</label>
              <div className="flex items-center gap-2">
                {SCOPE_OPTS.map((s) => (
                  <button key={s} onClick={() => toggleScope(s)}
                    className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors ${newScopes.includes(s) ? 'bg-cyan/10 text-cyan border border-cyan/20' : 'text-[#555] border border-white/[0.06] hover:text-[#888]'}`}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <button onClick={() => createMut.mutate({ name: newName, scopes: newScopes })}
                disabled={!newName.trim() || createMut.isPending}
                className="btn-void-ghost text-[12px] disabled:opacity-40">
                {createMut.isPending ? 'Creating…' : 'Create Key'}
              </button>
              <button onClick={() => setShowCreate(false)} className="text-[12px] text-[#555] hover:text-[#888]">Cancel</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Active keys */}
      {isLoading ? (
        <div className="py-12 text-center">
          <div className="w-5 h-5 border-2 border-cyan/30 border-t-cyan rounded-full animate-spin mx-auto" />
        </div>
      ) : (
        <motion.div variants={staggerContainer} initial="initial" animate="animate" className="space-y-2">
          {activeKeys.length === 0 && !showCreate && (
            <div className="py-14 text-center rounded-xl" style={{ border: '1px dashed rgba(255,255,255,0.06)' }}>
              <KeyRound size={28} className="mx-auto text-[#333] mb-3" />
              <p className="text-[13px] text-[#555]">No API keys yet</p>
              <button onClick={() => setShowCreate(true)} className="mt-3 text-[12px] text-cyan hover:underline">Create your first key →</button>
            </div>
          )}
          {activeKeys.map((k) => (
            <motion.div key={k.key_id} variants={staggerItem}
              className="flex items-center gap-4 px-4 py-3.5 rounded-xl"
              style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'rgba(6,182,212,0.1)' }}>
                <KeyRound size={13} className="text-cyan" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-white">{k.name}</p>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  <code className="text-[11px] font-mono text-[#555]">{k.prefix}••••••••••••</code>
                  {(k.scopes || []).map((s) => (
                    <span key={s} className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-white/[0.04] text-[#666]">{s}</span>
                  ))}
                  {k.created_at && (
                    <span className="text-[10px] text-[#444]">created {formatDistanceToNow(new Date(k.created_at), { addSuffix: true })}</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => copy(k.prefix, k.key_id)}
                  className="p-2 rounded-lg text-[#555] hover:text-white hover:bg-white/5 transition-colors">
                  {copiedId === k.key_id ? <CheckCircle2 size={13} className="text-[#16ff9e]" /> : <Copy size={13} />}
                </button>
                <button onClick={() => revokeMut.mutate(k.key_id)}
                  disabled={revokeMut.isPending}
                  className="p-2 rounded-lg text-[#555] hover:text-[#ff2d55] hover:bg-[#ff2d55]/5 transition-colors disabled:opacity-40">
                  <Trash2 size={13} />
                </button>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Revoked keys */}
      {revokedKeys.length > 0 && (
        <div className="space-y-2">
          <p className="text-[11px] text-[#444] font-semibold uppercase tracking-wide flex items-center gap-1.5">
            <AlertTriangle size={10} /> Revoked Keys ({revokedKeys.length})
          </p>
          {revokedKeys.map((k) => (
            <div key={k.key_id} className="flex items-center gap-4 px-4 py-3 rounded-xl opacity-40"
              style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.04)' }}>
              <KeyRound size={13} className="text-[#444]" />
              <div className="flex-1 min-w-0">
                <p className="text-[12px] text-[#666] line-through">{k.name}</p>
                <code className="text-[10px] font-mono text-[#444]">{k.prefix}••••••••••••</code>
              </div>
              <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-[#ff2d55]/10 text-[#ff2d55]">revoked</span>
            </div>
          ))}
        </div>
      )}

      {/* Info box */}
      <div className="rounded-xl p-4 text-[12px] text-[#555] space-y-1"
        style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
        <p className="font-semibold text-[#666]">Using API keys</p>
        <p>Include your key in the <code className="text-cyan font-mono">Authorization: Bearer sip_…</code> header on all API requests.</p>
        <p>Keys with <code className="text-[#888] font-mono">admin</code> scope can create/revoke other keys.</p>
      </div>
    </motion.div>
  );
}
