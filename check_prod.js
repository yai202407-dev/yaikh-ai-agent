async function checkProd() {
    const fetch = (await import('node-fetch')).default;
    console.log("Testing Production Service...");
    try {
        const response = await fetch('https://yaikh-ai-agent-dtbkajcrna-as.a.run.app/api/ai-agent', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_id: "antigravity-prod-test",
                message: "tell me about HR module",
                stream: false
            })
        });
        const data = await response.json();
        console.log("PROD RESPONSE:", data.response);
    } catch (e) {
        console.error("Error:", e);
    }
}
checkProd();
