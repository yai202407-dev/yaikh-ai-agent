import { Storage } from '@google-cloud/storage';
import speech from '@google-cloud/speech';

export class NotebookService {
    private storage: Storage;
    private speechClient: speech.SpeechClient;
    private readonly BUCKET_NAME = 'yaikh-notebook-depot';

    constructor() {
        this.storage = new Storage();
        // Uses Application Default Credentials by default in Cloud Run
        this.speechClient = new speech.SpeechClient();
    }

    /**
     * Uploads an in-memory buffer to the Notebook GCP Bucket
     */
    async uploadToGCS(buffer: Buffer, originalName: string, mimeType: string): Promise<string> {
        console.log(`[NotebookService] Uploading ${originalName} to ${this.BUCKET_NAME}...`);
        const bucket = this.storage.bucket(this.BUCKET_NAME);
        
        // Clean filename, append timestamp to prevent collisions
        const safeName = originalName.replace(/[^a-zA-Z0-9.-]/g, '_');
        const uniqueFilename = `${Date.now()}_${safeName}`;
        const file = bucket.file(uniqueFilename);

        await file.save(buffer, {
            contentType: mimeType,
            resumable: false, // Recommended false for smaller direct buffers like 10-50MB
        });

        const gcsUri = `gs://${this.BUCKET_NAME}/${uniqueFilename}`;
        console.log(`[NotebookService] Upload complete: ${gcsUri}`);
        return gcsUri;
    }

    /**
     * Transcribes long audio using Google Cloud Speech-to-Text
     */
    async transcribeAudio(gcsUri: string, mimeType: string): Promise<string> {
        console.log(`[NotebookService] Transcribing audio from: ${gcsUri}`);
        
        let encoding: any = 'ENCODING_UNSPECIFIED';
        let sampleRateHertz = 16000;

        if (mimeType.includes('mp3') || gcsUri.endsWith('.mp3')) {
            encoding = 'MP3';
            sampleRateHertz = 44100; // Common MP3 sample rate
        } else if (mimeType.includes('webm')) {
            encoding = 'WEBM_OPUS';
            sampleRateHertz = 48000;
        }

        const request = {
            audio: {
                uri: gcsUri,
            },
            config: {
                encoding: encoding,
                sampleRateHertz: sampleRateHertz,
                languageCode: 'en-US',
                alternativeLanguageCodes: ['th-TH'], // Good for mixed teams
                enableAutomaticPunctuation: true,
            },
        };

        try {
            // For files longer than 1 minute, longRunningRecognize must be used
            const [operation] = await this.speechClient.longRunningRecognize(request);
            console.log(`[NotebookService] Waiting for speech-to-text operation to complete...`);
            
            const [response] = await operation.promise();
            console.log(`[NotebookService] Transcription complete.`);

            if (!response.results || response.results.length === 0) {
                return "[No intelligible speech detected in recording]";
            }

            const transcription = response.results
                .map(result => result.alternatives?.[0]?.transcript || "")
                .join('\n');

            return transcription;
        } catch (error) {
            console.error(`[NotebookService] Transcription Error:`, error);
            throw new Error('Failed to transcribe audio file.');
        }
    }

    /**
     * Master endpoint to process any incoming notebook file
     */
    async processNotebookSource(buffer: Buffer, originalName: string, mimeType: string): Promise<string> {
        try {
            // 1. All sources get archived in the Cloud Storage Bucket
            const gcsUri = await this.uploadToGCS(buffer, originalName, mimeType);

            // 2. Extractor Logic based on type
            if (mimeType.startsWith('audio/') || originalName.endsWith('.mp3') || originalName.endsWith('.wav')) {
                const transcript = await this.transcribeAudio(gcsUri, mimeType);
                return `**Meeting/Audio Transcript (${originalName}):**\n\n${transcript}`;
            } 
            
            if (mimeType === 'application/pdf' || originalName.endsWith('.pdf')) {
                // Placeholder for PDF parser logic (like pdf-parse or langchain loaders)
                // In full prod, we would hook up @langchain/community pdf extractor here
                return `**PDF Extract (${originalName}):**\n\n[Successfully added PDF file ${originalName} to Notebook Storage at ${gcsUri} for processing]`;
            }

            if (mimeType.startsWith('text/') || mimeType === 'application/json' || originalName.endsWith('.csv')) {
                return `**Text Source (${originalName}):**\n\n${buffer.toString('utf-8')}`;
            }

            return `[File ${originalName} successfully stored at ${gcsUri} but content extraction for this format is not yet mapped]`;

        } catch (err: any) {
            console.error(`[NotebookService] Failed processing source: ${err.message}`);
            throw err;
        }
    }
}
