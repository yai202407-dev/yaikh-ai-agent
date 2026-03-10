import { getMongoClient } from './src/infrastructure/database/MongoDBClient.js';
import dotenv from 'dotenv';
dotenv.config();

async function check() {
    const client = getMongoClient();
    await client.connect();
    const db = client.getDb();

    // Let's get "GK Agent" to see what roles they have
    console.log("=== Checking GK Agent ===");
    const gk = await db.collection('users').findOne({ name: 'GK Agent' }) || await db.collection('users').findOne({ email: 'GK Agent' });
    console.log(gk ? gk.roles : "GK Agent not found");

    console.log("=== Checking GM Agent ===");
    const gm = await db.collection('users').findOne({ name: 'GM Agent' }) || await db.collection('users').findOne({ email: 'GM Agent' });
    console.log(gm ? gm.roles : "GM Agent not found");

    console.log("=== Any user with roles ===");
    const users = await db.collection('users').find({ "roles": { $exists: true, $not: { $size: 0 } } }).limit(2).toArray();
    for (const u of users) {
        console.log(`User: ${u.name}, Roles: ${JSON.stringify(u.roles)}, Sub-Roles: ${JSON.stringify(u.sub_roles)}`);
    }

    client.close();
}
check();
