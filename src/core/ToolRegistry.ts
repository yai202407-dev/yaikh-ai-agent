import { ITool, ToolDefinition } from './interfaces/ITool.js';

/**
 * Central registry for managing tools
 */
export class ToolRegistry {
    private tools: Map<string, ITool> = new Map();
    private domainTools: Map<string, Set<string>> = new Map();

    /**
     * Register a tool
     */
    register(tool: ITool, domain?: string): void {
        this.tools.set(tool.name, tool);

        if (domain) {
            if (!this.domainTools.has(domain)) {
                this.domainTools.set(domain, new Set());
            }
            this.domainTools.get(domain)!.add(tool.name);
        }
    }

    /**
     * Register multiple tools
     */
    registerMany(tools: ITool[], domain?: string): void {
        tools.forEach(tool => this.register(tool, domain));
    }

    /**
     * Get tool by name
     */
    getTool(name: string): ITool | undefined {
        return this.tools.get(name);
    }

    /**
     * Get tools by domain
     */
    getToolsByDomain(domain: string): ITool[] {
        const toolNames = this.domainTools.get(domain);
        if (!toolNames) return [];

        return Array.from(toolNames)
            .map(name => this.tools.get(name))
            .filter((tool): tool is ITool => tool !== undefined);
    }

    /**
     * Get tools by multiple domains
     */
    getToolsByDomains(domains: string[]): ITool[] {
        const tools = new Map<string, ITool>();

        domains.forEach(domain => {
            this.getToolsByDomain(domain).forEach(tool => {
                tools.set(tool.name, tool);
            });
        });

        return Array.from(tools.values());
    }

    /**
     * Get all tool definitions for LLM
     */
    getToolDefinitions(domains?: string[]): ToolDefinition[] {
        let tools: ITool[];

        if (domains && domains.length > 0) {
            tools = this.getToolsByDomains(domains);
        } else {
            tools = Array.from(this.tools.values());
        }

        return tools.map(tool => tool.getDefinition());
    }

    /**
     * Execute a tool by name
     */
    async executeTool(name: string, params?: Record<string, unknown>): Promise<string> {
        const tool = this.getTool(name);
        if (!tool) {
            throw new Error(`Tool '${name}' not found`);
        }
        return tool.execute(params);
    }

    /**
     * Get all registered tools
     */
    getAllTools(): ITool[] {
        return Array.from(this.tools.values());
    }
}
