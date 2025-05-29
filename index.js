const express = require("express");
const app = express();
const PORT = process.env.PORT || 3000;

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const DEEPSEEK_API_KEY = "sk-2ecfef4eb45a493197c4091bebf21be2";
const TELEGRAM_API_URL = "https://api.telegram.org/bot" + TELEGRAM_BOT_TOKEN;

if (!TELEGRAM_BOT_TOKEN) {
    console.error("Ошибка: нет TELEGRAM_BOT_TOKEN");
    process.exit(1);
}

let lastUpdateId = 0;

app.use(express.json());

// Функция для вызова Deepseek AI
async function getAIResponse(userMessage, userName) {
    try {
        const fetch = require("node-fetch");
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
                        content: "Пользователь " + userName + " написал: \"" + userMessage + "\". Ответь ему как туристический бот."
                    }
                ],
                max_tokens: 200,
                temperature: 0.7
            })
        });
        
        const data = await response.json();
        
        if (data.choices && data.choices[0] && data.choices[0].message) {
            return data.choices[0].message.content.trim();
        }
        
        console.error("Неожиданный ответ от Deepseek:", data);
        return null;
        
    } catch (error) {
        console.error("Ошибка Deepseek AI:", error);
        return null;
    }
}

async function sendMessage(chatId, text, parseMode = "HTML") {
    const url = TELEGRAM_API_URL + "/sendMessage";
    const data = {
        chat_id: chatId,
        text: text,
        parse_mode: parseMode
    };

    try {
        const fetch = require("node-fetch");
        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data)
        });

        const result = await response.json();
        if (!result.ok) {
            console.error("Ошибка отправки:", result);
        }
        return result;
    } catch (error) {
        console.error("Ошибка сообщения:", error);
    }
}

async function handleStartCommand(chatId, firstName) {
    const welcomeMessage = "🤖 Привет, " + firstName + "!\n\nЯ умный туристический бот с AI и готов помочь вам спланировать идеальное путешествие!\n\n🎯 Что я умею:\n• Подбираю туры по любым странам\n• Даю персональные советы по путешествиям\n• Помогаю с планированием маршрутов\n• Отвечаю на вопросы о визах, погоде, достопримечательностях\n\n💬 Просто напишите мне куда хотите поехать или задайте любой вопрос о путешествиях!\n\nКоманды: /start /help";

    await sendMessage(chatId, welcomeMessage);
}

async function handleHelpCommand(chatId) {
    const helpMessage = "📚 Справка по боту\n\n🤖 Я использую искусственный интеллект для персональных ответов!\n\n💡 Примеры вопросов:\n• \"Хочу поехать в Японию весной\"\n• \"Посоветуй недорогой отдых на море\"\n• \"Какие документы нужны для Таиланда?\"\n• \"Лучшие места в Европе для романтической поездки\"\n\n✨ Чем детальнее ваш вопрос, тем точнее мой ответ!\n\nКоманды:\n/start - Главное меню\n/help - Эта справка";

    await sendMessage(chatId, helpMessage);
}

async function handleTextMessage(chatId, text, firstName) {
    // Показываем что думаем
    await sendMessage(chatId, "🤔 Думаю...");
    
    // Пытаемся получить ответ от AI
    const aiResponse = await getAIResponse(text, firstName);
    
    if (aiResponse) {
        // Отправляем AI ответ
        await sendMessage(chatId, "🧠 " + aiResponse);
    } else {
        // Fallback к простым ответам
        const textLower = text.toLowerCase();
        
        if (textLower.includes("vietnam") || textLower.includes("вьетнам") || textLower.includes("вьетнаме")) {
            await sendMessage(chatId, "🇻🇳 Вьетнам - отличный выбор!\n\n🏖️ Популярные направления:\n• Нячанг - красивые пляжи и дайвинг\n• Фукуок - тропический остров\n• Муйне - кайтсерфинг и песчаные дюны\n• Ханой - столица с богатой историей\n• Хошимин - современный мегаполис\n\n🌤️ Лучшее время: Ноябрь-Март\n💰 Бюджет: от 800$ на неделю\n\nЧто именно вас интересует во Вьетнаме?");
        } else {
            const responses = [
                "Привет, " + firstName + "! Расскажите подробнее о ваших планах путешествия - я помогу с выбором!",
                "Интересно! Какой тип отдыха вы предпочитаете? Пляжный, экскурсионный, активный?",
                "Получил ваш запрос! Уточните пожалуйста бюджет и предпочтения по климату.",
                firstName + ", я готов помочь! В какое время года планируете поездку?",
                "Отличный вопрос! Давайте подберем что-то идеальное для вас."
            ];

            const randomResponse = responses[Math.floor(Math.random() * responses.length)];
            await sendMessage(chatId, randomResponse);
        }
    }
}

async function processUpdate(update) {
    if (!update.message) return;

    const message = update.message;
    const chatId = message.chat.id;
    const text = message.text;
    const firstName = message.from.first_name || "Друг";

    console.log("Сообщение от " + firstName + " (ID: " + chatId + "): " + text);

    if (text && text.startsWith("/")) {
        const command = text.split(" ")[0].toLowerCase();

        switch (command) {
            case "/start":
                await handleStartCommand(chatId, firstName);
                break;
            case "/help":
                await handleHelpCommand(chatId);
                break;
            default:
                await sendMessage(chatId, "❓ Неизвестная команда: " + command + "\n\n📱 Используйте /help для списка команд или просто напишите ваш вопрос о путешествиях!");
        }
    } else if (text) {
        await handleTextMessage(chatId, text, firstName);
    }
}

async function getUpdates() {
    const url = TELEGRAM_API_URL + "/getUpdates?offset=" + (lastUpdateId + 1) + "&timeout=30";

    try {
        const fetch = require("node-fetch");
        const response = await fetch(url);
        const data = await response.json();

        if (data.ok && data.result.length > 0) {
            for (const update of data.result) {
                await processUpdate(update);
                lastUpdateId = update.update_id;
            }
        }
    } catch (error) {
        console.error("Ошибка обновления:", error);
    }
}

async function startPolling() {
    console.log("🤖 Туристический AI-бот запущен! Начинаем опрос...");
    console.log("✅ Deepseek AI подключен");

    while (true) {
        try {
            await getUpdates();
        } catch (error) {
            console.error("Ошибка основного цикла:", error);
            await new Promise(resolve => setTimeout(resolve, 5000));
        }

        await new Promise(resolve => setTimeout(resolve, 1000));
    }
}

app.get("/", (req, res) => {
    res.json({
        status: "ОК",
        message: "🤖 Туристический AI-бот работает!",
        deepseek_enabled: true,
        uptime: process.uptime()
    });
});

app.post("/webhook", async (req, res) => {
    const update = req.body;
    await processUpdate(update);
    res.sendStatus(200);
});

app.listen(PORT, () => {
    console.log("🚀 Сервер запущен на порту " + PORT);
    startPolling();
});
```
