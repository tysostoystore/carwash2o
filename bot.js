// Telegram bot MVP for H2O Car Wash
// Greets user and shows WebApp button
const TelegramBot = require('node-telegram-bot-api');

const TOKEN = '7964941663:AAFLKeuq8Ht24kOHZrteM6MwIrz4FpWVuns';
const WEBAPP_URL = 'https://carwash2o.pages.dev/'; // TODO: set actual deployed URL

const bot = new TelegramBot(TOKEN, { polling: true });

console.log('Bot started, polling...');

bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  console.log(`/start from chat ${chatId}`);
  bot.sendMessage(chatId, 
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
});

// TEMP: Log chat_id and message_thread_id for group topics
bot.on('message', (msg) => {
  console.log('chat_id:', msg.chat?.id, 'thread_id:', msg.message_thread_id, 'text:', msg.text);
  if (!msg.text.startsWith('/start')) {
    bot.sendMessage(msg.chat.id, 'Чтобы начать, нажмите /start или используйте кнопку ниже!');
  }
});
