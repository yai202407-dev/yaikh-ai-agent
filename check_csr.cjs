const { MongoClient } = require('mongodb');
const uri = 'mongodb+srv://yai202407_db_user:w4T0FwTGNzpAjUz7@cluster0.d4ozsqu.mongodb.net/';
const client = new MongoClient(uri);

async function run() {
  await client.connect();
  const db = client.db('ym_eco_board');
  
  // 1. Search in orgs
  const csrOrgs = await db.collection('orgs').find({
    $or: [
        { name: { $regex: /csr/i } },
        { title: { $regex: /csr/i } },
        { name_en: { $regex: /csr/i } },
        { org_name: { $regex: /csr/i } }
    ]
  }).toArray();

  if (csrOrgs.length > 0) {
      console.log('--- Found CSR in Orgs ---');
      for (const org of csrOrgs) {
          const name = org.name || org.title || org.name_en || org.org_name || 'Unnamed';
          console.log(`Org: ${name} (ID: ${org._id})`);
          
          // Find members in user_org
          const userLinks = await db.collection('user_org').find({ org_id: org._id }).toArray();
          const userIds = userLinks.map(link => link.user_id);
          
          if (userIds.length > 0) {
              const users = await db.collection('users').find({ _id: { $in: userIds } }).toArray();
              console.log(`Members (${users.length}):`);
              users.forEach(u => console.log(`  - ${u.name || (u.first_name + ' ' + u.last_name)} (${u.email})`));
          } else {
              console.log('  No members linked via user_org');
          }
      }
  } else {
      console.log('No org matching CSR found.');
  }

  // 2. Search in sub_roles directly on user
  const csrUsers = await db.collection('users').find({
      sub_roles: { $elemMatch: { $regex: /csr/i } }
  }).toArray();

  if (csrUsers.length > 0) {
      console.log('\n--- Found Users with CSR in sub_roles ---');
      csrUsers.forEach(u => console.log(`- ${u.name} (${u.email}) - Roles: ${JSON.stringify(u.sub_roles)}`));
  } else {
      console.log('\nNo users found with CSR in sub_roles.');
  }

  process.exit(0);
}
run();
