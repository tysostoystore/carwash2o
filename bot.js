// Telegram bot MVP for H2O Car Wash
// Greets user and shows WebApp button
const TelegramBot = require('node-telegram-bot-api');

const TOKEN = '7964941663:AAFLKeuq8Ht24kOHZrteM6MwIrz4FpWVuns';
const WEBAPP_URL = 'https://tg-carwash2o-frontend-url'; // TODO: set actual deployed URL

const bot = new TelegramBot(TOKEN, { polling: true });

bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
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

// Optionally handle other commands or messages
bot.on('message', (msg) => {
  if (!msg.text.startsWith('/start')) {
    bot.sendMessage(msg.chat.id, 'Чтобы начать, нажмите /start или используйте кнопку ниже!');
  }
});
