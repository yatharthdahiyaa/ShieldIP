import React from 'react';
import { motion } from 'framer-motion';
import { Settings as SettingsIcon, Sliders, Bell, Shield, Globe, Cpu, Palette, Gauge, Volume2 } from 'lucide-react';
import { pageVariants } from '../utils/animations';
import useAppStore from '../store/useAppStore';

function SettingSection({ title, icon: Icon, children }) {
  return (
    <div className="rounded-xl p-6" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
      <div className="flex items-center gap-3 mb-5">
        <Icon size={16} className="text-cyan" />
        <h3 className="font-display font-bold text-[16px] text-white">{title}</h3>
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function SettingRow({ label, description, children }) {
  return (
    <div className="flex items-center justify-between py-2">
      <div>
        <p className="text-[13px] text-white font-medium">{label}</p>
        {description && <p className="text-[11px] text-[#555] mt-0.5">{description}</p>}
      </div>
      {children}
    </div>
  );
}

function Toggle({ value, onChange }) {
  return (
    <button onClick={() => onChange(!value)}
      className={`relative w-10 h-5 rounded-full transition-colors duration-200 ${value ? 'bg-cyan' : 'bg-white/10'}`}>
      <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform duration-200 ${value ? 'translate-x-5' : 'translate-x-0.5'}`} />
    </button>
  );
}

function SliderInput({ value, onChange, min = 0, max = 100, step = 1 }) {
  return (
    <div className="flex items-center gap-3">
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))}
        className="w-32 h-1 rounded-full appearance-none cursor-pointer"
        style={{ background: `linear-gradient(to right, #06b6d4 0%, #06b6d4 ${((value - min) / (max - min)) * 100}%, rgba(255,255,255,0.1) ${((value - min) / (max - min)) * 100}%, rgba(255,255,255,0.1) 100%)` }} />
      <span className="font-mono text-[12px] text-white w-8 text-right">{value}</span>
    </div>
  );
}

export default function Settings() {
  const store = useAppStore();

  const platforms = Object.entries(store.monitoredPlatforms);

  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit" className="p-8 space-y-6 max-w-3xl">
      <div>
        <h1 className="font-display font-extrabold text-[26px] text-white tracking-tight flex items-center gap-3">
          <SettingsIcon size={22} className="text-cyan" /> Settings
        </h1>
        <p className="text-[13px] mt-1 text-[#555]">Configure your ShieldIP experience</p>
      </div>

      <SettingSection title="Scanning & Detection" icon={Shield}>
        <SettingRow label="Scan Frequency" description="How often to check for new violations (seconds)">
          <SliderInput value={store.scanFrequency} onChange={(v) => store.updateSetting('scanFrequency', v)} min={1} max={30} />
        </SettingRow>
        <SettingRow label="Confidence Threshold" description="Minimum match confidence to flag as violation">
          <SliderInput value={store.confidenceThreshold} onChange={(v) => store.updateSetting('confidenceThreshold', v)} min={50} max={100} />
        </SettingRow>
        <SettingRow label="Auto-enforcement" description="Automatically enforce critical violations">
          <Toggle value={store.autoEnforcement} onChange={(v) => store.updateSetting('autoEnforcement', v)} />
        </SettingRow>
      </SettingSection>

      <SettingSection title="Monitored Platforms" icon={Globe}>
        {platforms.map(([name, enabled]) => (
          <SettingRow key={name} label={name}>
            <Toggle value={enabled} onChange={() => store.togglePlatform(name)} />
          </SettingRow>
        ))}
      </SettingSection>

      <SettingSection title="Notifications" icon={Bell}>
        <SettingRow label="Email Alerts" description="Receive email for new critical violations">
          <Toggle value={store.emailAlerts} onChange={(v) => store.updateSetting('emailAlerts', v)} />
        </SettingRow>
        <SettingRow label="Sound Alerts" description="Play sound for new violations">
          <Toggle value={store.notificationSound} onChange={(v) => store.updateSetting('notificationSound', v)} />
        </SettingRow>
        <SettingRow label="Alert Threshold" description="Minimum threat level for alerts">
          <select value={store.alertThreshold} onChange={(e) => store.updateSetting('alertThreshold', e.target.value)} className="void-input text-[12px] px-3 py-1.5">
            <option value="critical">Critical only</option>
            <option value="high">High & above</option>
            <option value="medium">Medium & above</option>
          </select>
        </SettingRow>
        <SettingRow label="Digest Frequency">
          <select value={store.digestFrequency} onChange={(e) => store.updateSetting('digestFrequency', e.target.value)} className="void-input text-[12px] px-3 py-1.5">
            <option value="realtime">Real-time</option>
            <option value="hourly">Hourly</option>
            <option value="daily">Daily</option>
          </select>
        </SettingRow>
      </SettingSection>

      <SettingSection title="Appearance" icon={Palette}>
        <SettingRow label="Aurora Intensity" description="Background glow intensity">
          <SliderInput value={store.auroraIntensity} onChange={(v) => store.updateSetting('auroraIntensity', v)} />
        </SettingRow>
        <SettingRow label="Sidebar Collapsed" description="Start with collapsed sidebar">
          <Toggle value={store.sidebarCollapsed} onChange={(v) => store.setSidebarCollapsed(v)} />
        </SettingRow>
      </SettingSection>

      <SettingSection title="Risk Scoring Weights" icon={Gauge}>
        {Object.entries(store.riskWeights).map(([key, val]) => (
          <SettingRow key={key} label={key.charAt(0).toUpperCase() + key.slice(1)} description={`Weight: ${val}%`}>
            <SliderInput value={val} onChange={(v) => store.updateRiskWeights({ ...store.riskWeights, [key]: v })} />
          </SettingRow>
        ))}
      </SettingSection>
    </motion.div>
  );
}
