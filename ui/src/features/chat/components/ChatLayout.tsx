import React, { useState, useEffect } from 'react';
import { ChatLogFeedModal } from './ChatLogFeedModal';

interface ChatLayoutProps {
    headerContent?: React.ReactNode;
    children: React.ReactNode;
    inputContent: React.ReactNode;
}

export const ChatLayout: React.FC<ChatLayoutProps> = ({
    headerContent,
    children,
    inputContent
}) => {

    const [userName, setUserName] = useState('Yai Data');
    const [showChatFeed, setShowChatFeed] = useState(false);

    useEffect(() => {
        const fetchUser = async () => {
            try {
                // Fetching user info assuming cookie/token might be handling auth implicitly.
                const token = localStorage.getItem('auth_token') || 'YOUR_PROVIDED_TOKEN_HERE';
                const response = await fetch('https://ym.yaikh.com/api/v1/user', {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                if (response.ok) {
                    const data = await response.json();
                    // Handle common JSON response patterns
                    if (data && data.name) {
                        setUserName(data.name);
                    } else if (data && data.data && data.data.name) {
                        setUserName(data.data.name);
                    } else if (data && data.user && data.user.name) {
                        setUserName(data.user.name);
                    }
                }
            } catch (error) {
                console.error("Failed to fetch user info:", error);
            }
        };
        fetchUser();
    }, []);



    return (
        <div className="flex h-screen w-full bg-[#010409] text-white relative overflow-hidden font-sans">
            {/* Deep space background layers */}
            <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[10%] left-[15%] w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[120px]" />
                <div className="absolute top-[30%] right-[10%] w-[400px] h-[400px] bg-orange-600/5 rounded-full blur-[140px]" />
                <div className="absolute bottom-[-10%] left-[40%] w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-[150px]" />

                {/* Random floating stars */}
                <div className="absolute top-[15%] left-[10%] w-[2px] h-[2px] bg-white/60 rounded-full shadow-[0_0_8px_white]" />
                <div className="absolute top-[25%] left-[80%] w-[3px] h-[3px] bg-white/50 rounded-full shadow-[0_0_10px_white]" />
                <div className="absolute top-[65%] left-[15%] w-[2px] h-[2px] bg-white/40 rounded-full" />
                <div className="absolute top-[50%] left-[85%] w-[3px] h-[3px] bg-white/70 rounded-full shadow-[0_0_8px_white]" />
                <div className="absolute top-[85%] left-[30%] w-[2px] h-[2px] bg-white/50 rounded-full shadow-[0_0_6px_white]" />
                <div className="absolute top-[35%] left-[45%] w-[2.5px] h-[2.5px] bg-white/60 rounded-full shadow-[0_0_8px_white]" />
                <div className="absolute top-[10%] left-[55%] w-[1.5px] h-[1.5px] bg-white/30 rounded-full" />
                <div className="absolute top-[75%] left-[70%] w-[2px] h-[2px] bg-white/40 rounded-full" />
            </div>

            <main className="flex-1 flex flex-col z-10 relative max-w-[1400px] mx-auto w-full">
                <header className="pt-8 pb-4 px-10 flex items-start justify-between relative">
                    {/* Left Header Controls */}
                    <div className="flex flex-col gap-6">
                        <button
                            onClick={() => {
                                // If embedded in iframe, try to navigate parent Document
                                if (window.parent && window.parent !== window) {
                                    try {
                                        window.parent.location.href = 'https://ym.yaikh.com/';
                                    } catch (e) {
                                        // Handle cross-origin iframe security restrictions
                                        window.parent.postMessage({ type: 'close-chat-overlay' }, '*');
                                    }
                                } else {
                                    window.location.href = 'https://ym.yaikh.com/';
                                }
                            }}
                            className="text-[13px] font-medium text-white/50 hover:text-white flex items-center gap-2 transition-colors"
                        >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
                            Back
                        </button>
                        <div className="flex items-center gap-3">
                            <div className="w-[38px] h-[38px] rounded-full bg-gradient-to-br from-[#FF6B2C] to-[#E84E0F] flex items-center justify-center font-bold text-white shadow-[0_0_20px_rgba(255,107,44,0.3)] border border-[#FF8A5B]/20 pointer-events-none">
                                <span className="text-[15px] tracking-tight">{userName.substring(0, 3)}</span>
                            </div>
                            <span className="font-bold text-[17px] tracking-wide text-white/90">{userName}</span>
                            <button
                                onClick={() => setShowChatFeed(true)}
                                className="ml-4 flex items-center gap-2 px-3 py-1.5 bg-[#1C2128] hover:bg-[#22272E] text-blue-400 text-sm font-medium rounded-lg border border-white/5 transition-all shadow-lg hover:shadow-blue-500/10 focus:outline-none"
                                title="Chat Manager Log Feed"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                                Live Log Feed
                            </button>
                        </div>
                    </div>



                    {/* Right Header Controls (Optional Settings) */}
                    <div className="flex items-start">
                        {headerContent}
                    </div>
                </header>

                <section className="flex-1 overflow-y-auto p-4 md:px-10 flex flex-col scroll-smooth custom-scrollbar mt-4">
                    {children}
                </section>

                <footer className="px-4 md:px-10 pb-8 pt-2">
                    {inputContent}
                </footer>
            </main>

            {showChatFeed && (
                <ChatLogFeedModal onClose={() => setShowChatFeed(false)} />
            )}
        </div>
    );
};
