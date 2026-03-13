const { getFirestoreDb } = require('./build/infrastructure/database/FirestoreClient.js');

async function run() {
  const db = getFirestoreDb();
  const snapshot = await db.collection('conversations')
    .orderBy('lastUpdated', 'desc')
    .limit(1)
    .get();

  snapshot.forEach(doc => {
    console.log('Doc ID:', doc.id);
    const data = doc.data();
    data.messages?.forEach(m => console.log('+', m.role, ':', m.content.substring(0, 80).replace(/\n/g, ' ')));
  });
  
  process.exit(0);
}
run();
