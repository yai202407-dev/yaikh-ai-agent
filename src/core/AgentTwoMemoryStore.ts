import axios from 'axios';
import { IMemoryStore, ConversationMessage, UserProfile } from './interfaces/IMemoryStore.js';

/**
 * Memory store that proxies all calls to Agent 2 (Port 3004).
 * This fulfills the "Stateless Main Agent" requirement by leveraging 
 * Agent 2's persistent MongoDB storage.
 */
export class AgentTwoMemoryStore implements IMemoryStore {
    private baseUrl: string;

    constructor() {
        this.baseUrl = process.env.AGENT_TWO_ENDPOINT || 'http://localhost:3004';
    }

    public generateSessionId(userId: string): string {
        // Generate a random unique ID for the session to prevent daily session merging
        const random = Math.random().toString(36).substring(2, 10);
        return `${userId}_${Date.now()}_${random}`;
    }

    async saveMessage(userId: string, role: 'user' | 'assistant' | 'system', content: string, sessionId?: string, systemToken?: string): Promise<void> {
        if (!userId || !content) return;
        
        try {
            const activeSessionId = sessionId || this.generateSessionId(userId);
            const headers: any = {};
            const payload: any = {
                conversationId: activeSessionId,
                userId: userId,
                userMessage: role === 'user' ? content : undefined,
                assistantMessage: (role === 'assistant' || role === 'system') ? content : undefined
            };

            if (systemToken && systemToken !== 'None Provided') {
                if (systemToken.startsWith('Bearer ')) {
                    headers['Authorization'] = systemToken;
                } else {
                    payload['systemToken'] = systemToken;
                }
            }

            await axios.post(`${this.baseUrl}/api/agent/history/store`, payload, { headers });
        } catch (error: any) {
            console.warn('[AgentTwoStore] Failed to save message:', error.message);
        }
    }

    async updateConversationTitle(sessionId: string, title: string): Promise<void> {
        try {
            // If Agent 2 has an endpoint to update title
            await axios.put(`${this.baseUrl}/api/agent/conversations/${sessionId}`, { title });
        } catch (error: any) {
            console.warn(`[AgentTwoStore] Failed or unsupported update title: ${error.message}`);
        }
    }

    async getConversationHistory(userId: string, sessionId?: string, systemToken?: string): Promise<ConversationMessage[]> {
        try {
            const activeSessionId = sessionId || this.generateSessionId(userId);
            const headers: any = {};
            if (systemToken && systemToken.startsWith('Bearer ')) {
                headers['Authorization'] = systemToken;
            }
            const response = await axios.get(`${this.baseUrl}/api/agent/history/${activeSessionId}`, { 
                headers,
                params: systemToken && !systemToken.startsWith('Bearer ') ? { systemToken } : {}
            });
            
            if (response.data && Array.isArray(response.data.messages)) {
                return response.data.messages.map((m: any) => ({
                    role: m.role || (m.type === 'human' ? 'user' : 'assistant'),
                    content: m.content,
                    timestamp: m.timestamp ? new Date(m.timestamp) : new Date()
                }));
            }
            return [];
        } catch (error: any) {
            console.warn('[AgentTwoStore] Failed to fetch history:', error.message);
            return [];
        }
    }

    async clearConversationHistory(userId: string, sessionId?: string, systemToken?: string): Promise<void> {
        try {
            if (sessionId) {
                await this.deleteConversation(sessionId, systemToken);
            } else {
                const headers: any = {};
                if (systemToken && systemToken.startsWith('Bearer ')) {
                    headers['Authorization'] = systemToken;
                }
                await axios.delete(`${this.baseUrl}/api/agent/conversations`, {
                    params: { 
                        userId,
                        ...(systemToken && !systemToken.startsWith('Bearer ') ? { systemToken } : {})
                    },
                    headers
                });
            }
        } catch (error: any) {
            console.warn('[AgentTwoStore] Failed to clear history:', error.message);
        }
    }

    async getConversations(userId: string, systemToken?: string): Promise<any[]> {
        try {
            const headers: any = {};
            if (systemToken && systemToken.startsWith('Bearer ')) {
                headers['Authorization'] = systemToken;
            }
            const response = await axios.get(`${this.baseUrl}/api/agent/conversations`, {
                params: { 
                    userId,
                    ...(systemToken && !systemToken.startsWith('Bearer ') ? { systemToken } : {})
                },
                headers
            });
            return response.data.conversations || [];
        } catch (error: any) {
            console.warn('[AgentTwoStore] Failed to get conversations:', error.message);
            return [];
        }
    }

    async deleteConversation(sessionId: string, systemToken?: string): Promise<void> {
        try {
            const headers: any = {};
            if (systemToken && systemToken.startsWith('Bearer ')) {
                headers['Authorization'] = systemToken;
            }
            await axios.delete(`${this.baseUrl}/api/agent/conversations/${sessionId}`, {
                params: systemToken && !systemToken.startsWith('Bearer ') ? { systemToken } : {},
                headers
            });
        } catch (error: any) {
            console.warn('[AgentTwoStore] Failed to delete conversation:', error.message);
        }
    }

    async getUserProfile(userId: string): Promise<UserProfile> {
        // Agent 2 might have user info. For now, return empty or proxy if endpoint exists.
        return {};
    }

    async updateUserProfile(userId: string, data: Partial<UserProfile>): Promise<void> {
        // No-op for now unless Agent 2 has a profile update API we want to use.
    }
}
