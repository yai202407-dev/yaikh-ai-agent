import { ITool, ToolDefinition } from '../../core/interfaces/ITool.js';
import { search } from 'duck-duck-scrape';

/**
 * Tool for searching the web using DuckDuckGo (Direct Implementation)
 */
export class DuckDuckGoSearchTool implements ITool {
    readonly name = 'web_search';
    readonly description = 'Search the web for real-time information, news, and general knowledge using DuckDuckGo.';

    async execute(args?: any): Promise<string> {
        try {
            const query = args?.query || args?.q;
            if (!query) return "Please provide a search query.";

            console.log(`🌐 [WebSearch] Searching for: "${query}"...`);

            // Call DuckDuckGo directly with common User-Agent to avoid anomaly detection
            const results = await search(query, {}, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                }
            });

            if (results.noResults || !results.results || results.results.length === 0) {
                return "No search results found for that query.";
            }

            // Format top 3 results
            const formattedResults = results.results.slice(0, 3).map(r =>
                `**${r.title}**\n${r.description}\nSource: ${r.url}`
            ).join('\n\n');

            return `### Web Search Results for "${query}":\n\n${formattedResults}`;
        } catch (error: any) {
            console.error('❌ WebSearch error:', error);
            if (error.message?.includes('anomaly')) {
                return "I encountered an issue with the search provider (rate limit or security check). Please try again in single query or rephrase it.";
            }
            return `I encountered an error while searching the web: ${error.message}. Please try a different query.`;
        }
    }

    getDefinition(): ToolDefinition {
        return {
            type: 'function',
            function: {
                name: this.name,
                description: this.description,
                parameters: {
                    type: 'object',
                    properties: {
                        query: {
                            type: 'string',
                            description: 'The search query to look up'
                        }
                    },
                    required: ['query']
                }
            }
        };
    }
}

export const WEB_SEARCH_TOOLS = [new DuckDuckGoSearchTool()];
