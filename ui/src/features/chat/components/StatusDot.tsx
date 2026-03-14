/**
 * StatusDot.tsx
 * 
 * Reusable colored presence indicator dot.
 * ⚫ gray   = idle (logged in)
 * 🟡 amber  = busy (on another screen)
 * 🟢 green  = active in chat (go ahead!)  
 * 🔴 red    = DND (do not disturb)
 */

import React from 'react';
import type { PresenceStatus } from '../hooks/usePresence';

interface StatusDotProps {
    status: PresenceStatus | null | undefined;
    size?: 'sm' | 'md' | 'lg';
    showLabel?: boolean;
    className?: string;
}

const STATUS_CONFIG: Record<PresenceStatus, { color: string; label: string; ring: string }> = {
    idle:   { color: '#9CA3AF', label: 'Online',       ring: 'rgba(156,163,175,0.4)' },
    busy:   { color: '#F59E0B', label: 'Busy',         ring: 'rgba(245,158,11,0.4)'  },
    active: { color: '#22C55E', label: 'Active',       ring: 'rgba(34,197,94,0.5)'   },
    dnd:    { color: '#EF4444', label: 'Do Not Disturb', ring: 'rgba(239,68,68,0.4)' },
};

const SIZE_MAP = {
    sm: 'w-2 h-2',
    md: 'w-2.5 h-2.5',
    lg: 'w-3.5 h-3.5',
};

export const StatusDot: React.FC<StatusDotProps> = ({
    status,
    size = 'sm',
    showLabel = false,
    className = '',
}) => {
    if (!status) {
        // Offline / no presence doc
        return (
            <span
                className={`${SIZE_MAP[size]} rounded-full bg-white/10 border border-white/15 inline-block shrink-0 ${className}`}
                title="Offline"
            />
        );
    }

    const cfg = STATUS_CONFIG[status];

    return (
        <span className={`inline-flex items-center gap-1.5 ${className}`}>
            <span
                className={`${SIZE_MAP[size]} rounded-full inline-block shrink-0`}
                style={{
                    backgroundColor: cfg.color,
                    boxShadow: `0 0 ${size === 'lg' ? '8px' : '5px'} ${cfg.ring}`,
                }}
                title={cfg.label}
            />
            {showLabel && (
                <span className="text-[10px]" style={{ color: cfg.color }}>
                    {cfg.label}
                </span>
            )}
        </span>
    );
};
