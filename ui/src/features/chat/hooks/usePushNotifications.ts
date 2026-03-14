/**
 * usePushNotifications.ts
 *
 * Phase 5: Web Push Notifications hook.
 *
 * Responsibilities:
 *  - Register the service worker
 *  - Request notification permission from the user
 *  - Subscribe to push using the VAPID public key from the backend
 *  - Send the subscription object to POST /api/push/subscribe
 *  - Expose permission state and toggle subscribe/unsubscribe
 */

import { useState, useEffect, useCallback } from 'react';
import type { DmUser } from './useDmChat';

type PermissionState = 'default' | 'granted' | 'denied' | 'unsupported';

interface UsePushNotificationsReturn {
    permission: PermissionState;
    isSubscribed: boolean;
    isLoading: boolean;
    subscribe: () => Promise<void>;
    unsubscribe: () => Promise<void>;
}

// Convert a VAPID base64 URL-safe key to a Uint8Array for the browser API
function urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    return Uint8Array.from([...rawData].map(char => char.charCodeAt(0)));
}

export function usePushNotifications(currentUser: DmUser | null): UsePushNotificationsReturn {
    const [permission, setPermission] = useState<PermissionState>('default');
    const [isSubscribed, setIsSubscribed] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

    // Check current status on mount
    useEffect(() => {
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
            setPermission('unsupported');
            return;
        }

        setPermission(Notification.permission as PermissionState);

        // Register the service worker
        navigator.serviceWorker.register('/sw.js', { scope: '/' })
            .then(async (reg) => {
                setRegistration(reg);
                // Check if we already have an active subscription
                const existing = await reg.pushManager.getSubscription();
                setIsSubscribed(!!existing);
                console.log('[Push] SW registered. Already subscribed:', !!existing);
            })
            .catch(err => console.error('[Push] SW registration failed:', err));
    }, []);

    const subscribe = useCallback(async () => {
        if (!currentUser || !registration || isLoading) return;
        setIsLoading(true);

        try {
            // 1. Request browser permission
            const result = await Notification.requestPermission();
            setPermission(result as PermissionState);
            if (result !== 'granted') {
                setIsLoading(false);
                return;
            }

            // 2. Get VAPID public key from the backend
            const keyRes = await fetch('/api/push/vapid-public-key');
            const keyData = await keyRes.json();
            if (!keyData.success) throw new Error('VAPID key not available');

            // 3. Create browser push subscription
            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(keyData.publicKey) as BufferSource,
            });

            // 4. Send subscription to backend for storage
            await fetch('/api/push/subscribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: currentUser.id,
                    userName: currentUser.name,
                    subscription: subscription.toJSON(),
                }),
            });

            setIsSubscribed(true);
            console.log('[Push] Subscribed successfully ✅');

            // Show a welcome notification to confirm it works
            if (registration.showNotification) {
                await registration.showNotification('Yai Notifications Active 🔔', {
                    body: 'You will now be notified when topics are resolved or critical issues arise.',
                    icon: '/yai-icon-192.png',
                    tag: 'yai-welcome',
                });
            }
        } catch (err) {
            console.error('[Push] Subscribe failed:', err);
        } finally {
            setIsLoading(false);
        }
    }, [currentUser, registration, isLoading]);

    const unsubscribe = useCallback(async () => {
        if (!currentUser || !registration || isLoading) return;
        setIsLoading(true);

        try {
            const existing = await registration.pushManager.getSubscription();
            if (existing) await existing.unsubscribe();

            await fetch('/api/push/unsubscribe', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: currentUser.id }),
            });

            setIsSubscribed(false);
            console.log('[Push] Unsubscribed successfully');
        } catch (err) {
            console.error('[Push] Unsubscribe failed:', err);
        } finally {
            setIsLoading(false);
        }
    }, [currentUser, registration, isLoading]);

    return { permission, isSubscribed, isLoading, subscribe, unsubscribe };
}
