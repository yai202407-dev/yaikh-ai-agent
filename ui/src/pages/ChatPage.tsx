import React, { useState, useEffect } from 'react';
import { useChat } from '../features/chat/hooks/useChat';
import { ChatLayout } from '../features/chat/components/ChatLayout';
import { MessageList } from '../features/chat/components/MessageList';
import { ChatInput } from '../features/chat/components/ChatInput';
import { AgentSettingsModal } from '../features/agent-config/components/AgentSettingsModal';
import { useAgentConfig } from '../features/agent-config/hooks/useAgentConfig';
import { DmChatView } from '../features/chat/components/DmChatView';
import { IdentitySelector, loadStoredIdentity } from '../features/chat/components/IdentitySelector';
import type { DmUser } from '../features/chat/hooks/useDmChat';

export const ChatPage: React.FC = () => {
    const { messages, isLoading, sendMessage, activeDeckTools } = useChat();
    const { config, availableModels, updateConfig } = useAgentConfig();
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    // ── Real user identity (Phase 2) ────────────────────────────────────────
    const [currentUser, setCurrentUser] = useState<DmUser | null>(() => loadStoredIdentity());
    const [showIdentitySelector, setShowIdentitySelector] = useState<boolean>(() => !loadStoredIdentity());

    // ── DM State ─────────────────────────────────────────────────────────────
    const [dmRecipient, setDmRecipient] = useState<DmUser | null>(null);
    const handleOpenDm = (recipient: DmUser) => setDmRecipient(recipient);
    const handleCloseDm = () => setDmRecipient(null);

    // If for some reason identity is cleared, re-prompt
    useEffect(() => {
        if (!currentUser) setShowIdentitySelector(true);
    }, [currentUser]);

    return (
        <>
            {/* Identity selector — appears on first visit or when user clicks their name */}
            <IdentitySelector
                isOpen={showIdentitySelector}
                onClose={() => { if (currentUser) setShowIdentitySelector(false); }}
                onSelect={(user) => { setCurrentUser(user); setShowIdentitySelector(false); }}
                currentUser={currentUser}
            />

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
                currentUser={currentUser || { id: 'guest', name: 'Guest', department: 'General' }}
                onOpenIdentitySelector={() => setShowIdentitySelector(true)}
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


