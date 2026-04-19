import React from 'react';
import clsx from 'clsx';

export function SkeletonLine({ className }) {
  return <div className={clsx('void-skeleton h-4 rounded', className)} />;
}

export function SkeletonCard({ className }) {
  return (
    <div className={clsx('rounded-xl p-5 space-y-3', className)}
         style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
      <div className="void-skeleton h-4 w-1/3 rounded" />
      <div className="void-skeleton h-8 w-2/3 rounded" />
      <div className="void-skeleton h-3 w-1/2 rounded" />
    </div>
  );
}

export function SkeletonTable({ rows = 5 }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 p-4 rounded-lg" style={{ background: 'rgba(255,255,255,0.02)' }}>
          <div className="void-skeleton h-10 w-10 rounded-md shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="void-skeleton h-4 w-1/3 rounded" />
            <div className="void-skeleton h-3 w-2/3 rounded" />
          </div>
          <div className="void-skeleton h-6 w-16 rounded shrink-0" />
        </div>
      ))}
    </div>
  );
}

export default function Skeleton({ type = 'card', count = 1, ...props }) {
  const Comp = type === 'table' ? SkeletonTable : type === 'line' ? SkeletonLine : SkeletonCard;
  if (type === 'table') return <Comp {...props} />;
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => <Comp key={i} {...props} />)}
    </div>
  );
}
