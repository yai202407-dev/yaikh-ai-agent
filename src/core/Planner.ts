import { IPlanner, ExecutionPlan, PlanStep } from './interfaces/IPlanner.js';
import { IntentResult } from './interfaces/IIntentClassifier.js';
import { ToolRegistry } from './ToolRegistry.js';

/**
 * Action planner for determining execution strategy
 */
export class Planner implements IPlanner {
    constructor(private toolRegistry: ToolRegistry) { }

    async plan(message: string, intent: IntentResult): Promise<ExecutionPlan> {
        const messageLower = message.toLowerCase();

        // Determine if tools are needed
        const requiresTools = this.requiresToolExecution(messageLower, intent);

        if (!requiresTools) {
            return {
                steps: [
                    {
                        type: 'llm_query',
                        description: 'Generate conversational response',
                        params: { message }
                    }
                ],
                requiresTools: false,
                strategy: 'direct_response'
            };
        }

        // Get relevant tools
        const domains = [intent.domain, ...(intent.relatedDomains || [])];
        const tools = this.toolRegistry.getToolsByDomains(domains);
        const toolNames = tools.map(t => t.name);

        // Determine execution strategy
        const requiresMultipleTools = this.detectsMultipleDataPoints(messageLower);

        return {
            steps: [
                {
                    type: 'tool_call',
                    description: 'Execute tools to retrieve data',
                    params: { domains, toolNames }
                },
                {
                    type: 'synthesis',
                    description: 'Synthesize tool results into response',
                    params: { message }
                }
            ],
            requiresTools: true,
            toolNames,
            strategy: requiresMultipleTools ? 'multi_step' : 'tool_execution'
        };
    }

    /**
     * Determine if message requires tool execution
     */
    private requiresToolExecution(message: string, intent: IntentResult): boolean {
        // Data request intents typically need tools
        if (intent.intentType === 'data_request') {
            return true;
        }

        // Check for data-related keywords
        const dataKeywords = [
            'how many', 'count', 'total', 'sum', 'calculate',
            'show', 'get', 'list', 'find', 'search',
            'approved', 'pending', 'completed', 'issued'
        ];

        return dataKeywords.some(keyword => message.includes(keyword));
    }

    /**
     * Detect if message asks for multiple data points
     */
    private detectsMultipleDataPoints(message: string): boolean {
        const multiKeywords = ['sum', 'add', 'combine', 'total of', 'and', '+'];
        return multiKeywords.some(keyword => message.includes(keyword));
    }
}
