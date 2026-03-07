/**
 * Tool interface for executable agent capabilities
 */
export interface ITool {
    /**
     * Unique tool name
     */
    readonly name: string;

    /**
     * Human-readable description
     */
    readonly description: string;

    /**
     * Execute the tool with given parameters
     */
    execute(params?: Record<string, unknown>): Promise<string>;

    /**
     * Get tool definition for LLM function calling
     */
    getDefinition(): ToolDefinition;
}

export interface ToolDefinition {
    type: 'function';
    function: {
        name: string;
        description: string;
        parameters: {
            type: 'object';
            properties: Record<string, unknown>;
            required: string[];
        };
    };
}
