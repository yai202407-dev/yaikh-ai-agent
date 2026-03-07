/**
 * Intent classifier interface for understanding user intent
 */
export interface IIntentClassifier {
    /**
     * Classify user message to determine intent and domain
     */
    classify(message: string): Promise<IntentResult>;
}

export interface IntentResult {
    /**
     * Primary domain/module detected
     */
    domain: string;

    /**
     * Additional related domains
     */
    relatedDomains?: string[];

    /**
     * Confidence score (0-1)
     */
    confidence?: number;

    /**
     * Detected intent type
     */
    intentType?: 'query' | 'command' | 'conversation' | 'data_request';
}
