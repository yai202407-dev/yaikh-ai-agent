/**
 * usePresence.ts
 *
 * Phase 6: Manages the CURRENT user's own presence status in Firestore.
 *
 * Status states:
 *  idle   (⚫ gray)   → logged in, app open
 *  busy   (🟡 amber)  → tab hidden or 5min no activity
 *  active (🟢 green)  → in chat window, actively chatting
 *  dnd    (🔴 red)    → manual Do Not Disturb
 *
 * Auto-lifecycle:
 *  - Sets 'idle' when user first loads
 *  - Sets 'busy' on tab hide or 5min idle timer
 *  - Returns to 'idle' when tab becomes visible again (unless dnd)
 *  - Deletes presence doc on beforeunload (user closes window)
 */

import { useEffect, useRef, useCallback } from 'react';
import { getFirestoreClient } from '../../../config/firebase';
import { doc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import type { DmUser } from './useDmChat';

export type PresenceStatus = 'idle' | 'busy' | 'active' | 'dnd';

const IDLE_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes without activity = busy

export function usePresence(currentUser: DmUser | null) {
    const statusRef = useRef<PresenceStatus>('idle');
    const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isManualDnd = useRef(false);

    const getDb = () => {
        try { return getFirestoreClient(); } catch { return null; }
    };

    const setStatus = useCallback(async (status: PresenceStatus) => {
        if (!currentUser) return;
        const db = getDb();
        if (!db) return;

        statusRef.current = status;
        try {
            await setDoc(doc(db, 'presence', currentUser.id), {
                userId: currentUser.id,
                name: currentUser.name,
                department: currentUser.department || '',
                status,
                updatedAt: serverTimestamp(),
            }, { merge: true });
        } catch (err) {
            console.error('[Presence] setStatus failed:', err);
        }
    }, [currentUser]);

    const resetIdleTimer = useCallback(() => {
        if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
        if (isManualDnd.current) return; // DND overrides idle timer

        idleTimerRef.current = setTimeout(() => {
            if (!isManualDnd.current) setStatus('busy');
        }, IDLE_TIMEOUT_MS);
    }, [setStatus]);

    // Public: call this when user is active in chat (sending/receiving messages)
    const markActive = useCallback(() => {
        if (isManualDnd.current) return;
        if (statusRef.current !== 'active') setStatus('active');
        resetIdleTimer();
    }, [setStatus, resetIdleTimer]);

    // Public: call this when user navigates away from chat
    const markIdle = useCallback(() => {
        if (isManualDnd.current) return;
        if (statusRef.current !== 'idle') setStatus('idle');
        resetIdleTimer();
    }, [setStatus, resetIdleTimer]);

    // Public: toggle DND on/off
    const toggleDnd = useCallback(async () => {
        if (isManualDnd.current) {
            // Turn off DND → go back to idle
            isManualDnd.current = false;
            await setStatus('idle');
            resetIdleTimer();
        } else {
            isManualDnd.current = true;
            if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
            await setStatus('dnd');
        }
    }, [setStatus, resetIdleTimer]);

    useEffect(() => {
        if (!currentUser) return;

        // Initial status: idle
        setStatus('idle');
        resetIdleTimer();

        // Activity = reset idle timer
        const activityEvents = ['mousemove', 'keydown', 'mousedown', 'touchstart', 'scroll'];
        const handleActivity = () => {
            if (isManualDnd.current) return;
            if (statusRef.current === 'busy') setStatus('idle');
            resetIdleTimer();
        };
        activityEvents.forEach(e => window.addEventListener(e, handleActivity, { passive: true }));

        // Visibility change: tab hide → busy, tab show → idle (if not DND)
        const handleVisibility = () => {
            if (isManualDnd.current) return;
            if (document.visibilityState === 'hidden') {
                setStatus('busy');
            } else {
                setStatus('idle');
                resetIdleTimer();
            }
        };
        document.addEventListener('visibilitychange', handleVisibility);

        // On close: remove presence
        const handleUnload = () => {
            const db = getDb();
            if (db && currentUser) {
                // Synchronous best-effort — use navigator.sendBeacon for reliability
                navigator.sendBeacon(
                    `/api/push/unsubscribe`, // reuse unsubscribe pattern - or use a dedicated endpoint
                    JSON.stringify({ userId: currentUser.id })
                );
                deleteDoc(doc(db, 'presence', currentUser.id)).catch(() => {});
            }
        };
        window.addEventListener('beforeunload', handleUnload);

        return () => {
            activityEvents.forEach(e => window.removeEventListener(e, handleActivity));
            document.removeEventListener('visibilitychange', handleVisibility);
            window.removeEventListener('beforeunload', handleUnload);
            if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
            // Clear presence on component unmount
            const db = getDb();
            if (db && currentUser) deleteDoc(doc(db, 'presence', currentUser.id)).catch(() => {});
        };
    }, [currentUser?.id]);

    return { markActive, markIdle, toggleDnd, currentStatus: statusRef.current };
}
