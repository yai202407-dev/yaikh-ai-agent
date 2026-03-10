async function askYai2(question) {
    const fetch = (await import('node-fetch')).default;

    console.log(`\n💬 Asking Yai2: "${question}"`);

    const requestBody = {
        user_id: "antigravity-test-02",
        message: question,
        stream: false
    };

    try {
        const startTime = Date.now();
        const response = await fetch('http://localhost:8001/api/ai-agent', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        const data = await response.json();
        const duration = ((Date.now() - startTime) / 1000).toFixed(1);

        console.log(`⏱️  Yai2 replied in ${duration}s:`);
        console.log(data.response);
        if (data.usedTools) {
            console.log(`   (🔧 Yai2 successfully used backend database tools for this answer)`);
        } else {
            console.log(`   (🧠 Yai2 answered from general knowledge/memory)`);
        }

    } catch (error) {
        console.error("Failed to reach Yai2:", error);
    }
}

async function runTests() {
    console.log("==========================================");
    console.log("🤖 INITIATING 5-QUESTION STRESS TEST TO YAI2");
    console.log("==========================================\n");

    const questions = [
        // 1. Tool usage: Dynamic Discovery
        "What are the names of the collections in the database that handle security or cameras?",

        // 2. Tool usage: Read Schema data
        "Can you look at the 'cameras' collection and tell me what the data fields look like?",

        // 3. Tool usage: Read real data
        "Tell me the name or details of one camera that is stored in the 'cameras' database.",

        // 4. Multi-system knowledge / Strict Rules
        "Who is the system administrator for this dashboard?",

        // 5. Memory Context
        "Do you remember what collections I just asked you about?"
    ];

    for (let i = 0; i < questions.length; i++) {
        await askYai2(questions[i]);
        // Wait 2 seconds between questions so we don't spam the dev LLM too hard
        await new Promise(resolve => setTimeout(resolve, 2000));
    }

    console.log("\n==========================================");
    console.log("✅ TEST COMPLETE");
    console.log("==========================================");
}

runTests();
