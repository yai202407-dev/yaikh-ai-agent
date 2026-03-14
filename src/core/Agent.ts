import { IMemoryStore } from './interfaces/IMemoryStore.js';
import { ILLMClient, ChatMessage, TokenUsage } from './interfaces/ILLMClient.js';
import { IIntentClassifier } from './interfaces/IIntentClassifier.js';
import { IPlanner } from './interfaces/IPlanner.js';
import { ToolRegistry } from './ToolRegistry.js';
import { IAgent, AgentResponse } from './interfaces/IAgent.js';

/**
 * Main agent orchestrator
 * Coordinates: memory → intent → planning → execution → memory update
 */
export class Agent implements IAgent {
    constructor(
        private memory: IMemoryStore,
        private llm: ILLMClient,
        private intentClassifier: IIntentClassifier,
        private planner: IPlanner,
        private toolRegistry: ToolRegistry,
        private systemPromptTemplate: string
    ) { }

    /**
     * Process user message
     */
    async process(userId: string, message: string, conversationId?: string): Promise<AgentResponse> {
        console.log(`\n📨 [Agent] Processing message from user ${userId}`);

        const totalUsage: TokenUsage = {
            prompt_tokens: 0,
            completion_tokens: 0,
            total_tokens: 0
        };

        const addUsage = (usage?: TokenUsage) => {
            if (usage) {
                totalUsage.prompt_tokens += usage.prompt_tokens;
                totalUsage.completion_tokens += usage.completion_tokens;
                totalUsage.total_tokens += usage.total_tokens;
            }
        };

        // STEP 1: Load memory context
        const history = await this.memory.getConversationHistory(userId);
        const profile = await this.memory.getUserProfile(userId);
        console.log(`🧠 [Agent] Loaded ${history.length} messages from memory`);

        // STEP 2: Extract user facts (name, etc.)
        await this.extractAndUpdateProfile(userId, message);

        // STEP 3: Classify intent
        const intent = await this.intentClassifier.classify(message);
        // Note: IntentClassifier.classify now uses generate, we should ideally track its usage too
        // but since IIntentClassifier.classify doesn't return usage yet, we'll skip it or update the interface.
        // For now, let's focus on the main chat and tool loop.
        console.log(`🎯 [Agent] Intent classified: domain=${intent.domain}, type=${intent.intentType}`);

        // STEP 4: Create execution plan
        const plan = await this.planner.plan(message, intent);
        console.log(`📋 [Agent] Plan created: strategy=${plan.strategy}, requiresTools=${plan.requiresTools}`);

        // STEP 5: Build conversation context
        const systemPrompt = this.buildSystemPrompt(profile, intent.domain);
        const messages: ChatMessage[] = [
            { role: 'system', content: systemPrompt },
            ...history.map(h => ({ role: h.role as 'user' | 'assistant', content: h.content })),
            { role: 'user', content: message }
        ];

        // STEP 6: Execute with or without tools
        let responseText: string;

        if (plan.requiresTools) {
            const toolResult = await this.executeWithTools(messages, plan.toolNames || []);
            responseText = toolResult.response;
            addUsage(toolResult.usage);
        } else {
            const chatResponse = await this.llm.chat(messages);
            responseText = chatResponse.content;
            addUsage(chatResponse.usage);
        }

        // STEP 7: Update memory
        await this.memory.saveMessage(userId, 'user', message);
        await this.memory.saveMessage(userId, 'assistant', responseText);
        console.log(`✅ [Agent] Response generated and saved to memory`);

        // Parse suggestions for UI buttons
        const { cleanResponse, suggestions } = this.parseSuggestions(responseText);

        return {
            response: cleanResponse,
            domain: intent.domain,
            intent: intent.intentType as any,
            usedTools: plan.requiresTools,
            usage: totalUsage,
            suggestions
        };
    }

