import { getMongoClient } from './src/infrastructure/database/MongoDBClient.js';
import dotenv from 'dotenv';
dotenv.config();

async function check() {
    const client = getMongoClient();
    await client.connect();
    const db = client.getDb();

    console.log("=== CHECKING HOW USERS HAVE ROLES ===");

    const userRoleExamples = await db.collection('users').find({
        role: { $exists: true }
    }).limit(1).toArray();

    if (userRoleExamples.length > 0) {
        console.log("Found user with 'role' field:", userRoleExamples[0].role);
    } else {
        const userRolesIdExamples = await db.collection('users').find({
            role_id: { $exists: true }
        }).limit(1).toArray();
        if (userRolesIdExamples.length > 0) {
            console.log("Found user with 'role_id' field:", userRolesIdExamples[0].role_id);
        } else {
            console.log("No obvious 'role' or 'role_id' found on users. Examining top fields of a user:");
            const user = await db.collection('users').findOne({});
            console.log(Object.keys(user || {}));
        }
    }

    // Checking if there is a mapping table for example: model_has_roles or user_roles
    const cols = await db.listCollections().toArray();
    const roleMappingTbls = cols.map(c => c.name).filter(n => n.includes('role') || n.includes('permission'));
    console.log("Related collections:", roleMappingTbls);

    const ormRoles = cols.map(c => c.name).filter(n => n === 'model_has_roles' || n === 'role_user');
    for (const tbl of ormRoles) {
        console.log(`Checking ${tbl} sample:`);
        const item = await db.collection(tbl).findOne();
        console.log(item);
    }

    client.close();
}
check();
