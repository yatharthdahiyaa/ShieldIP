import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  // WARNING: sessionStorage is accessible to any JS running on the page (XSS risk).
  // In production, migrate to httpOnly cookie-based auth and remove this interceptor.
  const token = sessionStorage.getItem('GOOGLE_ID_TOKEN');
  if (!token) return config; // don't attach empty Bearer header
  config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      console.warn('[ShieldIP] Unauthorized — token may be expired');
    }
    return Promise.reject(error);
  }
);

export const fetchHealth = () => api.get('/health').then((r) => r.data);
export const fetchAssets = () => api.get('/assets').then((r) => r.data);
export const registerAsset = (data) => api.post('/assets/register', data).then((r) => r.data);
export const fetchAsset = (id) => api.get(`/assets/${id}`).then((r) => r.data);
export const fetchViolations = (params) => api.get('/violations', { params }).then((r) => r.data);
export const fetchViolation = (id) => api.get(`/violations/${id}`).then((r) => r.data);
export const triggerEnforcement = (id, body) => api.post(`/violations/${id}/enforce`, body).then((r) => r.data);
export const fetchAnalyticsSummary = () => api.get('/analytics/summary').then((r) => r.data);
export const fetchAnalyticsByPlatform = () => api.get('/analytics/by-platform').then((r) => r.data);
export const fetchChains = () => api.get('/chains').then((r) => r.data);
export const fetchChain = (chainId) => api.get(`/chains/${chainId}`).then((r) => r.data);
export const fetchChainTimeline = (chainId) => api.get(`/chains/${chainId}/timeline`).then((r) => r.data);
export const fetchAssetChains = (assetId) => api.get(`/assets/${assetId}/chains`).then((r) => r.data);
export const fetchTraceabilitySummary = () => api.get('/analytics/traceability-summary').then((r) => r.data);

export const fetchAlerts = (params) => api.get('/alerts', { params }).then((r) => r.data);
export const markAlertRead = (id) => api.patch(`/alerts/${id}/read`).then((r) => r.data);
export const markAllAlertsRead = () => api.patch('/alerts/read-all').then((r) => r.data);

export default api;
