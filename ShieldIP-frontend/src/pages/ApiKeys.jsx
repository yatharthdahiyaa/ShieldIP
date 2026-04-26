import React from 'react';
import { motion } from 'framer-motion';
import { KeyRound } from 'lucide-react';
import { pageVariants } from '../utils/animations';

export default function ApiKeys() {
  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit" className="p-8">
      <h1 className="font-display font-extrabold text-[26px] text-white tracking-tight flex items-center gap-3">
        <KeyRound size={22} className="text-cyan" /> API Keys
      </h1>
      <p className="text-[13px] mt-1 text-[#555]">Manage your ShieldIP API credentials.</p>
      <div className="mt-6 rounded-xl p-6" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
        <p className="text-[13px] text-[#888]">API key management coming soon. For now, configure your keys in Settings → Integrations.</p>
      </div>
    </motion.div>
  );
}
