import axios, { AxiosInstance } from 'axios';

/**
 * Client for interacting with the Laravel backend API
 */
export class LaravelClient {
    private client: AxiosInstance;

    constructor() {
        const baseURL = process.env.LARAVEL_API_URL || 'https://virot.yaikh.com/api';
        const apiToken = process.env.LARAVEL_API_TOKEN;

        this.client = axios.create({
            baseURL,
            headers: {
                'Authorization': apiToken ? `Bearer ${apiToken}` : '',
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });
    }

    /**
     * Generic GET request
     */
    async get<T>(url: string, params?: any): Promise<T> {
        try {
            const response = await this.client.get<T>(url, { params });
            return response.data;
        } catch (error: any) {
            console.error(`Laravel API Error (GET ${url}):`, error.message);
            throw error;
        }
    }

    /**
     * Generic POST request
     */
    async post<T>(url: string, data?: any): Promise<T> {
        try {
            const response = await this.client.post<T>(url, data);
            return response.data;
        } catch (error: any) {
            console.error(`Laravel API Error (POST ${url}):`, error.message);
            throw error;
        }
    }

    /**
     * Specific helper for purchase requests count
     */
    async getPurchaseRequestsCount(): Promise<number> {
        const data = await this.get<{ count: number } | number>('/v1/ai-purchases/count');
        console.log(data);
        if (typeof data === 'number') return data;
        return data?.count || 0;
    }

    /**
     * Get GM Pending purchase requests count
     */
    async getGmPendingCount(): Promise<number> {
        const data = await this.get<{ gm_pending_count: number } | number>('/v1/ai-purchases/GM-pending');
        if (typeof data === 'number') return data;
        return data?.gm_pending_count || 0;
    }

    /**
     * Get Accounting approved purchase requests count
     */
    async getAccApproveCount(): Promise<number> {
        const data = await this.get<{ accountant_approved_count: number } | number>('/v1/ai-purchases/acc-approve');
        if (typeof data === 'number') return data;
        return data?.accountant_approved_count || 0;
    }

    /**
     * Get purchase requests count for current month
     */
    async getMonthCount(): Promise<number> {
        const data = await this.get<{ month_count: number } | number>('/v1/ai-purchases/month-count');
        if (typeof data === 'number') return data;
        return data?.month_count || 0;
    }

    /**
     * Get all time total purchase requests count
     */
    async getAllCount(): Promise<number> {
        const data = await this.get<{ total_count: number } | number>('/v1/ai-purchases/count-all');
        console.log(data);
        if (typeof data === 'number') return data;
        return data?.total_count || 0;
    }

    /**
     * Get list of purchase requests with full details
     */
    async getPurchaseRequests(params?: { status?: string, limit?: number }): Promise<any[]> {
        try {
            const response = await this.get<any>('/v1/ai-purchases', params);
            console.log('API Response received:', !!response);

            // Laravel usually wraps the array in a 'data' property
            if (response && response.data && Array.isArray(response.data)) {
                return response.data;
            }

            // Fallback if it's a direct array
            if (Array.isArray(response)) {
                return response;
            }

            return [];
        } catch (error) {
            console.error('Failed to fetch purchase requests:', error);
            return [];
        }
    }

    /**
     * Get specific purchase request details
     */
    async getPurchaseDetails(id: string | number): Promise<any | null> {
        try {
            const response = await this.get<any>(`/v1/ai-purchases/${id}`);

            // Handle Laravel 'data' wrapper
            if (response && response.data) {
                return response.data;
            }

            return response;
        } catch (error) {
            console.error(`Failed to fetch purchase request details for ID ${id}:`, error);
            return null;
        }
    }
}

// Export a singleton instance
export const laravelClient = new LaravelClient();
