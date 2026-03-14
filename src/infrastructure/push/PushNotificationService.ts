/**
 * PushNotificationService.ts
 *
 * Phase 5: Server-side Web Push delivery using VAPID.
 * 
 * Responsibilities:
 *  - Store push subscriptions in Firestore: push_subscriptions/{userId}
 *  - Send push to all subscribers when a topic is resolved
 *  - Send push when a new CRITICAL topic is detected
 */

import webpush from 'web-push';
import { getFirestoreDb } from '../database/FirestoreClient.js';

// ── VAPID Setup ───────────────────────────────────────────────────────────────

const VAPID_PUBLIC  = process.env.VAPID_PUBLIC_KEY  || '';
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY || '';
const VAPID_CONTACT = process.env.VAPID_CONTACT     || 'mailto:admin@yaikh.com';

if (VAPID_PUBLIC && VAPID_PRIVATE) {
    webpush.setVapidDetails(VAPID_CONTACT, VAPID_PUBLIC, VAPID_PRIVATE);
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PushPayload {
    title: string;
    body: string;
    icon?: string;
    badge?: string;
    tag?: string;          // groups notifications of same type
    url?: string;          // page to open on click
    data?: Record<string, any>;
}

// ── Service ───────────────────────────────────────────────────────────────────

export class PushNotificationService {
    private get db() { return getFirestoreDb(); }

    /**
     * Save or update a push subscription for a user.
     */
    async subscribe(userId: string, userName: string, subscription: webpush.PushSubscription): Promise<void> {
        await this.db.collection('push_subscriptions').doc(userId).set({
            userId,
            userName,
            subscription,
            createdAt: new Date(),
            updatedAt: new Date(),
        }, { merge: true });
        console.log(`✅ [Push] Subscription saved for ${userName} (${userId})`);
    }

    /**
     * Remove a push subscription (user unsubscribes).
     */
    async unsubscribe(userId: string): Promise<void> {
        await this.db.collection('push_subscriptions').doc(userId).delete();
        console.log(`🗑️ [Push] Subscription removed for user ${userId}`);
    }

    /**
     * Fan out a push notification to ALL registered subscribers.
     */
    async broadcastToAll(payload: PushPayload): Promise<{ sent: number; failed: number }> {
        if (!VAPID_PUBLIC || !VAPID_PRIVATE) {
            console.warn('[Push] VAPID keys not configured — skipping push');
            return { sent: 0, failed: 0 };
        }

        const snap = await this.db.collection('push_subscriptions').limit(500).get();
        if (snap.empty) return { sent: 0, failed: 0 };

        let sent = 0, failed = 0;
        const message = JSON.stringify(payload);

        await Promise.allSettled(snap.docs.map(async (doc) => {
            const { subscription } = doc.data() as { subscription: webpush.PushSubscription };
            try {
                await webpush.sendNotification(subscription, message);
                sent++;
            } catch (err: any) {
                // 410 Gone = subscription expired/unregistered — clean up
                if (err.statusCode === 410 || err.statusCode === 404) {
                    await doc.ref.delete();
                    console.log(`🗑️ [Push] Cleaned up expired subscription: ${doc.id}`);
                } else {
                    console.error(`⚠️ [Push] Failed to notify ${doc.id}:`, err.message);
                }
                failed++;
            }
        }));

        console.log(`📬 [Push] Broadcast complete: ${sent} sent, ${failed} failed`);
        return { sent, failed };
    }

    /**
     * Notify all users that a trending topic has been officially resolved.
     */
    async notifyTopicResolved(topicTitle: string, response: string, respondedBy: string): Promise<void> {
        await this.broadcastToAll({
            title: `✅ Resolved: ${topicTitle}`,
            body: `${respondedBy}: "${response.substring(0, 100)}${response.length > 100 ? '...' : ''}"`,
            icon: '/yai-icon-192.png',
            badge: '/yai-badge-72.png',
            tag: `resolved-${topicTitle.replace(/\s+/g, '-').toLowerCase()}`,
            url: '/?tab=channels',
            data: { topicTitle, respondedBy, type: 'resolved' },
        });
    }

    /**
     * Alert all users of a new CRITICAL trending topic that needs immediate attention.
     */
    async notifyCriticalTopic(topicTitle: string, summary: string, suggestedResponder: string): Promise<void> {
        await this.broadcastToAll({
            title: `🔴 Critical Topic: ${topicTitle}`,
            body: `${summary} — Action needed by ${suggestedResponder}`,
            icon: '/yai-icon-192.png',
            badge: '/yai-badge-72.png',
            tag: `critical-${topicTitle.replace(/\s+/g, '-').toLowerCase()}`,
            url: '/?tab=channels',
            data: { topicTitle, suggestedResponder, type: 'critical' },
        });
    }
}

// Singleton
export const pushService = new PushNotificationService();
