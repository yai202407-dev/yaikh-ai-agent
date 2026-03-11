import React, { useState } from 'react';
import { useChat } from '../features/chat/hooks/useChat';
import { ChatLayout } from '../features/chat/components/ChatLayout';
import { MessageList } from '../features/chat/components/MessageList';
import { ChatInput } from '../features/chat/components/ChatInput';
import { AgentSettingsModal } from '../features/agent-config/components/AgentSettingsModal';
import { useAgentConfig } from '../features/agent-config/hooks/useAgentConfig';

export const ChatPage: React.FC = () => {
    const {
        messages,
        isLoading,
        sendMessage,
    } = useChat();

    const { config, availableModels, updateConfig } = useAgentConfig();
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

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
                    <ChatInput
                        onSendMessage={async (msg) => {
                            await sendMessage(msg);
                        }}
                        isLoading={isLoading}
                    />
                }
            >
                <MessageList messages={messages} isLoading={isLoading} />
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
