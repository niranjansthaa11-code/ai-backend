export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    try {
        const { messages } = req.body;

        const response = await fetch("https://ai.hackclub.com/proxy/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer sk-hc-v1-95323fe12bec40cfadbc742590e73d74bbdd8f225024416b965dd43c975487d6"
            },
            body: JSON.stringify({
                model: "qwen/qwen3-32b",
                messages: messages
            })
        });

        const data = await response.json();
        return res.status(200).json(data);

    } catch (error) {
        console.error("Proxy Error:", error);
        return res.status(500).json({ error: "Failed to get AI response" });
    }
}