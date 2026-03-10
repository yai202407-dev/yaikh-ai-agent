import { getMongoClient } from './src/infrastructure/database/MongoDBClient.js';
import dotenv from 'dotenv';
dotenv.config();

async function checkRoles() {
    const client = getMongoClient();
    await client.connect();
    const db = client.getDb();

    console.log("=== ROLES COLLECTION ===");
    const roles = await db.collection('roles').find({}).limit(5).toArray();
    console.log(roles);

    console.log("\n=== USERS COLLECTION SAMPLE ===");
    // Get a user that might have a role or check the structure
    const user = await db.collection('users').findOne({});
    console.log(user);

    // check if there's any collection with "role" in name
    const collections = await db.listCollections().toArray();
    const roleCols = collections.map(c => c.name).filter(n => n.includes('role'));
    console.log("\n=== COLLECTIONS WITH 'role' ===");
    console.log(roleCols);

    client.close();
}
checkRoles();
