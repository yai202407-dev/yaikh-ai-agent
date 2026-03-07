import express, { Express } from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { IAgent } from '../core/interfaces/IAgent.js';
import { createRoutes } from './routes.js';
import { createReportRoutes } from './reportRoutes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Create Express server
 */
export function createServer(agent: IAgent, port: number): Express {
    const app = express();

    // Middleware
    app.use(express.json());
    app.use(cors());

    // Serve the chatbot UI from public/
    const publicDir = path.resolve(__dirname, '../../public');
    app.use(express.static(publicDir));

    // API Routes
    app.use(createRoutes(agent));
    app.use(createReportRoutes());

    // Start server
    app.listen(port, () => {
        console.log(`\n${'='.repeat(50)}`);
        console.log(`🚀 AI Agent API Server Started`);
        console.log(`${'='.repeat(50)}`);
        console.log(`📍 Chat UI:       http://localhost:${port}`);
        console.log(`📡 API:           http://localhost:${port}/api/ai-agent`);
        console.log(`📊 Reports URL:   http://localhost:${port}/api/reports`);
        console.log(`${'='.repeat(50)}\n`);
    });

    return app;
}
