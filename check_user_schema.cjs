const { MongoClient } = require('mongodb');
const uri = 'mongodb+srv://yai202407_db_user:w4T0FwTGNzpAjUz7@cluster0.d4ozsqu.mongodb.net/';
const client = new MongoClient(uri);

async function run() {
  await client.connect();
  const db = client.db('ym_eco_board');
  
  // Just dump a few full user objects
  const users = await db.collection('users').find({}).limit(2).toArray();
  console.log(JSON.stringify(users, null, 2));

  process.exit(0);
}
run();
