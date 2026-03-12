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

        if (params && typeof params.question === 'string') {
            question = params.question;
        } else {
            return 'Error: A question or task description is required to delegate to Agent Two.';
        }
        
        if (params && typeof params.userId === 'string') {
            userId = params.userId;
        }

        const endpoint = process.env.AGENT_TWO_ENDPOINT || 'https://yai-agent2.yaikh.com';

        try {
            console.log(`🤖 Delegating to Agent 2 (${endpoint})... Question: "${question}"`);
            
            // Expected endpoint based on docs-agent/api-design.md: POST /api/agent/chat
            const response = await axios.post(`${endpoint}/api/agent/chat`, {
                message: question,
                userId: userId
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
