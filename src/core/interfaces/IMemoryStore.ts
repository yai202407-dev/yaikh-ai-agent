/**
 * Memory store interface for conversation and user data persistence
 */
export interface IMemoryStore {
    generateSessionId(userId: string): string;
    saveMessage(userId: string, role: 'user' | 'assistant' | 'system', content: string, sessionId?: string, systemToken?: string): Promise<void>;

    /**
     * Retrieve conversation history for a user
     */
    getConversationHistory(userId: string, sessionId?: string, systemToken?: string): Promise<ConversationMessage[]>;

    /**
     * Clear conversation history for a user
     */
    clearConversationHistory(userId: string, sessionId?: string, systemToken?: string): Promise<void>;

    /**
     * Get list of conversations for a user
     */
    getConversations(userId: string, systemToken?: string): Promise<any[]>;

    /**
     * Delete a specific conversation by ID
     */
    deleteConversation(sessionId: string, systemToken?: string): Promise<void>;

    /**
     * Get user profile data
     */
    getUserProfile(userId: string): Promise<UserProfile>;

    /**
     * Update user profile data
     */
    updateUserProfile(userId: string, data: Partial<UserProfile>): Promise<void>;

    /**
     * Update conversation title
     */
    updateConversationTitle?(sessionId: string, title: string): Promise<void>;
}

export interface ConversationMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp?: Date;
}

export interface UserProfile {
    name?: string;
    email?: string;
    preferences?: Record<string, unknown>;
    metadata?: Record<string, unknown>;
}
