import React, { useState, lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import Sidebar from './components/Sidebar';
import BootScreen from './components/BootScreen';
import StarField from './components/StarField';
import AuroraBackground from './components/AuroraBackground';
import Toast from './components/Toast';
import CommandPalette from './components/CommandPalette';
import useAppStore from './store/useAppStore';
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
      <div className="w-8 h-8 rounded-full border-2 border-cyan/20 border-t-cyan animate-spin" />
    </div>
  );
}

export default function App() {
  const bootComplete = useAppStore((s) => s.bootComplete);
  const hasBooted = sessionStorage.getItem('shieldip_boot') === 'true';
  const [showApp, setShowApp] = useState(hasBooted);
  const [mobileOpen, setMobileOpen] = useState(false);

  if (!showApp && !hasBooted) {
    return <BootScreen onComplete={() => setShowApp(true)} />;
  }

  return (
    <MobileMenuContext.Provider value={{ open: mobileOpen, setOpen: setMobileOpen }}>
      <div className="flex h-screen overflow-hidden bg-black relative">
        <StarField />
        <AuroraBackground />
        <div className="fixed inset-0 z-[2] pointer-events-none"
             style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

        {/* Mobile hamburger */}
        <button
          className="md:hidden fixed top-4 left-4 z-50 p-2 rounded-lg text-white"
          style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.12)' }}
          onClick={() => setMobileOpen((o) => !o)}
          aria-label="Toggle menu"
        >
          ☰
        </button>

        {/* Mobile overlay */}
        {mobileOpen && (
          <div className="md:hidden fixed inset-0 z-30 bg-black/50" onClick={() => setMobileOpen(false)} />
        )}

        <div className="relative z-10 flex w-full h-full">
          <Sidebar />
          <main className="flex-1 overflow-y-auto">
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
