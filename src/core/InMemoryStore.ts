import { IMemoryStore, ConversationMessage, UserProfile } from './interfaces/IMemoryStore.js';

/**
 * Simple in-memory store for local development.
 * Data is lost when the server restarts — not suitable for production.
 * Use FirestoreMemoryStore for production / Cloud Run.
 */
export class InMemoryStore implements IMemoryStore {
    private conversations: Map<string, ConversationMessage[]> = new Map();
    private profiles: Map<string, UserProfile> = new Map();
    private maxHistory: number;

    constructor(maxHistory = 10) {
        this.maxHistory = maxHistory;
    }

    private getSessionId(userId: string): string {
        const date = new Date().toISOString().split('T')[0];
        return `${userId}_${date}`;
    }

    async saveMessage(userId: string, role: 'user' | 'assistant' | 'system', content: string): Promise<void> {
        if (!userId || !content) return;
        const sessionId = this.getSessionId(userId);
        const history = this.conversations.get(sessionId) ?? [];
        history.push({ role, content, timestamp: new Date() });
        // Keep only the last maxHistory messages
        if (history.length > this.maxHistory) {
            history.splice(0, history.length - this.maxHistory);
        }
        this.conversations.set(sessionId, history);
    }

    async getConversationHistory(userId: string): Promise<ConversationMessage[]> {
        const sessionId = this.getSessionId(userId);
        return this.conversations.get(sessionId) ?? [];
    }

    async clearConversationHistory(userId: string): Promise<void> {
        const sessionId = this.getSessionId(userId);
        this.conversations.delete(sessionId);
    }

    async getUserProfile(userId: string): Promise<UserProfile> {
        return this.profiles.get(userId) ?? {};
    }

    async updateUserProfile(userId: string, data: Partial<UserProfile>): Promise<void> {
        const existing = this.profiles.get(userId) ?? {};
        this.profiles.set(userId, { ...existing, ...data });
    }
}
