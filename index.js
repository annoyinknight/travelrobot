const express = require(\"express\");
const app = express();
const PORT = process.env.PORT || 3000;

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGP¡M_API_URL = \"https://api.telegram.org/bot\" + TELEGRAM_BOT_TOKEN;

if (!TELEGRAM_BOT_TOKEN) {
    console.error(\"Error: no TELEGRAM_BOT_TOKEN\");
    process.exit(1);
}

let lastUpdateId = 0;

app.use(express.json());

async function sendMessage(chatId, text, parseMode = \"HTML\") {
    const url = TELEGP¡M_API_URL + \"/sendMessage\";
    const data = {
        chat_id: chatId,
        text: text,
        parse_mode: parseMode
    };

    try {
        const fetch = require(\"node-fetch\");
        const response = await fetch(url, {
            method: \"POST\",
            headers: { \"Content-Type\": \"application/json\" },
            body: JSON.stringify(data)
        });

        const result = await response.json();
        if (!result.ok) {
            console.error(\"Send error:\", result);
        }
        return result;
    } catch (error) {
        console.error(\"Message error:\", error);
    }
}

async function handleStartCommand(chatId, firstName) {
    const welcomeMessage = \"Robot Welcome, \" + firstName + \"!\\n\\nI am your travel bot and ready to help you!\\n\\nAvailable commands:\\n/start - Show this message\\n/help - Get help\\n\\nWhat I can do:\\n- Find tours by country\\n- Give travel advice\\n- Help with trip planning\\n\\nTell me where you want to go!\";

    await sendMessage(chatId, welcomeMessage);
}

async function handleHelpCommand(chatId) {
    const helpMessage = \"Bot Help\\n\\nCommands:\\n/start - Start bot and show welcome\\n/help - Show this help\\n\\nCapabilities:\\n- Respond to any text messages\\n- Support commands\\n- Ready for expansion\\n\\nSend me anything and I'll respond!\";

    await sendMessage(chatId, helpMessage);
}

async function handleTextMessage(chatId, text, firstName) {
    const textLower = text.toLowerCase();

    if (textLower.includes(\"vietnam\")) {
        await sendMessage(chatId, \"Vietnam - great choice!\\n\\nPopular Vietnam tours:\\n\\n- Nyachang - beautiful beaches\\n- Fuquoc - tropical island\\n- Muine - water sports\\n\\n- Hanoi - capital, old quarter\\n- Hoshimin - modern megacity\\n\\nBest time: November-March\\n\\nWhat specifically interests you about Vietnam?\");
    } else {
        const responses = [
            \"Hello, \" + firstName + \"! You wrote: \\\"\" + text + \"\\\". Where are you planning to travel?\",
            \"Interesting! Tell me more about your travel plans!\",
            \"Got your message \\\"\" + text + \"\\\". Can help with tour selection!\",
            \"Thanks for the message! Looking for information about a country?\",
            \"Got it! Where would you like to go for vacation?\"
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
    const firstName = message.from.first_name || \"Friend\";

    console.log(\"Message from \" + firstName + \" (ID: \" + chatId + \"): \" + text);

    if (text && text.startsWith(\"/\")) {
        const command = text.split(\" \")[0].toLowerCase();

        switch (command) {
            case \"/start\":
                await handleStartCommand(chatId, firstName);
                break;
            case \"/help\":
                await handleHelpCommand(chatId);
                break;
            default:
                await sendMessage(chatId, \"Unknown command: \" + command + \"\\n\\nUse /help for command list.\");
        }
    } else if (text) {
        await handleTextMessage(chatId, text, firstName);
    }
}

async function getUpdates() {
    const url = TELEGRAM_API_URL + \"/getUpdates?offset=\" + (lastUpdateId + 1) + \"&timeout=30\";

    try {
        const fetch = require(\"node-fetch\");
        const response = await fetch(url);
        const data = await response.json();

        if (data.ok && data.result.length > 0) {
            for (const update of data.result) {
                await processUpdate(update);
                lastUpdateId = update.update_id;
            }
        }
    } catch (error) {
        console.error(\"Update error:\", error);
    }
}

async function startPolling() {
    console.log(\"Bot started! Starting polling...\");

    while (true) {
        try {
            await getUpdates();
        } catch (error) {
            console.error(\"Main loop error:\", error);
            await new Promise(resolve => setTimeout(resolve, 5000));
        }

        await new Promise(resolve => setTimeout(resolve, 1000));
    }
}

app.get(\"/\", (req, res) => {
    res.json({
        status: \"OK\",
        message: \"Travel Bot is running!\", 
        uptime: process.uptime()
    });
});

app.post(\"/webhook\", async (req, res) => {
    const update = req.body;
    await processUpdate(update);
    res.sendStatus(200);
});

app.listen(PORT, () => {
    console.log(\"Server started on port \" + PORT);
    startPolling();
});
