import { IntentResult } from './IIntentClassifier.js';

/**
 * Planner interface for action planning
 */
export interface IPlanner {
    /**
     * Create an execution plan based on user intent
     */
    plan(message: string, intent: IntentResult): Promise<ExecutionPlan>;
}

export interface ExecutionPlan {
    /**
     * List of steps to execute
     */
    steps: PlanStep[];

    /**
     * Whether to use tools
     */
    requiresTools: boolean;

    /**
     * Required tool names
     */
    toolNames?: string[];

    /**
     * Strategy for execution
     */
    strategy: 'direct_response' | 'tool_execution' | 'multi_step';
}

export interface PlanStep {
    /**
     * Step type
     */
    type: 'tool_call' | 'llm_query' | 'data_retrieval' | 'synthesis';

    /**
     * Description of the step
     */
    description: string;

    /**
     * Parameters for the step
     */
    params?: Record<string, unknown>;
}
