import { getFirestoreDb } from '../infrastructure/database/FirestoreClient.js';
import { IMemoryStore, ConversationMessage, UserProfile } from './interfaces/IMemoryStore.js';
import { FieldValue } from '@google-cloud/firestore';

export class FirestoreMemoryStore implements IMemoryStore {
    private db = getFirestoreDb();
    private collectionName = 'conversations';
    private usersCollection = 'agent_settings';

    /**
     * Get or create a 24-hour rolling session ID for the user to keep chats grouped 
     * cleanly per day instead of one infinite list forever.
     */
    public generateSessionId(userId: string): string {
        const date = new Date().toISOString().split('T')[0]; // "2026-03-11"
        return `${userId}_${date}`;
    }

    async saveMessage(userId: string, role: 'user' | 'assistant' | 'system', content: string, sessionId?: string, systemToken?: string): Promise<void> {
        if (!userId || !content) return;
        
        try {
            console.log(`[FirestoreMemoryStore] Saving message for ${userId}...`);
            const activeSessionId = sessionId || this.generateSessionId(userId);
            const docRef = this.db.collection(this.collectionName).doc(activeSessionId);

            const msg = {
                role,
                content,
                timestamp: new Date()
            };

            await docRef.set({
                userId,
                updatedAt: FieldValue.serverTimestamp(),
                lastUpdated: FieldValue.serverTimestamp(),
                isActive: true
            }, { merge: true });

            await docRef.update({
                messages: FieldValue.arrayUnion(msg)
            }).catch(async (e: any) => {
                await docRef.set({
                    userId,
                    lastUpdated: FieldValue.serverTimestamp(),
                    messages: [msg]
                }, { merge: true });
            });
            console.log(`[FirestoreMemoryStore] Successfully saved message for ${userId}.`);
        } catch (error) {
            console.error(`[FirestoreMemoryStore] FAILED to save message!`, error);
            throw error;
        }
    }

    async updateConversationTitle(sessionId: string, title: string): Promise<void> {
        try {
            const docRef = this.db.collection(this.collectionName).doc(sessionId);
            await docRef.set({ title }, { merge: true });
        } catch (error) {
            console.error(`[FirestoreMemoryStore] FAILED to update title!`, error);
        }
    }

    async getConversationHistory(userId: string, sessionId?: string, systemToken?: string): Promise<ConversationMessage[]> {
        const activeSessionId = sessionId || this.generateSessionId(userId);
        const doc = await this.db.collection(this.collectionName).doc(activeSessionId).get();

        if (!doc.exists) {
            return [];
        }

        const data = doc.data();
        if (data && Array.isArray(data.messages)) {
            // Limit to last 10 messages (5 pairs) to save on LLM context windows (costs / memory bounds)
            return data.messages.slice(-10).map((msg: any) => ({
                role: msg.role as 'user' | 'assistant' | 'system',
                content: msg.content,
                timestamp: msg.timestamp?.toDate()
            }));
        }

        return [];
    }

    async clearConversationHistory(userId: string, sessionId?: string, systemToken?: string): Promise<void> {
        const activeSessionId = sessionId || this.generateSessionId(userId);
        await this.db.collection(this.collectionName).doc(activeSessionId).delete();
    }

    async getConversations(userId: string, systemToken?: string): Promise<any[]> {
        const snapshot = await this.db.collection(this.collectionName)
            .where('userId', '==', userId)
            .orderBy('updatedAt', 'desc')
            .get();

        if (snapshot.empty) return [];

        return snapshot.docs.map(doc => ({
            _id: doc.id,
            ...doc.data()
        }));
    }

    async deleteConversation(sessionId: string, systemToken?: string): Promise<void> {
        await this.db.collection(this.collectionName).doc(sessionId).delete();
    }

    async getUserProfile(userId: string): Promise<UserProfile> {
        const doc = await this.db.collection(this.usersCollection).doc(userId).get();
        if (!doc.exists) {
            return {};
        }
        return doc.data() as UserProfile;
    }

    async updateUserProfile(userId: string, data: Partial<UserProfile>): Promise<void> {
        const docRef = this.db.collection(this.usersCollection).doc(userId);
        await docRef.set({
            ...data,
            lastUpdated: FieldValue.serverTimestamp()
        }, { merge: true });
    }
}
