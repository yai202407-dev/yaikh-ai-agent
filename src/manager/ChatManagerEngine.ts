import { getFirestoreDb } from '../infrastructure/database/FirestoreClient.js';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import type { Firestore } from '@google-cloud/firestore';
import { pushService } from '../infrastructure/push/PushNotificationService.js';

// ── Interfaces ────────────────────────────────────────────────────────────────

interface FailedLog {
    sessionId: string;
    userId: string;
    lastMessage: string;
    failureReason: string;
    timestamp: Date;
}

export interface TrendingTopic {
    id?: string;
    topic: string;
    summary: string;
    heatScore: number;              // 0-100
    mentioningUserCount: number;
    departments: string[];
    sampleQuestions: string[];
    suggestedResponder: string;     // e.g. "HR Department", "Management", "Chairman"
    urgency: 'low' | 'medium' | 'high' | 'critical';
    status: 'active' | 'responding' | 'resolved';
    officialResponse?: string;
    respondedBy?: string;
    respondedAt?: Date;
    detectedAt: Date;
    updatedAt: Date;
}

// ── Engine ────────────────────────────────────────────────────────────────────

export class ChatManagerEngine {
    private llm: ChatGoogleGenerativeAI;
    private _db: Firestore | null = null;

    private get db(): Firestore {
        if (!this._db) this._db = getFirestoreDb();
        return this._db;
    }

    constructor() {
        this.llm = new ChatGoogleGenerativeAI({
            model: 'gemini-2.5-flash',
            apiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '',
            temperature: 0.2,
        });
    }

    // ── Phase 3: Topic Intelligence ──────────────────────────────────────────

    /**
     * Reads last 2 hours of DM messages from Firestore dm_conversations,
     * feeds them to Gemini, extracts TOP 5 trending organizational topics,
     * and upserts results into the trending_topics Firestore collection.
     */
    async analyzeTopicTrends(): Promise<TrendingTopic[]> {
        console.log('🔍 [Chat Manager] Starting topic trend analysis...');

        const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);

        const conversationsSnap = await this.db
            .collection('dm_conversations')
            .where('updatedAt', '>=', twoHoursAgo)
            .limit(300)
            .get();

        if (conversationsSnap.empty) {
            console.log('[Chat Manager] No recent DM activity to analyze.');
            return [];
        }

        // Gather messages from all recent threads
        const messagesByConv: {
            convId: string;
            participants: string[];
            departments: string[];
            messages: string[];
        }[] = [];

        await Promise.all(conversationsSnap.docs.map(async (convDoc) => {
            const convData = convDoc.data();
            const msgsSnap = await this.db
                .collection('dm_conversations')
                .doc(convDoc.id)
                .collection('messages')
                .orderBy('timestamp', 'desc')
                .limit(30)
                .get();

            if (msgsSnap.empty) return;

            const texts = msgsSnap.docs
                .map(m => m.data().text as string)
                .filter(t => t && t.trim().length > 5);

            if (texts.length === 0) return;

            const depts = Object.values(convData.departments || {}) as string[];
            messagesByConv.push({
                convId: convDoc.id,
                participants: convData.participants || [],
                departments: depts,
                messages: texts,
            });
        }));

        if (messagesByConv.length === 0) return [];

        const conversationDump = messagesByConv.map((c, i) =>
            `[Conv ${i + 1} | Depts: ${c.departments.join(', ')}]\n` +
            c.messages.slice(0, 10).map(m => `  - "${m}"`).join('\n')
        ).join('\n\n');

        const totalUsers = new Set(messagesByConv.flatMap(c => c.participants)).size;

        const prompt = `
You are the Yai Company Chat Intelligence Engine. You analyze internal employee messages to identify trending organizational topics.

CONVERSATION DATA (${messagesByConv.length} threads, ~${totalUsers} unique employees active in last 2 hours):
${conversationDump}

YOUR TASK:
Extract the TOP 5 most discussed or concerning organizational topics from these messages.
Return a valid JSON array ONLY. No markdown fences, no extra text.

Each item must have these exact fields:
{
  "topic": "short 3-7 word title",
  "summary": "1-2 sentence explanation of what employees are discussing",
  "heatScore": 0-100 (based on how many people involved and urgency),
  "mentioningUserCount": estimated unique user count discussing this,
  "departments": ["dept1", "dept2"],
  "sampleQuestions": ["actual sample from messages", "another"],
  "suggestedResponder": "HR Department | Management | Chairman | IT | Finance | Operations",
  "urgency": "low | medium | high | critical"
}

RULES:
- Only topics with real evidence from multiple messages/users
- Skip generic small talk
- Focus on: holidays, payroll issues, incidents, operational problems, policy questions, production issues
- Return fewer than 5 if there isn't enough clear signal
- Output ONLY the JSON array

JSON:`;

