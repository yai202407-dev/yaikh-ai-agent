import { ITool, ToolDefinition } from '../../core/interfaces/ITool.js';
import { IMemoryStore } from '../../core/interfaces/IMemoryStore.js';

/**
 * Tool to store user's name in profile
 */
export class StoreUserNameTool implements ITool {
    readonly name = 'store_user_name';
    readonly description = 'Store the user\'s name in their profile';

    constructor(private memory: IMemoryStore, private userId: string) { }

    async execute(params?: Record<string, unknown>): Promise<string> {
        const name = params?.name as string;

        if (!name) {
            return 'Error: name parameter is required';
        }

        await this.memory.updateUserProfile(this.userId, { name });
        return `Stored user name: ${name}`;
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
                        name: {
                            type: 'string',
                            description: 'The user\'s name to store'
                        }
                    },
                    required: ['name']
                }
            }
        };
    }
}
