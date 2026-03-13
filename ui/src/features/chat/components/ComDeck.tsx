import React, { useState } from 'react';

export const ComDeck: React.FC = () => {
    const [activeAction, setActiveAction] = useState<string | null>(null);

    const handleActionClick = (actionName: string) => {
        setActiveAction(actionName);
        console.log(`ComDeck action selected: ${actionName}`);
        // Can be linked to modals or integrations later
    };

    return (
        <div className="flex flex-col items-center">
            {/* Title / Label Above */}
            <div className="flex items-center gap-2 mb-1 pointer-events-none">
                <svg className="w-5 h-5 text-orange-500/80 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
                <span className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-orange-600 tracking-wider">Com Deck</span>
            </div>

            {/* Main Capsule */}
            <div className="flex items-center rounded-xl overflow-hidden bg-gradient-to-b from-[#1C2128]/80 to-[#12161B]/90 border border-white/5 shadow-[0_10px_30px_-5px_rgba(255,100,20,0.1),inset_0_1px_1px_rgba(255,255,255,0.05)] backdrop-blur-md">
                
                {/* 1. One on One Chat */}
                <button 
                    onClick={() => handleActionClick('One On One')}
                    className={`p-3 border-r border-white/5 transition-all outline-none focus:outline-none group relative ${activeAction === 'One On One' ? 'bg-orange-500/10' : 'hover:bg-white/5'}`}
                    title="1 on 1 Chat"
                >
                    <svg className={`w-5 h-5 transition-colors ${activeAction === 'One On One' ? 'text-orange-400' : 'text-slate-300 group-hover:text-white'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                    {activeAction === 'One On One' && <div className="absolute inset-0 ring-1 ring-inset ring-orange-500/50 rounded-l-xl pointer-events-none" />}
                </button>

                {/* 2. Group Chat */}
                <button 
                    onClick={() => handleActionClick('Group Chat')}
                    className={`p-3 border-r border-white/5 transition-all outline-none focus:outline-none group relative ${activeAction === 'Group Chat' ? 'bg-orange-500/10' : 'hover:bg-white/5'}`}
                    title="Group Chat"
                >
                    <svg className={`w-5 h-5 transition-colors ${activeAction === 'Group Chat' ? 'text-orange-400' : 'text-slate-300 group-hover:text-white'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    {activeAction === 'Group Chat' && <div className="absolute inset-0 ring-1 ring-inset ring-orange-500/50 pointer-events-none" />}
                </button>

                {/* 3. Dispatch (Mail) */}
                <button 
                    onClick={() => handleActionClick('Dispatch')}
                    className={`p-3 border-r border-white/5 transition-all outline-none focus:outline-none group relative ${activeAction === 'Dispatch' ? 'bg-orange-500/10' : 'hover:bg-white/5'}`}
                    title="Dispatch (Mail)"
                >
                    <svg className={`w-5 h-5 transition-colors ${activeAction === 'Dispatch' ? 'text-orange-400' : 'text-slate-300 group-hover:text-white'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    {activeAction === 'Dispatch' && <div className="absolute inset-0 ring-1 ring-inset ring-orange-500/50 pointer-events-none" />}
                </button>

                {/* 4. Channels */}
                <button 
                    onClick={() => handleActionClick('Channels')}
                    className={`p-3 border-r border-white/5 transition-all outline-none focus:outline-none group relative ${activeAction === 'Channels' ? 'bg-orange-500/10' : 'hover:bg-white/5'}`}
                    title="Channels (AI Generated Topics)"
                >
                    <svg className={`w-5 h-5 transition-colors ${activeAction === 'Channels' ? 'text-orange-400' : 'text-slate-300 group-hover:text-white'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                    </svg>
                    {activeAction === 'Channels' && <div className="absolute inset-0 ring-1 ring-inset ring-orange-500/50 pointer-events-none" />}
                </button>

                {/* 5. File Stack */}
                <button 
                    onClick={() => handleActionClick('File Stack')}
                    className={`p-3 transition-all outline-none focus:outline-none group relative ${activeAction === 'File Stack' ? 'bg-orange-500/10' : 'hover:bg-white/5'}`}
                    title="File Stack (User's own file store)"
                >
                    <svg className={`w-5 h-5 transition-colors ${activeAction === 'File Stack' ? 'text-orange-400' : 'text-slate-300 group-hover:text-white'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                    </svg>
                    {activeAction === 'File Stack' && <div className="absolute inset-0 ring-1 ring-inset ring-orange-500/50 rounded-r-xl pointer-events-none" />}
                </button>
            </div>
        </div>
    );
};
