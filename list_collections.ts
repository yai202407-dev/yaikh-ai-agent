import { getMongoClient } from './src/infrastructure/database/MongoDBClient.js';
import dotenv from 'dotenv';
dotenv.config();

async function test() {
    const client = getMongoClient();
    try {
        await client.connect();
        // the .env we read from has DB_DATABASE=ym_eco_board
        const db = client.client.db("ym_eco_board");
        const collections = await db.listCollections().toArray();
        console.log("Collections:", collections.map(c => c.name));

        for (const c of collections) {
            const count = await db.collection(c.name).countDocuments();
            console.log(`- ${c.name}: ${count} docs`);
        }

    } catch (e) {
        console.error("Error connecting:", e);
    } finally {
        await client.close();
    }
}
test();
