import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, CheckCircle2, Shield, Hash, Clock, Fingerprint, X, CloudUpload, Search, Grid, List, Download, Trash2 } from 'lucide-react';
import { pageVariants, staggerContainer, staggerItem, scaleIn } from '../utils/animations';
import useAppStore from '../store/useAppStore';
import api from '../services/api';

export default function Assets() {
  const addToast = useAppStore((s) => s.addToast);
  const [assets, setAssets] = useState([
    { id: 'A-2001', name: 'brand-logo.png', hash: 'e3b0c44298fc1c149afb', timestamp: new Date(Date.now() - 86400000).toISOString(), size: '24.5', status: 'protected' },
    { id: 'A-2002', name: 'product-shot.jpg', hash: 'a7ffc6f8bf1ed76651c1', timestamp: new Date(Date.now() - 172800000).toISOString(), size: '156.2', status: 'protected' },
    { id: 'A-2003', name: 'campaign-video-thumb.png', hash: 'd8dc5e07a3f08e62e20f', timestamp: new Date(Date.now() - 259200000).toISOString(), size: '89.7', status: 'protected' },
  ]);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [viewMode, setViewMode] = useState('list');
  const [search, setSearch] = useState('');

  const handleFile = (f) => {
    if (!f?.type.startsWith('image/')) { addToast({ type: 'error', title: 'Invalid file', message: 'Please upload an image file.' }); return; }
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const clearFile = () => { setFile(null); setPreview(null); };

  const processFile = useCallback(async () => {
    if (!file) return;
    setLoading(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          const res = await api.post('/assets/register', { imageBase64: reader.result });
          const data = res.data;
          setAssets((prev) => [{ id: data.assetId || `A-${Date.now()}`, name: file.name, hash: data.hash || 'local-' + Date.now().toString(16), timestamp: data.timestamp || new Date().toISOString(), size: (file.size / 1024).toFixed(1), status: 'protected' }, ...prev]);
          addToast({ type: 'success', title: 'Asset Registered', message: `${file.name} protected with pHash fingerprint` });
        } catch {
          const mockHash = Array.from({ length: 16 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
          setAssets((prev) => [{ id: `A-${Date.now()}`, name: file.name, hash: mockHash, timestamp: new Date().toISOString(), size: (file.size / 1024).toFixed(1), status: 'protected' }, ...prev]);
          addToast({ type: 'success', title: 'Asset Registered (Demo)', message: `${file.name} registered locally` });
        }
        clearFile();
      };
      reader.readAsDataURL(file);
    } finally { setLoading(false); }
  }, [file, addToast]);

  const filtered = assets.filter((a) => a.name.toLowerCase().includes(search.toLowerCase()) || a.id.toLowerCase().includes(search.toLowerCase()));

  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit" className="p-8 space-y-6 max-w-4xl">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="font-display font-extrabold text-[26px] text-white tracking-tight flex items-center gap-3">
            <Fingerprint size={22} className="text-cyan" /> Asset Registry
          </h1>
          <p className="text-[13px] mt-1 text-[#555]">{assets.length} protected assets</p>
        </div>
      </div>

      <div className="rounded-xl p-6" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
        {!file ? (
          <div className={`border-2 border-dashed rounded-xl p-10 flex flex-col items-center gap-4 text-center cursor-pointer transition-all ${dragging ? 'border-cyan bg-cyan/5' : 'border-white/10 hover:border-white/20'}`}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0]); }}
            onClick={() => document.getElementById('assetFileInput').click()}>
            <input type="file" id="assetFileInput" className="hidden" accept="image/*" onChange={(e) => e.target.files[0] && handleFile(e.target.files[0])} />
            <CloudUpload size={32} className={dragging ? 'text-cyan' : 'text-[#333]'} />
            <div>
              <p className="text-[15px] font-semibold text-white">{dragging ? 'Release to upload' : 'Drag & drop your image'}</p>
              <p className="text-[12px] text-[#555] mt-1">or <span className="text-cyan cursor-pointer">click to browse</span> — PNG, JPG, JPEG</p>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-5 p-5 rounded-xl animate-void-in" style={{ background: 'rgba(6,182,212,0.04)', border: '1px solid rgba(6,182,212,0.15)' }}>
            <div className="relative shrink-0">
              <img src={preview} alt="preview" className="w-24 h-24 object-cover rounded-lg" style={{ border: '1px solid rgba(6,182,212,0.3)' }} />
              <button onClick={clearFile} className="absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center bg-surface border border-white/10 text-[#888] hover:text-white"><X size={12} /></button>
            </div>
            <div className="flex-1 space-y-3">
              <div>
                <p className="font-semibold text-[15px] text-white">{file.name}</p>
                <p className="void-label mt-0.5">{file.type.split('/')[1].toUpperCase()} · {(file.size / 1024).toFixed(1)} KB</p>
              </div>
              <div className="flex items-center gap-2"><CheckCircle2 size={13} className="text-secondary" /><span className="text-[12px] font-medium text-secondary">File validated</span></div>
              <button onClick={processFile} disabled={loading}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg font-bold text-[12px] uppercase tracking-widest text-white transition-all hover:shadow-cyan-glow disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #06b6d4, #0891b2)' }}>
                {loading ? <><div className="w-3.5 h-3.5 rounded-full border-2 border-white/20 border-t-white animate-spin" /> Registering...</> : <><Upload size={13} /> Register Asset</>}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#444]" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search assets..." className="void-input pl-9 pr-4 py-2 text-[12px] w-full" />
        </div>
        <div className="flex rounded-lg overflow-hidden border border-white/10">
          <button onClick={() => setViewMode('list')} className={`p-2 ${viewMode === 'list' ? 'bg-white/10 text-white' : 'text-[#555]'}`}><List size={14} /></button>
          <button onClick={() => setViewMode('grid')} className={`p-2 ${viewMode === 'grid' ? 'bg-white/10 text-white' : 'text-[#555]'}`}><Grid size={14} /></button>
        </div>
      </div>

      {filtered.length > 0 && (
        <motion.div variants={staggerContainer} initial="initial" animate="animate" className={viewMode === 'grid' ? 'grid grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-2'}>
          {filtered.map((asset) => (
            <motion.div key={asset.id} variants={staggerItem}
              className={`rounded-xl p-4 transition-all hover:bg-white/[0.04] ${viewMode === 'grid' ? 'flex flex-col gap-3' : 'flex items-center gap-4'}`}
              style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div className={`${viewMode === 'grid' ? 'w-full h-20' : 'w-14 h-14'} rounded-lg bg-gradient-to-br from-cyan/10 to-violet/10 flex items-center justify-center shrink-0`}>
                <Shield size={viewMode === 'grid' ? 24 : 18} className="text-cyan" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-white truncate">{asset.name}</p>
                <p className="void-label mt-0.5">{new Date(asset.timestamp).toLocaleDateString()} · {asset.size} KB</p>
                <div className="flex items-center gap-3 mt-1">
                  <span className="font-mono text-[9px] text-cyan truncate">{asset.id}</span>
                  <span className="font-mono text-[9px] text-secondary truncate">{asset.hash}</span>
                </div>
              </div>
              {viewMode !== 'grid' && (
                <div className="flex items-center gap-2 px-2 py-1 rounded text-[10px] font-bold uppercase bg-secondary/10 text-secondary shrink-0">
                  <CheckCircle2 size={10} /> Protected
                </div>
              )}
            </motion.div>
          ))}
        </motion.div>
      )}
    </motion.div>
  );
}
