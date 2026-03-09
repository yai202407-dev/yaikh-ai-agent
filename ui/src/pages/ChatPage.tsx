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
