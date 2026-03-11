import { Router, Request, Response } from 'express';
import { IAgent } from '../core/interfaces/IAgent.js';
import { getFirestoreDb } from '../infrastructure/database/FirestoreClient.js';
import multer from 'multer';
import { NotebookService } from '../skills/notebook/NotebookService.js';

// Use memory storage for ephemeral processing before pushing to GCP Bucket
const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 50 * 1024 * 1024 } // 50MB file limit
});
const notebookService = new NotebookService();

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
            const { user_id, message, stream } = req.body;
            const userId = user_id;

            if (!message || !userId) {
                return res.status(400).json({ error: 'Both "message" and "userId" are required' });
            }

            // --- STREAMING MODE ---
            if (stream === true) {
                res.setHeader('Content-Type', 'text/plain; charset=utf-8');
                res.setHeader('Transfer-Encoding', 'chunked');

                console.log('🚀 Streaming message:', message);

                const result = await agent.stream(userId, message, (chunk) => {
                    res.write(chunk);
                });

                if (result.suggestions && result.suggestions.length > 0) {
                    res.write(`\n[SUGGESTIONS: ${JSON.stringify(result.suggestions)}]`);
                }

                if (result.usage) {
                    res.write(`\n[USAGE: ${JSON.stringify(result.usage)}]`);
                }

                res.end();
                return;
            }

            // --- STANDARD MODE ---
            console.log('🚀 Processing message:', message);
            const result = await agent.process(userId, message);

            return res.json({
                response: result.response,
                domain: result.domain,
                intent: result.intent,
                usedTools: result.usedTools,
                usage: result.usage,
                suggestions: result.suggestions,
                chartData: result.chartData
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

    return router;
}
