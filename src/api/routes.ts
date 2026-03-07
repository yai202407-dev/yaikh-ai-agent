import { Router, Request, Response } from 'express';
import { IAgent } from '../core/interfaces/IAgent.js';

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

    return router;
}
