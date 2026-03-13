const { MongoClient } = require('mongodb');
const uri = 'mongodb+srv://yai202407_db_user:w4T0FwTGNzpAjUz7@cluster0.d4ozsqu.mongodb.net/';
const client = new MongoClient(uri);

async function run() {
  await client.connect();
  const db = client.db('ym_eco_board');
  
  // 1. Check if 'department' field contains CSR (any casing)
  const csrDeptUsers = await db.collection('users').find({
      $or: [
          { department: { $regex: /csr/i } },
          { name: { $regex: /csr/i } }
      ]
  }).toArray();
  
  console.log('--- Users with Department or Name = CSR ---');
  if (csrDeptUsers.length > 0) {
      csrDeptUsers.forEach(u => console.log(u.name, '(', u.email, ') - Dept:', u.department));
  } else {
      console.log('None.');
  }

  // 2. Check sub_roles specifically for exactly 'csr'
  const csrRolesUsers = await db.collection('users').find({
      sub_roles: { $elemMatch: { $regex: /csr/i } }
  }).toArray();
  
  console.log('\n--- Users with sub_role = CSR ---');
  if (csrRolesUsers.length > 0) {
      csrRolesUsers.forEach(u => {
          const csrRoles = u.sub_roles.filter(r => r.toLowerCase().includes('csr'));
          console.log(u.name, '(', u.email, ') - CSR Roles:', csrRoles);
      });
  } else {
      console.log('None.');
  }

  process.exit(0);
}
run();
