const express = require("express");
const app = express();

if (!process.env.TELEGRAM_BOT_TOKEN) {
    console.error("ERROR: NEED TELEGRAM_BOT_TOKEN");
    process.exit(1);
}

if (!process.env.DEEPSEEK_API_KEY) {
    console.error("ERROR: NEED DEEPSEEK_API_KEY");
    process.exit(1);
}

const PORT = process.env.PORT || 3000;
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_API_URL = "https://api.telegram.org/bot" + TELEGRAM_BOT_TOKEN;
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;

function isValidMessage(update) {
    return update && update.message && update.message.text && update.message.chat;
}

async function sendMessage(chatId, text) {
    if (!text || text.length === 0) return;
    if (text.length > 4096) text = text.substring(0, 4090) + "\n[...text cut]";

    try {
        const response = await fetch(TELEGRAM_API_URL + "/sendMessage", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ chat_id: chatId, text }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error("Telegram API error: " + data.description);
        console.log("Message sent to: " + chatId);
    } catch (error) {
        console.error("Send message error:", error.message);
    }
}

async function getAIResponse(userMessage) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);

    try {
        const response = await fetch("https://api.deepseek.com/v1/chat/completions", {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": "Bearer " + DEEPSEEK_API_KEY },
            body: JSON.stringify({
                model: "deepseek-chat",
                messages: [
                    { role: "system", content: "You are a friendly travel assistant. Respond in Russian." },
                    { role: "user", content: userMessage }
                ],
                max_tokens: 1500, temperature: 0.7
            }),
            signal: controller.signal
        });
        clearTimeout(timeout);
        const data = await response.json();
        if (!response.ok) throw new Error("DeepSeek API error: " + JSON.stringify(data));
        const result = data.choices?.[0]?.message?.content;
        if (!result) throw new Error("Invalid DeepSeek response");
        return result;
    } catch (error) {
        if (error.name === "AbortError") return "Sorry, request took too long. Try again.";
        console.error("DeepSeek error:", error.message);
        return "Sorry, I encountered an error. Please try again.";
    }
}

async function getUpdates(offset) {
    try {
        const response = await fetch(TELEGRAM_API_URL + "/getUpdates?offset=" + offset + "&timeout=10");
        const data = await response.json();
        if (!response.ok) throw new Error("Get updates error: " + JSON.stringify(data));
        return data.result || [];
    } catch (error) {
        console.error("Get updates error:", error.message);
        return [];
    }
}

(async () => {
    let offset = 0;
    console.log("Bot starting...");
    console.log("Bot is listening for messages...");

    while (true) {
        try {
            const updates = await getUpdates(offset);
            for (const update of updates) {
                if (!isValidMessage(update)) {
                    offset = update.update_id + 1;
                    continue;
                }
                const message = update.message;
                const chatId = message.chat.id;
                const text = message.text;
                console.log("New message from " + chatId + ": " + text);
                try {
                    await fetch(TELEGRAM_API_URL + "/sendChatAction", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ chat_id: chatId, action: "typing" })
                    });
                } catch (e) {}
                try {
                    const aiResponse = await getAIResponse(text);
                    await sendMessage(chatId, aiResponse);
                } catch (error) {
                    console.error("Message handling error:", error);
                    await sendMessage(chatId, "Sorry, error occurred.");
                }
                offset = update.update_id + 1;
            }
            await new Promise((resolve) => setTimeout(resolve, 1000));
        } catch (error) {
            console.error("Main loop error:", error);
            await new Promise((resolve) => setTimeout(resolve, 5000));
        }
    }
})();

app.get("/", (req, res) => {
    res.json({ status: "running", message: "Telegram bot working!", time: new Date() });
});

app.get("/health", (req, res) => {
    res.json({ status: "healthy", uptime: process.uptime(), memory: process.memoryUsage() });
});

app.listen(PORT, () => {
    console.log("Server started on port " + PORT);
});