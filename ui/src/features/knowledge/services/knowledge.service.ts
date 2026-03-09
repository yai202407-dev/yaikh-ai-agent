import { API_CONFIG } from '../../../config/api.config';

export const knowledgeService = {
    async ingestDocument(content: string, metadata: any = {}, userId?: string): Promise<{ message: string; documentId: string }> {
        const response = await fetch(`${API_CONFIG.BASE_URL}/knowledge/ingest`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content, metadata, userId }),
        });


        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to ingest document');
        }

        return response.json();
    },

    async uploadPDF(file: File, metadata: any = {}, userId?: string): Promise<{ message: string; documentId: string }> {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('metadata', JSON.stringify(metadata));
        if (userId) formData.append('userId', userId);

        const response = await fetch(`${API_CONFIG.BASE_URL}/knowledge/ingest-pdf`, {
            method: 'POST',
            body: formData, // Fetch automatically sets Content-Type to multipart/form-data
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to upload PDF');
        }

        return response.json();
    },

    async uploadImage(file: File, metadata: any = {}, userId?: string): Promise<{ message: string; documentId: string }> {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('metadata', JSON.stringify(metadata));
        if (userId) formData.append('userId', userId);

        const response = await fetch(`${API_CONFIG.BASE_URL}/knowledge/ingest-image`, {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to upload image');
        }

        return response.json();
    },

    async getTopics(): Promise<{ topics: Array<{ topic: string; summary: string }> }> {
        const response = await fetch(`${API_CONFIG.BASE_URL}/knowledge/topics`);
        if (!response.ok) {
            throw new Error('Failed to fetch knowledge topics');
        }
        return response.json();
    }
};
