import React from 'react';
import { motion } from 'framer-motion';
import { HelpCircle } from 'lucide-react';
import { pageVariants } from '../utils/animations';

export default function Help() {
  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit" className="p-8">
      <h1 className="font-display font-extrabold text-[26px] text-white tracking-tight flex items-center gap-3">
        <HelpCircle size={22} className="text-cyan" /> Help &amp; Docs
      </h1>
      <p className="text-[13px] mt-1 text-[#555]">Documentation and support resources.</p>
      <div className="mt-6 rounded-xl p-6 space-y-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
        <p className="text-[13px] text-white font-semibold">Quick links</p>
        <a href="https://github.com/yatharthdahiyaa/ShieldIP" target="_blank" rel="noopener noreferrer" className="block text-[13px] text-cyan hover:underline">
          GitHub Repository →
        </a>
        <p className="text-[13px] text-[#888]">Full documentation coming soon.</p>
      </div>
    </motion.div>
  );
}
