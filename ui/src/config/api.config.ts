export const API_CONFIG = {
    BASE_URL: (import.meta as any).env?.VITE_API_BASE_URL || '/api',
    TIMEOUT: 30000,
};
