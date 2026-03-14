import 'dotenv/config';
import { MongoClient } from 'mongodb';

async function check() {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
        console.error('MONGODB_URI not found');
        return;
    }

    const client = new MongoClient(uri);
    try {
        await client.connect();
        const url = new URL(uri);
        const dbName = url.pathname.slice(1) || 'yai-bot';
        const db = client.db(dbName);

        console.log(`Checking DB: ${dbName}`);

        const convs = await db.collection('conversations').find({}).limit(5).sort({ updatedAt: -1 }).toArray();
        console.log('\n--- Recent Conversations ---');
        convs.forEach(c => {
            console.log(`ID: ${c._id}, User: ${c.userId}, Active: ${c.isActive}, Title: ${c.title}, Updated: ${c.updatedAt}`);
        });

        const histories = await db.collection('chat_histories').find({}).limit(5).sort({ updatedAt: -1 }).toArray();
        console.log('\n--- Recent Chat Histories ---');
        histories.forEach(h => {
            console.log(`SessionID: ${h.sessionId}, Messages: ${h.messages?.length || 0}, Updated: ${h.updatedAt}`);
        });

    } catch (e) {
        console.error(e);
    } finally {
        await client.close();
    }
}

check();
