const { MongoClient } = require('mongodb');
const uri = 'mongodb+srv://yai202407_db_user:w4T0FwTGNzpAjUz7@cluster0.d4ozsqu.mongodb.net/';
const client = new MongoClient(uri);

async function run() {
  await client.connect();
  const db = client.db('ym_eco_board');
  
  // Find users who have sub_roles (which acts as their title/job function in this system)
  const totalWithRoles = await db.collection('users').countDocuments({ sub_roles: { $exists: true, $ne: [] } });
  console.log('\nTotal Users with mapped roles (sub_roles array):', totalWithRoles);

  const someUsers = await db.collection('users').find({ sub_roles: { $exists: true, $ne: [] } }).limit(5).toArray();
  someUsers.forEach(u => {
      console.log(`- ${u.name || u.email} roles: ${JSON.stringify(u.sub_roles)}`);
  });

  process.exit(0);
}
run();