        try {
            const response = await this.llm.invoke(prompt);
            const rawText = typeof response.content === 'string' ? response.content : '';

            const jsonMatch = rawText.match(/\[[\s\S]*\]/);
            if (!jsonMatch) {
                console.warn('[Chat Manager] Gemini returned no valid JSON');
                return [];
            }

            const parsed: any[] = JSON.parse(jsonMatch[0]);
            const now = new Date();
            const topics: TrendingTopic[] = [];

            for (const t of parsed) {
                const topic: TrendingTopic = {
                    topic: t.topic || 'Unknown Topic',
                    summary: t.summary || '',
                    heatScore: Math.min(100, Math.max(0, Number(t.heatScore) || 50)),
                    mentioningUserCount: Number(t.mentioningUserCount) || 1,
                    departments: Array.isArray(t.departments) ? t.departments : [],
                    sampleQuestions: Array.isArray(t.sampleQuestions) ? t.sampleQuestions.slice(0, 3) : [],
                    suggestedResponder: t.suggestedResponder || 'Management',
                    urgency: (['low', 'medium', 'high', 'critical'].includes(t.urgency)) ? t.urgency : 'medium',
                    status: 'active',
                    detectedAt: now,
                    updatedAt: now,
                };

                // Upsert by topic title
                const existing = await this.db.collection('trending_topics')
                    .where('topic', '==', topic.topic)
                    .where('status', '==', 'active')
                    .limit(1)
                    .get();

                if (!existing.empty) {
                    const docRef = existing.docs[0].ref;
                    await docRef.update({
                        heatScore: topic.heatScore,
                        mentioningUserCount: topic.mentioningUserCount,
                        departments: topic.departments,
                        sampleQuestions: topic.sampleQuestions,
                        updatedAt: now,
                    });
                    topic.id = existing.docs[0].id;
                } else {
                    const docRef = await this.db.collection('trending_topics').add(topic);
                    topic.id = docRef.id;

                    // 🔔 Phase 5: Push alert if this is a NEW critical topic
                    if (topic.urgency === 'critical') {
                        pushService.notifyCriticalTopic(
                            topic.topic,
                            topic.summary,
                            topic.suggestedResponder
                        ).catch(err => console.error('[Push] Critical alert failed:', err));
                    }
                }

                topics.push(topic);
            }

            console.log(`✅ [Chat Manager] ${topics.length} trending topics upserted.`);
            return topics;

        } catch (err) {
            console.error('[Chat Manager] Topic analysis error:', err);
            return [];
        }
    }

    /**
     * Post an official management response to a trending topic.
     * Marks the topic as resolved and stores the response.
     */
    async postOfficialResponse(topicId: string, responseText: string, respondedBy: string): Promise<void> {
        const docRef = this.db.collection('trending_topics').doc(topicId);

        // Fetch topic title before updating so we can include it in the push
        const snap = await docRef.get();
        const topicTitle = snap.exists ? (snap.data()?.topic || 'Topic') : 'Topic';

        await docRef.update({
            status: 'resolved',
            officialResponse: responseText,
            respondedBy,
            respondedAt: new Date(),
            updatedAt: new Date(),
        });

        console.log(`✅ [Chat Manager] Topic ${topicId} resolved by ${respondedBy}`);

        // 🔔 Phase 5: Push resolution notification to all employees
        pushService.notifyTopicResolved(topicTitle, responseText, respondedBy)
            .catch(err => console.error('[Push] Resolution notification failed:', err));
    }

    // ── Phase 1: Failure Analysis (original) ──────────────────────────────────

    async scanAndAnalyzeFailures(): Promise<string> {
        console.log('🔍 [Chat Manager] Scanning recent chat logs for failures...');

        try {
            const snapshot = await this.db.collection('conversations')
                .orderBy('lastUpdated', 'desc')
                .limit(100)
                .get();

            const failedSessions: FailedLog[] = [];

            snapshot.forEach(doc => {
                const data = doc.data();
                if (!data.messages || !Array.isArray(data.messages)) return;

                const messages = data.messages;
                for (let i = messages.length - 1; i >= 0; i--) {
                    const msg = messages[i];
                    if (
                        msg.role === 'assistant' &&
                        (msg.content.includes("couldn't process this request properly") ||
                            msg.content.includes("cannot directly access") ||
                            msg.content.includes("privacy and security protocols") ||
                            msg.content.includes("not available through my current tools") ||
                            msg.content.includes("temporary service unavailability") ||
                            msg.content.includes("unable to retrieve"))
                    ) {
                        const userQuestion = i > 0 && messages[i - 1].role === 'user'
                            ? messages[i - 1].content
                            : 'Unknown Context';
                        failedSessions.push({
                            sessionId: doc.id,
                            userId: data.userId || 'Unknown',
                            lastMessage: userQuestion,
                            failureReason: 'System Failure or Tool/Policy Refusal',
                            timestamp: data.lastUpdated?.toDate() || new Date(),
                        });
                    }
                }
            });

            if (failedSessions.length === 0) {
                return '✅ All clear! No critical agent failures detected in recent history.';
            }

            console.log(`⚠️ [Chat Manager] Found ${failedSessions.length} failures. Synthesizing report...`);
            const report = await this.synthesizeFailureReport(failedSessions);

            await this.db.collection('manager_reports').add({
                reportLevel: 'Warning',
                createdAt: new Date(),
                failedLogCount: failedSessions.length,
                synthesizedReport: report,
            });

            return report;

        } catch (error) {
            console.error('❌ [Chat Manager] Failed to scan logs:', error);
            throw error;
        }
    }

    private async synthesizeFailureReport(failures: FailedLog[]): Promise<string> {
        const failureTextDump = failures
            .map(f => `[Session: ${f.sessionId} | User: ${f.userId}] Q: "${f.lastMessage}"`)
            .join('\n');

        const prompt = `
You are the elite Chat Manager AI for the Yai 2 Agentic System.
Analyze the following failure logs and identify what the system is lacking.

RAW FAILURES:
${failureTextDump}

INSTRUCTIONS:
1. Categorize failures (e.g. "Missing HR Data Tool", "Complex DB Query", "Unclear Prompts")
2. Recommend what new Tool, DB connection, or Prompt fix the engineering team needs
3. Keep it professional, structured, under 400 words. Format with Markdown.
`;

        const response = await this.llm.invoke(prompt);
        return typeof response.content === 'string'
            ? response.content
            : 'Error extracting AI response.';
    }
}
