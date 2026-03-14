/**
 * sw.js — Yai Push Notification Service Worker
 *
 * Handles push events and displays native browser notifications.
 * Lives in /public so Vite serves it at the root path.
 */

const APP_NAME = 'Yai Company Chat';

// Listen for push events from the server
self.addEventListener('push', (event) => {
    let payload = {
        title: APP_NAME,
        body: 'New notification',
        icon: '/yai-icon-192.png',
        badge: '/yai-badge-72.png',
        tag: 'yai-notification',
        url: '/',
        data: {},
    };

    if (event.data) {
        try {
            const parsed = event.data.json();
            payload = { ...payload, ...parsed };
        } catch {
            payload.body = event.data.text() || payload.body;
        }
    }

    const options = {
        body: payload.body,
        icon: payload.icon,
        badge: payload.badge,
        tag: payload.tag,
        data: { url: payload.url, ...payload.data },
        requireInteraction: payload.data?.type === 'critical', // keep critical alerts on screen until dismissed
        vibrate: payload.data?.type === 'critical' ? [200, 100, 200, 100, 200] : [200, 100, 200],
        actions: [
            { action: 'view', title: '👀 View', icon: payload.icon },
            { action: 'dismiss', title: 'Dismiss' },
        ],
    };

    event.waitUntil(
        self.registration.showNotification(payload.title, options)
    );
});

// Handle notification click — open the app at the right tab
self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    if (event.action === 'dismiss') return;

    const targetUrl = event.notification.data?.url || '/';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
            // Focus existing window if open
            for (const client of windowClients) {
                if (client.url.includes(self.location.origin) && 'focus' in client) {
                    client.focus();
                    client.postMessage({ type: 'NAVIGATE', url: targetUrl });
                    return;
                }
            }
            // Otherwise open a new window
            if (clients.openWindow) {
                return clients.openWindow(targetUrl);
            }
        })
    );
});

// Handle subscription change (browser auto-refreshed the subscription)
self.addEventListener('pushsubscriptionchange', (event) => {
    event.waitUntil(
        self.registration.pushManager.subscribe(event.oldSubscription.options)
            .then((newSubscription) => {
                return fetch('/api/push/subscribe', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        userId: 'resubscribe',
                        subscription: newSubscription,
                    }),
                });
            })
    );
});

console.log('[Yai SW] Service worker loaded ✅');
