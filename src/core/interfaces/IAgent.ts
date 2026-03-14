import { TokenUsage } from "./ILLMClient.js";

export interface AgentResponse {
    response: string;
    domain: string;
    intent?: 'query' | 'command' | 'conversation' | 'data_request';
    usedTools: boolean;
    usage?: TokenUsage;
    suggestions?: string[];
    chartData?: any;
    conversationId?: string;
}

export interface IAgent {
    process(userId: string, message: string, conversationId?: string): Promise<AgentResponse>;
    stream(userId: string, message: string, onChunk: (chunk: string) => void, conversationId?: string): Promise<AgentResponse>;
    clearHistory(userId: string, systemToken?: string): Promise<void>;
    getConversations(userId: string, systemToken?: string): Promise<any[]>;
    getHistory(sessionId: string, systemToken?: string): Promise<any[]>;
    deleteConversation(sessionId: string, systemToken?: string): Promise<void>;
}
