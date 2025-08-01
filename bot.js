// Telegram bot MVP for H2O Car Wash
// Greets user and shows WebApp button
const TelegramBot = require('node-telegram-bot-api');

const { TG_TOKEN, WEBAPP_URL } = require('./config.js');

const TOKEN = TG_TOKEN || 'REPLACE_ME'; // fallback for dev

const bot = new TelegramBot(TOKEN, { polling: true });

console.log('Bot started, polling...');

// Логируем ошибки polling
bot.on('polling_error', (err) => {
  console.error('Polling error:', err);
});

// Логируем любые необработанные ошибки
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception in bot.js:', err);
  process.exit(1);
});
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection in bot.js:', err);
  process.exit(1);
});

// Логируем завершение процесса
process.on('exit', (code) => {
  console.log('bot.js process exited with code', code);
});

bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  console.log(`/start from chat ${chatId}`);
  try {
    await bot.sendMessage(chatId, 
      '👋 Добро пожаловать в H2O Автомойку!\n\n' +
      'Этот бот поможет вам быстро и удобно записаться на мойку через Telegram.\n' +
      'Нажмите кнопку ниже, чтобы открыть фирменное приложение и выбрать услугу.',
      {
        reply_markup: {
          inline_keyboard: [[
            { text: '🚗 Открыть WebApp', web_app: { url: WEBAPP_URL } }
          ]]
        }
      }
    );
    // Авто-открытие WebApp: отправляем ссылку, если Telegram не поддерживает web_app-кнопки
    await bot.sendMessage(chatId, `Если кнопка не сработала, просто перейдите по ссылке: ${WEBAPP_URL}`);
  } catch (err) {
    console.error('[TG] sendMessage error in /start:', err && err.response && err.response.body ? err.response.body : err);
  }
});

// TEMP: Log chat_id and message_thread_id for group topics
// Отключаем автоответ на каждое сообщение без /start (чтобы не было спама)
bot.on('message', (msg) => {
  console.log('chat_id:', msg.chat?.id, 'thread_id:', msg.message_thread_id, 'text:', msg.text);
  // Можно добавить кастомную логику, если нужно, но автоответ убран для предотвращения спама
});
