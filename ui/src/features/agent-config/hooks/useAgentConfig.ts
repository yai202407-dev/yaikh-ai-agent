import { useState, useEffect, useCallback } from 'react';
import { UserAgentConfig, LLMProvider, GeminiModel } from '../types';
import { agentConfigService } from '../services/agent-config.service';

const DEFAULT_CONFIG: Partial<UserAgentConfig> = {
    roles: {
        mainGenerator: {
            provider: LLMProvider.GEMINI,
            model: '',
            apiKey: '',
            temperature: 0.7,
            maxTokens: 2048
        },
        intentClassifier: {
            provider: LLMProvider.GEMINI,
            model: '',
            apiKey: '',
            temperature: 0.3,
            maxTokens: 512
        }
    }
};

export const useAgentConfig = () => {
    const [config, setConfig] = useState<UserAgentConfig | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [availableModels, setAvailableModels] = useState<GeminiModel[]>([]);

    const fetchConfig = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const data = await agentConfigService.getConfig();
            setConfig(data);
        } catch (err) {
            console.error('Failed to load agent config:', err);
            setError('Failed to load configuration. Using defaults.');
            // Only set default if we don't have any config at all
            if (!config) {
                setConfig(DEFAULT_CONFIG as any);
            }
        } finally {
            setIsLoading(false);
        }
    }, []);

    const fetchModels = useCallback(async () => {
        try {
            const models = await agentConfigService.getAvailableModels();
            setAvailableModels(models);
        } catch (err) {
            console.error('Failed to fetch models:', err);
        }
    }, []);

    useEffect(() => {
        fetchConfig();
        fetchModels();
    }, [fetchConfig, fetchModels]);

    const updateConfig = async (newConfig: Partial<UserAgentConfig>) => {
        setIsLoading(true);
        try {
            const updated = await agentConfigService.updateConfig(newConfig);
            setConfig(updated);
            return updated;
        } catch (err) {
            console.error('Failed to update config:', err);
            throw err;
        } finally {
            setIsLoading(false);
        }
    };

    return {
        config,
        isLoading,
        error,
        availableModels,
        updateConfig,
        refresh: fetchConfig
    };
};
