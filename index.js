const express = require("express");
const app = express();
const PORT = process.env.PORT || 3000;

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_API_URL = "https://api.telegram.org/bot" + TELEGRAM_BOT_TOKEN;

if (!TELEGRAM_BOT_TOKEN) {
    console.error("Ошибка: нет TELEGRAM_BOT_TOKEN");
    process.exit(1);
}

let lastUpdateId = 0;

app.use(express.json());

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
    const welcomeMessage = "Привет, " + firstName + "!\n\nЯ ваш туристический бот и готов помочь вам!\n\nДоступные команды:\n/start - Показать это сообщение\n/help - Получить справку\n\nЧто я умею:\n- Найти туры по стране\n- Дать советы по путешествиям\n- Помочь с формированием поездки\n\nСкажите мне куда хотите поехать!";

    await sendMessage(chatId, welcomeMessage);
}

async function handleHelpCommand(chatId) {
    const helpMessage = "Справка по боту\n\nКоманды:\n/start - Запустить бота и показать приветствие\n/help - Показать эту справку\n\nСпособности:\n- Отвечаю на любые сообщения\n- Поддерживаю команды\n- Готов к расширению\n\nНапишите мне что-нибудь и я отвечу!";

    await sendMessage(chatId, helpMessage);
}

async function handleTextMessage(chatId, text, firstName) {
    const textLower = text.toLowerCase();

    if (textLower.includes("vietnam") || textLower.includes("вьетнам") || textLower.includes("вьетнаме")) {
        await sendMessage(chatId, "Вьетнам - отличный выбор!\n\nПопулярные туры по Вьетнаму:\n\n- Нячанг - красивые пляжи\n- Фукуок - тропический остров\n- Муйне - водный спорт\n\n- Ханой - столица, старый квартал\n- Хошимин - современный мегаполис\n\nЛучшее время: Ноябрь-Март\n\nЧто именно вас интересует во Вьетнаме?");
    } else {
        const responses = [
            "Привет, " + firstName + "! Вы написали: \"" + text + "\". Куда планируете путешествовать?",
            "Интересно! Расскажите больше о своих планах на путешествие!",
            "Получил ваше сообщение \"" + text + "\". Могу помочь с выбором тура!",
            "Спасибо за сообщение! Ищете информацию о стране?",
            "Понял! Куда бы хотели поехать отдыхать?"
        ];

        const randomResponse = responses[Math.floor(Math.random() * responses.length)];
        await sendMessage(chatId, randomResponse);
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
                await sendMessage(chatId, "Неизвестная команда: " + command + "\n\nИспользуйте /help для списка команд.");
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
    console.log("Бот запущен! Начинаем опрос...");

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
        message: "Туристический бот работает!", 
        uptime: process.uptime()
    });
});

app.post("/webhook", async (req, res) => {
    const update = req.body;
    await processUpdate(update);
    res.sendStatus(200);
});

app.listen(PORT, () => {
    console.log("Сервер запущен на порту " + PORT);
    startPolling();
});
