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

// Функция для вызова Deepseek AI с улучшенной обработкой ошибок
async function getAIResponse(userMessage, userName) {
    if (!DEEPSEEK_API_KEY || DEEPSEEK_API_KEY.length < 10) {
        console.log("⚠️ API ключ отсутствует или некорректный");
        return null;
    }
    
    console.log("🔍 Обращаемся к Deepseek AI для пользователя:", userName);
    console.log("📝 Сообщение:", userMessage.substring(0, 100) + "...");
    
    try {
        const fetch = require("node-fetch");
        
        // Улучшенный системный промпт
        const systemPrompt = `Ты дружелюбный туристический бот-консультант. Твоя задача:
1. Отвечать ТОЛЬКО на русском языке
2. Быть полезным и информативным
3. Давать конкретные советы по путешествиям
4. Если не знаешь точной информации, честно говори об этом
5. Отвечай кратко но содержательно (максимум 3-4 предложения)
6. Используй дружелюбный тон`;

        const userPrompt = `Меня зовут ${userName}. Я написал: "${userMessage}". Помоги мне как туристический консультант.`;
        
        const requestBody = {
            model: "deepseek-chat",
            messages: [
                {
                    role: "system",
                    content: systemPrompt
                },
                {
                    role: "user", 
                    content: userPrompt
                }
            ],
            max_tokens: 150,
            temperature: 0.7,
            top_p: 1,
            stream: false
        };
        
        console.log("📤 Отправляем запрос в Deepseek API...");
        
        const response = await fetch("https://api.deepseek.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + DEEPSEEK_API_KEY,
                "User-Agent": "TravelBot/1.0"
            },
            body: JSON.stringify(requestBody),
            timeout: 15000 // 15 секунд таймаут
        });
        
        console.log("📥 Статус ответа:", response.status, response.statusText);
        
        // Детальная обработка HTTP ошибок
        if (!response.ok) {
            const errorText = await response.text();
            console.error("❌ HTTP ошибка:", response.status);
            console.error("❌ Текст ошибки:", errorText);
            
            if (response.status === 401) {
                console.error("🔑 Ошибка авторизации - проверьте API ключ");
            } else if (response.status === 429) {
                console.error("⏳ Превышен лимит запросов");
            } else if (response.status >= 500) {
                console.error("🔧 Ошибка сервера Deepseek");
            }
            
            return null;
        }
        
        const data = await response.json();
        console.log("📊 Получен ответ от Deepseek");
        
        // Проверяем структуру ответа
        if (data && data.choices && Array.isArray(data.choices) && data.choices.length > 0) {
            const choice = data.choices[0];
            if (choice.message && choice.message.content) {
                const aiResponse = choice.message.content.trim();
                console.log("✅ AI ответ успешно получен, длина:", aiResponse.length);
                console.log("💬 Ответ:", aiResponse.substring(0, 100) + "...");
                return aiResponse;
            }
        }
        
        console.error("❌ Неожиданная структура ответа:", JSON.stringify(data, null, 2));
        return null;
        
    } catch (error) {
        if (error.name === 'AbortError') {
            console.error("⏱️ Таймаут запроса к Deepseek API");
        } else if (error.code === 'ENOTFOUND') {
            console.error("🌐 Проблемы с сетевым подключением");
        } else {
            console.error("❌ Ошибка при обращении к Deepseek:", error.message);
        }
        return null;
    }
}

// Улучшенная функция отправки сообщений
async function sendMessage(chatId, text, parseMode = "Markdown") {
    const url = TELEGRAM_API_URL + "/sendMessage";
    
    // Ограничиваем длину сообщения для Telegram
    const maxLength = 4096;
    const truncatedText = text.length > maxLength ? text.substring(0, maxLength - 3) + "..." : text;
    
    const data = {
        chat_id: chatId,
        text: truncatedText,
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
            console.error("❌ Ошибка отправки в Telegram:", result);
            // Попробуем без parse_mode если была ошибка парсинга
            if (result.error_code === 400 && parseMode) {
                return await sendMessage(chatId, text, null);
            }
        }
        return result;
    } catch (error) {
        console.error("❌ Ошибка отправки сообщения:", error);
    }
}