    /**
     * Parse suggestions from completion text
     * Returns cleaned response and array of strings
     */
    private parseSuggestions(text: string): { cleanResponse: string, suggestions: string[] } {
        const suggestionRegex = /\[SUGGESTIONS:\s*([\s\S]*?)\]/i;
        const match = text.match(suggestionRegex);

        if (match) {
            try {
                // Remove the tag from the original text
                const cleanResponse = text.replace(suggestionRegex, '').trim();

                // Parse the array inside the tag
                const suggestionsContent = match[1];
                // Handle various formats: ["S1", "S2"] or "S1", "S2"
                let suggestions: string[] = [];

                if (suggestionsContent.startsWith('[') && suggestionsContent.endsWith(']')) {
                    suggestions = JSON.parse(suggestionsContent);
                } else {
                    // Fallback to manual split if JSON parse fails (e.g. LLM didn't send valid JSON)
                    suggestions = suggestionsContent
                        .split(',')
                        .map(s => s.trim().replace(/^["']|["']$/g, ''))
                        .filter(s => s.length > 0);
                }

                return { cleanResponse, suggestions };
            } catch (e) {
                console.error('❌ Error parsing suggestions:', e);
                return { cleanResponse: text.replace(suggestionRegex, '').trim(), suggestions: [] };
            }
        }

        return { cleanResponse: text, suggestions: [] };
    }

    /**
     * Execute with tool support
     */
    private async executeWithTools(messages: ChatMessage[], toolNames: string[]): Promise<{ response: string, usage: TokenUsage }> {
        const tools = this.toolRegistry.getToolDefinitions(undefined); // Get all tools
        console.log(`🔧 [Agent] Executing with ${tools.length} tools available`);

        const totalUsage: TokenUsage = {
            prompt_tokens: 0,
            completion_tokens: 0,
            total_tokens: 0
        };

        const addUsage = (usage?: TokenUsage) => {
            if (usage) {
                totalUsage.prompt_tokens += usage.prompt_tokens;
                totalUsage.completion_tokens += usage.completion_tokens;
                totalUsage.total_tokens += usage.total_tokens;
            }
        };

        let response = await this.llm.chat(messages, tools);
        addUsage(response.usage);

        // Handle tool calls iteratively
        while (response.tool_calls && response.tool_calls.length > 0) {
            console.log(`⚙️ [Agent] LLM requested ${response.tool_calls.length} tool call(s)`);

            // Add assistant message with tool calls
            messages.push({
                role: 'assistant',
                content: response.content || '',
                tool_calls: response.tool_calls
            });

            // Execute each tool
            for (const toolCall of response.tool_calls) {
                const toolName = toolCall.function.name;
                console.log(`🔧 [Agent] Executing tool: ${toolName}`);

                try {
                    const toolResult = await this.toolRegistry.executeTool(toolName, toolCall.function.arguments);
                    console.log(`✓ [Agent] Tool result: ${toolResult.substring(0, 100)}...`);

                    // Add tool result to messages
                    messages.push({
                        role: 'tool',
                        content: toolResult
                    });
                } catch (error) {
                    console.error(`❌ [Agent] Tool execution failed: ${error}`);
                    messages.push({
                        role: 'tool',
                        content: `Error executing tool: ${error}`
                    });
                }
            }

            // Get final response with tool results
            response = await this.llm.chat(messages, tools);
            addUsage(response.usage);
        }

        return { response: response.content, usage: totalUsage };
    }

    /**
     * Build system prompt with context
     */
    private buildSystemPrompt(profile: any, domain: string): string {
        let prompt = this.systemPromptTemplate;

        // Inject user context
        if (profile.name) {
            prompt += `\n\nUser Information:\n- The user's name is ${profile.name}.`;
        }

        prompt += `\n\nCurrent Domain: ${domain}`;

        return prompt;
    }

    /**
     * Extract profile information from message
     */
    private async extractAndUpdateProfile(userId: string, message: string): Promise<void> {
        // Simple name extraction
        const namePatterns = [
            /my name is\s+([a-zA-Z\s]+)/i,
            /i'?m\s+([a-zA-Z\s]+)/i,
            /call me\s+([a-zA-Z\s]+)/i
        ];

        for (const pattern of namePatterns) {
            const match = message.match(pattern);
            if (match) {
                const name = match[1].trim();
                await this.memory.updateUserProfile(userId, { name });
                console.log(`🧠 [Agent] Updated user profile: name=${name}`);
                break;
            }
        }
    }

    /**
     * Clear conversation history
     */
    async stream(userId: string, message: string, onChunk: (chunk: string) => void, conversationId?: string): Promise<AgentResponse> {
        onChunk("Streaming not completely implemented yet...");
        return this.process(userId, message, conversationId);
    }

    /**
     * Clear conversation history
     */
    async clearHistory(userId: string, systemToken?: string): Promise<void> {
        await this.memory.clearConversationHistory(userId, undefined, systemToken);
        console.log(`🗑️ [Agent] Cleared conversation history for user ${userId}`);
    }

    async getConversations(userId: string, systemToken?: string): Promise<any[]> {
        return await this.memory.getConversations(userId, systemToken);
    }

    async getHistory(sessionId: string, systemToken?: string): Promise<any[]> {
        const history = await this.memory.getConversationHistory('', sessionId, systemToken);
        return history.map(m => ({
            role: m.role === 'system' ? 'assistant' : m.role,
            content: m.content,
            timestamp: m.timestamp
        }));
    }

    async deleteConversation(sessionId: string, systemToken?: string): Promise<void> {
        await this.memory.deleteConversation(sessionId, systemToken);
    }
}
