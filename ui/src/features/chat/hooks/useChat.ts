import { useState, useCallback } from 'react';
import { Message } from '../types';
import { chatService } from '../services/chat.service';
import { formatTimestamp } from '../../../utils/dateUtils';
import { API_CONFIG } from '../../../config/api.config';

export const useChat = () => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);

    const loadConversation = useCallback(async (conversationId: string | null) => {
        setCurrentConversationId(conversationId);
        if (!conversationId) {
            setMessages([]);
            return;
        }

        setIsLoading(true);
        try {
            const response = await fetch(`${API_CONFIG.BASE_URL}/agent/history/${conversationId}`);
            if (!response.ok) throw new Error('Failed to fetch history');
            const data = await response.json();
            setMessages(data.messages || []);
        } catch (err) {
            console.error('Failed to load conversation history:', err);
            setMessages([]);
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
            return conversation._id;
        } catch (err) {
            console.error('Failed to create conversation:', err);
        } finally {
            setIsLoading(false);
        }
    }, []);

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

            const assistantMessage: Message = {
                role: 'assistant',
                content: data.response || 'Sorry, I encountered an issue while processing your request.',
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            };

            setMessages((prev) => [...prev, assistantMessage]);
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

            const assistantMessage: Message = {
                role: 'assistant',
                content: data.reply || 'Sorry, I encountered an issue while processing your request.',
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            };

            setMessages((prev) => [...prev, assistantMessage]);
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
        sendMessage,
        sendVoiceMessage,
        loadConversation,
        createNewConversation
    };
};
