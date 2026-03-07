import { ITool, ToolDefinition } from '../../core/interfaces/ITool.js';

/**
 * Chat skill - basic conversational capability
 */
export class ChatSkill implements ITool {
    readonly name = 'chat';
    readonly description = 'Engage in general conversation with the user';

    async execute(params?: Record<string, unknown>): Promise<string> {
        // This is typically handled by the LLM itself, not as a tool
        return 'I am here to help you with your questions and tasks.';
    }

    getDefinition(): ToolDefinition {
        return {
            type: 'function',
            function: {
                name: this.name,
                description: this.description,
                parameters: {
                    type: 'object',
                    properties: {},
                    required: []
                }
            }
        };
    }
}
