import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const ViolationContext = createContext();

export const useViolations = () => useContext(ViolationContext);

const SEED_VIOLATIONS = [
  { id: 'V-1001', platform: 'YouTube', url: 'youtube.com/watch?v=mock1', confidence: 99, region: 'North America', timestamp: Date.now() - 10000, riskScore: 92, domainAuth: 'High', priorFlag: true, licensed: false },
  { id: 'V-1002', platform: 'TikTok', url: 'tiktok.com/@user/video/mock2', confidence: 85, region: 'Asia Pacific', timestamp: Date.now() - 25000, riskScore: 78, domainAuth: 'Medium', priorFlag: false, licensed: false },
  { id: 'V-1003', platform: 'Instagram', url: 'instagram.com/p/mock3', confidence: 95, region: 'Europe', timestamp: Date.now() - 45000, riskScore: 88, domainAuth: 'High', priorFlag: true, licensed: false },
  { id: 'V-1004', platform: 'X', url: 'x.com/user/status/mock4', confidence: 75, region: 'Global', timestamp: Date.now() - 60000, riskScore: 60, domainAuth: 'Low', priorFlag: false, licensed: true },
  { id: 'V-1005', platform: 'Twitch', url: 'twitch.tv/videos/mock5', confidence: 92, region: 'South America', timestamp: Date.now() - 80000, riskScore: 85, domainAuth: 'High', priorFlag: true, licensed: false }
];

const PLATFORMS = ['YouTube', 'TikTok', 'Instagram', 'X', 'Twitch'];
const REGIONS = ['North America', 'South America', 'Europe', 'Asia Pacific', 'Global'];

export const ViolationProvider = ({ children }) => {
  const [violations, setViolations] = useState(SEED_VIOLATIONS);
  const [selectedViolation, setSelectedViolation] = useState(null);
  const [demoMode, setDemoMode] = useState(false);
  const [registeredContent, setRegisteredContent] = useState([]);
  const [enforcementLogs, setEnforcementLogs] = useState([]);

  // Layer 2: Live Updating feed simulation
  useEffect(() => {
    let interval;
    if (demoMode) {
      interval = setInterval(() => {
        const newVio = {
          id: `V-${Math.floor(1000 + Math.random() * 9000)}`,
          platform: PLATFORMS[Math.floor(Math.random() * PLATFORMS.length)],
          url: `mock-url-${Date.now().toString().slice(-4)}`,
          confidence: Math.floor(Math.random() * 40) + 60, // 60-100
          region: REGIONS[Math.floor(Math.random() * REGIONS.length)],
          timestamp: Date.now(),
          riskScore: Math.floor(Math.random() * 60) + 40,
          domainAuth: ['Low', 'Medium', 'High'][Math.floor(Math.random() * 3)],
          priorFlag: Math.random() > 0.5,
          licensed: Math.random() > 0.8
        };
        
        setViolations(prev => [newVio, ...prev].slice(0, 50));
        
        // Auto-select for demo
        if (Math.random() > 0.6) {
          setSelectedViolation(newVio);
        }
      }, 5000); // New violation every 5s
    }

    return () => clearInterval(interval);
  }, [demoMode]);

  const recordEnforcement = useCallback((action, itemContext) => {
    setEnforcementLogs(prev => [{
      id: `E-${Date.now()}`,
      action,
      targetId: itemContext.id,
      timestamp: Date.now(),
      status: 'pending'
    }, ...prev]);
  }, []);

  return (
    <ViolationContext.Provider value={{
      violations,
      selectedViolation,
      setSelectedViolation,
      demoMode,
      setDemoMode,
      registeredContent,
      setRegisteredContent,
      enforcementLogs,
      recordEnforcement
    }}>
      {children}
    </ViolationContext.Provider>
  );
};
