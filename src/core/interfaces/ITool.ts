/**
 * Context provided during tool execution
 */
export interface ToolContext {
    userId?: string;
    conversationId?: string;
    systemToken?: string;
    memoryStore?: any; // Reference to the memory store for history enrichment in delegation tools
}

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
     * Execute the tool with given parameters and optional context
     */
    execute(params?: Record<string, unknown>, context?: ToolContext): Promise<string>;

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
