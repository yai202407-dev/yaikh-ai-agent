/**
 * LLM client interface for abstracted LLM communication
 */
export interface ILLMClient {
    /**
     * Generate a simple text completion
     */
    generate(prompt: string): Promise<GenerateResponse>;

    /**
     * Chat with conversation history and optional tool support
     */
    chat(messages: ChatMessage[], tools?: Tool[]): Promise<ChatResponse>;
}

export interface ChatMessage {
    role: 'user' | 'assistant' | 'system' | 'tool';
    content: string;
    tool_calls?: ToolCall[];
}

export interface GenerateResponse {
    response: string;
    usage?: TokenUsage;
}

export interface ChatResponse {
    content: string;
    tool_calls?: ToolCall[];
    usage?: TokenUsage;
}

export interface TokenUsage {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
}

export interface ToolCall {
    id?: string;
    type?: string;
    function: {
        name: string;
        arguments?: Record<string, unknown>;
    };
}

export interface Tool {
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
