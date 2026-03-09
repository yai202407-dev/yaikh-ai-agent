import { API_CONFIG } from '../../../config/api.config';
import { UserAgentConfig, GeminiModel } from '../types';

export const agentConfigService = {
    async getConfig(userId: string = 'default-user'): Promise<UserAgentConfig> {
        const response = await fetch(`${API_CONFIG.BASE_URL}/agent-config?userId=${userId}`);
        if (!response.ok) {
            throw new Error('Failed to fetch agent configuration');
        }
        return response.json();
    },

    async updateConfig(config: Partial<UserAgentConfig>): Promise<UserAgentConfig> {
        // Ensure userId is present
        const payload = {
            userId: config.userId || 'default-user',
            roles: config.roles,
            isActive: config.isActive ?? true
        };

        const response = await fetch(`${API_CONFIG.BASE_URL}/agent-config`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        if (!response.ok) {
            throw new Error('Failed to update agent configuration');
        }
        const data = await response.json();
        return data.config; // The backend returns { message, config }
    },

    async getAvailableModels(): Promise<GeminiModel[]> {
        const response = await fetch(`${API_CONFIG.BASE_URL}/agent-config/models`);
        if (!response.ok) {
            throw new Error('Failed to fetch available models');
        }
        const data = await response.json();
        // data.models is an array of GeminiModelMetadata
        return data.models.map((m: any) => ({
            name: m.name,
            displayName: m.displayName,
            description: m.description
        }));
    },

    async clearCache(): Promise<void> {
        const response = await fetch(`${API_CONFIG.BASE_URL}/agent-config/clear-cache`, {
            method: 'POST'
        });
        if (!response.ok) {
            throw new Error('Failed to clear discovery cache');
        }
    }
};
