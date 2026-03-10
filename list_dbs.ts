import { getMongoClient } from './src/infrastructure/database/MongoDBClient.js';
import dotenv from 'dotenv';
dotenv.config();

async function test() {
    const client = getMongoClient();
    try {
        await client.connect();
        const dbs = await client.client.db().admin().listDatabases();
        console.log("Databases:", dbs.databases.map(d => d.name));
    } catch (e) {
        console.error("Error connecting:", e);
    } finally {
        await client.close();
    }
}
test();
