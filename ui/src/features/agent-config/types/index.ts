export enum LLMProvider {
    OPENAI = 'OpenAI',
    ANTHROPIC = 'Anthropic',
    GEMINI = 'Gemini'
}

export interface RoleProviderConfig {
    provider: LLMProvider;
    model: string;
    apiKey: string;
    temperature?: number;
    maxTokens?: number;
    additionalParams?: Record<string, any>;
}

export interface UserAgentConfig {
    userId: string;
    roles: {
        mainGenerator: RoleProviderConfig;
        intentClassifier: RoleProviderConfig;
        voiceTranscriber?: RoleProviderConfig;
        pdfTranscriber?: RoleProviderConfig;
        imageTranscriber?: RoleProviderConfig;
    };
    permissions: string[];
    isActive: boolean;
    createdAt?: string;
    updatedAt?: string;
}
export interface GeminiModel {
    name: string;
    displayName: string;
    description?: string;
}
