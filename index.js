const express = require("express");
const app = express();

// Middleware для парсинга JSON
app.use(express.json());

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
const WEBHOOK_URL = process.env.WEBHOOK_URL || "https://your-app.onrender.com"; // Замените на ваш URL

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

// Функция для установки webhook
async function setWebhook() {
    try {
        const webhookUrl = WEBHOOK_URL + "/webhook";
        const response = await fetch(TELEGRAM_API_URL + "/setWebhook", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url: webhookUrl }),
        });
        const data = await response.json();
        if (data.ok) {
            console.log("✅ Webhook set successfully:", webhookUrl);
        } else {
            console.error("❌ Failed to set webhook:", data.description);
        }
    } catch (error) {
        console.error("❌ Webhook setup error:", error.message);
    }
}

// Webhook endpoint для получения сообщений от Telegram
app.post("/webhook", async (req, res) => {
    try {
        const update = req.body;
        console.log("Received update:", JSON.stringify(update, null, 2));

        if (!isValidMessage(update)) {
            return res.status(200).json({ ok: true });
        }

        const message = update.message;
        const chatId = message.chat.id;
        const text = message.text;

        console.log("New message from " + chatId + ": " + text);

        // Отправляем "typing" индикатор
        try {
            await fetch(TELEGRAM_API_URL + "/sendChatAction", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ chat_id: chatId, action: "typing" })
            });
        } catch (e) {}

        // Получаем ответ от AI и отправляем пользователю
        try {
            const aiResponse = await getAIResponse(text);
            await sendMessage(chatId, aiResponse);
        } catch (error) {
            console.error("Message handling error:", error);
            await sendMessage(chatId, "Sorry, error occurred.");
        }

        res.status(200).json({ ok: true });
    } catch (error) {
        console.error("Webhook error:", error);
        res.status(500).json({ error: error.message });
    }
});

app.get("/", (req, res) => {
    res.json({ status: "running", message: "Telegram bot working!", time: new Date() });
});

app.get("/health", (req, res) => {
    res.json({ status: "healthy", uptime: process.uptime(), memory: process.memoryUsage() });
});

// Endpoint рля проверки и настройки webhook
app.get("/setup-webhook", async (req, res) => {
    await setWebhook();
    res.json({ message: "Webhook setup initiated" });
});

app.listen(PORT, () => {
    console.log("Server started on port " + PORT);
    console.log("🤔 Bot is ready to receive messages via webhook");

    // Автоматически устанавливаем webhook при запуске
    if (WEBHOOK_URL !== "https://your-app.onrender.com") {
        setTimeout(() => {
            setWebhook();
        }, 2000);
    } else {
        console.log("⚠️ Please set WEBHOOK_URL environment variable");
    }
});