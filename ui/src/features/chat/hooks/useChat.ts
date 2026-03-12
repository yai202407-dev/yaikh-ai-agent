import { useState, useCallback } from 'react';
import { Message } from '../types';
import { chatService } from '../services/chat.service';
import { formatTimestamp } from '../../../utils/dateUtils';
import { API_CONFIG } from '../../../config/api.config';

export const useChat = () => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
    const [activeDeckTools, setActiveDeckTools] = useState<string[]>([]);

    const extractAndCleanTools = (content: string) => {
        let cleanText = content;
        let tools: string[] = [];
        
        try {
            const match = content.match(/<YAI2_TOOLS>([\s\S]*?)<\/YAI2_TOOLS>/);
            if (match) {
                const toolsJson = match[1].trim();
                // Replace single with double quotes if needed, though JSON expects double
                const fixedJson = toolsJson.replace(/'/g, '"');
                const parsedTools = JSON.parse(fixedJson);
                if (Array.isArray(parsedTools)) {
                    tools = parsedTools;
                }
                cleanText = content.replace(/<YAI2_TOOLS>[\s\S]*?<\/YAI2_TOOLS>/g, '').trim();
            }
        } catch (e) {
            console.warn("Failed to parse YAI2_TOOLS metadata", e);
            // remove it anyway so the user doesn't see broken metadata
            cleanText = content.replace(/<YAI2_TOOLS>[\s\S]*?<\/YAI2_TOOLS>/g, '').trim();
        }
        
        return { cleanText, tools };
    };

    const processMessagesAndTools = (fetchedMessages: Message[]) => {
        let lastTools: string[] = [];
        const processedMessages = fetchedMessages.map(msg => {
            if (msg.role === 'assistant') {
                const { cleanText, tools } = extractAndCleanTools(msg.content);
                if (tools.length > 0) {
                    lastTools = tools;
                }
                return { ...msg, content: cleanText };
            }
            return msg;
        });
        
        setActiveDeckTools(lastTools);
        return processedMessages;
    }

    const loadConversation = useCallback(async (conversationId: string | null) => {
        setCurrentConversationId(conversationId);
        if (!conversationId) {
            setMessages([]);
            setActiveDeckTools([]);
            return;
        }

        setIsLoading(true);
        try {
            const response = await fetch(`${API_CONFIG.BASE_URL}/agent/history/${conversationId}`);
            if (!response.ok) throw new Error('Failed to fetch history');
            const data = await response.json();
            
            setMessages(processMessagesAndTools(data.messages || []));
        } catch (err) {
            console.error('Failed to load conversation history:', err);
            setMessages([]);
            setActiveDeckTools([]);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const createNewConversation = useCallback(async () => {
        setIsLoading(true);
        try {
            const conversation = await chatService.createConversation();
            setCurrentConversationId(conversation._id);
            setMessages([]);
            setActiveDeckTools([]);
            return conversation._id;
        } catch (err) {
            console.error('Failed to create conversation:', err);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const handleAssistantResponse = (responseContent: string) => {
        const { cleanText, tools } = extractAndCleanTools(responseContent || 'Sorry, I encountered an issue while processing your request.');
        
        if (tools.length > 0) {
            setActiveDeckTools(tools);
        } else {
            // Keep previous tools if no new ones are suggested, or clear them?
            // Usually we clear them if the AI doesn't suggest them for the current response.
            setActiveDeckTools([]);
        }

        const assistantMessage: Message = {
            role: 'assistant',
            content: cleanText,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };

        setMessages((prev) => [...prev, assistantMessage]);
    };

    const sendMessage = useCallback(async (content: string) => {
        if (!content.trim() || isLoading) return null;

        const userMessage: Message = {
            role: 'user',
            content: content.trim(),
            timestamp: formatTimestamp(),
        };

        setMessages((prev) => [...prev, userMessage]);
        setIsLoading(true);

        try {
            const data = await chatService.sendMessage(userMessage.content);
            handleAssistantResponse(data.response);
            return data;
        } catch (err) {
            console.error('Chat Error:', err);
            const errorMessage: Message = {
                role: 'assistant',
                content: 'System error: Unable to connect to the agent. Please ensure the server is running.',
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            };
            setMessages((prev) => [...prev, errorMessage]);
            return null;
        } finally {
            setIsLoading(false);
        }
    }, [isLoading, currentConversationId]);

    const sendVoiceMessage = useCallback(async (audio: string, mimeType: string) => {
        const userMessage: Message = {
            role: 'user',
            content: '(Voice Message)',
            timestamp: formatTimestamp(),
        };

        setMessages((prev) => [...prev, userMessage]);
        setIsLoading(true);

        try {
            const data = await chatService.sendVoice(audio, mimeType);
            handleAssistantResponse(data.reply);
        } catch (err) {
            console.error('Voice Chat Error:', err);
            const errorMessage: Message = {
                role: 'assistant',
                content: 'System error: Unable to process voice input. Please ensure the server is running.',
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            };
            setMessages((prev) => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    }, [isLoading]);

    return {
        messages,
        isLoading,
        currentConversationId,
        activeDeckTools,
        sendMessage,
        sendVoiceMessage,
        loadConversation,
        createNewConversation
    };
};
