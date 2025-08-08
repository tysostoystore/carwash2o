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
  // --- Черновик + подтверждение ---
  if (
    msg.chat && msg.chat.id === ADMIN_GROUP_ID &&
    msg.message_thread_id === ADMIN_THREAD_ID &&
    !msg.via_bot // чтобы бот не реагировал на свои рассылки
  ) {
    // Для альбомов — сохраняем сообщения в память и кнопка только на последнем сообщении группы
    if (msg.media_group_id) {
      if (!global._mediaGroups) global._mediaGroups = {};
      if (!global._mediaGroups[msg.media_group_id]) global._mediaGroups[msg.media_group_id] = [];
      global._mediaGroups[msg.media_group_id].push(msg);
      if (!global._mediaGroupLast) global._mediaGroupLast = {};
      global._mediaGroupLast[msg.media_group_id] = msg.message_id;
      // setTimeout нужен, чтобы дождаться всех сообщений альбома
      // Автоочистка альбома из памяти через 3 минуты
      setTimeout(() => {
        delete global._mediaGroups[msg.media_group_id];
        delete global._mediaGroupLast[msg.media_group_id];
      }, 180000);
      setTimeout(() => {
        if (global._mediaGroupLast[msg.media_group_id] === msg.message_id) {
          bot.editMessageReplyMarkup({
            inline_keyboard: [[
              { text: '✅ Отправить всем', callback_data: 'broadcast_media_' + msg.media_group_id },
              { text: '✏️ Редактировать', callback_data: 'edit' }
            ]]
          }, {
            chat_id: ADMIN_GROUP_ID,
            message_id: msg.message_id
          });
        }
      }, 800);
    } else {
      // Для всех остальных сообщений — сразу добавляем кнопки
      bot.editMessageReplyMarkup({
        inline_keyboard: [[
          { text: '✅ Отправить всем', callback_data: 'broadcast_' + msg.message_id },
          { text: '✏️ Редактировать', callback_data: 'edit' }
        ]]
      }, {
        chat_id: ADMIN_GROUP_ID,
        message_id: msg.message_id
      }).catch(() => {
        // Если не получилось отредактировать (например, нет reply_markup) — добавляем через sendMessage
        bot.sendMessage(ADMIN_GROUP_ID, 'Готово к рассылке:', {
          reply_to_message_id: msg.message_id,
          reply_markup: {
            inline_keyboard: [[
              { text: '✅ Отправить всем', callback_data: 'broadcast_' + msg.message_id },
              { text: '✏️ Редактировать', callback_data: 'edit' }
            ]]
          }
        });
      });
    }
  }

// --- Обработка inline-кнопок ---
if (!global._alreadyBroadcasted) global._alreadyBroadcasted = {};
bot.on('callback_query', async (query) => {
  const { message, data } = query;
  if (!message || !data) return;
  const TEST_USER_IDS = [411100616];
  // --- ОТПРАВИТЬ ВСЕМ: Альбом ---
  if (data.startsWith('broadcast_media_')) {
    const media_group_id = data.replace('broadcast_media_', '');
    if (global._alreadyBroadcasted['media_' + media_group_id]) {
      return bot.answerCallbackQuery({ callback_query_id: query.id, text: 'Уже отправлено!' });
    }
    global._alreadyBroadcasted['media_' + media_group_id] = true;
    // Собираем все сообщения альбома из памяти
    const group = Object.values(global._mediaGroups || {}).flat().filter(m => m.media_group_id == media_group_id);
    if (group && group.length) {
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
      for (const userId of TEST_USER_IDS) {
        await bot.sendMediaGroup(userId, media);
      }
      // После рассылки полностью очищаем память от альбомов
      if (global._mediaGroups) global._mediaGroups = {};
      if (global._mediaGroupLast) global._mediaGroupLast = {};
      if (global._lastMessages) global._lastMessages = [];
    }
    // Меняем клавиатуру на "✅ Отправлено"
    bot.editMessageReplyMarkup({ inline_keyboard: [[{ text: '✅ Отправлено', callback_data: 'done' }]] }, { chat_id: message.chat.id, message_id: message.message_id });
    return bot.answerCallbackQuery({ callback_query_id: query.id, text: 'Рассылка отправлена!' });
  }
  // --- ОТПРАВИТЬ ВСЕМ: Одиночное сообщение ---
  if (data.startsWith('broadcast_')) {
    const msg_id = parseInt(data.replace('broadcast_', ''));
    if (global._alreadyBroadcasted['msg_' + msg_id]) {
      return bot.answerCallbackQuery({ callback_query_id: query.id, text: 'Уже отправлено!' });
    }
    global._alreadyBroadcasted['msg_' + msg_id] = true;
    // Получаем оригинальное сообщение через getChatMessageHistory (или из памяти, если нужно)
    // Для простоты: ищем в памяти среди последних сообщений
    const msg = (global._lastMessages || []).find(m => m.message_id === msg_id);
    if (!msg) return bot.answerCallbackQuery({ callback_query_id: query.id, text: 'Сообщение не найдено' });
    for (const userId of TEST_USER_IDS) {
      if (msg.photo && msg.photo.length) {
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
        await bot.sendPoll(userId, msg.poll.question, msg.poll.options.map(o=>o.text), { is_anonymous: msg.poll.is_anonymous, allows_multiple_answers: msg.poll.allows_multiple_answers });
      } else if (msg.text) {
        await bot.sendMessage(userId, msg.text);
      }
    }
    bot.editMessageReplyMarkup({ inline_keyboard: [[{ text: '✅ Отправлено', callback_data: 'done' }]] }, { chat_id: message.chat.id, message_id: message.message_id });
    return bot.answerCallbackQuery({ callback_query_id: query.id, text: 'Рассылка отправлена!' });
  }
  // --- Редактировать ---
  if (data === 'edit') {
    bot.editMessageReplyMarkup({ inline_keyboard: [] }, { chat_id: message.chat.id, message_id: message.message_id });
    return bot.answerCallbackQuery({ callback_query_id: query.id, text: 'Можно редактировать сообщение' });
  }
});

// --- Сохраняем последние сообщения для поиска по message_id ---
if (!global._lastMessages) global._lastMessages = [];
bot.on('message', (msg) => {
  // Сохраняем только последние 30 сообщений
  global._lastMessages.push(msg);
  if (global._lastMessages.length > 30) global._lastMessages.shift();
});

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
