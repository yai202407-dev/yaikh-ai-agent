import { Ollama } from 'ollama';
import { ILLMClient, ChatMessage, ChatResponse, GenerateResponse, Tool } from '../../core/interfaces/ILLMClient.js';

/**
 * Ollama client implementation
 */
export class OllamaClient implements ILLMClient {
    private client: Ollama;
    private model: string;

    constructor(host: string, model: string = 'llama3.1:latest') {
        this.client = new Ollama({ host });
        this.model = model;
    }

    async generate(prompt: string): Promise<GenerateResponse> {
        const response = await this.client.generate({
            model: this.model,
            prompt
        });
        return {
            response: response.response,
            usage: {
                prompt_tokens: response.prompt_eval_count || 0,
                completion_tokens: response.eval_count || 0,
                total_tokens: (response.prompt_eval_count || 0) + (response.eval_count || 0)
            }
        };
    }

    async chat(messages: ChatMessage[], tools?: Tool[]): Promise<ChatResponse> {
        // Convert our message format to Ollama format
        const ollamaMessages = messages.map(msg => ({
            role: msg.role,
            content: msg.content,
            ...(msg.tool_calls && { tool_calls: msg.tool_calls })
        }));

        const response = await this.client.chat({
            model: this.model,
            messages: ollamaMessages as any,
            ...(tools && tools.length > 0 && { tools: tools as any })
        });

        return {
            content: response.message.content,
            tool_calls: response.message.tool_calls as any,
            usage: {
                prompt_tokens: response.prompt_eval_count || 0,
                completion_tokens: response.eval_count || 0,
                total_tokens: (response.prompt_eval_count || 0) + (response.eval_count || 0)
            }
        };
    }

    /**
     * Get model information
     */
    async getModelInfo() {
        return await this.client.show({ model: this.model });
    }
}
