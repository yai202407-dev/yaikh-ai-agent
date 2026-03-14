import { ITool, ToolDefinition } from '../../core/interfaces/ITool.js';
import axios from 'axios';

/**
 * Tool for communicating with the secondary AI agent (YAI-Bot)
 * as defined in the API docs (api-design.md)
 *
 * KEY DESIGN: When the user sends short follow-up messages (like "yes", "confirm",
 * "that correct") during a car booking flow, the Main Agent's history is used to
 * build a rich context string that is embedded into the `message` sent to Agent 2.
 * This ensures Agent 2's car booking specialist has all booking details even if it
 * has no prior history for this conversation.
 */
export class AgentTwoTool implements ITool {
    readonly name = 'agent_two_delegation';
    readonly description = 'Delegate a question or task to the secondary enterprise AI Agent (YAI-Bot). This agent is the primary authority for car bookings (vehicle reservations), HR data, personal user profiles, and purchase requests. Use this tool specifically when the user asks about booking cars, checking vehicle status, or managing reservations.';

    async execute(params?: Record<string, unknown>, context?: any): Promise<string> {
        let question = '';
        let userId = context?.userId || 'orchestrator-bot';
        let conversationId = context?.conversationId;
        let systemToken = context?.systemToken || '';
        let subAgent = 'auto';

        if (params && typeof params.question === 'string') {
            question = params.question;
        } else {
            return 'Error: A question or task description is required to delegate to Agent Two.';
        }
        
        // Manual overrides from params if provided (though context is preferred)
        if (params && typeof params.userId === 'string') {
            userId = params.userId;
        }
        
        if (params && typeof params.systemToken === 'string') {
            systemToken = params.systemToken;
        }

        if (params && typeof params.subAgent === 'string') {
            subAgent = params.subAgent;
        }

        const baseUrl = process.env.AGENT_TWO_ENDPOINT || 'https://yai-agent2.yaikh.com';
        
        // Map common alias terms to exact Agent 2 registry keys
        let targetAgent = subAgent;
        if (subAgent === 'booking') targetAgent = 'car_booking';
        if (subAgent === 'purchase') targetAgent = 'purchase_request';

        // Correct Agent 2 endpoints per api-design.md:
        //   POST /api/agent/chat                        — auto-routed
        //   POST /api/agent/direct/:agent/chat          — direct to specific agent
        const endpointUrl = targetAgent === 'auto' || !targetAgent 
            ? `${baseUrl}/api/agent/chat` 
            : `${baseUrl}/api/agent/direct/${targetAgent}/chat`;

        // ── CONTEXT ENRICHMENT ──────────────────────────────────────────────────
        // Problem: When a user sends a short follow-up like "yes", "that correct", or 
        // "proceed", Agent 2's car booking agent has no history of the booking details 
        // (pickup, destination, date, passengers). We fix this by injecting the Main 
        // Agent's conversation history into the message itself so the car booking 
        // specialist has full context regardless of its own history state.
        let enrichedMessage = question;
        try {
            if (context?.memoryStore && conversationId) {
                const history: any[] = await context.memoryStore.getConversationHistory(
                    userId, conversationId, systemToken
                );
                
                if (history && history.length > 0) {
                    // Use last 10 messages to stay focused and avoid token bloat
                    const recentHistory = history.slice(-10);
                    const transcript = recentHistory
                        .map((m: any) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${String(m.content || '').substring(0, 500)}`)
                        .join('\n');
                    
                    // Always enrich for car booking sub-agent to ensure context is preserved
                    // For other agents, only enrich if the message looks like a short continuation
                    const isCarBooking = targetAgent === 'car_booking';
                    const isShortFollowUp = question.trim().split(/\s+/).length <= 10;
                    
                    if (isCarBooking || isShortFollowUp) {
                        enrichedMessage = `[CONVERSATION HISTORY - Contains all booking details the user has already provided. Use this for full context.]\n${transcript}\n\n[CURRENT USER MESSAGE]\n${question}`;
                        console.log(`🔄 [AgentTwoTool] Enriched message with ${recentHistory.length} history messages (isCarBooking=${isCarBooking}).`);
                    }
                }
            }
        } catch (histErr: any) {
            // Non-blocking — if history fetch fails, just use the original question
            console.warn(`[AgentTwoTool] Could not enrich question with history: ${histErr.message}`);
        }

        try {
            console.log(`🤖 Delegating to Agent 2 (${endpointUrl}) | User: ${userId} | Conv: ${conversationId} | SubAgent: ${targetAgent}`);
            
            // Payload per Agent 2 api-design.md (POST /api/agent/chat or /direct/:agent/chat)
            const payload: any = {
                message: enrichedMessage,
                userId: userId,
                conversationId: conversationId,   // Pass always — Agent 2 uses this for its own history
                skipHistory: false                 // Let Agent 2 save history for future turns
            };
            
            // Inject token: prefer Authorization header (Bearer), fall back to body field
            const reqHeaders: any = { 'Content-Type': 'application/json' };
            if (systemToken && systemToken !== 'None Provided') {
                if (systemToken.startsWith('Bearer ')) {
                    reqHeaders['Authorization'] = systemToken;
                } else {
                    reqHeaders['Authorization'] = `Bearer ${systemToken}`;
                }
            }

            const response = await axios.post(endpointUrl, payload, {
                headers: reqHeaders,
                timeout: 60000  // 60s timeout for complex booking flows
            });

            if (response.data && response.data.reply) {
                let reply = response.data.reply;
                // Append suggestion chips if provided
                if (Array.isArray(response.data.suggestions) && response.data.suggestions.length > 0) {
                    reply += `\nSuggestions: ${response.data.suggestions.join(', ')}`;
                }
                return reply;
            }

            return 'Agent 2 returned an unexpected format or empty reply.';
        } catch (error: any) {
            console.error('❌ Error connecting to Agent 2:', error.message);
            if (error.response?.data) {
                return `Failed to fetch from Agent 2: ${JSON.stringify(error.response.data)}`;
            }
            return `Failed to connect to Agent 2: ${error.message}`;
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
                        question: {
                            type: 'string',
                            description: 'The user\'s message or intent to forward to Agent 2. For follow-up confirmations (like "yes", "correct", "proceed"), include a brief summary of the booking details that the user has already confirmed (date, pickup, destination, passengers, time) so the specialist agent has context.'
                        },
                        subAgent: {
                            type: 'string',
                            description: 'The specific sub-agent to target. Use "car_booking" for ALL vehicle reservation tasks (booking, confirming, modifying, cancelling, checking status). Use "purchase_request" for purchase/procurement, "chitchat" for general HR/employee lookup, and "auto" for automatic routing.',
                            enum: ['chitchat', 'car_booking', 'purchase_request', 'auto']
                        }
                    },
                    required: ['question']
                }
            }
        };
    }
}

export const AGENT_TWO_TOOLS: ITool[] = [
    new AgentTwoTool()
];
