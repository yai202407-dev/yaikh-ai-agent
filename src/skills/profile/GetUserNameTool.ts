import { ITool, ToolDefinition } from '../../core/interfaces/ITool.js';
import { IMemoryStore } from '../../core/interfaces/IMemoryStore.js';

/**
 * Tool to retrieve user's name from profile
 */
export class GetUserNameTool implements ITool {
    readonly name = 'get_user_name';
    readonly description = 'Retrieve the stored name of the current user';

    constructor(private memory: IMemoryStore, private userId: string) { }

    async execute(): Promise<string> {
        const profile = await this.memory.getUserProfile(this.userId);

        if (profile.name) {
            return `The user's name is ${profile.name}.`;
        }

        return 'User name is not set.';
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
