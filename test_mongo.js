const { getMongoClient } = require('./dist/infrastructure/database/MongoDBClient.js');
const dotenv = require('dotenv');
dotenv.config();

async function test() {
    const client = getMongoClient();
    try {
        await client.connect();
        console.log("Connected to MongoDB!");

        const count = await client.getDb().collection('purchase_requests').countDocuments();
        console.log(`Found ${count} purchase requests.`);

        // get returned requests
        const db = client.getDb();
        const collection = db.collection('purchase_requests');
        const returnedRequests = await collection
            .find({ returnFromName: { $exists: true } })
            .limit(10)
            .sort({ returned_at: -1 })
            .toArray();
        console.log(`Found ${returnedRequests.length} returned requests.`);
        if (returnedRequests.length > 0) {
            console.log("Sample:", {
                code: returnedRequests[0].code,
                returnReason: returnedRequests[0].returnReason
            });
        }
    } catch (e) {
        console.error("Error connecting:", e);
    } finally {
        await client.close();
    }
}

test();
