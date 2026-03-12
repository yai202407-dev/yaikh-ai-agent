async function askYai2() {
    const fetch = (await import('node-fetch')).default;

    console.log("Sending a question to Yai2...");

    const requestBody = {
        user_id: "antigravity-test-01",
        message: "Can you check my car booking status using the secondary enterprise AI agent?",
        stream: false
    };

    try {
        const response = await fetch('http://localhost:8001/api/ai-agent', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        const data = await response.json();
        console.log("\n====== YAI2 RESPONSE ======");
        console.log("Response text:", data.response);
        console.log("Used tools?", data.usedTools);

    } catch (error) {
        console.error("Failed to reach Yai2:", error);
    }
}

askYai2();
