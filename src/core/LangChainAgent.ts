import { ChatOllama } from "@langchain/ollama";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { HumanMessage, AIMessage, SystemMessage, ToolMessage } from "@langchain/core/messages";
import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import { ToolRegistry } from "./ToolRegistry.js";
import { IMemoryStore } from "./interfaces/IMemoryStore.js";
import { TokenUsage } from "./interfaces/ILLMClient.js";
import { IAgent, AgentResponse } from "./interfaces/IAgent.js";

/**
 * Agent implementation using LangChain and Ollama
 */
export class LangChainAgent implements IAgent {
    private llm: any | null = null;
    private tools: DynamicStructuredTool[] = [];
    private activeRequests: Set<string> = new Set();

    constructor(
        private memory: IMemoryStore,
        private toolRegistry: ToolRegistry,
        private systemPrompt: string | (() => Promise<string>),
        private modelName: string = "llama3.1:latest",
        private baseUrlOrApiKey: string = "http://localhost:11434",
        private provider: 'ollama' | 'gemini' = 'ollama'
    ) { }

    /**
     * Initialize the LangChain LLM with tools
     */
    async initialize() {
        if (this.provider === 'gemini') {
            console.log(`🧠 [LangChain] Initializing Gemini Agent (${this.modelName})...`);
            this.llm = new ChatGoogleGenerativeAI({
                model: this.modelName,
                apiKey: this.baseUrlOrApiKey,
                temperature: 0,
            });
        } else {
            console.log(`🧠 [LangChain] Initializing Ollama Agent (${this.modelName})...`);
            this.llm = new ChatOllama({
                model: this.modelName,
                baseUrl: this.baseUrlOrApiKey,
                temperature: 0,
            });
        }

        // Convert our tools to LangChain format
        this.tools = this.toolRegistry.getAllTools().map(tool => {
            const definition = tool.getDefinition();
            return new DynamicStructuredTool({
                name: tool.name,
                description: tool.description,
                schema: this.mapParametersToZod(definition.function.parameters),
                func: async (args: any) => {
                    return await tool.execute(args);
                },
            });
        });

        // Bind tools to the LLM
        this.llm = this.llm.bindTools(this.tools);
    }

    /**
     * Process user message
     */
    async process(userId: string, message: string): Promise<AgentResponse> {
        if (this.activeRequests.has(userId)) {
            return {
                response: "⚠️ I am still processing your previous request. Please wait a moment.",
                domain: 'general',
                intent: 'conversation' as any,
                usedTools: false,
                usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 } as TokenUsage,
                suggestions: []
            };
        }

        this.activeRequests.add(userId);

