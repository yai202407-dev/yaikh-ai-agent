import { useState, useEffect } from 'react';

/**
 * useUserIdentity
 *
 * A simple hook that manages the active "user identity" used for all API calls.
 * The identity is persisted in localStorage so it survives page refreshes.
 * It exposes the current userId and a setter, which can be wired into Settings.
 */

const STORAGE_KEY = 'yai_active_user_id';
const DEFAULT_USER_ID = 'admin';

/**
 * Returns the currently persisted userId (or the default).
 * Useful for reading the userId outside of React components (e.g. in services).
 */
export const getActiveUserId = (): string => {
    try {
        return localStorage.getItem(STORAGE_KEY) || DEFAULT_USER_ID;
    } catch {
        return DEFAULT_USER_ID;
    }
};

/**
 * Persists a new userId to localStorage.
 */
export const setActiveUserId = (userId: string): void => {
    try {
        localStorage.setItem(STORAGE_KEY, userId.trim() || DEFAULT_USER_ID);
        // Dispatch a custom event so other hooks/components can react
        window.dispatchEvent(new CustomEvent('yai-user-changed', { detail: userId.trim() || DEFAULT_USER_ID }));
    } catch {
        // ignore storage errors silently
    }
};

/**
 * React hook: returns the current userId and a reactive setter.
 * Syncs across all components that use this hook via a custom browser event.
 */
export const useUserIdentity = () => {
    const [userId, setUserIdState] = useState<string>(getActiveUserId());

    useEffect(() => {
        const handler = (e: Event) => {
            setUserIdState((e as CustomEvent).detail as string);
        };
        window.addEventListener('yai-user-changed', handler);
        return () => window.removeEventListener('yai-user-changed', handler);
    }, []);

    const setUserId = (newId: string) => {
        setActiveUserId(newId);
        setUserIdState(newId.trim() || DEFAULT_USER_ID);
    };

    return { userId, setUserId };
};
