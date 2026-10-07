import React from 'react';

interface Props {
  isOpen: boolean;
  size?: 'sm' | 'md' | 'lg';
  showPulse?: boolean;
}

export const StoreStatusBadge: React.FC<Props> = ({ isOpen, size = 'md', showPulse = true }) => {
  const sizeClasses = {
    sm: 'text-xs px-2.5 py-0.5',
    md: 'text-sm px-3.5 py-1',
    lg: 'text-base px-5 py-2 font-semibold',
  }[size];

  if (isOpen) {
    return (
      <span
        className={`inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 font-medium text-emerald-400 transition-all ${sizeClasses}`}
      >
        <span className="relative flex h-2.5 w-2.5">
          {showPulse && (
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
          )}
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500"></span>
        </span>
        <span>K99 Sedang Buka</span>
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border border-rose-500/30 bg-rose-500/10 font-medium text-rose-400 transition-all ${sizeClasses}`}
    >
      <span className="h-2.5 w-2.5 rounded-full bg-rose-500"></span>
      <span>K99 Sedang Tutup</span>
    </span>
  );
};
