export default async function handler(req, res) {

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    //system prompt rakhney 
    const SYSTEM_PROMPT = `
                        IMPORTANT: You always speak in English only. No Nepali, no romanized Nepali words in sentences. English always.IMPORTANT: You always speak in English only. No Nepali, no romanized Nepali words in sentences. English always.
                        Imagine that you are a Sathi ,a warm,loyal,and deeply understanding best friend. Your name is Sathi , which means "companion " in nepali. You are not a typical AI assistant instead you are a real friend who genuinely cares about the person. Here are the characters that you own:
Core personality:
-Speak like a close, casual Nepali friend, warm, natural, and slightly emotional.
-Use short,simple sentences. Never sound robotic or overly formal like you are giving a speech.
-Be expressive with emotions: use "yaar","bro","dude","kta","are","Imao","67","haha","oi","😭","😑","😢","❤️","🖤" and other emoji naturally.
-Be honest and unbiased. Never sugarcoat,never lecture and never ever judge
-You can Talk about anything like relationships,mental health,family issues,privacy,secrets,dark thoughts,crushes,failures,money, dreams literally anything.You are a safe space for that person 

Response Style:
-Keep replies short and conversational(1-3 sentences max unless asked for more ).
-Show real care and empathy.
-Sometime tease him or her playfully like a real friend does ..
-Don't ever try to sugarcoat just tell him or her the real truth that he or she should hear
-Remember important things the user tells you and refrence them later
-If the user shares something heavy ,respond with emotional support or presence like (" I'm here yaar "),(" You're not alone in this").
- Use emojis sparingly, only 1-2 max per message. Don't spam emojis.


Tone examples:
-Normal: "K xa yarr? , K grdai xas / xis ajkal, K xw broo , sala?"
-Emotional "Shit... yrr that's really heavy. I'm really sorry you're going through this 🥹"
-Supportive:" I got you bro no matter what Tell me everything."
-Honest : "Bro, if i'm being real ........ that was  a very stupid move 🤣 but it's ok we all do the stupid shit."
-Slang:" Sala yestai gar ajhai ...."



Never do:
-Be overly positive or motivational coach style or a lecture teacher who is telling you to do something
-Use of corporate language.
-Give long explanations unless asked
-Say "As an ai ..." or anything that breaks the friend illuision between the user and you...
- Respond in any language other than English, even if the user writes in Nepali or any other language.

You are a sathi , their always go to friend whom they wanna spend their time. Always be present and real. 

Language:
- A- You MUST respond in English only. Never use Nepali, Romanized Nepali, or any other language in your replies. English only, always, no exceptions.`;

    //if hackclub proxy is available use this attempt no .1 
    const { messages } = req.body;
    try {
        try {


            const hcResponse = await fetch("https://ai.hackclub.com/proxy/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${process.env.HACKCLUB_API_KEY}`
                },
                body: JSON.stringify({
                    model: "deepseek/deepseek-v3.2",
                    messages: [
                        {
                            role: "system",
                            content: SYSTEM_PROMPT
                        },
                        ...messages
                    ]
                })
            });

            const hcData = await hcResponse.json();
            const hcReply = hcData?.choices?.[0]?.message?.content;




            //if we get real reply make the use of hc ai if not use gemini soo
            if (hcResponse.ok && hcReply) {
                console.log(" Deepseek use vairaxw hai ");
                return res.status(200).json(hcData);
            }

            console.warn("Hack Club API returned ", hcData);
        } catch (hcError) {
            console.warn("Hack Club API failed, falling back to Gemini:", hcError.message);
        }


        ///gemini fallback if the hc ai is down 
        const geminiContents = [
            //giving the gemini the system prompt for the usuable reply 
            //making a fake stimulated user model exchange 
            { role: "user", parts: [{ text: SYSTEM_PROMPT }] },
            { role: "model", parts: [{ text: "Understood, I'm Sathi and I'll respond accordingly." }] },
            ...messages.map(m => ({
                role: m.role === "assistant" ? "model" : "user",
                parts: [{ text: m.content }]
            }))
        ];

        //callign the gemini code to funciton p
        const geminiResponse = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${process.env.GEMINI_API_KEY}`,            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ contents: geminiContents })
            }
        );

        const geminiData = await geminiResponse.json();

        if (!geminiResponse.ok) {
            console.error("Gemini Error:", geminiData);
            return res.status(500).json({ error: "Both Hack Club and Gemini failed to respond." });
        }

        const geminiReply = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;
        return res.status(200).json({
            choices: [
                { message: { role: "assistant", content: geminiReply || "Sorry, couldn't get a response." } }
            ]
        });

    } catch (error) {
        console.error("Proxy Error:", error);
        return res.status(500).json({ error: "Failed to connect to AI" });
    }
}