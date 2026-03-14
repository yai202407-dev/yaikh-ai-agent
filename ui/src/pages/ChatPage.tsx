import React, { useState } from 'react';
import { useChat } from '../features/chat/hooks/useChat';
import { ChatLayout } from '../features/chat/components/ChatLayout';
import { MessageList } from '../features/chat/components/MessageList';
import { ChatInput } from '../features/chat/components/ChatInput';
import { AgentSettingsModal } from '../features/agent-config/components/AgentSettingsModal';
import { useAgentConfig } from '../features/agent-config/hooks/useAgentConfig';
import { DmChatView } from '../features/chat/components/DmChatView';
import type { DmUser } from '../features/chat/hooks/useDmChat';

// ── Current user identity (guest until real auth is wired) ──────────────────
// We derive a stable guest ID from the browser. Phase 2 will replace this
// with the real MongoDB user session.
const getGuestUser = (): DmUser => {
    let guestId = localStorage.getItem('yai_guest_id');
    if (!guestId) {
        guestId = `guest_${Math.random().toString(36).substring(2, 10)}`;
        localStorage.setItem('yai_guest_id', guestId);
    }
    return {
        id: guestId,
        name: localStorage.getItem('yai_guest_name') || 'Yai Data',
        department: 'General',
    };
};

export const ChatPage: React.FC = () => {
    const { messages, isLoading, sendMessage, activeDeckTools } = useChat();
    const { config, availableModels, updateConfig } = useAgentConfig();
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    // ── DM State ────────────────────────────────────────────────────────────
    const [dmRecipient, setDmRecipient] = useState<DmUser | null>(null);
    const currentUser = getGuestUser();

    const handleOpenDm = (recipient: DmUser) => setDmRecipient(recipient);
    const handleCloseDm = () => setDmRecipient(null);

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
                    // Hide AI input when in DM mode — DmChatView has its own input
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
                currentUser={currentUser}
            >
                {/* Switch center content: AI chat ↔ 1-on-1 DM */}
                {dmRecipient ? (
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


