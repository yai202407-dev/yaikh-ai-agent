import { getMongoClient } from './src/infrastructure/database/MongoDBClient.js';
import dotenv from 'dotenv';
dotenv.config();

async function check() {
    const client = getMongoClient();
    await client.connect();
    const db = client.getDb();

    console.log("=== Searching for GK Agent ===");
    const usersByNamePattern = await db.collection('users').find({
        $or: [
            { name: { $regex: 'GK', $options: 'i' } },
            { email: { $regex: 'GK', $options: 'i' } },
            { eng_name: { $regex: 'GK', $options: 'i' } }
        ]
    }).limit(5).toArray();

    for (const u of usersByNamePattern) {
        console.log(`- ID: ${u._id}`);
        console.log(`  Name: ${u.name}`);
        console.log(`  Email: ${u.email}`);
        console.log(`  Roles:`, u.roles);
        console.log(`  Sub-Roles:`, u.sub_roles);
    }

    client.close();
}
check();
