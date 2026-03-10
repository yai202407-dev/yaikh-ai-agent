import { getMongoClient } from './src/infrastructure/database/MongoDBClient.js';
import { SYSTEM_PROMPT } from './src/config/prompts.js';
import dotenv from 'dotenv';
dotenv.config();

async function initBrain() {
    console.log("Connecting to Database to initialize Yai_AI_Brain...");
    const client = getMongoClient();
    try {
        await client.connect();
        const db = client.getDb();

        const collection = db.collection('yai_system_prompts');

        // Check if there's already a prompt
        const existing = await collection.findOne({ type: 'core_prompt' });

        if (!existing) {
            await collection.insertOne({
                type: 'core_prompt',
                content: SYSTEM_PROMPT,
                version: 1,
                updated_at: new Date(),
                description: 'The foundational personality and rule set for Yai 2. Read dynamically on every request.'
            });
            console.log("✅ Successfully initialized 'yai_system_prompts' collection with the default prompt!");
        } else {
            console.log("⚠️ Core prompt already exists in the database. Updating it just in case.");
            await collection.updateOne(
                { type: 'core_prompt' },
                { $set: { content: SYSTEM_PROMPT, updated_at: new Date() } }
            );
            console.log("✅ Successfully updated the existing core prompt.");
        }

    } catch (e) {
        console.error("❌ Error initializing brain:", e);
    } finally {
        await client.close();
    }
}

initBrain();
