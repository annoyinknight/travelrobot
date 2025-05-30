// start.js - запуститель бота
require('dotenv').config(); // Загружаем переменные окружения

if (process.env.NODE_ENV !== 'production') {
    console.log('Проверка загрузки переменных окружений:');
    console.log('TELEGRAM_BOT_TOKEN:', process.env.TELEGRAM_BOT_TOKEN ? '‚‚‚истует' : 'NOT SET');
    console.log('DEEPSEEK_API_KEY:', process.env.DEEPSEEK_API_KEY ? '‚•‚истует' : 'NOT SET');
}

// Запускаем основной код бота
require('./index.js');