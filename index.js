const express = require("express");
const app = express();

const PORT = process.env.PORT || 3000;
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;
const DEEPSEEK_API_KEY = "sk-2ecfef4eb45a493197c4091bebf21be2";

// Функция отправки сообщения пользователю
async function sendMessage(chatId, text) {
    try {
        const response = await fetch(`${TELEGRAM_API_URL}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ chat_id: chatId, text }),
        });

        const data = await response.json();
        if (!response.ok) throw new Error(`Ошибка Telegram API: ${data.description}`);
    } catch (error) {
        console.error("Ошибка при отправке сообщения:", error.message);
    }
}

// Функция отправки запроса к DeepSeek
async function getAIResponse(userMessage) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000); // 15 секунд таймаут

    try {
        const response = await fetch("https://api.deepseek.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${DEEPSEEK_API_KEY}`,
            },
            body: JSON.stringify({
                model: "deepseek-chat",
                messages: [
                    { role: "system", content: "You are a helpful assistant." },
                    { role: "user", content: userMessage },
                ],
            }),
            signal: controller.signal,
        });

        clearTimeout(timeout);

        const data = await response.json();

        if (!response.ok) {
            throw new Error(`Ошибка DeepSeek API: ${JSON.stringify(data)}`);
        }

        return data.choices[0].message.content;
    } catch (error) {
        if (error.name === "AbortError") {
            console.error("⏱️ Таймаут запроса к DeepSeek");
        } else {
            console.error("❌ Ошибка DeepSeek:", error.message);
        }
        return "Произошла ошибка при получении ответа от ИИ.";
    }
}

// Получение новых сообщений из Telegram
async function getUpdates(offset) {
    try {
        const response = await fetch(`${TELEGRAM_API_URL}/getUpdates?offset=${offset}`);
        const data = await response.json();

        if (!response.ok) {
            throw new Error(`Ошибка получения обновлений: ${JSON.stringify(data)}`);
        }

        return data.result;
    } catch (error) {
        console.error("Ошибка получения обновлений:", error.message);
        return [];
    }
}

// Основной цикл обработки
(async () => {
    let offset = 0;
    console.log("🤖 Бот запущен и слушает сообщения...");

    while (true) {
        const updates = await getUpdates(offset);

        for (const update of updates) {
            const message = update.message;
            const chatId = message.chat.id;
            const text = message.text;

            console.log(`📩 Новое сообщение от ${chatId}: ${text}`);

            const aiResponse = await getAIResponse(text);
            await sendMessage(chatId, aiResponse);

            offset = update.update_id + 1;
        }

        await new Promise((resolve) => setTimeout(resolve, 1000));
    }
})();

// Express endpoint (может пригодиться для проверки статуса бота)
app.get("/", (req, res) => {
    res.send("🤖 Telegram бот работает!");
});

app.listen(PORT, () => {
    console.log(`🌐 Сервер запущен на порту ${PORT}`);
});
