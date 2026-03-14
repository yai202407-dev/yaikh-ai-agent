/**
 * usePresenceFeed.ts
 *
 * Phase 6: Real-time Firestore listener for ALL users' presence status.
 * Used by ComDeck to show colored dots next to each user in the list.
 */

import { useEffect, useState } from 'react';
import { getFirestoreClient } from '../../../config/firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import type { PresenceStatus } from './usePresence';

export interface UserPresence {
    userId: string;
    name: string;
    department: string;
    status: PresenceStatus;
    updatedAt?: any;
}

export function usePresenceFeed(): Map<string, PresenceStatus> {
    const [presenceMap, setPresenceMap] = useState<Map<string, PresenceStatus>>(new Map());

    useEffect(() => {
        let db: ReturnType<typeof getFirestoreClient> | null = null;
        try { db = getFirestoreClient(); } catch { return; }

        const unsub = onSnapshot(
            collection(db, 'presence'),
            (snap) => {
                const map = new Map<string, PresenceStatus>();
                snap.docs.forEach(doc => {
                    const data = doc.data() as UserPresence;
                    map.set(data.userId, data.status);
                });
                setPresenceMap(map);
            },
            (err) => console.error('[PresenceFeed] onSnapshot error:', err)
        );

        return () => unsub();
    }, []);

    return presenceMap;
}
