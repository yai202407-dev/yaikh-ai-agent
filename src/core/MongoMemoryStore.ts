import { MongoClient, Collection, Db, ObjectId } from 'mongodb';
import { IMemoryStore, ConversationMessage, UserProfile } from './interfaces/IMemoryStore.js';

/**
 * Direct MongoDB Memory Store for the Main Agent.
 * Connects to the SAME database as Agent 2.
 * 
 * Key design principle:
 * - conversationId = MongoDB ObjectId hex string (24-char hex), matches Agent 2's Mongoose model
 * - sessionId in chat_histories = same ObjectId hex string
 */
export class MongoMemoryStore implements IMemoryStore {
    private client: MongoClient | null = null;
    private db: Db | null = null;
    private historyCollection: Collection | null = null;
    private convCollection: Collection | null = null;

    private uri: string;
    private dbName: string;
    private historyCollName: string;

    constructor() {
        this.uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';

        try {
            const url = new URL(this.uri);
            this.dbName = url.pathname.slice(1) || 'yai-bot';
        } catch (e) {
            this.dbName = 'yai-bot';
        }

        this.historyCollName = process.env.CONVERSATION_COLLECTION || 'chat_histories';
    }

    private async connect(): Promise<void> {
        if (this.db) return;

        try {
            this.client = new MongoClient(this.uri);
            await this.client.connect();
            this.db = this.client.db(this.dbName);
            this.historyCollection = this.db.collection(this.historyCollName);
            this.convCollection = this.db.collection('conversations');
            console.log(`[MongoMemoryStore] ✅ Connected to ${this.dbName}`);
        } catch (error) {
            console.error('[MongoMemoryStore] Connection failed:', error);
            throw error;
        }
    }

    /**
     * Generate a valid MongoDB ObjectId hex string.
     * This is compatible with Agent 2's Mongoose Conversation model which uses ObjectId _id.
     */
    public generateSessionId(_userId: string): string {
        return new ObjectId().toHexString();
    }

    async saveMessage(userId: string, role: 'user' | 'assistant' | 'system', content: string, sessionId?: string, systemToken?: string): Promise<void> {
        await this.connect();
        const strUserId = String(userId);

        // If no sessionId, we can't create one mid-save — this shouldn't happen
        // because LangChainAgent always passes an activeSessionId
        const activeSessionId = sessionId || new ObjectId().toHexString();

        console.log(`[MongoMemoryStore] Saving message - User: ${strUserId}, Session: ${activeSessionId}, Role: ${role}, Content: ${content.substring(0, 40)}...`);

        try {
            const type = role === 'user' ? 'human' : 'ai';
            const message = {
                type,
                data: {
                    content,
                    additional_kwargs: {}
                },
                timestamp: new Date()
            };

            // Save to chat_histories collection (TTLMongoDBChatMessageHistory format)
            await this.historyCollection!.updateOne(
                { sessionId: activeSessionId },
                {
                    $push: { messages: message } as any,
                    $set: { updatedAt: new Date() }
                },
                { upsert: true }
            );

            // Upsert conversation metadata — use ObjectId for _id
            let convObjectId: ObjectId;
            try {
                convObjectId = new ObjectId(activeSessionId);
            } catch {
                // Not a valid ObjectId string — skip metadata update
                console.warn(`[MongoMemoryStore] sessionId "${activeSessionId}" is not a valid ObjectId, skipping conv metadata update`);
                return;
            }

            const convUpdate: any = {
                $set: {
                    userId: strUserId,
                    updatedAt: new Date(),
                    isActive: true
                },
                $setOnInsert: {
                    title: 'New Chat',
                    createdAt: new Date(),
                    metadata: {}
                }
            };

            if (role === 'assistant') {
                convUpdate.$set.lastMessage = content.substring(0, 100);
            }

            await this.convCollection!.updateOne(
                { _id: convObjectId as any },
                convUpdate,
                { upsert: true }
            );

            console.log(`[MongoMemoryStore] ✅ Saved ${role} message for session: ${activeSessionId}`);
        } catch (error) {
            console.error('[MongoMemoryStore] Failed to save message:', error);
        }
    }

    async updateConversationTitle(sessionId: string, title: string): Promise<void> {
        await this.connect();
        try {
            let convObjectId: ObjectId;
            try {
                convObjectId = new ObjectId(sessionId);
            } catch {
                console.warn(`[MongoMemoryStore] updateConversationTitle: Invalid ObjectId format: ${sessionId}`);
                return;
            }

            await this.convCollection!.updateOne(
                { _id: convObjectId as any },
                { $set: { title } }
            );
            console.log(`[MongoMemoryStore] ✅ Updated title for session: ${sessionId}`);
        } catch (error) {
            console.error('[MongoMemoryStore] Failed to update conversation title:', error);
        }
    }

    async getConversationHistory(userId: string, sessionId?: string, systemToken?: string): Promise<ConversationMessage[]> {
        await this.connect();
        if (!sessionId) return [];

        try {
            const doc = await this.historyCollection!.findOne({ sessionId });
            if (!doc || !Array.isArray(doc.messages)) return [];

            return doc.messages.map((m: any) => ({
                role: m.type === 'human' ? 'user' : 'assistant',
                content: m.data?.content || m.content || '',
                timestamp: m.timestamp || new Date()
            }));
        } catch (error) {
            console.error('[MongoMemoryStore] Failed to get history:', error);
            return [];
        }
    }

    async clearConversationHistory(userId: string, sessionId?: string, systemToken?: string): Promise<void> {
        await this.connect();
        const strUserId = String(userId);
        if (sessionId) {
            await this.deleteConversation(sessionId);
        } else {
            // Find all conversations for this user and delete their histories
            const convs = await this.convCollection!.find({ userId: strUserId }).toArray();
            const ids = convs.map(c => c._id.toString());
            await Promise.all([
                this.convCollection!.deleteMany({ userId: strUserId }),
                ...ids.map(id => this.historyCollection!.deleteOne({ sessionId: id }))
            ]);
        }
    }

    async getConversations(userId: string, systemToken?: string): Promise<any[]> {
        await this.connect();
        const strUserId = String(userId);
        try {
            console.log(`[MongoMemoryStore] Fetching conversations for userId: "${strUserId}"`);
            const results = await this.convCollection!
                .find({ userId: strUserId, isActive: { $ne: false } })
                .sort({ updatedAt: -1 })
                .toArray();
            console.log(`[MongoMemoryStore] Found ${results.length} conversations for "${strUserId}"`);
            return results;
        } catch (error) {
            console.error('[MongoMemoryStore] Failed to get conversations:', error);
            return [];
        }
    }

    async deleteConversation(sessionId: string, systemToken?: string): Promise<void> {
        await this.connect();
        try {
            let convFilter: any = { sessionId };
            try {
                const oid = new ObjectId(sessionId);
                // Delete by ObjectId _id in conversations collection
                await this.convCollection!.deleteOne({ _id: oid as any });
            } catch {
                // Not an ObjectId, fall back to string
                await this.convCollection!.deleteOne({ _id: sessionId as any });
            }
            // Always delete by sessionId in histories
            await this.historyCollection!.deleteOne({ sessionId });
        } catch (error) {
            console.error('[MongoMemoryStore] Failed to delete conversation:', error);
        }
    }

    async getUserProfile(_userId: string): Promise<UserProfile> {
        return {};
    }

    async updateUserProfile(_userId: string, _data: Partial<UserProfile>): Promise<void> {
        // Not implemented
    }
}
