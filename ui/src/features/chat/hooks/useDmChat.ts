/**
 * useDmChat.ts — 1-on-1 real-time chat hook via Firestore
 *
 * FIRESTORE SCHEMA:
 * dm_conversations/{convId}
 *   ├── participants: [userIdA, userIdB]
 *   ├── participantNames: { [userId]: displayName }
 *   ├── lastMessage: string
 *   ├── lastMessageAt: Timestamp
 *   ├── updatedAt: Timestamp
 *   └── messages/  (subcollection)
 *       └── {msgId}
 *           ├── senderId: string
 *           ├── senderName: string
 *           ├── text: string
 *           ├── timestamp: Timestamp
 *           └── readBy: string[]
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
    collection, doc, addDoc, query, orderBy, limit,
    onSnapshot, serverTimestamp, updateDoc, setDoc, getDoc, Timestamp
} from 'firebase/firestore';
import { db } from '../../../config/firebase';

export interface DmMessage {
    id: string;
    senderId: string;
    senderName: string;
    text: string;
    timestamp: Date | null;
    readBy: string[];
}

export interface DmUser {
    id: string;
    name: string;
    department: string;
}

// Deterministic conversation ID — always smallest userId first
const buildConvId = (userIdA: string, userIdB: string): string => {
    const sorted = [userIdA, userIdB].sort();
    return `dm_${sorted[0]}_${sorted[1]}`;
};

export const useDmChat = (currentUser: DmUser, recipient: DmUser | null) => {
    const [messages, setMessages] = useState<DmMessage[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const unsubRef = useRef<(() => void) | null>(null);

    // Tear down old listener when recipient changes
    useEffect(() => {
        if (unsubRef.current) {
            unsubRef.current();
            unsubRef.current = null;
        }
        setMessages([]);
        if (!recipient) return;

        setIsLoading(true);
        const convId = buildConvId(currentUser.id, recipient.id);
        const msgsRef = collection(db, 'dm_conversations', convId, 'messages');
        const q = query(msgsRef, orderBy('timestamp', 'asc'), limit(100));

        const unsub = onSnapshot(q, (snapshot) => {
            const msgs: DmMessage[] = snapshot.docs.map(d => {
                const data = d.data();
                return {
                    id: d.id,
                    senderId: data.senderId,
                    senderName: data.senderName,
                    text: data.text,
                    timestamp: data.timestamp instanceof Timestamp
                        ? data.timestamp.toDate()
                        : null,
                    readBy: data.readBy || [],
                };
            });
            setMessages(msgs);
            setIsLoading(false);

            // Mark unread messages as read
            snapshot.docs.forEach(d => {
                const data = d.data();
                if (!data.readBy?.includes(currentUser.id)) {
                    updateDoc(d.ref, {
                        readBy: [...(data.readBy || []), currentUser.id]
                    }).catch(() => {});
                }
            });
        }, (err) => {
            console.error('[useDmChat] onSnapshot error:', err);
            setIsLoading(false);
        });

        unsubRef.current = unsub;
        return () => { unsub(); };
    }, [currentUser.id, recipient?.id]);

    const sendMessage = useCallback(async (text: string) => {
        if (!text.trim() || !recipient) return;
        setIsSending(true);

        const convId = buildConvId(currentUser.id, recipient.id);
        const convRef = doc(db, 'dm_conversations', convId);
        const msgsRef = collection(db, 'dm_conversations', convId, 'messages');

        try {
            // Upsert conversation header
            const convSnap = await getDoc(convRef);
            if (!convSnap.exists()) {
                await setDoc(convRef, {
                    participants: [currentUser.id, recipient.id],
                    participantNames: {
                        [currentUser.id]: currentUser.name,
                        [recipient.id]: recipient.name,
                    },
                    departments: {
                        [currentUser.id]: currentUser.department,
                        [recipient.id]: recipient.department,
                    },
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp(),
                    lastMessage: text.trim(),
                    lastMessageAt: serverTimestamp(),
                });
            } else {
                await updateDoc(convRef, {
                    updatedAt: serverTimestamp(),
                    lastMessage: text.trim(),
                    lastMessageAt: serverTimestamp(),
                });
            }

            // Write message
            await addDoc(msgsRef, {
                senderId: currentUser.id,
                senderName: currentUser.name,
                text: text.trim(),
                timestamp: serverTimestamp(),
                readBy: [currentUser.id],
            });
        } catch (err) {
            console.error('[useDmChat] sendMessage error:', err);
        } finally {
            setIsSending(false);
        }
    }, [currentUser, recipient]);

    return { messages, isLoading, isSending, sendMessage };
};
