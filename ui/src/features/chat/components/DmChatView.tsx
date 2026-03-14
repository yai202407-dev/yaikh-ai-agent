/**
 * DmChatView.tsx
 *
 * The 1-on-1 chat view that replaces the center AI chat when a user is selected.
 * Rendered as a context overlay above the main chat board — appears seamlessly
 * inside the existing ChatLayout without any new modals or routes.
 */

import React, { useRef, useEffect, useState } from 'react';
import { useDmChat, DmUser } from '../hooks/useDmChat';

interface DmChatViewProps {
    currentUser: DmUser;
    recipient: DmUser;
    onClose: () => void;
}

export const DmChatView: React.FC<DmChatViewProps> = ({ currentUser, recipient, onClose }) => {
    const { messages, isLoading, isSending, sendMessage } = useDmChat(currentUser, recipient);
    const [draft, setDraft] = useState('');
    const bottomRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    // Auto-scroll to latest message
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Focus input on open
    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    const handleSend = async () => {
        if (!draft.trim() || isSending) return;
        const text = draft.trim();
        setDraft('');
        await sendMessage(text);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const recipientInitials = recipient.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    const colors = ['#FF6B2C', '#E84E0F', '#C73E0C', '#A32D09'];
    const bg = colors[recipient.id.charCodeAt(0) % colors.length];

    const formatTime = (date: Date | null) => {
        if (!date) return '';
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className="flex flex-col h-full w-full relative">
            {/* DM Banner — sits at the top replacing the normal "Hi there" heading */}
            <div className="flex items-center gap-3 px-6 py-3 bg-[#0D1117] border-b border-white/5 relative z-10">
                <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0 shadow-lg"
                    style={{ background: `linear-gradient(135deg, ${bg}, #1C2128)` }}
                >
                    {recipientInitials}
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-white leading-tight">{recipient.name}</p>
                    <p className="text-[11px] text-white/40">{recipient.department} · Direct Message</p>
                </div>
                {/* "Connected, online" indicator */}
                <div className="flex items-center gap-1.5 mr-4">
                    <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)] animate-pulse" />
                    <span className="text-[11px] text-white/30">Live</span>
                </div>
                <button
                    onClick={onClose}
                    className="text-white/30 hover:text-white/80 p-1.5 rounded-lg hover:bg-white/5 transition-all"
                    title="Return to Yai AI"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>

            {/* Message thread */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 custom-scrollbar">
                {isLoading && (
                    <div className="flex justify-center items-center h-20">
                        <div className="w-5 h-5 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" />
                    </div>
                )}

                {!isLoading && messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-32 gap-2 text-white/20">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                        <p className="text-sm">Start a conversation with {recipient.name.split(' ')[0]}</p>
                    </div>
                )}

                {messages.map((msg, i) => {
                    const isMe = msg.senderId === currentUser.id;
                    const showName = !isMe && (i === 0 || messages[i - 1].senderId !== msg.senderId);
                    return (
                        <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                            {showName && (
                                <span className="text-[11px] text-white/30 mb-1 ml-1">{msg.senderName}</span>
                            )}
                            <div className={`max-w-[75%] group relative`}>
                                <div
                                    className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed break-words shadow-sm ${
                                        isMe
                                            ? 'bg-gradient-to-br from-[#FF6B2C] to-[#E84E0F] text-white rounded-br-sm'
                                            : 'bg-[#1C2128] text-white/90 border border-white/5 rounded-bl-sm'
                                    }`}
                                >
                                    {msg.text}
                                </div>
                                {/* Timestamp on hover */}
                                <span className={`text-[10px] text-white/20 mt-1 block opacity-0 group-hover:opacity-100 transition-opacity ${isMe ? 'text-right' : 'text-left'}`}>
                                    {formatTime(msg.timestamp)}
                                </span>
                            </div>
                        </div>
                    );
                })}

                {isSending && (
                    <div className="flex items-end gap-2">
                        <div className="bg-[#1C2128] border border-white/5 rounded-2xl rounded-bl-sm px-4 py-2.5">
                            <div className="flex gap-1 items-center h-4">
                                <div className="w-1.5 h-1.5 bg-white/30 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                <div className="w-1.5 h-1.5 bg-white/30 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                <div className="w-1.5 h-1.5 bg-white/30 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                            </div>
                        </div>
                    </div>
                )}

                <div ref={bottomRef} />
            </div>

            {/* Input area */}
            <div className="px-6 pb-6 pt-2 border-t border-white/5 bg-[#0D1117]/50">
                <div className="flex items-end gap-3 bg-[#1C2128] rounded-2xl border border-white/10 px-4 py-3 focus-within:border-[#FF6B2C]/40 transition-colors shadow-lg">
                    <textarea
                        ref={inputRef}
                        value={draft}
                        onChange={e => setDraft(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={`Message ${recipient.name.split(' ')[0]}...`}
                        rows={1}
                        className="flex-1 bg-transparent text-sm text-white/90 placeholder-white/25 resize-none outline-none leading-relaxed max-h-32 custom-scrollbar"
                        style={{ minHeight: '22px' }}
                    />
                    <button
                        onClick={handleSend}
                        disabled={!draft.trim() || isSending}
                        className="shrink-0 w-8 h-8 rounded-xl flex items-center justify-center bg-[#FF6B2C] hover:bg-[#E84E0F] disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-orange-500/30"
                    >
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                        </svg>
                    </button>
                </div>
                <p className="text-[10px] text-white/15 mt-2 text-center">Enter to send · Shift+Enter for new line</p>
            </div>
        </div>
    );
};
