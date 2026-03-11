import React, { useState, useEffect } from 'react';
import { API_CONFIG } from '../../../config/api.config';

interface Message {
    role: string;
    content: string;
    timestamp: string;
}

interface ChatSession {
    sessionId: string;
    userId: string;
    lastUpdated: string;
    messages: Message[];
}

export const ChatLogFeedModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const [sessions, setSessions] = useState<ChatSession[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchLogs = async () => {
            try {
                const response = await fetch(`${API_CONFIG.BASE_URL}/agent/chat-log`);
                if (response.ok) {
                    const data = await response.json();
                    setSessions(data.logs || []);
                }
            } catch (error) {
                console.error("Failed to fetch chat logs:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchLogs();
        
        // Auto refresh every 10 seconds
        const interval = setInterval(fetchLogs, 10000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
            <div className="bg-[#0D1117] border border-white/10 rounded-2xl w-full max-w-5xl h-[85vh] flex flex-col shadow-2xl overflow-hidden relative">
                
                {/* Header */}
                <div className="px-6 py-4 border-b border-white/10 flex justify-between items-center bg-[#161B22]">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-600/20 text-blue-400 flex items-center justify-center border border-blue-500/30">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                        </div>
                        <h2 className="text-xl font-bold text-white tracking-wide">Yai 2 Live Chat Feed</h2>
                        <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-red-500/20 text-red-400 rounded-full border border-red-500/30 animate-pulse">LIVE MONITORING</span>
                    </div>
                    <button onClick={onClose} className="p-2 text-white/50 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar bg-gradient-to-b from-transparent to-black/30">
                    {loading && sessions.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-white/40 space-y-4">
                            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                            <p>Tapping into global datastream...</p>
                        </div>
                    ) : sessions.length === 0 ? (
                        <div className="flex items-center justify-center h-full text-white/40">
                            No chat logs found in the database.
                        </div>
                    ) : (
                        sessions.map((session) => (
                            <div key={session.sessionId} className="bg-[#1C2128] rounded-xl border border-white/5 overflow-hidden">
                                <div className="px-4 py-2 bg-[#22272E] border-b border-white/5 flex justify-between items-center text-xs">
                                    <span className="font-mono text-blue-400">USER: {session.userId}</span>
                                    <span className="font-mono text-white/40">{new Date(session.lastUpdated).toLocaleString()}</span>
                                </div>
                                <div className="p-4 space-y-4">
                                    {session.messages && session.messages.length > 0 ? (
                                        session.messages.map((msg, i) => (
                                            <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                                                <div className={`max-w-[80%] rounded-lg p-3 text-sm ${msg.role === 'user' ? 'bg-blue-600/20 border border-blue-500/20 text-blue-100' : 'bg-white/5 border border-white/10 text-white/80'}`}>
                                                    <div className="text-[10px] uppercase tracking-wider mb-1 opacity-50 font-semibold">{msg.role}</div>
                                                    <div className="whitespace-pre-wrap">{msg.content}</div>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="text-sm text-white/30 italic">No message contents synchronized yet.</div>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};