        try {
            if (!this.llm) {
                console.log('🔧 Initializing LangChain agent orchestrator...');
                await this.initialize();
            }

            const history = await this.memory.getConversationHistory(userId);

            // Build message history
            const currentDateTime = new Date().toLocaleString('en-GB', {
                day: '2-digit', month: '2-digit', year: 'numeric',
                hour: '2-digit', minute: '2-digit', second: '2-digit'
            });

            // Fetch dynamic prompt if it's a function
            const resolvedPrompt = typeof this.systemPrompt === 'function' ? await this.systemPrompt() : this.systemPrompt;

            const messages: any[] = [
                new SystemMessage(`Current Date & Time: ${currentDateTime}\n\n${resolvedPrompt}`)
            ];

            // Add conversation history
            for (const msg of history) {
                if (msg.role === 'user') {
                    messages.push(new HumanMessage(msg.content));
                } else {
                    messages.push(new AIMessage(msg.content));
                }
            }

            // Add current message
            messages.push(new HumanMessage(message));

            // Invoke LLM and handle tool calls
            console.log(`🧠 [LangChain] Initial LLM call starting...`);
            const startTime = Date.now();
            let response = await this.llm!.invoke(messages);

            let totalUsage: TokenUsage = { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };
            totalUsage = this.accumulateUsage(response, totalUsage);

            console.log(`⏱️  Initial LLM call took ${((Date.now() - startTime) / 1000).toFixed(1)}s`);
            console.log(`🔧 Tool calls found: ${response.tool_calls?.length || 0}`);

            let iterations = 0;
            const maxIterations = 8;
            const executedToolCalls = new Set<string>();

            // --- LEAK PROTECTION: Check if response has raw JSON tool calls in content but no native tool_calls ---
            if ((!response.tool_calls || response.tool_calls.length === 0) && typeof response.content === 'string') {
                const trimmed = response.content.trim();
                if (trimmed.startsWith('{') && trimmed.endsWith('}') && (trimmed.includes('"name"') || trimmed.includes('"arguments"'))) {
                    try {
                        const parsed = JSON.parse(trimmed);
                        if (parsed.name) {
                            console.log(`🛡️  Leak Protection: Manually parsing tool call from content: ${parsed.name}`);
                            response.tool_calls = [{
                                name: parsed.name,
                                args: parsed.arguments || parsed.args || {},
                                id: `man-${Date.now()}`
                            }];
                            // Clear content so it doesn't leak to user
                            response.content = "";
                        }
                    } catch (e) { /* Not valid tool call JSON */ }
                }
            }

            // Tool calling loop
            while (response.tool_calls && response.tool_calls.length > 0 && iterations < maxIterations) {
                iterations++;
                console.log(`🔧 [LangChain] Iteration ${iterations}: Executing ${response.tool_calls.length} tool(s)...`);

                // Loop detection: Check if we've already done exactly this before
                const currentCallKey = JSON.stringify(response.tool_calls.map((tc: any) => ({
                    name: tc.name.split('<')[0].split('|')[0].trim(),
                    args: tc.args
                })));
                if (executedToolCalls.has(currentCallKey)) {
                    console.log(`⚠️  Loop detected! AI is repeating tool calls. Force-stopping.`);
                    break;
                }
                executedToolCalls.add(currentCallKey);

                // Add AI response to messages
                messages.push(response);

                // Execute each tool
                for (const toolCall of response.tool_calls) {
                    // Clean up tool name if it contains weird tokens (like <|channel|>)
                    const cleanToolName = toolCall.name.split('<')[0].trim();

                    console.log(`  ↳ Tool ${cleanToolName} starting...`);
                    const toolStartTime = Date.now();

                    const tool = this.tools.find(t => t.name === cleanToolName);
                    if (tool) {
                        try {
                            const result = await tool.invoke(toolCall.args);
                            console.log(`  ✅ Tool ${cleanToolName} finished in ${((Date.now() - toolStartTime) / 1000).toFixed(1)}s. Result length: ${result.length}`);
                            messages.push(new ToolMessage({
                                content: result,
                                tool_call_id: toolCall.id || ''
                            }));
                        } catch (error) {
                            console.error(`❌ Tool ${cleanToolName} failed:`, error);
                            messages.push(new ToolMessage({
                                content: `Error: ${error}`,
                                tool_call_id: toolCall.id || ''
                            }));
                        }
                    } else {
                        console.log(`  ❌ Tool ${cleanToolName} not found in registry!`);
                        messages.push(new ToolMessage({
                            content: `Error: Tool not found`,
                            tool_call_id: toolCall.id || ''
                        }));
                    }
                }

                // Get next response
                console.log(`🧠 [LangChain] Asking LLM for follow-up...`);
                const followUpStartTime = Date.now();
                response = await this.llm!.invoke(messages);
                totalUsage = this.accumulateUsage(response, totalUsage);
                console.log(`⏱️  Follow-up LLM call took ${((Date.now() - followUpStartTime) / 1000).toFixed(1)}s`);
            }

            console.log(`✨ [LangChain] Process finished. Total time: ${((Date.now() - startTime) / 1000).toFixed(1)}s`);

            let responseText = '';
            if (typeof response.content === 'string') {
                responseText = response.content;
            } else if (Array.isArray(response.content)) {
                responseText = response.content
                    .map((part: any) => typeof part === 'string' ? part : part.text || '')
                    .join('');
            }

            let { cleanResponse, suggestions } = this.parseSuggestions(responseText);
            const { cleanText, chartData } = this.parseChartData(cleanResponse);

            if (!cleanText && responseText) {
                cleanResponse = responseText;
            } else if (!cleanText && iterations > 0) {
                cleanResponse = "I have processed your request using the available tools, but I couldn't generate a summary.";
            } else if (cleanText) {
                cleanResponse = cleanText;
            }
            
            if (!cleanResponse || cleanResponse.trim() === '') {
                cleanResponse = "I'm sorry, I couldn't process this request properly. The answer may be too large, or I lack the proper information. Please try rephrasing or narrowing down your search.";
            }

            // Save to memory
            await this.memory.saveMessage(userId, 'user', message);
            await this.memory.saveMessage(userId, 'assistant', responseText);

            console.log(`🚀 Sending response back to API...`);
            return {
                response: cleanResponse,
                domain: 'general',
                intent: 'conversation' as any,
                usedTools: iterations > 0,
                usage: totalUsage,
                suggestions,
                chartData
            };
        } catch (error: any) {
            console.error('💥 Critical Agent Error:', error);
            return {
                response: "I apologize, but I'm having trouble connecting to my database tools right now. Could you please try rephrasing your request?",
                domain: 'general',
                intent: 'conversation' as any,
                usedTools: false,
                usage: {
                    prompt_tokens: 0,
                    completion_tokens: 0,
                    total_tokens: 0
                } as TokenUsage,
                suggestions: ["Try again", "Show me help"]
            };
        } finally {
            this.activeRequests.delete(userId);
        }
    }

    /**
     * Stream user message with real-time feedback
     */
    async stream(userId: string, message: string, onChunk: (chunk: string) => void): Promise<AgentResponse> {
        if (this.activeRequests.has(userId)) {
            const warning = "⚠️ I am still processing your previous request. Please wait a moment for me to finish.";
            onChunk(warning);
            return { response: warning, domain: 'general', usedTools: false, suggestions: [] };
        }

        this.activeRequests.add(userId);
        console.log(`📡 [Streaming] Started for user ${userId}: "${message.substring(0, 30)}..."`);

        try {
            if (!this.llm) {
                await this.initialize();
            }

            const history = await this.memory.getConversationHistory(userId);
            const currentDateTime = new Date().toLocaleString('en-GB', {
                day: '2-digit', month: '2-digit', year: 'numeric',
                hour: '2-digit', minute: '2-digit', second: '2-digit'
            });
            const resolvedPrompt = typeof this.systemPrompt === 'function' ? await this.systemPrompt() : this.systemPrompt;
            const messages: any[] = [new SystemMessage(`Current Date & Time: ${currentDateTime}\n\n${resolvedPrompt}`)];

            for (const msg of history) {
                messages.push(msg.role === 'user' ? new HumanMessage(msg.content) : new AIMessage(msg.content));
            }
            messages.push(new HumanMessage(message));

            let iterations = 0;
            const maxIterations = 8;
            let usedTools = false;
            let totalUsage: TokenUsage = { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };
            let finalResponse = "";

            try {
                const executedToolCalls = new Set<string>();

                // Helper function for recursive tool-calling in a stream
                const runStream = async (currentMessages: any[]): Promise<void> => {
                    if (iterations >= maxIterations) return;

                    let toolCalls: any[] = [];
                    let gatheredContent = "";

                    const stream = await this.llm!.stream(currentMessages);

                    for await (const chunk of stream) {
                        // Accumulate usage metadata
                        if (chunk.usage_metadata) {
                            totalUsage = this.accumulateUsage(chunk, totalUsage);
                        }

                        // Collect tool calls from chunks (Gemini/Ollama)
                        if (chunk.tool_calls && chunk.tool_calls.length > 0) {
                            usedTools = true;
                            toolCalls = [...toolCalls, ...chunk.tool_calls];
                        }

                        // Collect tool call chunks if they exist (sometimes provided incrementally)
                        if (chunk.tool_call_chunks && chunk.tool_call_chunks.length > 0) {
                            usedTools = true;
                            // Note: tool_call_chunks are usually handled by LangChain internally 
                            // to populate tool_calls on the final message, but we track presence here.
                        }

                        // If it's just text content, stream it out
                        if (chunk.content && (!chunk.tool_calls || chunk.tool_calls.length === 0)) {
                            const text = typeof chunk.content === 'string' ? chunk.content : (chunk.content as any).text;
                            if (text) {
                                finalResponse += text;
                                gatheredContent += text;
                                onChunk(text);
                            }
                        }
                    }

                    // After stream ends, check if we need to execute tools
                    // We need a full AIMessage to stick into the history for the tools to work
                    const aiMessage = new AIMessage({
                        content: gatheredContent,
                        tool_calls: toolCalls
                    });

                    if (toolCalls.length > 0) {
                        iterations++;

                        // Loop detection
                        const currentCallKey = JSON.stringify(toolCalls.map((tc: any) => ({
                            name: tc.name.split('<')[0].split('|')[0].trim(),
                            args: tc.args
                        })));

                        if (executedToolCalls.has(currentCallKey)) {
                            console.log(`⚠️  Stream Loop detected! Force-stopping.`);
                            return;
                        }
                        executedToolCalls.add(currentCallKey);

                        onChunk(`\n[THINKING: Executing ${toolCalls.length} tool(s)...]\n`);
                        currentMessages.push(aiMessage);

                        for (const toolCall of toolCalls) {
                            const cleanToolName = toolCall.name.split('<')[0].trim();
                            const tool = this.tools.find(t => t.name === cleanToolName);

                            if (tool) {
                                try {
                                    const result = await tool.invoke(toolCall.args);
                                    currentMessages.push(new ToolMessage({ content: result, tool_call_id: toolCall.id || '' }));
                                } catch (error) {
                                    currentMessages.push(new ToolMessage({ content: `Error: ${error}`, tool_call_id: toolCall.id || '' }));
                                }
                            } else {
                                currentMessages.push(new ToolMessage({ content: `Error: Tool not found`, tool_call_id: toolCall.id || '' }));
                            }
                        }

                        // Recursively call stream with tool results
                        await runStream(currentMessages);
                    }
                };

                // Start the stream process
                await runStream(messages);

            } catch (error) {
                console.error('Streaming error:', error);
                onChunk(`\nError: I encountered a problem while generating the response.`);
                finalResponse = `I encountered a problem while generating the response.`;
            }

            let { cleanResponse, suggestions } = this.parseSuggestions(finalResponse);
            const { cleanText, chartData } = this.parseChartData(cleanResponse);
            
            let finalOutput = cleanText || cleanResponse;
            if (!finalOutput || finalOutput.trim() === '') {
                finalOutput = "I'm sorry, I couldn't process this request properly. The answer may be too large, or I lack the proper information. Please try rephrasing or narrowing down your search.";
            }

            // Save to memory
            await this.memory.saveMessage(userId, 'user', message);
            await this.memory.saveMessage(userId, 'assistant', finalOutput);

            return {
                response: finalOutput,
                domain: 'general',
                usedTools,
                usage: totalUsage,
                suggestions,
                chartData
            };
        } finally {
            this.activeRequests.delete(userId);
            console.log(`✅ [Streaming] Finished for user ${userId}`);
        }
    }

    /**
     * Clear conversation history
     */
    async clearHistory(userId: string): Promise<void> {
        await this.memory.clearConversationHistory(userId);
    }

    /**
     * Parse suggestions from completion text
     */
    private parseSuggestions(text: string): { cleanResponse: string, suggestions: string[] } {
        const suggestionRegex = /\[SUGGESTIONS:\s*([\s\S]*?)\]/i;
        const match = text.match(suggestionRegex);

        if (match) {
            try {
                const cleanResponse = text.replace(suggestionRegex, '').trim();
                const suggestionsContent = match[1];
                let suggestions: string[] = [];

                if (suggestionsContent.startsWith('[') && suggestionsContent.endsWith(']')) {
                    suggestions = JSON.parse(suggestionsContent);
                } else {
                    suggestions = suggestionsContent
                        .split(',')
                        .map(s => s.trim().replace(/^["']|["']$/g, ''))
                        .filter(s => s.length > 0);
                }

                return { cleanResponse, suggestions };
            } catch (e) {
                return { cleanResponse: text.replace(suggestionRegex, '').trim(), suggestions: [] };
            }
        }

        return { cleanResponse: text, suggestions: [] };
    }

    /**
     * Parse chart data from completion text
     */
    private parseChartData(text: string): { cleanText: string, chartData: any | null } {
        const marker = '[CHART:';
        const startIdx = text.toUpperCase().indexOf(marker);
        if (startIdx === -1) return { cleanText: text, chartData: null };

        let openBrackets = 0;
        let endIdx = -1;

        for (let i = startIdx; i < text.length; i++) {
            if (text[i] === '[') openBrackets++;
            else if (text[i] === ']') {
                openBrackets--;
                if (openBrackets === 0) {
                    endIdx = i;
                    break;
                }
            }
        }

        if (endIdx !== -1) {
            const raw = text.substring(startIdx, endIdx + 1);
            const jsonStr = raw.substring(marker.length, raw.length - 1).trim();
            try {
                const chartData = JSON.parse(jsonStr);
                const cleanText = (text.substring(0, startIdx) + text.substring(endIdx + 1)).trim();
                return { cleanText, chartData };
            } catch (e) {
                console.error("Failed to parse chart JSON:", e);
                return { cleanText: text, chartData: null };
            }
        }

        return { cleanText: text, chartData: null };
    }

    /**
     * Map internal parameter types to Zod schema
     */
    private mapParametersToZod(parameters: any): any {
        const shape: any = {};

        if (parameters && parameters.properties) {
            for (const [key, value] of Object.entries(parameters.properties as Record<string, any>)) {
                let schema: z.ZodTypeAny;

                switch (value.type) {
                    case 'string':
                        schema = z.string().describe(value.description || '');
                        break;
                    case 'number':
                        schema = z.number().describe(value.description || '');
                        break;
                    case 'boolean':
                        schema = z.boolean().describe(value.description || '');
                        break;
                    default:
                        schema = z.any().describe(value.description || '');
                }

                if (parameters.required?.includes(key)) {
                    shape[key] = schema;
                } else {
                    shape[key] = schema.optional();
                }
            }
        }

        return z.object(shape);
    }

    /**
     * Accumulate usage from response metadata
     */
    private accumulateUsage(response: any, current: TokenUsage): TokenUsage {
        const usage = response.usage_metadata;
        const responseMetadata = response.response_metadata;

        if (usage) {
            return {
                prompt_tokens: (current.prompt_tokens || 0) + (usage.input_tokens || usage.prompt_tokens || 0),
                completion_tokens: (current.completion_tokens || 0) + (usage.output_tokens || usage.completion_tokens || 0),
                total_tokens: (current.total_tokens || 0) + (usage.total_tokens || 0)
            };
        } else if (responseMetadata && responseMetadata.tokenUsage) {
            // Fallback for some Ollama/other provider formats
            const ollamaUsage = responseMetadata.tokenUsage;
            return {
                prompt_tokens: (current.prompt_tokens || 0) + (ollamaUsage.prompt_tokens || 0),
                completion_tokens: (current.completion_tokens || 0) + (ollamaUsage.completion_tokens || 0),
                total_tokens: (current.total_tokens || 0) + (ollamaUsage.total_tokens || 0)
            };
        }

        return current;
    }
}
