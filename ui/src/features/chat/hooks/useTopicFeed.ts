/**
 * useTopicFeed.ts
 *
 * Phase 3: Real-time Firestore listener for trending_topics collection.
 * Feeds the Channels board with live topic data.
 */

import { useEffect, useState } from 'react';
import { getFirestoreClient } from '../../../config/firebase';
import {
    collection,
    query,
    orderBy,
    limit,
    onSnapshot,
} from 'firebase/firestore';

export interface LiveTopic {
    id: string;
    topic: string;
    summary: string;
    heatScore: number;
    mentioningUserCount: number;
    departments: string[];
    sampleQuestions: string[];
    suggestedResponder: string;
    urgency: 'low' | 'medium' | 'high' | 'critical';
    status: 'active' | 'responding' | 'resolved';
    officialResponse?: string;
    respondedBy?: string;
    respondedAt?: any;
    detectedAt?: any;
    updatedAt?: any;
}

export function useTopicFeed() {
    const [topics, setTopics] = useState<LiveTopic[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let db: ReturnType<typeof getFirestoreClient> | null = null;
        try {
            db = getFirestoreClient();
        } catch {
            setLoading(false);
            return;
        }

        const q = query(
            collection(db, 'trending_topics'),
            orderBy('heatScore', 'desc'),
            limit(20)
        );

        const unsub = onSnapshot(q, (snap) => {
            const results: LiveTopic[] = snap.docs.map(doc => ({
                id: doc.id,
                ...(doc.data() as Omit<LiveTopic, 'id'>),
            }));
            setTopics(results);
            setLoading(false);
        }, () => {
            setLoading(false);
        });

        return () => unsub();
    }, []);

    return { topics, loading };
}
