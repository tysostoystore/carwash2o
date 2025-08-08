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
  // process.exit(1); // Не валим процесс на любой ошибке Telegram API!
});

// Логируем завершение процесса
process.on('exit', (code) => {
  console.log('bot.js process exited with code', code);
});

// --- Логируем все входящие сообщения для отладки рассылки ---
bot.on('message', async (msg) => {
  console.log('[INCOMING MESSAGE]', {
    chat_id: msg.chat && msg.chat.id,
    message_thread_id: msg.message_thread_id,
    from_id: msg.from && msg.from.id,
    from_username: msg.from && msg.from.username,
    text: msg.text,
    date: msg.date
  });

  // --- Рассылка только себе из ветки "Рассылка" ---
  const ADMIN_THREAD_ID = 82;
  const ADMIN_GROUP_ID = -1002856721715;
  const TEST_USER_IDS = [411100616];
  if (
    msg.chat && msg.chat.id === ADMIN_GROUP_ID &&
    msg.message_thread_id === ADMIN_THREAD_ID
  ) {
    for (const userId of TEST_USER_IDS) {
      try {
        // --- Альбомы (media group) ---
        if (msg.media_group_id) {
          // Сохраняем альбомы в память (in-memory, на время)
          if (!global._mediaGroups) global._mediaGroups = {};
          if (!global._mediaGroups[msg.media_group_id]) global._mediaGroups[msg.media_group_id] = [];
          global._mediaGroups[msg.media_group_id].push(msg);
          // Ждём ~500мс, потом отправляем альбом
          setTimeout(async () => {
            const group = global._mediaGroups[msg.media_group_id];
            if (group && group.length) {
              // Формируем массив для sendMediaGroup
              const media = group.map(m => {
                if (m.photo && m.photo.length) {
                  return {
                    type: 'photo',
                    media: m.photo[m.photo.length - 1].file_id,
                    caption: m.caption || m.text || undefined,
                    parse_mode: 'HTML'
                  };
                } else if (m.video) {
                  return {
                    type: 'video',
                    media: m.video.file_id,
                    caption: m.caption || m.text || undefined,
                    parse_mode: 'HTML'
                  };
                } else if (m.document) {
                  return {
                    type: 'document',
                    media: m.document.file_id,
                    caption: m.caption || m.text || undefined,
                    parse_mode: 'HTML'
                  };
                }
                return null;
              }).filter(Boolean);
              if (media.length) {
                await bot.sendMediaGroup(userId, media);
              }
              delete global._mediaGroups[msg.media_group_id];
            }
          }, 600);
        } else if (msg.photo && msg.photo.length) {
          // Фото с подписью
          const photo = msg.photo[msg.photo.length - 1].file_id;
          await bot.sendPhoto(userId, photo, { caption: msg.caption || msg.text || '', parse_mode: 'HTML' });
        } else if (msg.document) {
          await bot.sendDocument(userId, msg.document.file_id, { caption: msg.caption || msg.text || '', parse_mode: 'HTML' });
        } else if (msg.video) {
          await bot.sendVideo(userId, msg.video.file_id, { caption: msg.caption || msg.text || '', parse_mode: 'HTML' });
        } else if (msg.audio) {
          await bot.sendAudio(userId, msg.audio.file_id, { caption: msg.caption || msg.text || '', parse_mode: 'HTML' });
        } else if (msg.voice) {
          await bot.sendVoice(userId, msg.voice.file_id);
        } else if (msg.sticker) {
          await bot.sendSticker(userId, msg.sticker.file_id);
        } else if (msg.poll) {
          // Пересылаем опрос (poll) как новый
          await bot.sendPoll(userId, msg.poll.question, msg.poll.options.map(o=>o.text), { is_anonymous: msg.poll.is_anonymous, allows_multiple_answers: msg.poll.allows_multiple_answers });
        } else if (msg.text) {
          await bot.sendMessage(userId, msg.text);
        }
      } catch (e) {
        console.error('Ошибка рассылки:', userId, e.message);
      }
    }
  }
});

// --- Антиспам на приветствие ---
const lastWelcome = {};

bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  const now = Date.now();
  // Не отправлять приветствие чаще, чем раз в минуту на пользователя
  if (lastWelcome[chatId] && now - lastWelcome[chatId] < 60 * 1000) {
    console.log(`Skip welcome for ${chatId}: too soon`);
    return;
  }
  lastWelcome[chatId] = now;
  console.log(`/start from chat ${chatId}`);
  console.log('Sending WebApp button with URL:', WEBAPP_URL);
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
