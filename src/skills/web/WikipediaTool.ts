import axios from 'axios';
import { ITool, ToolDefinition } from '../../core/interfaces/ITool.js';

/**
 * Tool for searching general knowledge using Wikipedia (Reliable Implementation)
 */
export class WikipediaSearchTool implements ITool {
    readonly name = 'wiki_search';
    readonly description = 'Search Wikipedia for reliable general knowledge, history, people, and scientific facts.';

    private readonly USER_AGENT = 'YorkmarsAgent/1.0 (contact@yorkmars.com) Mozilla/5.0';

    async execute(args?: any): Promise<string> {
        try {
            const query = args?.query || args?.q;
            if (!query) return "Please provide a search query.";

            console.log(`📚 [WikiSearch] Searching for: "${query}"...`);

            // 1. Search for page
            const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&origin=*`;
            const searchResponse = await axios.get(searchUrl, {
                headers: { 'User-Agent': this.USER_AGENT }
            });

            const searchResults = searchResponse.data.query.search;
            if (!searchResults || searchResults.length === 0) {
                return "No Wikipedia articles found for that query.";
            }

            const title = searchResults[0].title;

            // 2. Get summary
            const summaryUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title.replace(/ /g, '_'))}`;
            const summaryResponse = await axios.get(summaryUrl, {
                headers: { 'User-Agent': this.USER_AGENT }
            });

            const summary = summaryResponse.data;

            return `### Wikipedia: ${summary.title}\n\n${summary.extract}\n\nRead more: ${summary.content_urls.desktop.page}`;
        } catch (error: any) {
            console.error('❌ WikiSearch error:', error);
            return `I encountered an error while searching Wikipedia: ${error.message}.`;
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
                            description: 'The topic or term to look up on Wikipedia'
                        }
                    },
                    required: ['query']
                }
            }
        };
    }
}

export const WIKI_SEARCH_TOOLS = [new WikipediaSearchTool()];
