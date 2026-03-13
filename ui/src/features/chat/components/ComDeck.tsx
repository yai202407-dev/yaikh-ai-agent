import React, { useState } from 'react';

interface ComDeckProps {
    isOpen: boolean;
    onClose: () => void;
}

export const ComDeck: React.FC<ComDeckProps> = ({ isOpen, onClose }) => {
    const [activeAction, setActiveAction] = useState<string | null>(null);

    const handleActionClick = (actionName: string) => {
        setActiveAction(actionName);
        console.log(`ComDeck action selected: ${actionName}`);
    };

    if (!isOpen) return null;

    return (
        <aside className="absolute right-0 top-0 h-full w-[280px] bg-[#0D1117]/95 border-l border-white/10 shadow-[-20px_0_40px_rgba(0,0,0,0.5)] z-40 flex flex-col backdrop-blur-xl animate-slide-in-right">
            
            {/* Header */}
            <header className="h-[68px] flex items-center justify-between px-5 border-b border-white/5 bg-gradient-to-r from-transparent to-[#161B22]/50">
                <div className="flex items-center gap-3">
                    <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                    </svg>
                    <h2 className="text-[15px] font-bold text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-orange-600 tracking-wide uppercase">Com Deck</h2>
                </div>
                <button 
                    onClick={onClose}
                    className="p-2 text-white/40 hover:text-white/90 hover:bg-white/5 rounded-lg transition-colors"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
            </header>

            {/* Tool List */}
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2 custom-scrollbar">
                
                {/* 1. One on One Chat */}
                <button 
                    onClick={() => handleActionClick('One On One')}
                    className={`flex items-center gap-4 w-full p-4 rounded-xl border transition-all text-left ${
                        activeAction === 'One On One' 
                        ? 'bg-gradient-to-r from-orange-500/10 to-transparent border-orange-500/50 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),0_0_15px_rgba(249,115,22,0.15)]' 
                        : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
                    }`}
                >
                    <div className={`p-2 rounded-lg ${activeAction === 'One On One' ? 'bg-orange-500/20 text-orange-400' : 'bg-white/5 text-white/50'}`}>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                    </div>
                    <div>
                        <div className={`font-semibold text-[13px] ${activeAction === 'One On One' ? 'text-orange-400' : 'text-white/80'}`}>1-on-1 Chat</div>
                        <div className="text-[11px] text-white/40 mt-0.5">Direct messages</div>
                    </div>
                </button>

                {/* 2. Group Chat */}
                <button 
                    onClick={() => handleActionClick('Group Chat')}
                    className={`flex items-center gap-4 w-full p-4 rounded-xl border transition-all text-left ${
                        activeAction === 'Group Chat' 
                        ? 'bg-gradient-to-r from-orange-500/10 to-transparent border-orange-500/50 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),0_0_15px_rgba(249,115,22,0.15)]' 
                        : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
                    }`}
                >
                    <div className={`p-2 rounded-lg ${activeAction === 'Group Chat' ? 'bg-orange-500/20 text-orange-400' : 'bg-white/5 text-white/50'}`}>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                    </div>
                    <div>
                        <div className={`font-semibold text-[13px] ${activeAction === 'Group Chat' ? 'text-orange-400' : 'text-white/80'}`}>Group Chat</div>
                        <div className="text-[11px] text-white/40 mt-0.5">Team collaboration</div>
                    </div>
                </button>

                {/* 3. Dispatch (Mail) */}
                <button 
                    onClick={() => handleActionClick('Dispatch')}
                    className={`flex items-center gap-4 w-full p-4 rounded-xl border transition-all text-left ${
                        activeAction === 'Dispatch' 
                        ? 'bg-gradient-to-r from-orange-500/10 to-transparent border-orange-500/50 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),0_0_15px_rgba(249,115,22,0.15)]' 
                        : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
                    }`}
                >
                    <div className={`p-2 rounded-lg ${activeAction === 'Dispatch' ? 'bg-orange-500/20 text-orange-400' : 'bg-white/5 text-white/50'}`}>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                    </div>
                    <div>
                        <div className={`font-semibold text-[13px] ${activeAction === 'Dispatch' ? 'text-orange-400' : 'text-white/80'}`}>Dispatch</div>
                        <div className="text-[11px] text-white/40 mt-0.5">Mail & Broadcasts</div>
                    </div>
                </button>

                {/* 4. Channels */}
                <button 
                    onClick={() => handleActionClick('Channels')}
                    className={`flex items-center gap-4 w-full p-4 rounded-xl border transition-all text-left ${
                        activeAction === 'Channels' 
                        ? 'bg-gradient-to-r from-orange-500/10 to-transparent border-orange-500/50 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),0_0_15px_rgba(249,115,22,0.15)]' 
                        : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
                    }`}
                >
                    <div className={`p-2 rounded-lg ${activeAction === 'Channels' ? 'bg-orange-500/20 text-orange-400' : 'bg-white/5 text-white/50'}`}>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                        </svg>
                    </div>
                    <div>
                        <div className={`font-semibold text-[13px] ${activeAction === 'Channels' ? 'text-orange-400' : 'text-white/80'}`}>Channels</div>
                        <div className="text-[11px] text-white/40 mt-0.5">AI Generated Topics</div>
                    </div>
                </button>

                {/* 5. File Stack */}
                <button 
                    onClick={() => handleActionClick('File Stack')}
                    className={`flex items-center gap-4 w-full p-4 rounded-xl border transition-all text-left ${
                        activeAction === 'File Stack' 
                        ? 'bg-gradient-to-r from-orange-500/10 to-transparent border-orange-500/50 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),0_0_15px_rgba(249,115,22,0.15)]' 
                        : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
                    }`}
                >
                    <div className={`p-2 rounded-lg ${activeAction === 'File Stack' ? 'bg-orange-500/20 text-orange-400' : 'bg-white/5 text-white/50'}`}>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                        </svg>
                    </div>
                    <div>
                        <div className={`font-semibold text-[13px] ${activeAction === 'File Stack' ? 'text-orange-400' : 'text-white/80'}`}>File Stack</div>
                        <div className="text-[11px] text-white/40 mt-0.5">Personal file store</div>
                    </div>
                </button>

            </div>
        </aside>
    );
};
