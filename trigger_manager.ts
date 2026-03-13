import { ChatManagerEngine } from './src/manager/ChatManagerEngine.js';
import dotenv from 'dotenv';

dotenv.config();

async function run() {
    console.log("Starting Chat Manager Scan...");
    const engine = new ChatManagerEngine();
    try {
        const report = await engine.scanAndAnalyzeFailures();
        console.log("\n--- SYNTHESIZED REPORT ---");
        console.log(report);
    } catch (e) {
        console.error("Failed:", e);
    } finally {
        process.exit(0);
    }
}

run();
