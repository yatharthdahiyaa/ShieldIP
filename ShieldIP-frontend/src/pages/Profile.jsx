import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { User, Mail, Shield, KeyRound, Globe, Clock, Camera, Save, LogOut, Copy, CheckCircle2, ExternalLink } from 'lucide-react';
import { pageVariants } from '../utils/animations';
import useAppStore from '../store/useAppStore';

export default function Profile() {
  const addToast = useAppStore((s) => s.addToast);
  const [profile, setProfile] = useState({
    name: 'Admin User',
    email: 'admin@shieldip.io',
    role: 'Organization Admin',
    org: 'ShieldIP Security',
    timezone: 'UTC-5 (EST)',
    joined: 'January 2024',
    apiCalls: '12,847',
    assetsProtected: '847',
  });
  const [editing, setEditing] = useState(false);
  const [apiKey] = useState(() => {
    const stored = localStorage.getItem('shieldip_api_key');
    if (stored) return stored;
    const generated = 'sk-shieldip-' + Array.from({ length: 32 }, () => Math.random().toString(36)[2]).join('');
    localStorage.setItem('shieldip_api_key', generated);
    return generated;
  });
  const [showKey, setShowKey] = useState(false);
  const [copied, setCopied] = useState(false);

  const copyKey = () => {
    navigator.clipboard.writeText(apiKey);
    setCopied(true);
    addToast({ type: 'success', title: 'Copied', message: 'API key copied to clipboard' });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit" className="p-8 space-y-6 max-w-3xl">
      <div>
        <h1 className="font-display font-extrabold text-[26px] text-white tracking-tight flex items-center gap-3">
          <User size={22} className="text-cyan" /> Profile
        </h1>
        <p className="text-[13px] mt-1 text-[#555]">Manage your account and API access</p>
      </div>

      <div className="rounded-xl p-6" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-start gap-6">
          <div className="relative group">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-cyan/20 to-violet/20 flex items-center justify-center border-2 border-cyan/20">
              <User size={32} className="text-cyan" />
            </div>
            <button className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <Camera size={16} className="text-white" />
            </button>
          </div>
          <div className="flex-1">
            <h2 className="font-display font-bold text-[20px] text-white">{profile.name}</h2>
            <p className="text-[13px] text-[#888] mt-0.5">{profile.email}</p>
            <div className="flex items-center gap-3 mt-2">
              <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-cyan/10 text-cyan">{profile.role}</span>
              <span className="text-[10px] text-[#555]">{profile.org}</span>
            </div>
          </div>
          <button onClick={() => setEditing(!editing)} className="btn-void-ghost text-[12px]">{editing ? 'Cancel' : 'Edit'}</button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {[
          { icon: Shield, label: 'Assets Protected', value: profile.assetsProtected, color: '#16ff9e' },
          { icon: Globe, label: 'API Calls (30d)', value: profile.apiCalls, color: '#06b6d4' },
          { icon: Clock, label: 'Member Since', value: profile.joined, color: '#888' },
          { icon: Mail, label: 'Timezone', value: profile.timezone, color: '#f59e0b' },
        ].map(({ icon: Ic, label, value, color }) => (
          <div key={label} className="rounded-xl p-4 flex items-center gap-3"
               style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
            <Ic size={16} style={{ color }} />
            <div>
              <p className="void-label">{label}</p>
              <p className="text-[14px] font-semibold text-white">{value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-xl p-6" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-3 mb-5">
          <KeyRound size={16} className="text-cyan" />
          <h3 className="font-display font-bold text-[16px] text-white">API Key</h3>
        </div>
        <div className="flex items-center gap-3 p-3 rounded-lg" style={{ background: '#0e0e0e', border: '1px solid rgba(255,255,255,0.06)' }}>
          <code className="flex-1 font-mono text-[12px] text-[#888] truncate">
            {showKey ? apiKey : apiKey.slice(0, 14) + '••••••••••••••••••••'}
          </code>
          <button onClick={() => setShowKey(!showKey)} className="text-[11px] text-cyan hover:text-white transition-colors">
            {showKey ? 'Hide' : 'Show'}
          </button>
          <button onClick={copyKey} className="flex items-center gap-1 text-[11px] text-[#888] hover:text-white transition-colors">
            {copied ? <CheckCircle2 size={12} className="text-secondary" /> : <Copy size={12} />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
        <p className="text-[11px] text-[#555] mt-2">Use this key to authenticate API requests. Keep it secret.</p>
      </div>

      <div className="rounded-xl p-6" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
        <h3 className="font-display font-bold text-[16px] text-white mb-4">Quick Links</h3>
        <div className="space-y-2">
          {[
            { label: 'API Documentation', url: '#' },
            { label: 'SDK Integration Guide', url: '#' },
            { label: 'Webhook Configuration', url: '#' },
            { label: 'Support & Contact', url: '#' },
          ].map((link) => (
            <a key={link.label} href={link.url} className="flex items-center justify-between py-2.5 px-3 rounded-lg text-[13px] text-[#888] hover:text-white hover:bg-white/[0.02] transition-colors">
              {link.label}
              <ExternalLink size={12} />
            </a>
          ))}
        </div>
      </div>

      <button className="flex items-center gap-2 text-[13px] text-primary hover:text-white transition-colors">
        <LogOut size={14} /> Sign Out
      </button>
    </motion.div>
  );
}
