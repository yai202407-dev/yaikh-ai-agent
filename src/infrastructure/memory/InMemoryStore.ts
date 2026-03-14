import { IMemoryStore, ConversationMessage, UserProfile } from '../../core/interfaces/IMemoryStore.js';

/**
 * In-memory implementation of memory store (for development/testing)
 * In production, replace with Redis, MongoDB, or Postgres
 */
export class InMemoryStore implements IMemoryStore {
    private conversations: Map<string, ConversationMessage[]> = new Map();
    private profiles: Map<string, UserProfile> = new Map();
    private maxHistoryLength: number;

    constructor(maxHistoryLength: number = 10) {
        this.maxHistoryLength = maxHistoryLength;
    }

    generateSessionId(userId: string): string {
        return `mem_${userId}_${Date.now()}`;
    }

    async saveMessage(userId: string, role: 'user' | 'assistant' | 'system', content: string, sessionId?: string, systemToken?: string): Promise<void> {
        const key = sessionId || userId;
        const history = this.conversations.get(key) || [];

        history.push({
            role,
            content,
            timestamp: new Date()
        });

        // Keep only the last N messages
        const trimmedHistory = history.slice(-this.maxHistoryLength);
        this.conversations.set(key, trimmedHistory);
    }

    async getConversationHistory(userId: string, sessionId?: string, systemToken?: string): Promise<ConversationMessage[]> {
        const key = sessionId || userId;
        return this.conversations.get(key) || [];
    }

    async clearConversationHistory(userId: string, sessionId?: string, systemToken?: string): Promise<void> {
        const key = sessionId || userId;
        this.conversations.delete(key);
    }

    async getConversations(userId: string, systemToken?: string): Promise<any[]> {
        return []; // In-memory doesn't keep track of session metadata easily, return empty for mock
    }

    async deleteConversation(sessionId: string, systemToken?: string): Promise<void> {
        this.conversations.delete(sessionId);
    }

    async getUserProfile(userId: string): Promise<UserProfile> {
        return this.profiles.get(userId) || {};
    }

    async updateUserProfile(userId: string, data: Partial<UserProfile>): Promise<void> {
        const currentProfile = await this.getUserProfile(userId);
        this.profiles.set(userId, { ...currentProfile, ...data });
    }

    /**
     * Get statistics (for debugging/monitoring)
     */
    getStats() {
        return {
            totalUsers: this.profiles.size,
            activeConversations: this.conversations.size,
            totalMessages: Array.from(this.conversations.values())
                .reduce((sum, messages) => sum + messages.length, 0)
        };
    }
}
