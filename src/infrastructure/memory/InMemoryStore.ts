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

    async saveMessage(userId: string, role: 'user' | 'assistant' | 'system', content: string): Promise<void> {
        const history = this.conversations.get(userId) || [];

        history.push({
            role,
            content,
            timestamp: new Date()
        });

        // Keep only the last N messages
        const trimmedHistory = history.slice(-this.maxHistoryLength);
        this.conversations.set(userId, trimmedHistory);
    }

    async getConversationHistory(userId: string): Promise<ConversationMessage[]> {
        return this.conversations.get(userId) || [];
    }

    async clearConversationHistory(userId: string): Promise<void> {
        this.conversations.delete(userId);
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
