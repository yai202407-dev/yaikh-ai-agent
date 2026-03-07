import { IIntentClassifier, IntentResult } from './interfaces/IIntentClassifier.js';
import { ILLMClient } from './interfaces/ILLMClient.js';

/**
 * LLM-based intent classifier
 */
export class IntentClassifier implements IIntentClassifier {
    constructor(
        private llmClient: ILLMClient,
        private domainDefinitions: DomainDefinition[]
    ) { }

    async classify(message: string): Promise<IntentResult> {
        const domainList = this.domainDefinitions
            .map(d => `- ${d.name}: ${d.description}`)
            .join('\n');

        const prompt = `You are an AI intent classifier. Analyze the user's message and determine the most relevant domain.

Available domains:
${domainList}

Rules:
- Return ONLY the domain name (no explanation)
- If none match, return "general"
- If multiple domains are relevant, return the primary one

User message: "${message}"

Domain:`;

        const classificationResponse = await this.llmClient.generate(prompt);
        const domain = classificationResponse.response.trim().toLowerCase();

        // Detect related domains for cross-domain queries
        const relatedDomains = this.detectRelatedDomains(message);

        return {
            domain,
            relatedDomains: relatedDomains.filter(d => d !== domain),
            confidence: 0.8, // Could be enhanced with actual confidence scoring
            intentType: this.detectIntentType(message)
        };
    }

    /**
     * Detect related domains from message keywords
     */
    private detectRelatedDomains(message: string): string[] {
        const messageLower = message.toLowerCase();
        const detected: string[] = [];

        this.domainDefinitions.forEach(domain => {
            if (domain.keywords.some(keyword => messageLower.includes(keyword))) {
                detected.push(domain.name);
            }
        });

        return detected;
    }

    /**
     * Detect intent type
     */
    private detectIntentType(message: string): 'query' | 'command' | 'conversation' | 'data_request' {
        const messageLower = message.toLowerCase();

        // Data request patterns
        if (
            messageLower.match(/how many|count|total|sum|calculate|show me|get|list/) ||
            messageLower.includes('?')
        ) {
            return 'data_request';
        }

        // Command patterns
        if (messageLower.match(/create|delete|update|add|remove|set/)) {
            return 'command';
        }

        // Query patterns
        if (messageLower.match(/what|when|where|who|why|how/)) {
            return 'query';
        }

        return 'conversation';
    }
}

export interface DomainDefinition {
    name: string;
    description: string;
    keywords: string[];
}
