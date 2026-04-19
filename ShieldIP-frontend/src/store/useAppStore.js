import { create } from 'zustand';

const loadSettings = () => {
  try {
    const raw = localStorage.getItem('shieldip_settings');
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
};

const defaults = {
  sidebarCollapsed: false,
  theme: 'dark',
  auroraIntensity: 100,
  reduceMotion: false,
  bootComplete: false,
  scanFrequency: 5,
  confidenceThreshold: 70,
  autoEnforcement: false,
  emailAlerts: true,
  alertThreshold: 'high',
  notificationSound: false,
  digestFrequency: 'realtime',
  monitoredPlatforms: { YouTube: true, TikTok: true, Instagram: true, X: true, Twitch: true, Dailymotion: false },
  riskWeights: { severity: 30, reach: 25, repeat: 25, license: 20 },
};

const useAppStore = create((set, get) => ({
  ...defaults,
  ...loadSettings(),

  toasts: [],
  unreadCount: 0,
  readNotificationIds: new Set(),

  setSidebarCollapsed: (v) => set(() => {
    const val = typeof v === 'function' ? v(get().sidebarCollapsed) : v;
    persist('sidebarCollapsed', val);
    return { sidebarCollapsed: val };
  }),

  setBootComplete: (v) => {
    sessionStorage.setItem('shieldip_boot', 'true');
    set({ bootComplete: v });
  },

  updateSetting: (key, value) => set(() => {
    persist(key, value);
    return { [key]: value };
  }),

  updateRiskWeights: (weights) => set(() => {
    persist('riskWeights', weights);
    return { riskWeights: weights };
  }),

  togglePlatform: (platform) => set((s) => {
    const next = { ...s.monitoredPlatforms, [platform]: !s.monitoredPlatforms[platform] };
    persist('monitoredPlatforms', next);
    return { monitoredPlatforms: next };
  }),

  addToast: (toast) => set((s) => {
    const id = Date.now() + Math.random();
    const t = { id, ...toast };
    setTimeout(() => get().removeToast(id), toast.duration || 4000);
    return { toasts: [...s.toasts, t].slice(-5) };
  }),

  removeToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

  setUnreadCount: (n) => set({ unreadCount: n }),

  markNotificationRead: (id) => set((s) => {
    const next = new Set(s.readNotificationIds);
    next.add(id);
    return { readNotificationIds: next };
  }),
}));

function persist(key, value) {
  try {
    const current = loadSettings();
    current[key] = value;
    localStorage.setItem('shieldip_settings', JSON.stringify(current));
  } catch { /* quota exceeded */ }
}

export default useAppStore;
