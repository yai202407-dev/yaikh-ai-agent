import { ILLMClient, ChatMessage, ChatResponse, GenerateResponse, Tool } from '../../core/interfaces/ILLMClient.js';

/**
 * OpenAI client implementation (stub for future use)
 * Install: npm install openai
 */
export class OpenAIClient implements ILLMClient {
    private apiKey: string;
    private model: string;

    constructor(apiKey: string, model: string = 'gpt-4') {
        this.apiKey = apiKey;
        this.model = model;
    }

    async generate(prompt: string): Promise<GenerateResponse> {
        // TODO: Implement OpenAI API call
        // const openai = new OpenAI({ apiKey: this.apiKey });
        // const response = await openai.completions.create({
        //   model: this.model,
        //   prompt
        // });
        // return response.choices[0].text;

        throw new Error('OpenAI client not yet implemented. Install openai package and implement.');
    }

    async chat(messages: ChatMessage[], tools?: Tool[]): Promise<ChatResponse> {
        // TODO: Implement OpenAI chat API call
        // const openai = new OpenAI({ apiKey: this.apiKey });
        // const response = await openai.chat.completions.create({
        //   model: this.model,
        //   messages,
        //   ...(tools && { functions: tools })
        // });
        // return {
        //   content: response.choices[0].message.content || '',
        //   tool_calls: response.choices[0].message.function_call
        // };

        throw new Error('OpenAI client not yet implemented. Install openai package and implement.');
    }
}
