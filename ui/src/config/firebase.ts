// Firebase Client SDK config for the frontend (browser)
// This connects to the SAME Firestore project as the backend
// Project: ai-agent-489507

import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
    projectId: 'ai-agent-489507',
    apiKey: 'AIzaSyCmvpSL_Tf_c-I2Z3bbv2zVApyICCJ4kU4',
    authDomain: 'ai-agent-489507.firebaseapp.com',
    storageBucket: 'ai-agent-489507.appspot.com',
    appId: 'yaikh-chat-client',
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const db = getFirestore(app);
export const getFirestoreClient = () => db;
