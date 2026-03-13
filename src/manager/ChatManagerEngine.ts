import { getFirestoreDb } from '../infrastructure/database/FirestoreClient.js';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import type { Firestore } from '@google-cloud/firestore';

interface FailedLog {
    sessionId: string;
    userId: string;
    lastMessage: string;
    failureReason: string;
    timestamp: Date;
}

export class ChatManagerEngine {
    private llm: ChatGoogleGenerativeAI;
    private _db: Firestore | null = null;

    /** Lazy getter — only connects to Firestore when first used */
    private get db(): Firestore {
        if (!this._db) {
            this._db = getFirestoreDb();
        }
        return this._db;
    }

    constructor() {
        this.llm = new ChatGoogleGenerativeAI({
            model: 'gemini-2.5-flash',
            apiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '',
            temperature: 0.2, // Low temp for analytical tasks
        });
    }

    /**
     * Triggered every night (or on command) to analyze the last 24 hours of logs.
     * Looks for users who got "I'm sorry, I couldn't process this request properly."
     */
    async scanAndAnalyzeFailures(): Promise<string> {
        console.log("🔍 [Chat Manager] Beginning system-wide scan of recent chat logs...");

        try {
            // Get the last 100 conversations
            const snapshot = await this.db.collection('conversations')
                .orderBy('lastUpdated', 'desc')
                .limit(100)
                .get();

            const failedSessions: FailedLog[] = [];

            snapshot.forEach(doc => {
                const data = doc.data();
                if (!data.messages || !Array.isArray(data.messages)) return;
                
                // Read from bottom up
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
                         msg.content.includes("unable to retrieve")
                        )
                    ) {
                        // Found a failure or refusal. Let's get the user question immediately before it
                        const userQuestion = i > 0 && messages[i - 1].role === 'user' ? messages[i - 1].content : "Unknown Context";
                        
                        failedSessions.push({
                            sessionId: doc.id,
                            userId: data.userId || 'Unknown',
                            lastMessage: userQuestion,
                            failureReason: 'System Failure or Tool/Policy Refusal / Unavailability',
                            timestamp: data.lastUpdated?.toDate() || new Date()
                        });
                        // Do not break here; allow it to capture multiple failures per session
                    }
                }
            });

            if (failedSessions.length === 0) {
                return "✅ All clear! No critical agent failures detected in recent history.";
            }

            console.log(`⚠️ [Chat Manager] Found ${failedSessions.length} failed interactions. Triggering AI synthesis...`);
            
            // Send the raw data to the Manager AI Model to categorize and deduce
            const report = await this.synthesizeFailureReport(failedSessions);
            
            // Save the report back to Firestore
            await this.db.collection('manager_reports').add({
                reportLevel: 'Warning',
                createdAt: new Date(),
                failedLogCount: failedSessions.length,
                synthesizedReport: report
            });

            return report;

        } catch (error) {
            console.error("❌ [Chat Manager] Failed to scan logs:", error);
            throw error;
        }
    }

    /**
     * Uses Gemini to group the errors conceptually
     */
    private async synthesizeFailureReport(failures: FailedLog[]): Promise<string> {
        const failureTextDump = failures.map((f, i) => `[Session: ${f.sessionId} | User: ${f.userId}] Question Asked: "${f.lastMessage}"`).join('\n');

        const prompt = `
You are the elite Chat Manager AI for the Yai 2 Agentic System.
Your job is to read the following raw failure logs (questions that caused the system to crash or abort) and deduce WHAT the system is lacking.

RAW FAILURES:
${failureTextDump}

INSTRUCTIONS:
1. Categorize these failures. (e.g. "Missing Tool for HR Data", "Complex Database Loop", "Unclear User Prompts")
2. Recommend exactly what new Tool, Database connection, or Prompt adjustment the engineering team needs to build to prevent this tomorrow.
3. Keep it professional, structured, and under 400 words. Format with Markdown.
        `;

        const response = await this.llm.invoke(prompt);
        return typeof response.content === 'string' ? response.content : "Error extracting string from AI response.";
    }
}
