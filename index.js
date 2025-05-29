const express = require("express");
const app = express();
const PORT = process.env.PORT || 3000;

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const DEEPSEEK_API_KEY = "sk-2ecfef4eb45a493197c4091bebf21be2";

if (!TELEGRAM_BOT_TOKEN) {
    console.error("❌ Ошибка: TELEGRAM_BOT_TOKEN не задан");
    process.exit(1);
}

const TELEGRAM_API_URL = "https://api.telegram.org/bot" + TELEGRAM_BOT_TOKEN;

app.use(express.json());

/**
 * Запрос к Deepseek AI
 */
async function getAIResponse(userMessage, userName) {
    try {
        const response = await fetch("https://api.deepseek.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + DEEPSEEK_API_KEY
            },
            body: JSON.stringify({
                model: "deepseek-chat",
                messages: [
                    {
                        role: "system",
                        content: "Ты туристический бот-помощник. Отвечай на русском языке дружелюбно и информативно. Помогай с выбором туров, планированием поездок и даёшь советы по путешествиям. Если пользователь спрашивает про конкретную страну, дай полезную информацию. Отвечай кратко но содержательно."
                    },
                    {
                        role: "user",
                        content: `Пользователь ${userName} написал: "${userMessage}". Ответь ему как туристический бот.`
                    }
                ],
                max_tokens: 200,
                temperature: 0.7
            })
        });

        const data = await response.json();

        return data?.choices?.[0]?.message?.content?.trim() || null;
    } catch (error) {
        console.error("❌ Ошибка Deepseek AI:", error);
        return null;
    }
}

/**
 * Отправка сообщения в Telegram
 */
async function sendMessage(chatId, text, parseMode = "HTML") {
    const url = `${TELEGRAM_API_URL}/sendMessage`;

    const data = {
        chat_id: chatId,
        text: text.slice(0, 4000), // безопасность
        parse_mode: parseMode
    };

    try {
        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data)
        });

        const result = await response.json();
        if (!result.ok) {
            console.error("❌ Ошибка отправки в Telegram:", result);
        }

        return result;
    } catch (error) {
        console.error("❌ Ошибка отправки сообщения:", error);
    }
}

/**
 * Команда /start
 */
async function handleStartCommand(chatId, firstName) {
    const welcomeMessage = `🤖 Привет, ${firstName}!

Я умный туристический бот с AI и готов помочь вам спланировать идеальное путешествие!

🎯 Что я умею:
• Подбираю туры по странам
• Даю советы по отдыху
• Помогаю с маршрутом
• Рассказываю о визах, погоде и достопримечательностях

💬 Просто напиши, куда хочешь поехать, или задай вопрос!

Команды: /start /help`;
    await sendMessage(chatId, welcomeMessage);
}

/**
 * Команда /help
 */
async function handleHelpCommand(chatId) {
    const helpMessage = `📚 Справка

Примеры вопросов:
• "Хочу в Японию весной"
• "Посоветуй недорогой отдых на море"
• "Какие документы нужны для Таиланда?"
• "Лучшие места в Европе для пары"

Чем детальнее вопрос — тем точнее ответ.

Команды:
/start — Главное меню
/help — Эта справка`;

    await sendMessage(chatId, helpMessage);
}

/**
 * Обработка обычного текста
 */
async function handleTextMessage(chatId, text, firstName) {
    await sendMessage(chatId, "🤔 Думаю...");

    try {
        const aiResponse = await getAIResponse(text, firstName);

        if (aiResponse) {
            await sendMessage(chatId, "🧠 " + aiResponse);
        } else {
            const textLower = text.toLowerCase();

            if (textLower.includes("вьетнам")) {
                await sendMessage(chatId, `🇻🇳 Вьетнам — отличный выбор!

🏖️ Популярные направления:
• Нячанг — пляжи и дайвинг
• Фукуок — остров и природа
• Муйне — дюны и кайтсерфинг
• Ханой — история и культура
• Хошимин — мегаполис и еда

🌤️ Сезон: ноябрь–март
💰 Бюджет: от $800 на неделю

Что именно интересует?`);
            } else {
                const fallbackReplies = [
                    `Привет, ${firstName}! Расскажите подробнее — я помогу!`,
                    "Интересно! Какой отдых вы хотите — пляж, экскурсии, приключения?",
                    "Уточните бюджет и климат — и я предложу лучшие идеи!",
                    `${firstName}, когда планируете поездку? Подберу вариант!`,
                    "Хороший запрос! Сейчас найдем вам классное направление!"
                ];
                const randomResponse = fallbackReplies[Math.floor(Math.random() * fallbackReplies.length)];
                await sendMessage(chatId, randomResponse);
            }
        }
    } catch (e) {
        console.error("❌ Ошибка при ответе:", e);
        await sendMessage(chatId, "😓 Произошла ошибка при обработке запроса. Попробуйте ещё раз.");
    }
}

/**
 * Обработка обновления от Telegram
 */
async function processUpdate(update) {
    if (!update.message) return;

    const message = update.message;
    const chatId = message.chat.id;
    const text = message.text;
    const firstName = message.from?.first_name || "Друг";

    console.log(`📩 Сообщение от ${firstName} (${chatId}): ${text}`);

    if (text?.startsWith("/")) {
        const command = text.split(" ")[0].toLowerCase();

        switch (command) {
            case "/start":
                await handleStartCommand(chatId, firstName);
                break;
            case "/help":
                await handleHelpCommand(chatId);
                break;
            default:
                await sendMessage(chatId, `❓ Неизвестная команда: ${command}\n\n📱 Используйте /help или задайте вопрос.`);
        }
    } else {
        await handleTextMessage(chatId, text, firstName);
    }
}

/**
 * Webhook endpoint
 */
app.post("/webhook", async (req, res) => {
    console.log("📥 Webhook получен:", JSON.stringify(req.body, null, 2));
    await processUpdate(req.body);
    res.sendStatus(200);
});

/**
 * Проверка статуса
 */
app.get("/", (req, res) => {
    res.json({
        status: "✅ OK",
        message: "🤖 Туристический AI-бот работает",
        uptime: process.uptime()
    });
});

/**
 * Запуск сервера
 */
app.listen(PORT, () => {
    console.log(`🚀 Сервер запущен на порту ${PORT}`);
    console.log("📡 Webhook endpoint: /webhook");
});
