/**
 * Memory store interface for conversation and user data persistence
 */
export interface IMemoryStore {
    /**
     * Save a message to conversation history
     */
    saveMessage(userId: string, role: 'user' | 'assistant' | 'system', content: string): Promise<void>;

    /**
     * Retrieve conversation history for a user
     */
    getConversationHistory(userId: string): Promise<ConversationMessage[]>;

    /**
     * Clear conversation history for a user
     */
    clearConversationHistory(userId: string): Promise<void>;

    /**
     * Get user profile data
     */
    getUserProfile(userId: string): Promise<UserProfile>;

    /**
     * Update user profile data
     */
    updateUserProfile(userId: string, data: Partial<UserProfile>): Promise<void>;
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
