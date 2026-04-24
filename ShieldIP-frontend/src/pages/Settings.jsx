import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Settings as SettingsIcon, Shield, Globe, Bell, Palette, Gauge, CheckCircle2, AlertCircle } from 'lucide-react';
import { pageVariants } from '../utils/animations';
import useAppStore from '../store/useAppStore';

const TABS = [
  { key: 'scanning',    label: 'Scanning & Detection', icon: Shield },
  { key: 'platforms',   label: 'Platforms',            icon: Globe },
  { key: 'alerts',      label: 'Notifications',        icon: Bell },
  { key: 'appearance',  label: 'Appearance',           icon: Palette },
  { key: 'risk',        label: 'Risk Weights',         icon: Gauge },
];

function SettingRow({ label, description, error, children }) {
  return (
    <div className="py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
      <div className="flex items-center justify-between">
        <div className="flex-1 mr-4">
          <p className="text-[13px] text-white font-medium">{label}</p>
          {description && <p className="text-[11px] text-[#555] mt-0.5">{description}</p>}
          {error && <p className="text-[11px] text-primary mt-1 flex items-center gap-1"><AlertCircle size={10} /> {error}</p>}
        </div>
        {children}
      </div>
    </div>
  );
}

function Toggle({ id, value, onChange }) {
  return (
    <button
      id={id}
      role="switch"
      aria-checked={value}
      onClick={() => onChange(!value)}
      className={`relative w-10 h-5 rounded-full transition-colors duration-200 shrink-0 ${value ? 'bg-cyan' : 'bg-white/10'}`}
    >
      <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform duration-200 ${value ? 'translate-x-5' : 'translate-x-0.5'}`} />
    </button>
  );
}

function SliderInput({ id, value, onChange, min = 0, max = 100, step = 1 }) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="flex items-center gap-3 shrink-0">
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-32 h-1 rounded-full appearance-none cursor-pointer"
        style={{ background: `linear-gradient(to right, #06b6d4 0%, #06b6d4 ${pct}%, rgba(255,255,255,0.1) ${pct}%, rgba(255,255,255,0.1) 100%)` }}
      />
      <span className="font-mono text-[12px] text-white w-8 text-right">{value}</span>
    </div>
  );
}

export default function Settings() {
  const store = useAppStore();
  const [activeTab, setActiveTab] = useState('scanning');
  const [saved, setSaved] = useState(false);
  const [errors, setErrors] = useState({});

  // Local draft state — all changes are staged here, not written to store until Save
  const [draft, setDraft] = useState({
    scanFrequency:       store.scanFrequency,
    confidenceThreshold: store.confidenceThreshold,
    autoEnforcement:     store.autoEnforcement,
    monitoredPlatforms:  { ...store.monitoredPlatforms },
    emailAlerts:         store.emailAlerts,
    notificationSound:   store.notificationSound,
    alertThreshold:      store.alertThreshold,
    digestFrequency:     store.digestFrequency,
    auroraIntensity:     store.auroraIntensity,
    sidebarCollapsed:    store.sidebarCollapsed,
    riskWeights:         { ...store.riskWeights },
  });

  const set = (key, value) => setDraft((d) => ({ ...d, [key]: value }));
  const setNested = (key, subKey, value) =>
    setDraft((d) => ({ ...d, [key]: { ...d[key], [subKey]: value } }));

  const validate = () => {
    const errs = {};
    if (draft.scanFrequency < 1 || draft.scanFrequency > 60)
      errs.scanFrequency = 'Must be between 1 and 60 seconds.';
    if (draft.confidenceThreshold < 50 || draft.confidenceThreshold > 100)
      errs.confidenceThreshold = 'Must be between 50 and 100.';
    const totalWeight = Object.values(draft.riskWeights).reduce((s, v) => s + v, 0);
    if (totalWeight !== 100)
      errs.riskWeights = `Weights must sum to 100 (currently ${totalWeight}).`;
    return errs;
  };

  const handleSave = () => {
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    // Persist all draft values to Zustand (which writes to localStorage)
    Object.entries(draft).forEach(([key, value]) => {
      if (key === 'riskWeights') {
        store.updateRiskWeights(value);
      } else if (key === 'monitoredPlatforms') {
        Object.keys(value).forEach((platform) => {
          if (value[platform] !== store.monitoredPlatforms[platform]) {
            store.togglePlatform(platform);
          }
        });
      } else if (key === 'sidebarCollapsed') {
        store.setSidebarCollapsed(value);
      } else {
        store.updateSetting(key, value);
      }
    });

    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const platforms = Object.entries(draft.monitoredPlatforms);

  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit" className="p-8 space-y-6 max-w-3xl">
      <div>
        <h1 className="font-display font-extrabold text-[26px] text-white tracking-tight flex items-center gap-3">
          <SettingsIcon size={22} className="text-cyan" /> Settings
        </h1>
        <p className="text-[13px] mt-1 text-[#555]">Configure your ShieldIP experience — changes are staged until you click Save.</p>
      </div>

      {/* Tab Bar */}
      <div className="flex gap-1 p-1 rounded-lg w-fit" style={{ background: 'rgba(255,255,255,0.03)' }}>
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = activeTab === t.key;
          return (
            <button
              key={t.key}
              id={`settings-tab-${t.key}`}
              onClick={() => setActiveTab(t.key)}
              className={`flex items-center gap-2 px-3 py-2 rounded-md text-[12px] font-medium transition-all ${active ? 'bg-white/[0.07] text-white' : 'text-[#555] hover:text-[#888]'}`}
            >
              <Icon size={13} /> {t.label}
            </button>
          );
        })}
      </div>

      {/* Tab Panels — all rendered, toggled via CSS visibility to preserve state */}
      <div>
        {/* Scanning */}
        <div style={{ display: activeTab === 'scanning' ? 'block' : 'none' }}>
          <div className="rounded-xl p-6" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <SettingRow label="Scan Frequency" description="How often to check for new violations (seconds)" error={errors.scanFrequency}>
              <SliderInput id="setting-scan-freq" value={draft.scanFrequency} onChange={(v) => set('scanFrequency', v)} min={1} max={60} />
            </SettingRow>
            <SettingRow label="Confidence Threshold" description="Minimum match confidence % to flag as violation" error={errors.confidenceThreshold}>
              <SliderInput id="setting-confidence" value={draft.confidenceThreshold} onChange={(v) => set('confidenceThreshold', v)} min={50} max={100} />
            </SettingRow>
            <SettingRow label="Auto-enforcement" description="Automatically enforce critical violations">
              <Toggle id="setting-auto-enforce" value={draft.autoEnforcement} onChange={(v) => set('autoEnforcement', v)} />
            </SettingRow>
          </div>
        </div>

        {/* Platforms */}
        <div style={{ display: activeTab === 'platforms' ? 'block' : 'none' }}>
          <div className="rounded-xl p-6" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            {platforms.map(([name, enabled]) => (
              <SettingRow key={name} label={name} description={`Monitor violations on ${name}`}>
                <Toggle id={`setting-platform-${name}`} value={enabled} onChange={(v) => setNested('monitoredPlatforms', name, v)} />
              </SettingRow>
            ))}
          </div>
        </div>

        {/* Notifications */}
        <div style={{ display: activeTab === 'alerts' ? 'block' : 'none' }}>
          <div className="rounded-xl p-6" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <SettingRow label="Email Alerts" description="Receive email for new critical violations">
              <Toggle id="setting-email-alerts" value={draft.emailAlerts} onChange={(v) => set('emailAlerts', v)} />
            </SettingRow>
            <SettingRow label="Sound Alerts" description="Play sound for new violations">
              <Toggle id="setting-sound-alerts" value={draft.notificationSound} onChange={(v) => set('notificationSound', v)} />
            </SettingRow>
            <SettingRow label="Alert Threshold" description="Minimum threat level for alerts">
              <select
                id="setting-alert-threshold"
                value={draft.alertThreshold}
                onChange={(e) => set('alertThreshold', e.target.value)}
                className="void-input text-[12px] px-3 py-1.5"
              >
                <option value="critical">Critical only</option>
                <option value="high">High &amp; above</option>
                <option value="medium">Medium &amp; above</option>
              </select>
            </SettingRow>
            <SettingRow label="Digest Frequency">
              <select
                id="setting-digest-freq"
                value={draft.digestFrequency}
                onChange={(e) => set('digestFrequency', e.target.value)}
                className="void-input text-[12px] px-3 py-1.5"
              >
                <option value="realtime">Real-time</option>
                <option value="hourly">Hourly</option>
                <option value="daily">Daily</option>
              </select>
            </SettingRow>
          </div>
        </div>

        {/* Appearance */}
        <div style={{ display: activeTab === 'appearance' ? 'block' : 'none' }}>
          <div className="rounded-xl p-6" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <SettingRow label="Aurora Intensity" description="Background glow intensity (0 = off, 100 = full)">
              <SliderInput id="setting-aurora" value={draft.auroraIntensity} onChange={(v) => set('auroraIntensity', v)} min={0} max={100} />
            </SettingRow>
            <SettingRow label="Sidebar Collapsed" description="Start with collapsed sidebar">
              <Toggle id="setting-sidebar" value={draft.sidebarCollapsed} onChange={(v) => set('sidebarCollapsed', v)} />
            </SettingRow>
          </div>
        </div>

        {/* Risk Weights */}
        <div style={{ display: activeTab === 'risk' ? 'block' : 'none' }}>
          <div className="rounded-xl p-6" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            {errors.riskWeights && (
              <div className="mb-4 flex items-center gap-2 px-4 py-2 rounded-lg text-[12px]"
                   style={{ background: 'rgba(255,45,85,0.06)', border: '1px solid rgba(255,45,85,0.15)', color: '#ff2d55' }}>
                <AlertCircle size={13} /> {errors.riskWeights}
              </div>
            )}
            {Object.entries(draft.riskWeights).map(([key, val]) => (
              <SettingRow key={key} label={key.charAt(0).toUpperCase() + key.slice(1)} description={`Current weight: ${val}%`}>
                <SliderInput
                  id={`setting-risk-${key}`}
                  value={val}
                  onChange={(v) => setNested('riskWeights', key, v)}
                />
              </SettingRow>
            ))}
            <p className="text-[11px] text-[#555] mt-3">
              Total: <span className={Object.values(draft.riskWeights).reduce((s,v)=>s+v,0) === 100 ? 'text-[#16ff9e]' : 'text-primary'}>
                {Object.values(draft.riskWeights).reduce((s,v)=>s+v,0)}%
              </span> (must equal 100%)
            </p>
          </div>
        </div>
      </div>

      {/* Save Row */}
      <div className="flex items-center justify-end gap-3 pt-2">
        {saved && (
          <span className="flex items-center gap-1.5 text-[12px] font-semibold text-[#16ff9e]">
            <CheckCircle2 size={14} /> Settings saved to local storage
          </span>
        )}
        {Object.keys(errors).length > 0 && (
          <span className="flex items-center gap-1.5 text-[12px] font-semibold text-primary">
            <AlertCircle size={14} /> Fix validation errors before saving
          </span>
        )}
        <button
          id="settings-save-btn"
          onClick={handleSave}
          className="flex items-center gap-2 px-6 py-2.5 rounded-lg font-bold text-[12px] uppercase tracking-widest text-white transition-all hover:shadow-cyan-glow"
          style={{ background: 'linear-gradient(135deg, #06b6d4, #0891b2)' }}
        >
          Save Settings
        </button>
      </div>
    </motion.div>
  );
}
