import { getFirestoreDb } from './src/infrastructure/database/FirestoreClient.js';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  const db = getFirestoreDb();
  // We'll search across the last 20 conversations for the exact questions the subagent asked
  const snapshot = await db.collection('conversations')
    .orderBy('lastUpdated', 'desc')
    .limit(20)
    .get();

  let matched = 0;
  snapshot.forEach(doc => {
    let hasTarget = false;
    const data = doc.data();
    data.messages?.forEach((m: any) => {
        if (typeof m.content === 'string' && m.content.includes('Master Org Chart')) hasTarget = true;
    });
    if (hasTarget) {
        matched++;
        console.log('>>> MATCHED DOC ID:', doc.id);
        data.messages?.forEach((m: any) => console.log(`  [${m.role}] ${m.content.substring(0, 80).replace(/\n/g, ' ')}`));
    }
  });
  console.log(`Matched ${matched} conversation docs`);
  process.exit(0);
}
run();
