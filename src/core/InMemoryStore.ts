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

    public generateSessionId(userId: string): string {
        const date = new Date().toISOString().split('T')[0];
        return `${userId}_${date}`;
    }

    async saveMessage(userId: string, role: 'user' | 'assistant' | 'system', content: string, sessionId?: string, systemToken?: string): Promise<void> {
        if (!userId || !content) return;
        const activeSessionId = sessionId || this.generateSessionId(userId);
        const history = this.conversations.get(activeSessionId) ?? [];
        history.push({ role, content, timestamp: new Date() });
        // Keep only the last maxHistory messages
        if (history.length > this.maxHistory) {
            history.splice(0, history.length - this.maxHistory);
        }
        this.conversations.set(activeSessionId, history);
    }

    async updateConversationTitle(sessionId: string, title: string): Promise<void> {
        // InMemoryStore doesn't persist conversation metadata independently of messages
        // in its current implementation, so we don't strictly need to do anything here for now.
        // If we added a `metadata` Map, we'd update the title there.
    }

    async getConversationHistory(userId: string, sessionId?: string, systemToken?: string): Promise<ConversationMessage[]> {
        const activeSessionId = sessionId || this.generateSessionId(userId);
        return this.conversations.get(activeSessionId) ?? [];
    }

    async clearConversationHistory(userId: string, sessionId?: string, systemToken?: string): Promise<void> {
        const activeSessionId = sessionId || this.generateSessionId(userId);
        this.conversations.delete(activeSessionId);
    }

    async getConversations(userId: string, systemToken?: string): Promise<any[]> {
        const results: any[] = [];
        for (const [sid, msgs] of this.conversations.entries()) {
            if (sid.startsWith(`${userId}_`)) {
                results.push({
                    _id: sid,
                    title: msgs.length > 0 ? (msgs[0].content.substring(0, 30) + '...') : 'New Chat',
                    updatedAt: msgs.length > 0 ? (msgs[msgs.length - 1].timestamp || new Date()) : new Date()
                });
            }
        }
        return results.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
    }

    async deleteConversation(sessionId: string, systemToken?: string): Promise<void> {
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
