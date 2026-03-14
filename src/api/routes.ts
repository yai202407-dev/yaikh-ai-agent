import { Router, Request, Response } from 'express';
import { IAgent } from '../core/interfaces/IAgent.js';
import { getFirestoreDb } from '../infrastructure/database/FirestoreClient.js';
import multer from 'multer';
import { NotebookService } from '../skills/notebook/NotebookService.js';
import { ChatManagerEngine } from '../manager/ChatManagerEngine.js';
import axios from 'axios';

// Use memory storage for ephemeral processing before pushing to GCP Bucket
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 50 * 1024 * 1024 } // 50MB file limit
});
const notebookService = new NotebookService();
const chatManagerEngine = new ChatManagerEngine();

/**
 * Create API routes
 */
export function createRoutes(agent: IAgent): Router {
    const router = Router();

    /**
     * Health check — dedicated endpoint so express.static doesn't shadow it
     */
    router.get('/api/health', (_req: Request, res: Response) => {
        res.json({
            status: 'running',
            message: '🚀 AI Agent API is running',
            timestamp: new Date().toISOString()
        });
    });

    // Legacy root redirect (express.static now serves index.html here)
    router.get('/', (_req: Request, res: Response) => {
        res.json({
            status: 'running',
            message: '🚀 AI Agent API is running',
            timestamp: new Date().toISOString()
        });
    });


    /**
     * Unified agent endpoint (handles both standard and streaming)
     */
    router.post('/api/ai-agent', async (req: Request, res: Response) => {
        try {
            console.log('📥 req.body:', JSON.stringify(req.body));
            const { user_id, userId: altUserId, message, stream, conversationId } = req.body;
            const userId = user_id || altUserId;
            const userToken = req.headers.authorization;
            if (!message) {
                return res.status(400).json({ error: 'Field "message" is required in request body' });
            }
            if (!userId) {
                return res.status(400).json({ error: 'Field "userId" or "user_id" is required in request body' });
            }

            // --- STREAMING MODE ---
            if (stream === true) {
                res.setHeader('Content-Type', 'text/plain; charset=utf-8');
                res.setHeader('Transfer-Encoding', 'chunked');

                console.log('🚀 Streaming message:', message, 'Token present:', !!userToken);

                // Quick trick: if userToken exists, we append it to the message so LLM can use it
                const orchestratorParams = new String(message) as any;
                if (userToken) {
                    orchestratorParams.__systemToken = userToken;
                }

                const result = await agent.stream(userId, orchestratorParams, (chunk) => {
                    res.write(chunk);
                }, conversationId);

                if (result.suggestions && result.suggestions.length > 0) {
                    res.write(`\n[SUGGESTIONS: ${JSON.stringify(result.suggestions)}]`);
                }

                if (result.conversationId) {
                    res.write(`\n[CONVERSATION_ID: ${result.conversationId}]`);
                }

                if (result.usage) {
                    res.write(`\n[USAGE: ${JSON.stringify(result.usage)}]`);
                }

                res.end();
                return;
            }

            // --- STANDARD MODE ---
            console.log('🚀 Processing message:', message, 'Token present:', !!userToken);
            
            // Quick trick: if userToken exists, we append it to the message so LLM can use it
            const orchestratorParams = new String(message) as any;
            if (userToken) {
                orchestratorParams.__systemToken = userToken;
            }

            const result = await agent.process(userId, orchestratorParams, conversationId);

            return res.json({
                response: result.response,
                domain: result.domain,
                intent: result.intent,
                usedTools: result.usedTools,
                usage: result.usage,
                suggestions: result.suggestions,
                chartData: result.chartData,
                conversationId: result.conversationId || conversationId || `${userId}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
            });

        } catch (err: any) {
            console.error('❌ Agent error:', err);

            // If headers were already sent (streaming failed mid-way)
            if (res.headersSent) {
                res.write(`\n❌ Error: ${err.message}`);
                res.end();
                return;
            }

            return res.status(200).json({
                response: "I'm sorry, I encountered an internal error while processing your request. Please try again in a moment.",
                domain: 'general',
                usedTools: false,
                suggestions: ["Try asking again", "Show me usage help"]
            });
        }
    });

    /**
     * Clear conversation history
     */
    router.post('/api/agent/clear', async (req: Request, res: Response) => {
        try {
            const { userId } = req.body;

            if (!userId) {
                return res.status(400).json({ error: 'userId is required' });
            }

            await agent.clearHistory(userId);

            return res.json({
                message: 'Conversation history cleared successfully'
            });

        } catch (err: any) {
            console.error('❌ Clear history error:', err);
            return res.status(500).json({ error: 'Internal server error' });
        }
    });

    /**
     * Clear conversation history (Proxy to Agent 2)
     */
    router.delete('/api/agent/conversations', async (req: Request, res: Response) => {
        try {
            const userId = req.query.userId as string;
            const userToken = req.headers.authorization;

            if (!userId) {
                return res.status(400).json({ success: false, error: 'userId is required' });
            }

            // Delete from whichever memory provider is active
            await agent.clearHistory(userId, userToken);

            return res.json({
                success: true,
                message: 'All conversation history cleared successfully'
            });

        } catch (err: any) {
            console.error('❌ Clear history error:', err);
            return res.status(500).json({ success: false, error: 'Internal server error' });
        }
    });

    /**
     * Delete a specific conversation (Proxy to Agent 2)
     */
    router.delete('/api/agent/conversations/:id', async (req: Request, res: Response) => {
        try {
            const { id } = req.params;
            const userToken = req.headers.authorization;
            await agent.deleteConversation(id, userToken);
            return res.json({ success: true, message: 'Conversation deleted' });
        } catch (error: any) {
            console.error('❌ Proxy Delete conversation error:', error.message);
            return res.status(500).json({ success: false, message: 'Failed to delete conversation' });
        }
    });

    /**
     * Get user's conversation list (Proxy to Agent 2)
     */
    router.get('/api/agent/conversations', async (req: Request, res: Response) => {
        try {
            const userId = req.query.userId as string;
            if (!userId) return res.status(400).json({ success: false, error: 'userId query parameter required' });
            const userToken = req.headers.authorization;

            const conversations = await agent.getConversations(userId, userToken);
            return res.json({ success: true, conversations });
        } catch (error: any) {
            console.error('❌ Proxy Fetch conversations error:', error.message);
            return res.json({ success: true, conversations: [] });
        }
    });

    /**
     * Get messages for a specific conversation session (Proxy to Agent 2)
     */
    router.get('/api/agent/history/:sessionId', async (req: Request, res: Response) => {
        try {
            const { sessionId } = req.params;
            const userToken = req.headers.authorization;
            console.log(`[Routes] Fetching history for session: ${sessionId}`);
            const messages = await agent.getHistory(sessionId, userToken);
            console.log(`[Routes] Found ${messages.length} messages for session: ${sessionId}`);
            return res.json({ success: true, messages });
        } catch (error: any) {
            console.error('❌ Fetch history error:', error.message);
            return res.json({ success: true, messages: [] });
        }
    });

    /**
     * Admin: View all chat logs
     */
    router.get('/api/agent/chat-log', async (_req: Request, res: Response) => {
        try {
            const db = getFirestoreDb();
            const snapshot = await db.collection('conversations')
                .orderBy('lastUpdated', 'desc')
                .limit(50)
                .get();

            const logs: any[] = [];
            snapshot.forEach(doc => {
                const data = doc.data();
                logs.push({
                    sessionId: doc.id,
                    userId: data.userId || 'Unknown',
                    lastUpdated: data.lastUpdated?.toDate() || new Date(),
                    messages: data.messages || []
                });
            });

            return res.json({ logs });
        } catch (error: any) {
            console.error('❌ Fetch chat-log error:', error);
            // Gracefully degrade if Firestore is not available (e.g. local dev)
            if (error.message?.includes('not connected') || error.message?.includes('credentials')) {
                return res.status(503).json({ error: 'Chat log unavailable: Firestore not configured in this environment.' });
            }
            return res.status(500).json({ error: 'Failed to fetch chat logs' });
        }
    });

    /**
     * NotebookLM: Upload source file (Audio, PDF, TXT)
     */
    router.post('/api/agent/upload-source', upload.single('file'), async (req: Request, res: Response) => {
        try {
            const file = req.file;
            if (!file) {
                return res.status(400).json({ error: 'No file uploaded' });
            }

            console.log(`[Notebook Upload] Received file: ${file.originalname} (${file.mimetype})`);

            // Process the buffer via our GCS/Speech/Parser Engine
            const extractedContent = await notebookService.processNotebookSource(
                file.buffer,
                file.originalname,
                file.mimetype
            );

            // Return the extracted text so the ChatUI can instantly append it to the conversation context
            return res.json({
                success: true,
                filename: file.originalname,
                message: "Source ingested successfully into Google Cloud Storage.",
                content: extractedContent
            });

        } catch (error: any) {
            console.error('❌ Notebook Upload Error:', error);
            return res.status(500).json({ error: 'Failed to process and upload source document' });
        }
    });

    /**
     * Admin: Trigger Chat Manager Engine to scan and synthesize failure logs
     */
    router.post('/api/manager/scan', async (_req: Request, res: Response) => {
        try {
            const report = await chatManagerEngine.scanAndAnalyzeFailures();
            return res.json({
                success: true,
                message: "Chat Manager scan completed.",
                report: report
            });
        } catch (error: any) {
            console.error('❌ Chat Manager Scan Error:', error);
            return res.status(500).json({ error: 'Failed to complete chat manager scan' });
        }
    });


    /**
     * GET /api/users — list all users from MongoDB (for ComDeck identity + future auth)
     */
    router.get('/api/users', async (req: Request, res: Response) => {
        try {
            const { department, limit = '200' } = req.query as any;
            const { getMongoClient } = await import('../infrastructure/database/MongoDBClient.js');
            const client = getMongoClient();
            await client.connect();
            const db = client.getDb();

            const query: any = { is_active: { $ne: false } };
            if (department) {
                query.department = { $regex: department, $options: 'i' };
            }

            const users = await db.collection('users')
                .find(query)
                .project({
                    _id: 1,
                    name: 1,
                    employee_id: 1,
                    department: 1,
                    position: 1,
                    email: 1,
                    avatar: 1,
                })
                .limit(parseInt(limit) > 500 ? 500 : parseInt(limit))
                .sort({ department: 1, name: 1 })
                .toArray();

            return res.json({
                success: true,
                count: users.length,
                users: users.map(u => ({
                    id: u._id.toString(),
                    name: u.name || u.employee_id || 'Unknown',
                    department: u.department || 'General',
                    position: u.position || '',
                    email: u.email || '',
                    avatar: u.avatar || null,
                }))
            });
        } catch (error: any) {
            console.error('❌ GET /api/users error:', error);
            return res.status(500).json({ success: false, error: 'Failed to fetch users', details: error.message });
        }
    });

    /**
     * GET /api/users/:id — get a single user by MongoDB ID
     */
    router.get('/api/users/:id', async (req: Request, res: Response) => {
        try {
            const { id } = req.params;
            const { getMongoClient } = await import('../infrastructure/database/MongoDBClient.js');
            const client = getMongoClient();
            await client.connect();
            const user = await client.getUserById(id);

            if (!user) {
                return res.status(404).json({ success: false, error: 'User not found' });
            }

            return res.json({
                success: true,
                user: {
                    id: user._id.toString(),
                    name: user.name || user.employee_id || 'Unknown',
                    department: user.department || 'General',
                    position: user.position || '',
                    email: user.email || '',
                    avatar: user.avatar || null,
                }
            });
        } catch (error: any) {
            console.error('❌ GET /api/users/:id error:', error);
            return res.status(500).json({ success: false, error: 'Failed to fetch user' });
        }
    });

    return router;
}
