import { ITool, ToolDefinition } from '../../core/interfaces/ITool.js';
import { getFirestoreDb } from '../../infrastructure/database/FirestoreClient.js';

export class AnalyzeUserHistoryTool implements ITool {
    readonly name = 'analyze_user_history';
    readonly description = 'Study and retrieve the past conversation history and messages of a specific user across all their past sessions. Use this when you need to understand the user\'s past behavior, questions, or context.';

    async execute(params?: Record<string, unknown>): Promise<string> {
        let userId = '';

        if (params && typeof params.userId === 'string') {
            userId = params.userId;
        } else {
            return "Error: You must provide a valid userId to study their message history.";
        }

        try {
            const db = getFirestoreDb();
            // Query conversations where the userId matches
            const snapshot = await db.collection('conversations')
                .where('userId', '==', userId)
                .orderBy('lastUpdated', 'desc')
                .limit(10) // Limit to last 10 sessions to prevent massive payload
                .get();

            if (snapshot.empty) {
                return `No past conversation history or messages found for user: ${userId}.`;
            }

            let historyDump = `Conversation History for user ${userId}:\n\n`;
            let totalMessages = 0;

            snapshot.forEach(doc => {
                const data = doc.data();
                if (data.messages && Array.isArray(data.messages)) {
                    const sessionDate = data.lastUpdated ? data.lastUpdated.toDate().toISOString().split('T')[0] : 'Unknown Date';
                    historyDump += `--- Session: ${sessionDate} ---\n`;
                    
                    data.messages.forEach((msg: any) => {
                        const role = msg.role.toUpperCase();
                        // Truncate overly long messages
                        let content = msg.content;
                        if (content.length > 300) {
                            content = content.substring(0, 300) + '... [truncated]';
                        }
                        historyDump += `[${role}]: ${content}\n`;
                        totalMessages++;
                    });
                    historyDump += `\n`;
                }
            });

            if (totalMessages === 0) {
                return `Found sessions for user ${userId}, but they contained no readable messages.`;
            }

            historyDump += `\nTotal recent messages retrieved: ${totalMessages}. You can now analyze this data to understand the user's past interactions.`;
            return historyDump;
        } catch (error: any) {
            console.error('❌ Error analyzing user history:', error);
            // Gracefully degrade if Firestore is not available (e.g. local dev)
            if (error.message?.includes('not connected') || error.message?.includes('credentials') || error.message?.includes('index')) {
                return "Error: Could not retrieve history. Firestore configuration or index is missing.";
            }
            return `Failed to fetch user history: ${error.message}`;
        }
    }

    getDefinition(): ToolDefinition {
        return {
            type: 'function',
            function: {
                name: this.name,
                description: this.description,
                parameters: {
                    type: 'object',
                    properties: {
                        userId: {
                            type: 'string',
                            description: 'The User ID of the user whose message history you want to study. Extract this from the system prompt or user input.'
                        }
                    },
                    required: ['userId']
                }
            }
        };
    }
}
