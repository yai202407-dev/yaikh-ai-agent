/**
 * IdentitySelector.tsx
 *
 * Phase 2: "Who are you?" modal.
 * Fetches real users from /api/users (MongoDB), lets the user
 * pick themselves. Stores the selection in localStorage.
 * Appears on first visit, can be re-opened from the header.
 */

import React, { useState, useEffect, useCallback } from 'react';
import type { DmUser } from '../hooks/useDmChat';

interface IdentitySelectorProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (user: DmUser) => void;
    currentUser: DmUser | null;
}

interface ApiUser {
    id: string;
    name: string;
    department: string;
    position: string;
    email: string;
    avatar: string | null;
}

const STORAGE_KEY = 'yai_identity';

export const IdentitySelector: React.FC<IdentitySelectorProps> = ({ isOpen, onClose, onSelect, currentUser }) => {
    const [users, setUsers] = useState<ApiUser[]>([]);
    const [filtered, setFiltered] = useState<ApiUser[]>([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedId, setSelectedId] = useState<string | null>(currentUser?.id || null);

    const fetchUsers = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/users?limit=500');
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            if (data.success) {
                setUsers(data.users);
                setFiltered(data.users);
            } else {
                throw new Error(data.error || 'Unknown error');
            }
        } catch (err: any) {
            setError(`Could not load users: ${err.message}`);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (isOpen && users.length === 0) fetchUsers();
    }, [isOpen, users.length, fetchUsers]);

    useEffect(() => {
        const q = search.toLowerCase().trim();
        if (!q) {
            setFiltered(users);
        } else {
            setFiltered(users.filter(u =>
                u.name.toLowerCase().includes(q) ||
                u.department.toLowerCase().includes(q) ||
                u.position.toLowerCase().includes(q)
            ));
        }
    }, [search, users]);

    const handleConfirm = () => {
        const user = users.find(u => u.id === selectedId);
        if (!user) return;
        const dmUser: DmUser = {
            id: user.id,
            name: user.name,
            department: user.department,
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(dmUser));
        onSelect(dmUser);
        onClose();
    };

    // Group by department
    const deptGroups = filtered.reduce<Record<string, ApiUser[]>>((acc, user) => {
        const dept = user.department || 'General';
        if (!acc[dept]) acc[dept] = [];
        acc[dept].push(user);
        return acc;
    }, {});

    const initials = (name: string) =>
        name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

    const colors = ['#FF6B2C', '#E84E0F', '#C73E0C', '#A32D09', '#7F1D09','#FF8C42','#FF6B2C'];
    const userColor = (id: string) => colors[id.charCodeAt(0) % colors.length];

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

            {/* Modal */}
            <div className="relative w-full max-w-lg bg-[#0D1117] rounded-2xl border border-white/10 shadow-2xl flex flex-col max-h-[85vh] z-10 overflow-hidden">

                {/* Header */}
                <div className="px-6 py-5 border-b border-white/5 shrink-0">
                    <div className="flex items-center gap-3 mb-1">
                        <div className="w-8 h-8 rounded-xl bg-[#FF6B2C]/20 flex items-center justify-center">
                            <svg className="w-4 h-4 text-[#FF6B2C]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                        </div>
                        <div>
                            <h2 className="text-white font-bold text-base">Who are you?</h2>
                            <p className="text-white/40 text-xs">Select your identity to start chatting</p>
                        </div>
                        <button onClick={onClose} className="ml-auto text-white/30 hover:text-white/70 p-1.5 rounded-lg hover:bg-white/5 transition-colors">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                    {/* Search */}
                    <div className="mt-4 relative">
                        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <input
                            type="text"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Search by name or department..."
                            className="w-full bg-[#1C2128] border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white/80 placeholder-white/25 outline-none focus:border-[#FF6B2C]/40 transition-colors"
                        />
                    </div>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto custom-scrollbar px-4 py-3">
                    {loading && (
                        <div className="flex justify-center items-center h-32">
                            <div className="w-6 h-6 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" />
                            <span className="ml-3 text-white/30 text-sm">Loading employees...</span>
                        </div>
                    )}

                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-red-400 text-sm text-center">
                            <p>{error}</p>
                            <button onClick={fetchUsers} className="mt-2 text-[#FF6B2C] hover:underline text-xs">
                                Try again
                            </button>
                        </div>
                    )}

                    {!loading && !error && Object.entries(deptGroups).sort(([a], [b]) => a.localeCompare(b)).map(([dept, deptUsers]) => (
                        <div key={dept} className="mb-5">
                            <p className="text-[10px] text-white/25 uppercase tracking-widest font-bold mb-2 px-2 sticky top-0 bg-[#0D1117] py-1">
                                {dept} <span className="text-white/15">({deptUsers.length})</span>
                            </p>
                            <div className="space-y-1">
                                {deptUsers.map(user => {
                                    const isSelected = user.id === selectedId;
                                    const isCurrent = user.id === currentUser?.id;
                                    return (
                                        <button
                                            key={user.id}
                                            onClick={() => setSelectedId(user.id)}
                                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left group ${
                                                isSelected
                                                    ? 'bg-[#FF6B2C]/15 border border-[#FF6B2C]/40'
                                                    : 'hover:bg-white/5 border border-transparent'
                                            }`}
                                        >
                                            <div
                                                className="w-9 h-9 rounded-full flex items-center justify-center text-[13px] font-bold text-white shrink-0 shadow-sm"
                                                style={{ background: `linear-gradient(135deg, ${userColor(user.id)}55, #1C2128)` }}
                                            >
                                                {initials(user.name)}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className={`text-sm font-semibold truncate ${isSelected ? 'text-white' : 'text-white/80'}`}>
                                                    {user.name}
                                                    {isCurrent && <span className="ml-2 text-[10px] text-[#FF6B2C] font-normal">(current)</span>}
                                                </p>
                                                {user.position && (
                                                    <p className="text-[11px] text-white/35 truncate">{user.position}</p>
                                                )}
                                            </div>
                                            {isSelected && (
                                                <svg className="w-4 h-4 text-[#FF6B2C] shrink-0" fill="currentColor" viewBox="0 0 24 24">
                                                    <path d="M20.285 2l-11.285 11.567-5.286-5.011-3.714 3.716 9 8.728 15-15.285z" />
                                                </svg>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    ))}

                    {!loading && !error && filtered.length === 0 && (
                        <div className="text-center text-white/25 text-sm py-12">
                            No employees match your search
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-white/5 shrink-0 flex items-center gap-3">
                    <div className="flex-1 text-xs text-white/30">
                        {selectedId ? (
                            <span>✓ Selected: <span className="text-white/60">{users.find(u => u.id === selectedId)?.name}</span></span>
                        ) : (
                            'Select your name from the list above'
                        )}
                    </div>
                    <button
                        onClick={handleConfirm}
                        disabled={!selectedId}
                        className="px-5 py-2 bg-[#FF6B2C] hover:bg-[#E84E0F] disabled:opacity-30 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl transition-all shadow-lg hover:shadow-orange-500/25"
                    >
                        Confirm Identity
                    </button>
                </div>
            </div>
        </div>
    );
};

// Helper: load stored identity or return null
export const loadStoredIdentity = (): DmUser | null => {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return null;
        return JSON.parse(raw) as DmUser;
    } catch {
        return null;
    }
};
