import React, { useState } from 'react';

interface ComDeckProps {
    isOpen: boolean;
    onClose: () => void;
}

interface Department {
    id: string;
    name: string;
    icon: React.ReactNode;
    users: { id: number; name: string }[];
}

const departments: Department[] = [
    {
        id: 'accounts', name: 'Accounts',
        icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-7 h-7"><path strokeLinecap="round" strokeLinejoin="round" d="M9 7H6a2 2 0 00-2 2v9a2 2 0 002 2h9a2 2 0 002-2v-3M9 7V5a2 2 0 012-2h2a2 2 0 012 2v2M9 7h6M9 12h3m0 0h3m-3 0v3" /></svg>,
        users: [{ id: 1, name: 'Sothirich P.' }, { id: 2, name: 'Viroth K.' }, { id: 3, name: 'Daly C.' }, { id: 4, name: 'Nicole T.' }]
    },
    {
        id: 'admin', name: 'Admin',
        icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-7 h-7"><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
        users: [{ id: 5, name: 'Gamini A.' }, { id: 6, name: 'Samnang T.' }, { id: 7, name: 'Menghorng S.' }]
    },
    {
        id: 'hr', name: 'HR & Pay',
        icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-7 h-7"><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
        users: [{ id: 8, name: 'Brasna C.' }, { id: 9, name: 'Siyet K.' }, { id: 10, name: 'Thearith Y.' }, { id: 11, name: 'Anna Y.' }]
    },
    {
        id: 'csr', name: 'CSR',
        icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-7 h-7"><path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>,
        users: [{ id: 12, name: 'Khun B.' }, { id: 13, name: 'YMTM S.' }, { id: 14, name: 'Hencsr L.' }]
    },
    {
        id: 'mr', name: 'MR',
        icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-7 h-7"><path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>,
        users: [{ id: 15, name: 'Neang S.' }, { id: 16, name: 'Van V.' }, { id: 17, name: 'Samnang K.' }]
    },
    {
        id: 'sourcing', name: 'Sourcing',
        icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-7 h-7"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>,
        users: [{ id: 18, name: 'Vinh D.' }, { id: 19, name: 'Chheang M.' }, { id: 20, name: 'Chhem S.' }]
    },
    {
        id: 'planning', name: 'Planning',
        icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-7 h-7"><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>,
        users: [{ id: 21, name: 'Sok S.' }, { id: 22, name: 'Seklas M.' }, { id: 23, name: 'Sin K.' }]
    },
    {
        id: 'logistics', name: 'Logistics',
        icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-7 h-7"><path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>,
        users: [{ id: 24, name: 'Dat S.' }, { id: 25, name: 'Sim A.' }, { id: 26, name: 'Yeang S.' }]
    },
    {
        id: 'warehouse', name: 'Warehouse',
        icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-7 h-7"><path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>,
        users: [{ id: 27, name: 'Sokha L.' }, { id: 28, name: 'Ratha P.' }, { id: 29, name: 'Bunthan K.' }]
    },
    {
        id: 'quality', name: 'Quality',
        icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-7 h-7"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" /></svg>,
        users: [{ id: 30, name: 'Sopheap R.' }, { id: 31, name: 'Kosal M.' }, { id: 32, name: 'Somaly T.' }]
    },
    {
        id: 'production', name: 'Production',
        icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-7 h-7"><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
        users: [{ id: 33, name: 'Vanna S.' }, { id: 34, name: 'Chanthy N.' }, { id: 35, name: 'Mony K.' }]
    },
    {
        id: 'mechanic', name: 'Mechanic',
        icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-7 h-7"><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
        users: [{ id: 36, name: 'Kong S.' }, { id: 37, name: 'Ratana P.' }]
    },
    {
        id: 'finishing', name: 'Finishing',
        icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-7 h-7"><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>,
        users: [{ id: 38, name: 'Dara M.' }, { id: 39, name: 'Sokphea N.' }, { id: 40, name: 'Lina C.' }]
    },
    {
        id: 'packing', name: 'Packing',
        icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-7 h-7"><path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>,
        users: [{ id: 41, name: 'Sophea R.' }, { id: 42, name: 'Bopha K.' }, { id: 43, name: 'Sreyleak P.' }]
    },
    {
        id: 'security', name: 'Security',
        icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-7 h-7"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>,
        users: [{ id: 44, name: 'Dara S.' }, { id: 45, name: 'Pov R.' }, { id: 46, name: 'Narin M.' }]
    },
];

