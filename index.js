const userContexts = {}; // ключ — chatId

const QUESTIONS = [
    { key: "destination", text: "Куда хочешь поехать? Можно просто страну или регион." },
    { key: "dates", text: "Когда примерно планируешь отпуск?" },
    { key: "travelers", text: "С кем путешествуешь — один, с друзьями, семьей?" },
    { key: "vacation_type", text: "Что предпочитаешь — пляж, экскурсии, активный отдых?" },
    { key: "budget", text: "Какой у тебя примерный бюджет на поездку?" }
];

function getNextQuestion(context) {
    for (const q of QUESTIONS) {
        if (!context[q.key]) return q;
    }
    return null;
}

function extractValue(key, text) {
    const low = text.toLowerCase();
    if (key === "destination") {
        if (/вьетнам|турция|тайланд|египет/.test(low)) return low;
    }
    if (key === "dates") {
        if (/июн|июл|авг|сент|окт/.test(low)) return text;
    }
    if (key === "travelers") {
        if (/один|одна|сам/.test(low)) return "1 взрослый";
        if (/вдвоем|вдвоём|жена|муж|пара/.test(low)) return "2 взрослых";
        if (/семь|ребен|дети/.test(low)) return "семья";
    }
    if (key === "budget") {
        const match = text.match(/\d{5,6}/);
        if (match) return match[0];
    }
    if (key === "vacation_type") {
        if (/пляж|море/.test(low)) return "пляжный";
        if (/экскурс|музей|город/.test(low)) return "экскурсионный";
        if (/гор|трекинг|приключ/.test(low)) return "активный";
    }
    return null;
}

async function handleUserMessage(chatId, text) {
    if (!userContexts[chatId]) userContexts[chatId] = {};
    const context = userContexts[chatId];

    const nextQuestion = getNextQuestion(context);

    if (nextQuestion) {
        const extracted = extractValue(nextQuestion.key, text);
        if (extracted) {
            context[nextQuestion.key] = extracted;
            const next = getNextQuestion(context);
            if (next) {
                await sendMessage(chatId, next.text);
            } else {
                await sendMessage(chatId, "Спасибо, всё записал. Сейчас посмотрим, что можно предложить... ⛱");
                const summary = Object.entries(context).map(([k, v]) => `${k}: ${v}`).join("\n");
                const aiResponse = await getAIResponse(`Вот параметры поездки:\n${summary}\nПредложи варианты и советы.`);
                await sendMessage(chatId, aiResponse);
            }
        } else {
            // Пользователь не дал точный ответ, просто задаем следующий вопрос
            await sendMessage(chatId, nextQuestion.text);
        }
    } else {
        // Повторный пользователь или всё уже собрано — отправим в ИИ напрямую
        const aiResponse = await getAIResponse(text);
        await sendMessage(chatId, aiResponse);
    }
}

// В основном цикле ЗАМЕНИ строку:
// const aiResponse = await getAIResponse(text);
// await sendMessage(chatId, aiResponse);

// НА:
await handleUserMessage(chatId, text);
