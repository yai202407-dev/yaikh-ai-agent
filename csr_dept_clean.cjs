const { MongoClient } = require('mongodb');
const uri = 'mongodb+srv://yai202407_db_user:w4T0FwTGNzpAjUz7@cluster0.d4ozsqu.mongodb.net/';
const client = new MongoClient(uri);

async function run() {
  await client.connect();
  const db = client.db('ym_eco_board');
  
  const csrRolesUsers = await db.collection('users').find({
      sub_roles: { $elemMatch: { $regex: /csr/i } }
  }).toArray();
  
  const members = [...new Set(csrRolesUsers.map(u => u.name || u.email))];
  
  console.log('CSR Members:', members.join(', '));
  console.log('Total Count:', members.length);

  process.exit(0);
}
run();
