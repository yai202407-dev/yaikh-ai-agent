import { Firestore } from '@google-cloud/firestore';
import * as path from 'path';
import * as url from 'url';
import * as fs from 'fs';

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
            
            const firestoreOptions: any = {
                projectId: this.projectId,
                ignoreUndefinedProperties: true 
            };
            
            // In Cloud Run / Production, we don't have this key file 
            // the GCP environment provides default credentials implicitly.
            if (fs.existsSync(this.keyFilename)) {
                firestoreOptions.keyFilename = this.keyFilename;
                console.log(`[FirestoreClient] Using explicit local service key.`);
            } else {
                console.log(`[FirestoreClient] Local key missing. Falling back to Application Default Credentials.`);
            }

            this.db = new Firestore(firestoreOptions);
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
