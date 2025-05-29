```javascript
const express = require('express');
const axios = require('axios');
const app = express();

// Environment variables
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const ALLOWED_USER_IDS = process.env.ALLOWED_USER_IDS?.split(',').map(id => parseInt(id)) || [];
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Rate limiting storage
const rateLimits = new Map();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 10;

// Helper functions
function isRateLimited(userId) {
  const now = Date.now();
  const userRequests = rateLimits.get(userId) || [];
  const validRequests = userRequests.filter(time => now - time < RATE_LIMIT_WINDOW);
  
  if (validRequests.length >= RATE_LIMIT_MAX_REQUESTS) {
    return true;
  }
  
  validRequests.push(now);
  rateLimits.set(userId, validRequests);
  return false;
}

function isUserAllowed(userId) {
  if (ALLOWED_USER_IDS.length === 0) {
    return false; // Secure by default
  }
  return ALLOWED_USER_IDS.includes(userId);
}

// Send message to Telegram
async function sendTelegramMessage(chatId, text) {
  try {
    const url = 'https://api.telegram.org/bot' + TELEGRAM_BOT_TOKEN + '/sendMessage';
    const response = await axios.post(url, {
      chat_id: chatId,
      text: text,
      parse_mode: 'Markdown'
    });
    return response.data;
  } catch (error) {
    console.error('Error sending Telegram message:', error.response?.data || error.message);
    throw error;
  }
}

// Get AI response from Deepseek
async function getDeepseekResponse(message, isCommand = false) {
  try {
    let systemPrompt = 'Ты — персональный тревел-ассистент в Telegram. Отвечай на русском языке, будь дружелюбным и полезным. Помогай с планированием путешествий, турами, визами, погодой и всем, что связано с поездками.';
    
    if (isCommand) {
      systemPrompt += ' Пользователь использует команду бота, отвечай соответственно.';
    }

    const response = await axios.post('https://api.deepseek.com/v1/chat/completions', {
      model: 'deepseek-chat',
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: message
        }
      ],
      max_tokens: 300,
      temperature: 0.7
    }, {
      headers: {
        'Authorization': 'Bearer ' + DEEPSEEK_API_KEY,
        'Content-Type': 'application/json'
      }
    });

    return response.data.choices[0].message.content;
  } catch (error) {
    console.error('Deepseek API error:', error.response?.data || error.message);
    
    if (error.response?.status === 429) {
      return 'Извините, сейчас высокая нагрузка. Попробуйте через минуту.';
    } else if (error.response?.status === 401) {
      return 'Ошибка авторизации. Обратитесь к администратору.';
    }
    
    return 'Извините, возникла техническая проблема. Попробуйте позже.';
  }
}

// Main webhook endpoint
app.post('/webhook', async (req, res) => {
  try {
    const update = req.body;
    
    // Only process text messages
    if (!update.message || !update.message.text) {
      return res.status(200).json({ ok: true });
    }

    const message = update.message;
    const userId = message.from.id;
    const chatId = message.chat.id;
    const text = message.text;

    console.log('Message from', userId, '(' + message.from.first_name + '):', text);

    // Check if user is allowed
    if (!isUserAllowed(userId)) {
      await sendTelegramMessage(chatId, 
        'Извините, у вас нет доступа к этому боту. 🚫\n\n' +
        'Обратитесь к администратору, если считаете, что это ошибка.'
      );
      return res.status(200).json({ ok: true });
    }

    // Check rate limiting
    if (isRateLimited(userId)) {
      await sendTelegramMessage(chatId, 
        'Вы отправляете сообщения слишком быстро. Подождите немного. ⏰'
      );
      return res.status(200).json({ ok: true });
    }

    // Handle /start command
    if (text.startsWith('/start')) {
      const welcomeMessage = 'Привет! 👋 Я — твой личный тревел-ассистент в Telegram.\nВот что я умею:\n\n✈️ Помогаю подобрать лучшие туры по твоим пожеланиям\n📅 Напоминаю о важных вещах перед поездкой — от документов до багажа\n📝 Создаю персональные чек-листы и сохраняю заметки\n🌍 Рассказываю про визы, погоду и курсы валют в нужной стране\n🎯 Помогаю организовать весь процесс путешествия — от выбора до возвращения домой\n\nНапиши, куда хочешь поехать, или задай вопрос — я помогу сделать твой отпуск проще и приятнее!';
      
      await sendTelegramMessage(chatId, welcomeMessage);
      return res.status(200).json({ ok: true });
    }

    // Handle other commands
    let commandPrompt = '';
    let isCommandRequest = false;

    if (text.startsWith('/help')) {
      commandPrompt = 'Пользователь просит помощь с командами бота. Расскажи о всех доступных командах и возможностях тревел-ассистента.';
      isCommandRequest = true;
    } else if (text.startsWith('/tours')) {
      commandPrompt = 'Пользователь хочет подобрать туры. Спроси у него предпочтения: бюджет, направление, тип отдыха, количество людей.';
      isCommandRequest = true;
    } else if (text.startsWith('/checklist')) {
      commandPrompt = 'Пользователь хочет создать чек-лист для поездки. Спроси направление и тип поездки, чтобы создать персональный список.';
      isCommandRequest = true;
    } else if (text.startsWith('/visa')) {
      commandPrompt = 'Пользователь спрашивает о визах. Спроси в какую страну он планирует поехать и из какой страны.';
      isCommandRequest = true;
    } else if (text.startsWith('/weather')) {
      commandPrompt = 'Пользователь хочет узнать погоду. Спроси в каком городе или стране его интересует погода.';
      isCommandRequest = true;
    }

    // Get AI response
    const aiResponse = await getDeepseekResponse(commandPrompt || text, isCommandRequest);
    await sendTelegramMessage(chatId, aiResponse);

    res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    model: 'deepseek-chat'
  });
});

// Set webhook endpoint
app.post('/set-webhook', async (req, res) => {
  const webhookUrl = req.body.webhook_url;
  
  if (!webhookUrl) {
    return res.status(400).json({ error: 'webhook_url is required' });
  }

  try {
    const url = 'https://api.telegram.org/bot' + TELEGRAM_BOT_TOKEN + '/setWebhook';
    const response = await axios.post(url, {
      url: webhookUrl
    });
    
    res.json(response.data);
  } catch (error) {
    console.error('Error setting webhook:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to set webhook' });
  }
});

// Remove webhook endpoint
app.post('/remove-webhook', async (req, res) => {
  try {
    const url = 'https://api.telegram.org/bot' + TELEGRAM_BOT_TOKEN + '/deleteWebhook';
    const response = await axios.post(url);
    res.json(response.data);
  } catch (error) {
    console.error('Error removing webhook:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to remove webhook' });
  }
});

app.listen(PORT, () => {
  console.log('Telegram travel bot running on port', PORT);
  console.log('Allowed users:', ALLOWED_USER_IDS.join(', ') || 'None - access denied to all');
});
```
