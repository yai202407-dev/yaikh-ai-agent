import React, { useState } from 'react';

interface ComDeckProps {
    isOpen: boolean;
    onClose: () => void;
}

const mockUsers = [
    { id: 1, name: 'Neang Samneang', avatar: 'https://ui-avatars.com/api/?name=Neang+Samneang&background=1C2128&color=fff' },
    { id: 2, name: 'Van Viroth', avatar: 'https://ui-avatars.com/api/?name=Van+Viroth&background=1C2128&color=fff' },
    { id: 3, name: 'Samnang Ken', avatar: 'https://ui-avatars.com/api/?name=Samnang+Ken&background=1C2128&color=fff' },
    { id: 4, name: 'Vinh Daly', avatar: 'https://ui-avatars.com/api/?name=Vinh+Daly&background=1C2128&color=fff' },
    { id: 5, name: 'Chheang Menghuy', avatar: 'https://ui-avatars.com/api/?name=Chheang+Menghuy&background=1C2128&color=fff' },
    { id: 6, name: 'Chhem Seangleng', avatar: 'https://ui-avatars.com/api/?name=Chhem+Seangleng&background=1C2128&color=fff' },
    { id: 7, name: 'Sok Sophy', avatar: 'https://ui-avatars.com/api/?name=Sok+Sophy&background=1C2128&color=fff' },
    { id: 8, name: 'Seklas Menghuy', avatar: 'https://ui-avatars.com/api/?name=Seklas+Menghuy&background=1C2128&color=fff' },
    { id: 9, name: 'Sin Khorn', avatar: 'https://ui-avatars.com/api/?name=Sin+Khorn&background=1C2128&color=fff' },
    { id: 10, name: 'Dat Sreymeala', avatar: 'https://ui-avatars.com/api/?name=Dat+Sreymeala&background=1C2128&color=fff' },
    { id: 11, name: 'Sim Ahoun', avatar: 'https://ui-avatars.com/api/?name=Sim+Ahoun&background=1C2128&color=fff' },
    { id: 12, name: 'Yeang Seangleng', avatar: 'https://ui-avatars.com/api/?name=Yeang+Seangleng&background=1C2128&color=fff' },
];

export const ComDeck: React.FC<ComDeckProps> = ({ isOpen, onClose }) => {
    const [activeAction, setActiveAction] = useState<string>('One On One');

    if (!isOpen) return null;

    return (
        <aside className="absolute right-0 top-0 h-full w-[360px] bg-[#0D1117]/80 backdrop-blur-2xl z-40 flex flex-col p-6 animate-slide-in-right border-l border-white/5 shadow-[-20px_0_40px_rgba(0,0,0,0.5)]">
            {/* Close Button at very top right */}
            <button 
                onClick={onClose}
                className="absolute top-4 right-4 p-2 text-white/40 hover:text-white/90 hover:bg-white/5 rounded-lg transition-colors z-50 rounded-full bg-black/20"
            >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
            
            {/* Top Toolbar Navigation */}
            <div className="flex bg-[#12161B]/95 rounded-xl border border-white/5 shadow-2xl overflow-hidden mb-8 mt-6 h-[64px] backdrop-blur-md relative">
                {/* 1. One on One Chat */}
                <button 
                    onClick={() => setActiveAction('One On One')}
                    className={`flex-1 flex justify-center items-center transition-all ${activeAction === 'One On One' ? 'bg-[#FF6B2C]/10 text-[#FF6B2C] border-b-2 border-[#FF6B2C]' : 'hover:bg-white/5 text-white/50'}`}
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                </button>
                {/* 2. Group Chat */}
                <button 
                    onClick={() => setActiveAction('Group Chat')}
                    className={`flex-1 flex justify-center items-center transition-all ${activeAction === 'Group Chat' ? 'bg-[#FF6B2C]/10 text-[#FF6B2C] border-b-2 border-[#FF6B2C]' : 'hover:bg-white/5 text-white/50'}`}
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                </button>
                {/* 3. Dispatch (Mail) */}
                <button 
                    onClick={() => setActiveAction('Dispatch')}
                    className={`flex-1 flex justify-center items-center transition-all ${activeAction === 'Dispatch' ? 'bg-[#FF6B2C]/10 text-[#FF6B2C] border-b-2 border-[#FF6B2C]' : 'hover:bg-white/5 text-white/50'}`}
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                </button>
                {/* 4. Channels */}
                <button 
                    onClick={() => setActiveAction('Channels')}
                    className={`flex-1 flex justify-center items-center transition-all ${activeAction === 'Channels' ? 'bg-[#FF6B2C]/10 text-[#FF6B2C] border-b-2 border-[#FF6B2C]' : 'hover:bg-white/5 text-white/50'}`}
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                    </svg>
                </button>
                {/* 5. File Stack */}
                <button 
                    onClick={() => setActiveAction('File Stack')}
                    className={`flex-1 flex justify-center items-center transition-all ${activeAction === 'File Stack' ? 'bg-[#FF6B2C]/10 text-[#FF6B2C] border-b-2 border-[#FF6B2C]' : 'hover:bg-white/5 text-white/50'}`}
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                    </svg>
                </button>
            </div>

            {/* Main Content Area based on Selection */}
            {activeAction === 'One On One' && (
                <div className="flex-1 overflow-y-auto custom-scrollbar pb-6 pr-2">
                    <div className="grid grid-cols-3 gap-y-7 gap-x-4">
                        {mockUsers.map(user => (
                            <button key={user.id} className="flex flex-col items-center group focus:outline-none">
                                <div className="w-[68px] h-[68px] rounded-full overflow-hidden border-2 border-transparent group-hover:border-[#FF6B2C] transition-all bg-[#12161B] mb-2 shadow-lg group-hover:shadow-[0_0_15px_rgba(255,107,44,0.4)]">
                                    <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                                </div>
                                <span className="text-[12px] font-medium text-white/80 text-center leading-tight group-hover:text-white transition-colors px-1">
                                    {user.name}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>
            )}
            
            {activeAction !== 'One On One' && (
                <div className="flex-1 flex items-center justify-center text-white/30 text-sm">
                    {activeAction} Content Area
                </div>
            )}
            
        </aside>
    );
};
