import { ITool, ToolDefinition } from '../../core/interfaces/ITool.js';
import axios from 'axios';

/**
 * Tool for communicating with the secondary AI agent (YAI-Bot)
 * as defined in the API docs (docs-agent/api-design.md)
 */
export class AgentTwoTool implements ITool {
    readonly name = 'agent_two_delegation';
    readonly description = 'Delegate a question or task to the secondary enterprise AI Agent. This agent has access to HR databases, employee directories, car bookings, purchase requests, and general enterprise knowledge. Use this when the user asks about these domain topics.';

    async execute(params?: Record<string, unknown>): Promise<string> {
        let question = '';
        let userId = 'orchestrator-bot';
        let systemToken = '';
        let subAgent = 'auto';

        if (params && typeof params.question === 'string') {
            question = params.question;
        } else {
            return 'Error: A question or task description is required to delegate to Agent Two.';
        }
        
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
        
        // Determine the correct endpoint based on subAgent selection
        const endpointUrl = subAgent === 'auto' || !subAgent 
            ? `${baseUrl}/api/agent/chat` 
            : `${baseUrl}/api/agent/direct/${subAgent}/chat`;

        try {
            console.log(`🤖 Delegating to Agent 2 (${endpointUrl})... Question: "${question}"`);
            
            // Expected endpoint based on docs-agent/api-design.md
            const payload: any = {
                message: question,
                userId: userId
            };
            
            // Inject the priority token appropriately 
            const reqHeaders: any = { 'Content-Type': 'application/json' };
            if (systemToken) {
                if (systemToken.startsWith('Bearer ')) {
                    reqHeaders['Authorization'] = systemToken;
                } else {
                    payload['systemToken'] = systemToken;
                }
            }

            const response = await axios.post(endpointUrl, payload, {
                headers: reqHeaders
            });

            if (response.data && response.data.reply) {
                // If the agent also returned suggestions, let's format those too
                let addendum = '';
                if (Array.isArray(response.data.suggestions) && response.data.suggestions.length > 0) {
                    addendum = `\nSuggestions: ${response.data.suggestions.join(', ')}`;
                }
                
                return `Agent 2 replied:\n${response.data.reply}${addendum}`;
            }

            return 'Agent 2 returned an unexpected format or empty reply.';
        } catch (error: any) {
            console.error('❌ Error connecting to Agent 2:', error.message);
            if (error.response && error.response.data) {
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
                            description: 'The exact question, intent, or task to send to the secondary AI agent.'
                        },
                        userId: {
                            type: 'string',
                            description: 'Optional user identifier from the original prompt. Defaults to "orchestrator-bot".'
                        },
                        systemToken: {
                            type: 'string',
                            description: 'Optional authentication token from the requesting client to pass along to Agent 2 for permission checks.'
                        },
                        subAgent: {
                            type: 'string',
                            description: 'The specific sub-agent to target. Allowed values: "chitchat", "admin", "booking", "purchase", "auto". Use "booking" for cars, "purchase" for requests, "admin" for database/monitoring queries, and "auto" if unsure.',
                            enum: ['chitchat', 'admin', 'booking', 'purchase', 'auto']
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
