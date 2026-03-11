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
    private getSessionId(userId: string): string {
        const date = new Date().toISOString().split('T')[0]; // "2026-03-11"
        return `${userId}_${date}`;
    }

    async saveMessage(userId: string, role: 'user' | 'assistant' | 'system', content: string): Promise<void> {
        if (!userId || !content) return;
        
        try {
            console.log(`[FirestoreMemoryStore] Saving message for ${userId}...`);
            const sessionId = this.getSessionId(userId);
            const docRef = this.db.collection(this.collectionName).doc(sessionId);

            const msg = {
                role,
                content,
                timestamp: new Date()
            };

            await docRef.set({
                userId,
                lastUpdated: FieldValue.serverTimestamp(),
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

    async getConversationHistory(userId: string): Promise<ConversationMessage[]> {
        const sessionId = this.getSessionId(userId);
        const doc = await this.db.collection(this.collectionName).doc(sessionId).get();

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

    async clearConversationHistory(userId: string): Promise<void> {
        const sessionId = this.getSessionId(userId);
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
