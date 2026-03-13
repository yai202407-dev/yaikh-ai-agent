const { MongoClient } = require('mongodb');
const uri = 'mongodb+srv://yai202407_db_user:w4T0FwTGNzpAjUz7@cluster0.d4ozsqu.mongodb.net/';
const client = new MongoClient(uri);

async function run() {
  await client.connect();
  const db = client.db('ym_eco_board');
  
  // Find a few users with a valid position/title
  const usersWithPositions = await db.collection('users').find({ position: { $exists: true, $ne: '' } }).limit(5).toArray();
  console.log('--- SAMPLED USERS WITH POSITIONS ---');
  usersWithPositions.forEach(u => {
    console.log('- Name:', u.name || u.name_en || 'Unknown', '| Title:', u.position);
  });

  // Count how many users have job titles mapped
  const totalWithPos = await db.collection('users').countDocuments({ position: { $exists: true, $ne: '' } });
  console.log('\nTotal Users with explicit Job Titles:', totalWithPos);

  process.exit(0);
}
run();