async function handleStartCommand(chatId, firstName) {
    const welcomeMessage = `🤖 *Привет, ${firstName}!*

Я умный туристический бот с искусственным интеллектом и готов помочь вам спланировать идеальное путешествие!

🎯 *Что я умею:*
• Подбираю туры по любым странам
• Даю персональные советы по путешествиям  
• Помогаю с планированием маршрутов
• Отвечаю на вопросы о визах, погоде, достопримечательностях
• Рекомендую отели, рестораны и развлечения

💬 *Просто напишите мне:*
- Куда хотите поехать
- Какой у вас бюджет
- Предпочтения по отдыху
- Любые вопросы о путешествиях

*Команды:* /start | /help`;

    await sendMessage(chatId, welcomeMessage);
}

async function handleHelpCommand(chatId) {
    const helpMessage = `📚 *Справка по боту*

🧠 Я использую *Deepseek AI* для персональных ответов!

💡 *Примеры вопросов:*
• "Хочу поехать в Японию весной на 2 недели"
• "Посоветуй недорогой отдых на море до 1000$"
• "Какие документы нужны для Таиланда?"
• "Лучшие места в Европе для романтической поездки"
• "Где лучше всего встретить Новый год?"

✨ *Совет:* Чем детальнее ваш вопрос (бюджет, даты, предпочтения), тем точнее мой ответ!

*Команды:*
/start - Главное меню
/help - Эта справка

🚀 *Готов помочь с планированием путешествия!*`;

    await sendMessage(chatId, helpMessage);
}

async function handleTextMessage(chatId, text, firstName) {
    console.log(`📝 Обрабатываем сообщение от ${firstName}: "${text}"`);
    
    // Показываем индикатор обработки
    const thinkingMessage = await sendMessage(chatId, "🤔 *Думаю над вашим вопросом...*");
    
    // Получаем ответ от AI
    const aiResponse = await getAIResponse(text, firstName);
    
    if (aiResponse) {
        console.log("✅ Отправляем AI ответ пользователю");
        await sendMessage(chatId, `🧠 ${aiResponse}`);
    } else {
        console.log("⚠️ AI недоступен, используем резервные ответы");
        
        // Улучшенные fallback ответы
        const textLower = text.toLowerCase();
        
        if (textLower.includes("vietnam") || textLower.includes("вьетнам")) {
            await sendMessage(chatId, `🇻🇳 *Вьетнам - отличный выбор!*

🏖️ *Популярные направления:*
• *Нячанг* - красивые пляжи, дайвинг
• *Фукуок* - тропический остров, релакс
• *Муйне* - кайтсерфинг, песчаные дюны
• *Ханой* - столица, культура, история
• *Хошимин* - мегаполис, шопинг, еда

🌤️ *Лучшее время:* Ноябрь-Март
💰 *Примерный бюджет:* от 800$ на неделю
📋 *Виза:* не нужна до 15 дней

Что именно вас интересует во Вьетнаме?`);
        } else if (textLower.includes("таиланд") || textLower.includes("thailand")) {
            await sendMessage(chatId, `🇹🇭 *Таиланд - классика пляжного отдыха!*

🏝️ *Популярные острова:*
• *Пхукет* - развитая инфраструктура
• *Самуи* - уютные пляжи
• *Краби* - живописная природа

🏙️ *Города:*
• *Бангкок* - столица, храмы, шопинг
• *Паттайя* - активная ночная жизнь

💰 *Бюджет:* от 600$ на неделю
📋 *Виза:* не нужна до 30 дней`);
        } else {
            // Интеллектуальные fallback ответы
            const smartResponses = [
                `Привет, ${firstName}! 🌍 Расскажите подробнее о ваших планах - в какую страну думаете поехать, какой бюджет и на сколько дней?`,
                `Интересно! 🤔 Чтобы дать точные рекомендации, уточните: предпочитаете пляжный отдых, экскурсии или активные развлечения?`,
                `${firstName}, отличный вопрос! 📅 В какое время года планируете поездку? Это поможет выбрать лучшее направление.`,
                `Готов помочь с планированием! 💼 Какой примерно бюджет рассматриваете и сколько человек поедет?`,
                `Понял ваш запрос! 🎯 Для персональных рекомендаций расскажите о предпочтениях: море/горы, спокойный отдых/активный?`
            ];

            const randomResponse = smartResponses[Math.floor(Math.random() * smartResponses.length)];
            await sendMessage(chatId, randomResponse);
        }
    }
}

