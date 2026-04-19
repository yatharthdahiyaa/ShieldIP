import React, { useState } from 'react';
import { Upload, CheckCircle2, Shield, Hash, Clock, Fingerprint, X, CloudUpload } from 'lucide-react';
import { useViolations } from '../../contexts/ViolationContext';

export default function ContentRegistration() {
  const { registeredContent, setRegisteredContent } = useViolations();
  const [file, setFile]       = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [dragging, setDragging] = useState(false);

  const handleFile = (f) => {
    if (!f?.type.startsWith('image/')) { setError('Drop a valid image file.'); return; }
    setFile(f); setError(''); setPreview(URL.createObjectURL(f));
  };
  const clearFile = () => { setFile(null); setPreview(null); setError(''); };

  const processFile = async () => {
    if (!file) return;
    setLoading(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const res = await fetch('/api/hash', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ imageBase64: reader.result }) });
        if (!res.ok) throw new Error('Server error');
        const data = await res.json();
        setRegisteredContent(prev => [{
          name: file.name, hash: data.hash, assetId: data.assetId,
          timestamp: data.timestamp, previewUrl: URL.createObjectURL(file),
          size: (file.size/1024).toFixed(1),
        }, ...prev]);
        clearFile();
      };
      reader.readAsDataURL(file);
    } catch { setError('Registration failed. Ensure backend is running.'); }
    finally { setLoading(false); }
  };

  return (
    <div className="max-w-3xl space-y-6">
      {/* Upload Zone */}
      <div className="card-3d p-8">
        <div className="flex items-center gap-3 mb-6">
          <Fingerprint size={18} style={{ color: '#ff2d55' }} />
          <div>
            <h2 className="font-display font-bold text-[20px] text-white">Register New Asset</h2>
            <p className="void-label mt-0.5">Perceptual hash fingerprinting via backend pHash engine</p>
          </div>
        </div>

        {!file ? (
          <div
            className={`void-drop-zone p-14 flex flex-col items-center gap-5 text-center cursor-pointer ${dragging ? 'dragging' : ''}`}
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={e => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0]); }}
            onClick={() => document.getElementById('fileInputVoid').click()}
          >
            <input type="file" id="fileInputVoid" className="hidden" accept="image/*"
                   onChange={e => e.target.files[0] && handleFile(e.target.files[0])} />
            <div className="w-16 h-16 rounded-md flex items-center justify-center transition-all duration-300"
                 style={{ background: dragging ? 'rgba(255,45,85,0.1)' : '#1b1b1b',
                          boxShadow: dragging ? '0 0 30px rgba(255,45,85,0.15)' : '0 20px 60px rgba(0,0,0,0.8)' }}>
              <CloudUpload size={26} style={{ color: dragging ? '#ff2d55' : '#333' }} />
            </div>
            <div>
              <p className="text-[16px] font-semibold text-white mb-1">
                {dragging ? 'Release to upload' : 'Drag & drop your image'}
              </p>
              <p className="text-[13px]" style={{ color: '#444' }}>
                or <span style={{ color: '#ff2d55', cursor:'pointer' }}>click to browse</span> — PNG, JPG, JPEG
              </p>
            </div>
            <div className="flex items-center gap-8 text-[11px]" style={{ color: '#333' }}>
              {[['#', 'pHash Fingerprint'], ['✦', 'Immutable Record'], ['◉', 'Timestamped']].map(([sym, lbl]) => (
                <span key={lbl} className="flex items-center gap-1.5">{sym} {lbl}</span>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-5 p-5 rounded-sm animate-void-in"
               style={{ background: 'rgba(255,45,85,0.04)', border: '1px solid rgba(255,45,85,0.12)' }}>
            <div className="relative shrink-0">
              <img src={preview} alt="preview" className="w-24 h-24 object-cover rounded-md"
                   style={{ border: '1px solid rgba(255,45,85,0.3)' }} />
              <button onClick={clearFile}
                      className="absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center"
                      style={{ background: '#1b1b1b', border: '1px solid rgba(255,255,255,0.1)', color: '#888' }}>
                <X size={12} />
              </button>
            </div>
            <div className="flex-1 space-y-3">
              <div>
                <p className="font-semibold text-[15px] text-white">{file.name}</p>
                <p className="void-label mt-0.5">{file.type.split('/')[1].toUpperCase()} · {(file.size/1024).toFixed(1)} KB</p>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 size={13} style={{ color: '#16ff9e' }} />
                <span className="text-[12px] font-medium" style={{ color: '#16ff9e' }}>File validated — ready to fingerprint</span>
              </div>
              {error && <p className="text-[12px]" style={{ color: '#ff2d55' }}>{error}</p>}
              <button onClick={processFile} disabled={loading}
                      className="btn-void-primary flex items-center gap-2 text-[12px] uppercase tracking-widest">
                {loading ? (
                  <><div className="w-3.5 h-3.5 rounded-full border-2 border-white/20 border-t-white animate-spin" />Hashing & Registering…</>
                ) : (
                  <><Upload size={13} />Complete Registration</>
                )}
              </button>
            </div>
          </div>
        )}
        {error && !file && <p className="text-[12px] mt-3" style={{ color: '#ff2d55' }}>{error}</p>}
      </div>

      {/* Registered Assets */}
      {registeredContent.length > 0 && (
        <div className="space-y-3 animate-void-in">
          <div className="flex items-center gap-3">
            <Shield size={15} style={{ color: '#16ff9e' }} />
            <h3 className="font-display font-bold text-[16px] text-white">Protected Assets</h3>
            <span className="ml-auto void-badge void-badge-secure">{registeredContent.length} registered</span>
          </div>
          <div className="space-y-2">
            {registeredContent.map((item, idx) => (
              <div key={idx} className="card-3d p-5 flex items-start gap-5">
                <div className="relative shrink-0">
                  <img src={item.previewUrl} alt={item.name}
                       className="w-[68px] h-[68px] object-cover rounded-md"
                       style={{ border: '1px solid rgba(255,255,255,0.08)' }} />
                  <div className="absolute -bottom-2 -right-2 w-6 h-6 rounded-full bg-[#16ff9e] flex items-center justify-center border-2"
                       style={{ borderColor: '#131313' }}>
                    <CheckCircle2 size={12} color="#000" />
                  </div>
                </div>
                <div className="flex-1 space-y-3 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-[14px] text-white">{item.name}</p>
                      <p className="void-label mt-0.5 flex items-center gap-1">
                        <Clock size={9} /> {new Date(item.timestamp).toLocaleString()}
                      </p>
                    </div>
                    <span className="void-badge void-badge-moderate shrink-0">Immutable</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 p-3 rounded-sm"
                       style={{ background: '#0e0e0e', border: '1px solid rgba(255,255,255,0.04)' }}>
                    <div>
                      <p className="void-label mb-1">Asset ID</p>
                      <p className="font-mono text-[11px] font-bold truncate" style={{ color: '#ff2d55' }}>{item.assetId}</p>
                    </div>
                    <div>
                      <p className="void-label mb-1">pHash</p>
                      <p className="font-mono text-[11px] font-bold tracking-widest truncate" style={{ color: '#16ff9e' }}>{item.hash}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
