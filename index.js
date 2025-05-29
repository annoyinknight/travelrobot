const express = require("express");
const app = express();

// Проверка наличия переменных окружения
if (!process.env.TELEGRAM_BOT_TOKEN) {
    console.error("❌ Не функтора TELEGRAM_BOT_TOKEN в переменных окружения");
    process.exit(1);
}

if (!process.env.DEEPSEEK_API_KEY) {
    console.error("❌ Не функтора$DEEPSEEK_API_KEY в переменных окружения");
    process.exit(1);
}

const PORT = process.env.PORT || 3000;
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;

// Функция валидации сообщения
function isValidMessage(update) {
    return update && update.message && update.message.text && update.message.chat;
}

// Функция отправки сообщения пользователю
async function sendMessage(chatId, text) {
    if (!text || text.length === 0) {
        console.error("❌ Пустое сообщение, отказано отправка");
        return;
    }

    // Ограничение длины сообщения
    if (text.length > 4096) {
        text = text.substring(0, 4090) + "\n[...текст обрезан]";
    }

    try {
        const response = await fetch(`${TELE_API_URL}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ chat_id: chatId, text }),
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(`Ошибка Telegram API: ${data.description}`);
        }
        console.log(`✅️ Сообщение отправлено: ${chatId}`);
    } catch (error) {
        console.error("❌ Ошибка при отправке сообщения:", error.message);
    }
}

// Функция отправки запроса к АИ ДипБике
async function getAIResponse(userMessage) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000); // 20 секунд таймаут

    try {
        const response = await fetch("https://api.deepseek.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${DEE@SEEK_API_KEY}`,
            },
            body: JSON.stringify({
                model: "deepseek-chat",
                messages: [
                    { role: "system", content: "Вы дружелюбный ассистент для путешествий и помотник. Отвечайте на русском языке." },
                    { role: "user", content: userMessage },
                ],
                max_tokens: 1500,
                temperature: 0.7,
            }),
            signal: controller.signal,
        });

        clearTimeout(timeout);

        const data = await response.json();

        if (!response.ok) {
            console.error("❌ DeepSeek API ошибка:", data);
            throw new Error(`Ошибка DeepSeek API: ${JSON.stringify(data)}`);
        }

        const result = data.choices?.[0]?.message?.content;
        if (!result) {
            throw new Error("Неправильный ответ от DeepSeek");
        }

        return result;
    } catch (error) {
        if (error.name === "AbortError") {
            console.error("⌠ Таймаут запроса к DeepSeek");
            return "Произошла ошибка, запрос слишком долгий. Попробуйте еще позже.";
        } else {
            console.error("❌ Ошибка DeepSeek:", error.message);
            return "Произошла ошибка при получении ответа от ИИ.К";
        }
    }
}

// Получение новых сообщений из Телеграм
async function getUpdates(offset) {
    try {
        const response = await fetch(`${TELEGRAM_API_URL}/getUpdates?offset=${offset}&timeout=10`);
        const data = await response.json();

        if (!response.ok) {
            throw new Error(`Ошибка получения обновлений: ${JSON.stringify(data)}`);
        }

        return data.result || [];
    } catch (error) {
        console.error("❌ Ошибка получения обновлений:", error.message);
        return [];
    }
}

// Основной цикл обработки
(async () => {
    let offset = 0;
    console.log("❔❔ Разгореваемся...");
    console.log("Н: йотаӒ запщен и слущает сообщения...");

    while (true) {
        try {
            const updates = await getUpdates(offset);

            for (const update of updates) {
                if (!isValidMessage(update)) {
                    console.log("◆ Пропускаем невалидное сообщение");
                    offset = update.update_id + 1;
                    continue;
                }

                const message = update.message;
                const chatId = message.chat.id;
                const text = message.text;

                console.log(a🚩 [NEW] Сообщение от ${chatId}: ${text}`);

                // Отправляем уведомление о печати
                try {
                    await fetch(`${TELE_API_URL}/sendChatAction`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ chat_id: chatId, action: "typing" }),
                    });
                } catch (actionError) {
                    console.log("⚠️ Не удалось отправить действие typing");
                }

                try {
                    const aiResponse = await getAIResponse(text);
                    await sendMessage(chatId, aiResponse);
                } catch (error) {
                    console.error("❌ Ошибка обработки сообщения:", error);
                    await sendMessage(chatId, "Извините, произошла ошибка при обработке вашего сообщения.");
                }

                offset = update.update_id + 1;
            }

            // Небольшая пауза между запросами
            await new Promise((resolve) => setTimeout(resolve, 1000));
        } catch (error) {
            console.error("❌ Критическая ошибка в основном фикле:", error);
            await new Promise((resolve) => setTimeout(resolve, 5000)); // Ждсм 5 секунд перед повтором
        }
    }
})();

// Express endpoint для проверки статусаapp.get("/", (req, res) => {
    res.json({
        status: "running",
        message: "🤖 Telegram бот работает!",
        timestamp: new Date().toISOString()
    });
});

app.get("/health", (req, res) => {
    res.json({
        status: "healthy",
        uptime: process.uptime(),
        memory: process.memoryUsage()
    });
});

app.listen(PORT, () => {
    console.log(`🎀 Сервер запущен на порту ${PORT}`);
});
