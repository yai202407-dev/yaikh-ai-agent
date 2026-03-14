import React, { useState } from 'react';
import { ChatLogFeedModal } from './ChatLogFeedModal';
import { NotebookSidebar } from './NotebookSidebar';
import { ComDeck } from './ComDeck';
import type { DmUser } from '../hooks/useDmChat';
import { usePushNotifications } from '../hooks/usePushNotifications';
import { usePresence } from '../hooks/usePresence';

interface ChatLayoutProps {
    headerContent?: React.ReactNode;
    children: React.ReactNode;
    inputContent: React.ReactNode;
    onSidebarToolClick?: (toolName: string) => void;
    activeDeckTools?: string[];
    onOpenDm?: (recipient: DmUser) => void;
    currentUser?: DmUser;
}

export const ChatLayout: React.FC<ChatLayoutProps> = ({
    headerContent,
    children,
    inputContent,
    onSidebarToolClick,
    activeDeckTools,
    onOpenDm,
    currentUser,
}) => {

    // Use the currentUser prop for display name — falls back to 'Yai Data'
    const displayName = currentUser?.name || 'Yai Data';
    const displayInitials = displayName.split(' ').map((n: string) => n[0]).join('').substring(0, 3).toUpperCase();

    const [showChatFeed, setShowChatFeed] = useState(false);
    const [showNotebook, setShowNotebook] = useState(false);
    const [showComDeck, setShowComDeck] = useState(false);

    // Phase 5: Push notifications
    const { permission: pushPermission, isSubscribed, isLoading: pushLoading, subscribe: subscribePush, unsubscribe: unsubscribePush } = usePushNotifications(currentUser || null);

    // Phase 6: Own presence management
    const { toggleDnd, currentStatus } = usePresence(currentUser || null);

    return (
        <div className="flex h-screen w-full bg-[#010409] text-white relative font-sans min-w-[320px]">
            {/* Deep space background layers */}
            <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[10%] left-[15%] w-[500px] h-[500px] bg-red-600/10 rounded-full blur-[120px]" />
                <div className="absolute top-[30%] right-[10%] w-[400px] h-[400px] bg-orange-600/5 rounded-full blur-[140px]" />
                <div className="absolute bottom-[-10%] left-[40%] w-[600px] h-[600px] bg-yellow-600/10 rounded-full blur-[150px]" />

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

            <main className="flex-1 flex flex-col z-10 relative w-full min-w-0 overflow-hidden">
                <header className="pt-4 pb-3 px-4 md:pt-8 md:pb-4 md:px-10 flex items-start justify-between relative flex-wrap gap-2">
                    {/* Left Header Controls */}
                    <div className="flex flex-col gap-3 md:gap-6">
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
                        <div className="flex items-center gap-2 flex-wrap">
                            {/* Avatar with own status dot */}
                            <div className="relative shrink-0">
                                <div className="w-[34px] h-[34px] rounded-full bg-gradient-to-br from-[#FF6B2C] to-[#E84E0F] flex items-center justify-center font-bold text-white shadow-[0_0_20px_rgba(255,107,44,0.3)] border border-[#FF8A5B]/20">
                                    <span className="text-[13px] tracking-tight">{displayInitials}</span>
                                </div>
                                {/* Status dot — clickable to toggle DND */}
                                <button
                                    onClick={toggleDnd}
                                    title={`Status: ${currentStatus} — click to toggle Do Not Disturb`}
                                    className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#010409] hover:scale-125 transition-transform"
                                    style={{
                                        backgroundColor:
                                            currentStatus === 'active' ? '#22C55E' :
                                            currentStatus === 'busy'   ? '#F59E0B' :
                                            currentStatus === 'dnd'    ? '#EF4444' :
                                                                          '#9CA3AF',
                                    }}
                                />
                            </div>

                            {/* Display name + own status label */}
                            <div className="flex flex-col leading-none">
                                <span className="font-bold text-[15px] tracking-wide text-white/90">{displayName}</span>
                                <span className="text-[10px] capitalize mt-0.5" style={{
                                    color: currentStatus === 'active' ? '#22C55E' :
                                           currentStatus === 'busy'   ? '#F59E0B' :
                                           currentStatus === 'dnd'    ? '#EF4444' :
                                                                         '#6B7280',
                                }}>
                                    {currentStatus === 'idle'   ? '● Online' :
                                     currentStatus === 'busy'   ? '● Busy' :
                                     currentStatus === 'active' ? '● Active' :
                                                                  '● Do Not Disturb'}
                                </span>
                            </div>

                            {/* 🔔 Phase 5: Notification bell */}
                            {pushPermission !== 'unsupported' && (
                                <button
                                    onClick={isSubscribed ? unsubscribePush : subscribePush}
                                    disabled={pushLoading}
                                    title={isSubscribed ? 'Notifications ON — click to disable' : pushPermission === 'denied' ? 'Notifications blocked in browser settings' : 'Enable push notifications'}
                                    className={`w-7 h-7 rounded-full flex items-center justify-center transition-all shrink-0 disabled:opacity-50 ${
                                        isSubscribed
                                            ? 'bg-green-500/15 border border-green-500/40 text-green-400 hover:bg-green-500/25'
                                            : pushPermission === 'denied'
                                            ? 'bg-red-500/10 border border-red-500/20 text-red-400/50 cursor-not-allowed'
                                            : 'bg-white/5 border border-white/10 text-white/30 hover:text-white/70 hover:border-white/20'
                                    }`}
                                >
                                    {pushLoading ? (
                                        <svg className="w-3 h-3 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                        </svg>
                                    ) : isSubscribed ? (
                                        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M15.137 3.945A6 6 0 006 10v3.17L4.72 16h14.56L18 13.17V10a6 6 0 00-2.863-6.055zM12 22a2 2 0 002-2h-4a2 2 0 002 2zm0-20a8 8 0 018 8v2.17l1.28 3.83H2.72L4 12.17V10A8 8 0 0112 2z" />
                                        </svg>
                                    ) : (
                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                                        </svg>
                                    )}
                                </button>
                            )}
                            
                            <button
                                onClick={() => setShowComDeck(!showComDeck)}
                                className={`flex items-center gap-2 px-3 py-1.5 transition-all outline-none rounded-lg border text-sm font-medium shadow-lg focus:outline-none ${
                                    showComDeck 
                                        ? 'bg-orange-600/20 border-orange-500/50 text-orange-400 shadow-[0_0_15px_rgba(249,115,22,0.2)] hover:bg-orange-600/30' 
                                        : 'bg-[#1C2128] border-white/5 hover:bg-[#22272E] hover:border-white/10 text-white/60 hover:text-white/90'
                                }`}
                                title="Toggle Com Deck"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                                </svg>
                                {showComDeck ? 'Com Deck Open' : 'Com Deck'}
                            </button>

                            <button
                                onClick={() => setShowNotebook(!showNotebook)}
                                className={`ml-4 flex items-center gap-2 px-3 py-1.5 transition-all outline-none rounded-lg border text-sm font-medium shadow-lg focus:outline-none ${
                                    showNotebook 
                                        ? 'bg-orange-600/20 border-orange-500/50 text-orange-400 shadow-[0_0_15px_rgba(249,115,22,0.2)] hover:bg-orange-600/30' 
                                        : 'bg-[#1C2128] border-white/5 hover:bg-[#22272E] hover:border-white/10 text-white/60 hover:text-white/90'
                                }`}
                                title="Toggle Yai2 GPT Deck"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                                {showNotebook ? 'Yai2 GPT Deck Open' : 'Yai2 GPT Deck'}
                            </button>
                            <button
                                onClick={() => setShowChatFeed(true)}
                                className="ml-4 flex items-center gap-2 px-3 py-1.5 bg-[#1C2128] hover:bg-[#22272E] text-orange-400 text-sm font-medium rounded-lg border border-white/5 transition-all shadow-lg hover:shadow-orange-500/10 focus:outline-none"
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

            {/* Sidebars sit as flex siblings so they PUSH main content left */}
            <NotebookSidebar isOpen={showNotebook} onClose={() => setShowNotebook(false)} onToolClick={onSidebarToolClick} activeDeckTools={activeDeckTools} />
            <ComDeck isOpen={showComDeck} onClose={() => setShowComDeck(false)} onOpenDm={onOpenDm} currentUser={currentUser} />

            {showChatFeed && (
                <ChatLogFeedModal onClose={() => setShowChatFeed(false)} />
            )}
        </div>
    );
};