async function processUpdate(update) {
    if (!update.message || !update.message.text) return;

    const message = update.message;
    const chatId = message.chat.id;
    const text = message.text.trim();
    const firstName = message.from.first_name || "Друг";

    console.log(`📨 [${new Date().toLocaleTimeString()}] ${firstName} (${chatId}): ${text}`);

    if (text.startsWith("/")) {
        const command = text.split(" ")[0].toLowerCase();

        switch (command) {
            case "/start":
                await handleStartCommand(chatId, firstName);
                break;
            case "/help":
                await handleHelpCommand(chatId);
                break;
            default:
                await sendMessage(chatId, `❓ *Неизвестная команда:* ${command}

📱 Используйте /help для списка команд или просто напишите ваш вопрос о путешествиях!

💡 *Например:* "Хочу поехать в Италию на 10 дней"`);
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
        console.error("❌ Ошибка получения обновлений:", error.message);
    }
}

async function startPolling() {
    console.log("🚀 Туристический AI-бот запущен!");
    console.log("✅ Deepseek AI интеграция активна");
    console.log("🔑 API ключ:", DEEPSEEK_API_KEY ? DEEPSEEK_API_KEY.substring(0, 10) + "..." : "ОТСУТСТВУЕТ");
    console.log("📅 Время запуска:", new Date().toLocaleString());
    console.log("🎯 Начинаем прослушивание сообщений...\n");

    while (true) {
        try {
            await getUpdates();
        } catch (error) {
            console.error("❌ Ошибка основного цикла:", error.message);
            console.log("⏳ Перезапуск через 5 секунд...");
            await new Promise(resolve => setTimeout(resolve, 5000));
        }

        await new Promise(resolve => setTimeout(resolve, 1000));
    }
}

// Улучшенный API endpoint для статуса
app.get("/", (req, res) => {
    const status = {
        status: "🟢 РАБОТАЕТ",
        message: "🤖 Туристический AI-бот активен",
        deepseek_ai: DEEPSEEK_API_KEY ? "🟢 Подключен" : "🔴 Отключен",
        uptime_seconds: Math.floor(process.uptime()),
        uptime_formatted: new Date(process.uptime() * 1000).toISOString().substr(11, 8),
        memory_usage: process.memoryUsage(),
        timestamp: new Date().toISOString(),
        version: "2.0.0"
    };
    
    res.json(status);
});

app.post("/webhook", async (req, res) => {
    try {
        const update = req.body;
        await processUpdate(update);
        res.sendStatus(200);
    } catch (error) {
        console.error("❌ Ошибка webhook:", error);
        res.sendStatus(500);
    }
});

// Обработка ошибок приложения
process.on('uncaughtException', (error) => {
    console.error('❌ Критическая ошибка:', error);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Необработанное отклонение промиса:', reason);
});

app.listen(PORT, () => {
    console.log(`🌐 HTTP сервер запущен на порту ${PORT}`);
    startPolling();
});
```
