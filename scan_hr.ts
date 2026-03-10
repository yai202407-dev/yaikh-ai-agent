import { getMongoClient } from './src/infrastructure/database/MongoDBClient.js';
import dotenv from 'dotenv';
dotenv.config();

async function scan() {
    const client = getMongoClient();
    await client.connect();
    const db = client.getDb();

    console.log("=== USERS ===");
    console.log(await db.collection('users').findOne());

    console.log("=== RECRUITMENTS ===");
    console.log(await db.collection('recruitments').findOne());

    console.log("=== TRAININGS ===");
    console.log(await db.collection('training_announcements').findOne());

    client.close();
}
scan();
