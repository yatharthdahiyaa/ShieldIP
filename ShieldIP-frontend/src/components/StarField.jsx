import React, { useMemo } from 'react';

export default function StarField() {
  const stars = useMemo(() =>
    Array.from({ length: 150 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 1.5 + 0.5,
      duration: Math.random() * 3 + 2,
      delay: Math.random() * 5,
    })), []);

  return (
    <div className="fixed inset-0 z-0 pointer-events-none" aria-hidden="true">
      {stars.map((s) => (
        <div
          key={s.id}
          className="absolute rounded-full bg-white"
          style={{
            left: `${s.x}%`,
            top: `${s.y}%`,
            width: `${s.size}px`,
            height: `${s.size}px`,
            animation: `twinkle ${s.duration}s ease-in-out ${s.delay}s infinite`,
            opacity: 0.2,
          }}
        />
      ))}
    </div>
  );
}
