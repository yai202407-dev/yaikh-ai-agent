import React, { useState, useEffect } from 'react';
import { useChat } from '../features/chat/hooks/useChat';
import { ChatLayout } from '../features/chat/components/ChatLayout';
import { MessageList } from '../features/chat/components/MessageList';
import { ChatInput } from '../features/chat/components/ChatInput';
import { AgentSettingsModal } from '../features/agent-config/components/AgentSettingsModal';
import { useAgentConfig } from '../features/agent-config/hooks/useAgentConfig';
import { DmChatView } from '../features/chat/components/DmChatView';
import type { DmUser } from '../features/chat/hooks/useDmChat';

// ── Helpers ───────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'yai_current_user';

function loadStoredUser(): DmUser | null {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch { return null; }
}

function saveUser(user: DmUser) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
}

/**
 * On startup, check if the URL contains ?lt=<laravel_token>
 * If so, verify it against the backend and return the user.
 * Strip the ?lt= param from the URL immediately (security).
 */
async function verifyLaravelToken(token: string): Promise<DmUser | null> {
    try {
        const res = await fetch('/api/auth/verify-token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token }),
        });
        const data = await res.json();
        if (data.success && data.user) return data.user;
    } catch (err) {
        console.error('[Auth] Token verification failed:', err);
    }
    return null;
}

// ── Component ─────────────────────────────────────────────────────────────────

export const ChatPage: React.FC = () => {
    const { messages, isLoading, sendMessage, activeDeckTools } = useChat();
    const { config, availableModels, updateConfig } = useAgentConfig();
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    // ── Identity: from Laravel token OR cached localStorage ──────────────────
    const [currentUser, setCurrentUser] = useState<DmUser | null>(null);
    const [authState, setAuthState] = useState<'loading' | 'ready' | 'unauthenticated'>('loading');

    useEffect(() => {
        (async () => {
            // 1. Check URL for ?lt= Laravel token
            const params = new URLSearchParams(window.location.search);
            const laravelToken = params.get('lt');

            if (laravelToken) {
                // Strip token from URL immediately – don't expose it in browser history
                params.delete('lt');
                const newUrl = params.toString()
                    ? `${window.location.pathname}?${params.toString()}`
                    : window.location.pathname;
                window.history.replaceState({}, '', newUrl);

                // Verify with backend
                const user = await verifyLaravelToken(laravelToken);
                if (user) {
                    saveUser(user);
                    setCurrentUser(user);
                    setAuthState('ready');
                    return;
                }
            }

            // 2. Try cached user from previous session
            const cached = loadStoredUser();
            if (cached) {
                setCurrentUser(cached);
                setAuthState('ready');
                return;
            }

            // 3. No auth at all
            setAuthState('unauthenticated');
        })();
    }, []);

    // ── DM State ─────────────────────────────────────────────────────────────
    const [dmRecipient, setDmRecipient] = useState<DmUser | null>(null);
    const handleOpenDm = (recipient: DmUser) => setDmRecipient(recipient);
    const handleCloseDm = () => setDmRecipient(null);

    // ── Loading screen ───────────────────────────────────────────────────────
    if (authState === 'loading') {
        return (
            <div className="flex h-screen w-full bg-[#010409] items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-10 h-10 border-2 border-[#FF6B2C]/30 border-t-[#FF6B2C] rounded-full animate-spin" />
                    <p className="text-white/30 text-sm">Verifying session...</p>
                </div>
            </div>
        );
    }

    // ── Unauthenticated screen ───────────────────────────────────────────────
    if (authState === 'unauthenticated') {
        return (
            <div className="flex h-screen w-full bg-[#010409] items-center justify-center">
                <div className="flex flex-col items-center gap-4 text-center px-8">
                    <div className="w-14 h-14 rounded-full bg-[#FF6B2C]/10 border border-[#FF6B2C]/20 flex items-center justify-center">
                        <svg className="w-7 h-7 text-[#FF6B2C]/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                    </div>
                    <div>
                        <p className="text-white/60 font-semibold">Session not found</p>
                        <p className="text-white/25 text-sm mt-1">Please open the chat from the Yaikh company portal.</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <>
            <ChatLayout
                headerContent={
                    <div className="fixed left-1/2 -translate-x-1/2 top-10 flex flex-col items-center pointer-events-none z-50">
                        <div className={`w-[46px] h-[46px] rounded-full flex items-center justify-center bg-[#0F121A]/90 border border-[#3B82F6]/30 shadow-[0_0_25px_rgba(59,130,246,0.15)] backdrop-blur-xl ${isLoading ? 'yai-agent-glow' : 'yai-agent-float'} transition-all duration-700`}>
                            <svg className={`w-5 h-5 text-[#3B82F6] transition-all duration-700 drop-shadow-[0_0_10px_rgba(59,130,246,0.6)] ${isLoading ? 'scale-110 opacity-100' : 'scale-100 opacity-90'}`} fill="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} stroke="white" d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                        </div>
                    </div>
                }
                inputContent={
                    dmRecipient ? null : (
                        <ChatInput
                            onSendMessage={async (msg) => { await sendMessage(msg); }}
                            isLoading={isLoading}
                        />
                    )
                }
                onSidebarToolClick={async (toolName) => {
                    const promptText = `Generate a ${toolName} based on the ongoing context in my workspace.`;
                    await sendMessage(promptText);
                }}
                activeDeckTools={activeDeckTools}
                onOpenDm={handleOpenDm}
                currentUser={currentUser || { id: 'unknown', name: 'Unknown', department: '' }}
            >
                {dmRecipient && currentUser ? (
                    <DmChatView
                        currentUser={currentUser}
                        recipient={dmRecipient}
                        onClose={handleCloseDm}
                    />
                ) : (
                    <MessageList messages={messages} isLoading={isLoading} />
                )}
            </ChatLayout>

            <AgentSettingsModal
                isOpen={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
                config={config}
                availableModels={availableModels}
                onSave={updateConfig}
            />
        </>
    );
};
