import { API_CONFIG } from '../../../config/api.config';

export interface KnowledgeTopic {
    topic: string;
    summary: string;
}

export const knowledgeService = {
    async getTopics(): Promise<KnowledgeTopic[]> {
        const response = await fetch(`${API_CONFIG.BASE_URL}/knowledge/topics`);
        if (!response.ok) {
            throw new Error('Failed to fetch knowledge topics');
        }
        const data = await response.json();
        return data.topics;
    }
};
