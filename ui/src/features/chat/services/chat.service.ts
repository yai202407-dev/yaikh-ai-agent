import { API_CONFIG } from '../../../config/api.config';
import { getActiveUserId } from '../hooks/useUserIdentity';

export const chatService = {
    async sendMessage(message: string) {
        const userId = getActiveUserId();
        const url = new URL(`${API_CONFIG.BASE_URL}/ai-agent`, window.location.origin);
        const response = await fetch(url.toString(), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message, user_id: userId }), // backend expects user_id
        });

        if (!response.ok) {
            throw new Error('Failed to get response from agent');
        }

        return response.json();
    },

    async getConversations(): Promise<any[]> {
        const userId = getActiveUserId();
        const response = await fetch(`${API_CONFIG.BASE_URL}/agent/conversations?userId=${userId}`);
        if (!response.ok) {
            throw new Error('Failed to fetch conversations');
        }
        const data = await response.json();
        return data.conversations;
    },

    async createConversation(title?: string): Promise<any> {
        const userId = getActiveUserId();
        const response = await fetch(`${API_CONFIG.BASE_URL}/agent/conversations?userId=${userId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title }),
        });
        if (!response.ok) {
            throw new Error('Failed to create conversation');
        }
        const data = await response.json();
        return data.conversation;
    },

    async deleteConversation(id: string): Promise<void> {
        const response = await fetch(`${API_CONFIG.BASE_URL}/agent/conversations/${id}`, {
            method: 'DELETE',
        });
        if (!response.ok) {
            throw new Error('Failed to delete conversation');
        }
    },

    async sendVoice(audio: string, mimeType: string) {
        const userId = getActiveUserId();
        const response = await fetch(`${API_CONFIG.BASE_URL}/agent/voice`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ audio, mimeType, userId }),
        });

        if (!response.ok) {
            throw new Error('Failed to process voice input');
        }

        return response.json();
    },

    async sendFeedback(data: { prompt: string; response: string; isCorrect: boolean; feedbackText?: string; agentRole?: string }) {
        const response = await fetch(`${API_CONFIG.BASE_URL}/agent/feedback`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            throw new Error('Failed to send feedback');
        }

        return response.json();
    },

    async getGreeting(): Promise<string> {
        const userId = getActiveUserId();
        const response = await fetch(`${API_CONFIG.BASE_URL}/agent/greeting?userId=${userId}`);
        if (!response.ok) {
            throw new Error('Failed to fetch greeting');
        }
        const data = await response.json();
        return data.greeting;
    }
};
