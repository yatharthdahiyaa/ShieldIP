import React, { useState, lazy, Suspense } from 'react';
import { X } from 'lucide-react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import Sidebar from './components/Sidebar';
import StarField from './components/StarField';
import AuroraBackground from './components/AuroraBackground';
import Toast from './components/Toast';
import CommandPalette from './components/CommandPalette';
import ErrorBoundary from './components/ErrorBoundary';
import { MobileMenuContext } from './context/MobileMenuContext';

const Dashboard     = lazy(() => import('./pages/Dashboard'));
const Monitor       = lazy(() => import('./pages/Monitor'));
const Violations    = lazy(() => import('./pages/Violations'));
const Enforcement   = lazy(() => import('./pages/Enforcement'));
const Analytics     = lazy(() => import('./pages/Analytics'));
const Notifications = lazy(() => import('./pages/Notifications'));
const Settings      = lazy(() => import('./pages/Settings'));
const Assets        = lazy(() => import('./pages/Assets'));
const AuditLog      = lazy(() => import('./pages/AuditLog'));
const Profile       = lazy(() => import('./pages/Profile'));
const Traceability   = lazy(() => import('./pages/Traceability'));
const ApiKeys        = lazy(() => import('./pages/ApiKeys'));
const Help           = lazy(() => import('./pages/Help'));

function PageLoader() {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="relative">
        <div className="w-10 h-10 rounded-full border-2 border-cyan/10 border-t-cyan animate-spin" />
        <div className="absolute inset-0 w-10 h-10 rounded-full border-2 border-transparent border-b-secondary/30 animate-spin" style={{ animationDuration: '1.5s', animationDirection: 'reverse' }} />
        <div className="absolute inset-1/2 w-2 h-2 -ml-1 -mt-1 rounded-full bg-cyan/50 animate-pulse" />
      </div>
    </div>
  );
}

export default function App() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <MobileMenuContext.Provider value={{ open: mobileOpen, setOpen: setMobileOpen }}>
      <div className="flex h-screen overflow-hidden bg-black relative">
        <StarField />
        <AuroraBackground />
        <div className="fixed inset-0 z-[2] pointer-events-none"
             style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)', backgroundSize: '48px 48px' }} />
        <div className="noise-overlay" />

        {/* Mobile hamburger */}
        <button
          className="md:hidden fixed top-4 left-4 z-[60] p-2.5 rounded-xl text-white transition-colors"
          style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)' }}
          onClick={() => setMobileOpen((o) => !o)}
          aria-label="Toggle menu"
        >
          {mobileOpen
            ? <X size={18} />
            : <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><rect y="3" width="18" height="1.5" rx="1" fill="currentColor"/><rect y="8.25" width="18" height="1.5" rx="1" fill="currentColor"/><rect y="13.5" width="18" height="1.5" rx="1" fill="currentColor"/></svg>
          }
        </button>

        {/* Mobile overlay backdrop */}
        {mobileOpen && (
          <div className="md:hidden fixed inset-0 z-40 bg-black/70 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
        )}

        <div className="relative z-10 flex w-full h-full">
          <Sidebar />
          <main className="flex-1 overflow-y-auto pt-14 md:pt-0">
            <ErrorBoundary>
              <Suspense fallback={<PageLoader />}>
                <AnimatePresence mode="wait">
                  <Routes>
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/monitor" element={<Monitor />} />
                    <Route path="/violations" element={<Violations />} />
                    <Route path="/enforcement" element={<Enforcement />} />
                    <Route path="/analytics" element={<Analytics />} />
                    <Route path="/notifications" element={<Notifications />} />
                    <Route path="/settings" element={<Settings />} />
                    <Route path="/assets" element={<Assets />} />
                    <Route path="/audit" element={<AuditLog />} />
                    <Route path="/traceability" element={<Traceability />} />
                    <Route path="/profile" element={<Profile />} />
                    <Route path="/api-keys" element={<ApiKeys />} />
                    <Route path="/help" element={<Help />} />
                    <Route path="*" element={<Navigate to="/dashboard" replace />} />
                  </Routes>
                </AnimatePresence>
              </Suspense>
            </ErrorBoundary>
          </main>
        </div>

        <Toast />
        <CommandPalette />
      </div>
    </MobileMenuContext.Provider>
  );
}
