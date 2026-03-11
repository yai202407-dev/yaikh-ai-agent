import { Firestore } from '@google-cloud/firestore';
import * as path from 'path';
import * as url from 'url';

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class FirestoreClient {
    private static instance: FirestoreClient;
    private db: Firestore | null = null;
    private projectId = 'ai-agent-489507';
    private keyFilename = path.resolve(__dirname, '../../../service-account-key.json');

    private constructor() {
        this.connect();
    }

    public static getInstance(): FirestoreClient {
        if (!FirestoreClient.instance) {
            FirestoreClient.instance = new FirestoreClient();
        }
        return FirestoreClient.instance;
    }

    private connect() {
        try {
            console.log(`🔥 Connecting to Google Cloud Firestore [${this.projectId}]...`);
            this.db = new Firestore({
                projectId: this.projectId,
                keyFilename: this.keyFilename,
                ignoreUndefinedProperties: true 
            });
            console.log('✅ Connected to Firestore database.');
        } catch (error) {
            console.error('❌ Failed to connect to Firestore:', error);
            this.db = null;
        }
    }

    public getDb(): Firestore {
        if (!this.db) {
            throw new Error('Firestore is not connected. Call getInstance() to connect first.');
        }
        return this.db;
    }
}

export const getFirestoreDb = (): Firestore => {
    return FirestoreClient.getInstance().getDb();
};