export const ComDeck: React.FC<ComDeckProps> = ({ isOpen, onClose }) => {
    const [activeTab, setActiveTab] = useState<string>('One On One');
    const [selectedDept, setSelectedDept] = useState<Department | null>(null);

    // --- Resizable panel logic ---
    const MIN_WIDTH = 200;
    const MAX_WIDTH = 520;
    const DEFAULT_WIDTH = 340;
    const [panelWidth, setPanelWidth] = useState<number>(() => {
        const saved = localStorage.getItem('comDeckWidth');
        return saved ? parseInt(saved, 10) : DEFAULT_WIDTH;
    });
    const isDragging = React.useRef(false);

    const handleMouseDown = (e: React.MouseEvent) => {
        e.preventDefault();
        isDragging.current = true;
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';

        const startX = e.clientX;
        const startWidth = panelWidth;

        const onMouseMove = (ev: MouseEvent) => {
            if (!isDragging.current) return;
            // Dragging LEFT edge: moving left = wider, moving right = narrower
            const delta = startX - ev.clientX;
            const newWidth = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startWidth + delta));
            setPanelWidth(newWidth);
        };

        const onMouseUp = () => {
            isDragging.current = false;
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
            // Persist to localStorage
            setPanelWidth(prev => {
                localStorage.setItem('comDeckWidth', String(prev));
                return prev;
            });
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
        };

        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
    };

    const handleDeptClick = (dept: Department) => setSelectedDept(dept);
    const handleBackToDepts = () => setSelectedDept(null);

    return (
        <aside
            style={isOpen ? { width: `${panelWidth}px` } : undefined}
            className={`h-screen bg-[#0D1117] border-l border-white/5 shadow-[-10px_0_30px_rgba(0,0,0,0.4)] z-20 flex flex-col shrink-0 transition-[width] duration-300 ease-in-out overflow-hidden relative ${isOpen ? '' : 'w-0'}`}
        >
            {/* ← Drag-resize handle on left edge */}
            {isOpen && (
                <div
                    onMouseDown={handleMouseDown}
                    className="absolute left-0 top-0 h-full w-[5px] z-50 cursor-col-resize group flex items-center justify-center"
                    title="Drag to resize"
                >
                    {/* Visual grip indicator */}
                    <div className="w-[3px] h-16 rounded-full bg-white/10 group-hover:bg-[#FF6B2C]/60 transition-colors" />
                </div>
            )}
            {/* Top Toolbar Navigation */}
            <div className="flex bg-[#12161B] border-b border-white/5 shrink-0">
                {[
                    { id: 'One On One', label: '1-on-1', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /> },
                    { id: 'Group Chat', label: 'Group', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /> },
                    { id: 'Dispatch', label: 'Mail', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /> },
                    { id: 'Channels', label: 'Channels', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" /> },
                    { id: 'File Stack', label: 'Files', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" /> },
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => { setActiveTab(tab.id); setSelectedDept(null); }}
                        className={`flex-1 flex flex-col items-center justify-center gap-1 py-3 transition-all text-[10px] font-semibold tracking-wide uppercase border-b-2 ${activeTab === tab.id ? 'text-[#FF6B2C] border-[#FF6B2C] bg-[#FF6B2C]/5' : 'text-white/40 border-transparent hover:text-white/70 hover:bg-white/5'}`}
                        title={tab.id}
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">{tab.icon}</svg>
                        <span>{tab.label}</span>
                    </button>
                ))}
                {/* Close button */}
                <button onClick={onClose} className="px-3 text-white/30 hover:text-white/80 transition-colors border-b-2 border-transparent">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">

                {/* ONE ON ONE LAYER 1 — DEPARTMENTS */}
                {activeTab === 'One On One' && !selectedDept && (
                    <div className="p-4">
                        <p className="text-[11px] text-white/30 uppercase tracking-widest mb-4 px-1 font-semibold">Select Department</p>
                        <div className="grid grid-cols-3 gap-3">
                            {departments.map(dept => (
                                <button
                                    key={dept.id}
                                    onClick={() => handleDeptClick(dept)}
                                    className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-white/5 hover:bg-[#FF6B2C]/10 border border-white/5 hover:border-[#FF6B2C]/40 transition-all group focus:outline-none"
                                >
                                    <div className="w-12 h-12 rounded-full bg-[#1C2128] flex items-center justify-center text-white/50 group-hover:text-[#FF6B2C] group-hover:bg-[#FF6B2C]/10 transition-all shadow-inner">
                                        {dept.icon}
                                    </div>
                                    <span className="text-[11px] font-semibold text-white/60 group-hover:text-white/90 text-center leading-tight transition-colors">
                                        {dept.name}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* ONE ON ONE LAYER 2 — USERS IN DEPARTMENT */}
                {activeTab === 'One On One' && selectedDept && (
                    <div className="p-4">
                        {/* Back navigation */}
                        <button
                            onClick={handleBackToDepts}
                            className="flex items-center gap-2 text-[12px] text-white/50 hover:text-[#FF6B2C] mb-5 transition-colors group"
                        >
                            <svg className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                            </svg>
                            <span className="font-semibold">Back</span>
                            <span className="text-white/30">/ {selectedDept.name}</span>
                        </button>
                        <div className="grid grid-cols-3 gap-y-6 gap-x-3">
                            {selectedDept.users.map(user => {
                                const initials = user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
                                const colors = ['#FF6B2C', '#E84E0F', '#C73E0C', '#A32D09', '#7F1D09'];
                                const bg = colors[user.id % colors.length];
                                return (
                                    <button key={user.id} className="flex flex-col items-center gap-2 group focus:outline-none">
                                        <div
                                            className="w-[64px] h-[64px] rounded-full flex items-center justify-center font-bold text-[18px] text-white border-2 border-transparent group-hover:border-[#FF6B2C] transition-all shadow-lg group-hover:shadow-[0_0_20px_rgba(255,107,44,0.35)]"
                                            style={{ background: `linear-gradient(135deg, ${bg}44, #1C2128)` }}
                                        >
                                            {initials}
                                        </div>
                                        <span className="text-[11px] font-medium text-white/70 text-center group-hover:text-white leading-tight transition-colors px-1">
                                            {user.name}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* PLACEHOLDER for other tabs */}
                {activeTab !== 'One On One' && (
                    <div className="flex flex-col items-center justify-center h-full text-white/20 text-sm p-8 gap-3">
                        <svg className="w-12 h-12 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        <p className="text-center font-medium">{activeTab}<br/><span className="text-[11px] font-normal opacity-70">Coming soon</span></p>
                    </div>
                )}

            </div>
        </aside>
    );
};
