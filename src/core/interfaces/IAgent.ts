import { TokenUsage } from "./ILLMClient.js";

export interface AgentResponse {
    response: string;
    domain: string;
    intent?: 'query' | 'command' | 'conversation' | 'data_request';
    usedTools: boolean;
    usage?: TokenUsage;
    suggestions?: string[];
    chartData?: any;
}

export interface IAgent {
    process(userId: string, message: string): Promise<AgentResponse>;
    stream(userId: string, message: string, onChunk: (chunk: string) => void): Promise<AgentResponse>;
    clearHistory(userId: string): Promise<void>;
}
