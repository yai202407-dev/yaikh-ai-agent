import 'dotenv/config';
import { LangChainAgent } from './core/LangChainAgent.js';
import { InMemoryStore } from './infrastructure/memory/InMemoryStore.js';
import { ToolRegistry } from './core/ToolRegistry.js';
import { createServer } from './api/server.js';
import { SYSTEM_PROMPT } from './config/prompts.js';

// Import skills
import { ChatSkill } from './skills/chat/ChatSkill.js';
import { PURCHASE_REQUEST_MONGO_TOOLS } from './skills/data/PurchaseRequestMongoTools.js';
import { SHOP_MONGO_TOOLS } from './skills/data/ShopMongoTools.js';
import { TICKET_MONGO_TOOLS } from './skills/data/TicketMongoTools.js';
import { GATEPASS_MONGO_TOOLS } from './skills/data/GatepassMongoTools.js';
import { CAR_BOOKING_MONGO_TOOLS } from './skills/data/CarBookingMongoTools.js';
import { WEB_SEARCH_TOOLS } from './skills/web/DuckDuckGoTool.js';
import { WIKI_SEARCH_TOOLS } from './skills/web/WikipediaTool.js';
import { REPORT_TOOLS } from './skills/report/ReportTools.js';

/**
 * Bootstrap and start the AI Agent application
 */
async function bootstrap() {
    console.log('🚀 Starting AI Agent (LangChain Edition)...\n');

    // Configuration
    const PORT = parseInt(process.env.PORT || '8001');
    const MAX_HISTORY = parseInt(process.env.MAX_HISTORY || '10');

    // Choose Provider
    const LLM_PROVIDER = (process.env.LLM_PROVIDER || 'ollama') as 'ollama' | 'gemini';
    let modelName = process.env.OLLAMA_MODEL || 'llama3.1:latest';
    let baseUrlOrApiKey = process.env.OLLAMA_URL || 'http://127.0.0.1:11434';

    if (LLM_PROVIDER === 'gemini') {
        modelName = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
        baseUrlOrApiKey = process.env.GEMINI_API_KEY || '';
        if (!baseUrlOrApiKey) {
            console.error('❌ Error: GEMINI_API_KEY is not defined in .env');
            process.exit(1);
        }
    }

    // Initialize infrastructure
    console.log('⚙️ Initializing infrastructure...');
    const memory = new InMemoryStore(MAX_HISTORY);
    console.log(`   ✓ Memory: InMemoryStore (max ${MAX_HISTORY} messages)`);

    // LangSmith Tracking Check
    if (process.env.LANGCHAIN_TRACING_V2 === 'true') {
        console.log(`   ✓ Monitoring: LangSmith enabled (Project: ${process.env.LANGCHAIN_PROJECT})`);
    } else {
        console.log(`   ⚠️  Monitoring: LangSmith is NOT enabled`);
    }

    // Initialize tool registry
    console.log('\n🔧 Registering tools...');
    const toolRegistry = new ToolRegistry();

    // Register general skills
    toolRegistry.register(new ChatSkill(), 'general');

    // Register MongoDB-based purchase request tools
    PURCHASE_REQUEST_MONGO_TOOLS.forEach(tool => {
        toolRegistry.register(tool, 'purchase_request');
    });

    // Register Shop & Inventory tools
    SHOP_MONGO_TOOLS.forEach(tool => {
        toolRegistry.register(tool, 'shop');
    });

    // Register Ticket management tools
    TICKET_MONGO_TOOLS.forEach(tool => {
        toolRegistry.register(tool, 'ticket');
    });

    // Register Gatepass tools
    GATEPASS_MONGO_TOOLS.forEach(tool => {
        toolRegistry.register(tool, 'gatepass');
    });

    // Register Car Booking tools
    CAR_BOOKING_MONGO_TOOLS.forEach(tool => {
        toolRegistry.register(tool, 'car_booking');
    });

    // Register Web Search tools
    WEB_SEARCH_TOOLS.forEach(tool => {
        toolRegistry.register(tool, 'general');
    });

    // Register Wikipedia tools
    WIKI_SEARCH_TOOLS.forEach(tool => {
        toolRegistry.register(tool, 'general');
    });

    // Register Report tools
    REPORT_TOOLS.forEach(tool => {
        toolRegistry.register(tool, 'report');
    });

    console.log(`   ✓ Registered ${toolRegistry.getAllTools().length} tools`);

    // Create LangChain agent
    console.log('\n🧠 Initializing LangChain agent orchestrator...');
    const agent = new LangChainAgent(
        memory,
        toolRegistry,
        SYSTEM_PROMPT,
        modelName,
        baseUrlOrApiKey,
        LLM_PROVIDER
    );

    // Initializing the agent executor early
    await agent.initialize();
    console.log('   ✓ Agent orchestrator ready');

    // Start API server
    console.log('\n🌐 Starting API server...');
    createServer(agent as any, PORT);
}

// Start application
bootstrap().catch(error => {
    console.error('❌ Failed to start application:', error);
    process.exit(1);
});

// Global error handlers
process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
    // process.exit(1); // Optional: decide if you want to crash or stay alive
});
