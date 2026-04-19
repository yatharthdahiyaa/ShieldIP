import React from 'react';
import useAppStore from '../store/useAppStore';

export default function AuroraBackground() {
  const intensity = useAppStore((s) => s.auroraIntensity);
  const opMul = intensity / 100;

  return (
    <div className="fixed inset-0 z-[1] pointer-events-none overflow-hidden" aria-hidden="true">
      <div
        className="absolute animate-aurora-1"
        style={{
          width: 600,
          height: 600,
          borderRadius: '50%',
          background: `radial-gradient(circle, rgba(6,182,212,${0.15 * opMul}) 0%, transparent 70%)`,
          left: '15%',
          top: '30%',
          filter: 'blur(80px)',
        }}
      />
      <div
        className="absolute animate-aurora-2"
        style={{
          width: 500,
          height: 500,
          borderRadius: '50%',
          background: `radial-gradient(circle, rgba(124,58,237,${0.12 * opMul}) 0%, transparent 70%)`,
          right: '10%',
          top: '20%',
          filter: 'blur(80px)',
        }}
      />
    </div>
  );
}
