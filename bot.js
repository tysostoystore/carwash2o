// Telegram bot MVP for H2O Car Wash
// Greets user and shows WebApp button
const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');
const path = require('path');
const USERS_PATH = __dirname + '/backend/data/users.json';
// Ensure directory exists
try {
  const dir = path.dirname(USERS_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log('[INIT bot] Created users dir:', dir);
  }
} catch (e) {
  console.error('[INIT bot] Failed to ensure users dir:', e);
}
// Загружаем user_id из файла
function loadUsers() {
  try {
    const data = fs.readFileSync(USERS_PATH, 'utf8');
    const obj = JSON.parse(data);
    global._allUserIds = Array.isArray(obj.allUserIds) ? obj.allUserIds : [];
    global._badReviewUsers = Array.isArray(obj.badReviewUsers) ? obj.badReviewUsers : [];
  } catch(e) {
    global._allUserIds = [];
    global._badReviewUsers = [];
  }
}
function saveUsers() {
  try {
    fs.writeFileSync(USERS_PATH, JSON.stringify({
      allUserIds: global._allUserIds,
      badReviewUsers: global._badReviewUsers
    }, null, 2));
  } catch(e) { console.error('Не удалось сохранить users.json', e); }
}
function removeUserFromLists(uid) {
  if (!global._allUserIds) global._allUserIds = [];
  if (!global._badReviewUsers) global._badReviewUsers = [];
  const beforeAll = global._allUserIds.length;
  const beforeBad = global._badReviewUsers.length;
  global._allUserIds = global._allUserIds.filter(id => id !== uid);
  global._badReviewUsers = global._badReviewUsers.filter(id => id !== uid);
  if (beforeAll !== global._allUserIds.length || beforeBad !== global._badReviewUsers.length) {
    console.log(`[BOT] Removed user ${uid} from lists due to 403 (blocked)`);
    saveUsers();
  }
}
loadUsers();
const { TG_TOKEN, WEBAPP_URL } = require('./config.js');

const TOKEN = TG_TOKEN || 'REPLACE_ME'; // fallback for dev

const bot = (module.parent ? null : new TelegramBot(TOKEN, { polling: true }));

if (bot) console.log('Bot started, polling...');

// Логируем ошибки polling
if (bot) bot.on('polling_error', (err) => {
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
if (bot) bot.on('message', async (msg) => {
  // --- Сохраняем всех пользователей в память (in-memory) ---
  if (!global._allUserIds) global._allUserIds = [];
  const fromId = msg.from && msg.from.id;
  if (fromId && !global._allUserIds.includes(fromId)) {
    global._allUserIds.push(fromId);
    saveUsers();
  }
  console.log('[INCOMING MESSAGE]', {
    chat_id: msg.chat && msg.chat.id,
    message_thread_id: msg.message_thread_id,
    from_id: msg.from && msg.from.id,
    from_username: msg.from && msg.from.username,
    text: msg.text,
    date: msg.date
  });

  // --- Рассылка только себе из ветки "Рассылка" ---
  const ADMIN_THREAD_ID = 157;
  const ADMIN_GROUP_ID = -1002856721715;
  // --- Черновик + подтверждение ---
  if (
    msg.chat && msg.chat.id === ADMIN_GROUP_ID &&
    msg.message_thread_id === ADMIN_THREAD_ID &&
    !msg.via_bot // чтобы бот не реагировал на свои рассылки
  ) {
    // Для альбомов — сохраняем сообщения в память и делаем предпросмотр
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
      setTimeout(async () => {
        if (global._mediaGroupLast[msg.media_group_id] === msg.message_id) {
          // --- ПРЕДПРОСМОТР АЛЬБОМА ---
          const group = global._mediaGroups[msg.media_group_id] || [];
          if (group.length) {
            const media = group.map(m => {
              if (m.photo && m.photo.length) {
                return {
                  type: 'photo',
                  media: m.photo[m.photo.length - 1].file_id,
                  caption: (m.caption || m.text ? 'ПРЕДПРОСМОТР\n' + (m.caption || m.text) : 'ПРЕДПРОСМОТР'),
                  parse_mode: 'HTML'
                };
              } else if (m.video) {
                return {
                  type: 'video',
                  media: m.video.file_id,
                  caption: (m.caption || m.text ? 'ПРЕДПРОСМОТР\n' + (m.caption || m.text) : 'ПРЕДПРОСМОТР'),
                  parse_mode: 'HTML'
                };
              } else if (m.document) {
                return {
                  type: 'document',
                  media: m.document.file_id,
                  caption: (m.caption || m.text ? 'ПРЕДПРОСМОТР\n' + (m.caption || m.text) : 'ПРЕДПРОСМОТР'),
                  parse_mode: 'HTML'
                };
              }
              return null;
            }).filter(Boolean);
            const preview = await bot.sendMediaGroup(ADMIN_GROUP_ID, media, { message_thread_id: ADMIN_THREAD_ID });
            // Кнопки только на последнем сообщении предпросмотра
            if (preview && preview.length) {
              const lastPreviewId = preview[preview.length - 1].message_id;
              bot.editMessageReplyMarkup({
                inline_keyboard: [
  [{ text: '✏️ Редактировать', callback_data: 'edit' }],
  [{ text: 'Выбрать получателя', callback_data: 'choose_recipient_media_' + msg.media_group_id }]
]
              }, {
                chat_id: ADMIN_GROUP_ID,
                message_id: lastPreviewId
              });
            }
          }
        }
      }, 800);
    } else {
      // Для всех остальных сообщений — сразу добавляем кнопки
      // --- ПРЕДПРОСМОТР ОДИНОЧНОГО СООБЩЕНИЯ ---
      const preview = await bot.sendMessage(ADMIN_GROUP_ID, `ПРЕДПРОСМОТР\n${msg.text || msg.caption || ''}`, {
        message_thread_id: ADMIN_THREAD_ID,
        reply_markup: {
          inline_keyboard: [
  [{ text: '✏️ Редактировать', callback_data: 'edit' }],
  [{ text: 'Выбрать получателя', callback_data: 'choose_recipient_' + msg.message_id }]
]
        },
        parse_mode: 'HTML',
        disable_web_page_preview: true
      });
    }
  }
});

// --- Обработка inline-кнопок ---
if (!global._alreadyBroadcasted) global._alreadyBroadcasted = {};
// MVP: список "недовольных" клиентов в памяти
// badReviewUsers теперь всегда из users.json
if (!global._badReviewUsers) global._badReviewUsers = [];

if (bot) bot.on('callback_query', async (query) => {
  try {
    const { message, data } = query;
    console.log('[CALLBACK] data:', data, 'chat_id:', message && message.chat && message.chat.id, 'msg_id:', message && message.message_id);
    if (!message || !data) return;
  const TEST_USER_IDS = [411100616];

  // --- ОТПРАВИТЬ СЕБЕ: Альбом ---
  if (data.startsWith('broadcast_self_media_')) {
    const media_group_id = data.replace('broadcast_self_media_', '');
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
      // Определяем автора сообщения (reply_to_message.from.id)
      let authorId = message.reply_to_message?.from?.id;
      if (!authorId && group[0]?.from?.id) authorId = group[0].from.id;
      if (!authorId) authorId = query?.from?.id; // запасной вариант — отправить инициатору нажатия
      if (!authorId) return; // если не найден автор
      await bot.sendMediaGroup(authorId, media);
    }
    try {
      await bot.editMessageReplyMarkup({ inline_keyboard: [[{ text: '✅ Отправить', callback_data: 'send' }]] }, { chat_id: message.chat.id, message_id: message.message_id });
    } catch (e) { console.error('[EDIT RM self_media] error:', e && e.response && e.response.body ? e.response.body : e); }
    return bot.answerCallbackQuery(query.id, { text: 'Отправлено автору!' });
  }

    // --- ОТПРАВИТЬ НЕДОВОЛЬНЫМ: Альбом ---
    if (data.startsWith('broadcast_bad_media_')) {
      // Перечитываем сегменты перед рассылкой
      try { loadUsers(); } catch {}
      const media_group_id = data.replace('broadcast_bad_media_', '');
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
        console.log(`[BROADCAST bad_media] users: ${global._badReviewUsers.length}`);
        for (const userId of global._badReviewUsers) {
          await bot.sendMediaGroup(userId, media);
        }
      }
      try {
        await bot.editMessageReplyMarkup({ inline_keyboard: [[{ text: '✅ Отправить', callback_data: 'send' }]] }, { chat_id: message.chat.id, message_id: message.message_id });
      } catch (e) { console.error('[EDIT RM bad_media] error:', e && e.response && e.response.body ? e.response.body : e); }
      return bot.answerCallbackQuery(query.id, { text: 'Отправлено недовольным!' });
    }

    // --- ОТПРАВИТЬ ВСЕМ: Альбом ---
    if (data.startsWith('broadcast_media_')) {
      try { loadUsers(); } catch {}
      const media_group_id = data.replace('broadcast_media_', '');
      const group = Object.values(global._mediaGroups || {}).flat().filter(m => m.media_group_id == media_group_id);
      if (group && group.length) {
        const media = group.map(m => {
          if (m.photo && m.photo.length) {
            return { type: 'photo', media: m.photo[m.photo.length - 1].file_id, caption: m.caption || m.text || undefined, parse_mode: 'HTML' };
          } else if (m.video) {
            return { type: 'video', media: m.video.file_id, caption: m.caption || m.text || undefined, parse_mode: 'HTML' };
          } else if (m.document) {
            return { type: 'document', media: m.document.file_id, caption: m.caption || m.text || undefined, parse_mode: 'HTML' };
          }
          return null;
        }).filter(Boolean);
        const allUsers = Array.isArray(global._allUserIds) ? global._allUserIds : [];
        console.log(`[BROADCAST media_all] users: ${allUsers.length}`);
        for (const userId of allUsers) {
          try {
            await bot.sendMediaGroup(userId, media);
          } catch (error) {
            console.error(`Ошибка отправки альбома пользователю ${userId}:`, error.message);
            if (error.response && error.response.statusCode === 403) removeUserFromLists(userId);
          }
        }
      }
      try { await bot.editMessageReplyMarkup({ inline_keyboard: [[{ text: '✅ Отправить', callback_data: 'send' }]] }, { chat_id: message.chat.id, message_id: message.message_id }); } catch (e) { console.error('[EDIT RM media_all] error:', e && e.response && e.response.body ? e.response.body : e); }
      return bot.answerCallbackQuery(query.id, { text: 'Рассылка альбома всем отправлена' });
    }

    // --- ОТПРАВИТЬ СЕБЕ: Одиночное сообщение ---
    if (data.startsWith('broadcast_self_')) {
      try {
        const msg_id = parseInt(data.replace('broadcast_self_', ''));
        const msg = (global._lastMessages || []).find(m => m.message_id === msg_id) || message.reply_to_message;
        const authorId = (msg && msg.from && msg.from.id) || (query && query.from && query.from.id);
        if (!authorId) {
          console.error('broadcast_self_: authorId not found');
          return bot.answerCallbackQuery(query.id, { text: '❌ Автор не найден' });
        }
        const text = (msg && (msg.text || msg.caption)) || ' ';
        await bot.sendMessage(authorId, text, { parse_mode: 'HTML', disable_web_page_preview: true });
        try {
          await bot.editMessageReplyMarkup(
            { inline_keyboard: [[{ text: '✅ Отправлено', callback_data: 'sent' }]] }, 
            { chat_id: message.chat.id, message_id: message.message_id }
          );
        } catch (e) { console.error('[EDIT RM bad] error:', e && e.response && e.response.body ? e.response.body : e); }
        return bot.answerCallbackQuery(query.id, { text: 'Отправлено автору!' });
      } catch (e) {
        console.error('broadcast_self_ error:', e);
        return bot.answerCallbackQuery(query.id, { text: '❌ Ошибка отправки себе' });
      }
    }

    // --- ОТПРАВИТЬ НЕДОВОЛЬНЫМ: Одиночное сообщение ---
    if (data.startsWith('broadcast_bad_')) {
      try {
        // Перечитываем сегменты перед рассылкой
        try { loadUsers(); } catch {}
        const msg_id = parseInt(data.replace('broadcast_bad_', ''));
        const msg = (global._lastMessages || []).find(m => m.message_id === msg_id);
        
        if (!msg) {
          console.error('Сообщение не найдено в кеше:', msg_id);
          return bot.answerCallbackQuery(query.id, { text: '❌ Ошибка: сообщение устарело' });
        }
        
        try {
          await bot.sendMessage(message.chat.id, '📤 КОПИЯ РАССЫЛКИ ВСЕМ:\n\n' + (msg.text || msg.caption || ''), {
            parse_mode: 'HTML',
            disable_web_page_preview: true
          });
        } catch (e) {
          console.error('Ошибка отправки копии:', e.message);
        }
        
        // Рассылка недовольным пользователям с задержкой
        const badUsers = Array.isArray(global._badReviewUsers) ? global._badReviewUsers : [];
        if (badUsers.length === 0) {
          console.log('Нет пользователей для рассылки (badReviewUsers пуст)');
          return bot.answerCallbackQuery(query.id, { text: '❌ Нет пользователей для рассылки' });
        }
        console.log(`[BROADCAST bad] Начинаю рассылку ${badUsers.length} пользователям...`);
        let successCount = 0;
        const errors = [];
        
        for (const userId of badUsers) {
          try {
            // Отправка в зависимости от типа контента
            if (msg.photo && msg.photo.length) {
              const photo = msg.photo[msg.photo.length - 1].file_id;
              await bot.sendPhoto(userId, photo, { 
                caption: msg.caption || msg.text || '', 
                parse_mode: 'HTML' 
              });
            } else if (msg.document) {
              await bot.sendDocument(userId, msg.document.file_id, { 
                caption: msg.caption || msg.text || '', 
                parse_mode: 'HTML' 
              });
            } else if (msg.video) {
              await bot.sendVideo(userId, msg.video.file_id, { 
                caption: msg.caption || msg.text || '', 
                parse_mode: 'HTML' 
              });
            } else if (msg.audio) {
              await bot.sendAudio(userId, msg.audio.file_id, { 
                caption: msg.caption || msg.text || '', 
                parse_mode: 'HTML' 
              });
            } else if (msg.voice) {
              await bot.sendVoice(userId, msg.voice.file_id);
            } else if (msg.sticker) {
              await bot.sendSticker(userId, msg.sticker.file_id);
            } else if (msg.poll) {
              await bot.sendPoll(
                userId, 
                msg.poll.question, 
                msg.poll.options.map(o => o.text), 
                { 
                  is_anonymous: msg.poll.is_anonymous, 
                  allows_multiple_answers: msg.poll.allows_multiple_answers 
                }
              );
            } else if (msg.text) {
              await bot.sendMessage(userId, msg.text, { parse_mode: 'HTML' });
            }
            
            successCount++;
            console.log(`Отправлено пользователю ${userId} (${successCount}/${badUsers.length})`);
            
            // Задержка между сообщениями (100мс)
            await new Promise(resolve => setTimeout(resolve, 100));
            
          } catch (error) {
            console.error(`Ошибка отправки пользователю ${userId}:`, error.message);
            if (error.response && error.response.statusCode === 403) {
              removeUserFromLists(userId);
            }
            errors.push(`${userId}: ${error.message}`);
            // Продолжаем при ошибке
          }
        }
        
        // Формируем статистику
        const stats = `✅ Успешно: ${successCount}\n❌ Ошибок: ${errors.length}`;
        
        // Обновляем кнопку после завершения
        try {
          await bot.editMessageReplyMarkup(
          { inline_keyboard: [[{ text: `✅ Отправлено ${successCount}/${badUsers.length}`, callback_data: 'sent' }]] }, 
          { chat_id: message.chat.id, message_id: message.message_id }
        );
        } catch (e) { console.error('[EDIT RM all] error:', e && e.response && e.response.body ? e.response.body : e); }
        
        console.log(`Рассылка завершена. ${stats}`);
        
        // Отправляем статистику
        if (errors.length > 0) {
          await bot.sendMessage(
            message.chat.id, 
            `📊 Статистика рассылки:\n${stats}\n\n` +
            `Последние ошибки (${Math.min(3, errors.length)} из ${errors.length}):\n` +
            errors.slice(0, 3).join('\n'),
            { parse_mode: 'HTML' }
          );
        }
        
        return bot.answerCallbackQuery(query.id, { 
          text: `✅ Отправлено ${successCount} из ${allUsers.length} пользователям` 
        });
        
      } catch (error) {
        console.error('Ошибка в broadcast_:', error);
        return bot.answerCallbackQuery(query.id, { 
          text: `❌ Ошибка: ${error.message || 'неизвестная ошибка'}` 
        });
      }
    }

    // --- ОТПРАВИТЬ ВСЕМ: Одиночное сообщение ---
    if (data.startsWith('broadcast_') && !data.startsWith('broadcast_media_') && !data.startsWith('broadcast_self_') && !data.startsWith('broadcast_bad_')) {
      try {
        try { loadUsers(); } catch {}
        const msg_id = parseInt(data.replace('broadcast_', ''));
        const msg = (global._lastMessages || []).find(m => m.message_id === msg_id);
        if (!msg) {
          console.error('Сообщение не найдено в кеше:', msg_id);
          return bot.answerCallbackQuery(query.id, { text: '❌ Ошибка: сообщение устарело' });
        }
        const allUsers = Array.isArray(global._allUserIds) ? global._allUserIds : [];
        if (allUsers.length === 0) {
          console.log('Нет пользователей для рассылки (allUserIds пуст)');
          return bot.answerCallbackQuery(query.id, { text: '❌ Нет пользователей для рассылки' });
        }
        console.log(`[BROADCAST all] Начинаю рассылку ${allUsers.length} пользователям...`);
        let successCount = 0; const errors = [];
        for (const userId of allUsers) {
          try {
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
              await bot.sendPoll(userId, msg.poll.question, msg.poll.options.map(o => o.text), { is_anonymous: msg.poll.is_anonymous, allows_multiple_answers: msg.poll.allows_multiple_answers });
            } else if (msg.text) {
              await bot.sendMessage(userId, msg.text, { parse_mode: 'HTML' });
            }
            successCount++;
            console.log(`Отправлено пользователю ${userId} (${successCount}/${allUsers.length})`);
            await new Promise(r => setTimeout(r, 100));
          } catch (error) {
            console.error(`Ошибка отправки пользователю ${userId}:`, error.message);
            if (error.response && error.response.statusCode === 403) removeUserFromLists(userId);
            errors.push(`${userId}: ${error.message}`);
          }
        }
        try {
          await bot.editMessageReplyMarkup({ inline_keyboard: [[{ text: `✅ Отправлено ${successCount}/${allUsers.length}`, callback_data: 'sent' }]] }, { chat_id: message.chat.id, message_id: message.message_id });
        } catch (e) { console.error('[EDIT RM all_single] error:', e && e.response && e.response.body ? e.response.body : e); }
        if (errors.length > 0) {
          await bot.sendMessage(message.chat.id, `📊 Статистика рассылки:\n✅ Успешно: ${successCount}\n❌ Ошибок: ${errors.length}`, { parse_mode: 'HTML' });
        }
        return bot.answerCallbackQuery(query.id, { text: `✅ Отправлено ${successCount} из ${allUsers.length} пользователям` });
      } catch (error) {
        console.error('Ошибка в broadcast_all:', error);
        return bot.answerCallbackQuery(query.id, { text: `❌ Ошибка: ${error.message || 'неизвестная ошибка'}` });
      }
    }

    // --- Редактировать ---
    if (data === 'edit') {
      try {
        await bot.editMessageReplyMarkup({ inline_keyboard: [] }, { chat_id: message.chat.id, message_id: message.message_id });
      } catch (e) { console.error('[EDIT RM edit] error:', e && e.response && e.response.body ? e.response.body : e); }
      return bot.answerCallbackQuery(query.id, { text: 'Можно редактировать сообщение' });
    }

    // --- ВЫБОР ПОЛУЧАТЕЛЯ (альбом) ---
    if (data.startsWith('choose_recipient_media_')) {
      const media_group_id = data.replace('choose_recipient_media_', '');
      try {
        await bot.editMessageReplyMarkup({
          inline_keyboard: [
            [{ text: '📤 Себе', callback_data: 'broadcast_self_media_' + media_group_id }],
            [{ text: '✅ Всем', callback_data: 'broadcast_media_' + media_group_id }],
            [{ text: '😡 Недовольным', callback_data: 'broadcast_bad_media_' + media_group_id }],
            [{ text: '⬅️ Назад', callback_data: 'preview_media_' + media_group_id }]
          ]
        }, { chat_id: message.chat.id, message_id: message.message_id });
      } catch (e) { console.error('[EDIT RM choose_recipient_media] error:', e && e.response && e.response.body ? e.response.body : e); }
      return bot.answerCallbackQuery(query.id);
    }
    // --- НАЗАД к предпросмотру (альбом) ---
    if (data.startsWith('preview_media_')) {
      const media_group_id = data.replace('preview_media_', '');
      try {
        await bot.editMessageReplyMarkup({
          inline_keyboard: [
            [{ text: '✏️ Редактировать', callback_data: 'edit' }],
            [{ text: 'Выбрать получателя', callback_data: 'choose_recipient_media_' + media_group_id }]
          ]
        }, { chat_id: message.chat.id, message_id: message.message_id });
      } catch (e) { console.error('[EDIT RM preview_media] error:', e && e.response && e.response.body ? e.response.body : e); }
      return bot.answerCallbackQuery(query.id);
    }
    // --- НАЗАД к предпросмотру (одиночное) ---
    if (data.startsWith('preview_')) {
      const msg_id = data.replace('preview_', '');
      try {
        await bot.editMessageReplyMarkup({
          inline_keyboard: [
            [{ text: '✏️ Редактировать', callback_data: 'edit' }],
            [{ text: 'Выбрать получателя', callback_data: 'choose_recipient_' + msg_id }]
          ]
        }, { chat_id: message.chat.id, message_id: message.message_id });
      } catch (e) { console.error('[EDIT RM preview_single] error:', e && e.response && e.response.body ? e.response.body : e); }
      return bot.answerCallbackQuery(query.id);
    }
    // --- ВЫБОР ПОЛУЧАТЕЛЯ (одиночное) ---
    if (data.startsWith('choose_recipient_')) {
      const msg_id = data.replace('choose_recipient_', '');
      try {
        await bot.editMessageReplyMarkup({
          inline_keyboard: [
            [{ text: '📤 Себе', callback_data: 'broadcast_self_' + msg_id }],
            [{ text: '✅ Всем', callback_data: 'broadcast_' + msg_id }],
            [{ text: '😡 Недовольным', callback_data: 'broadcast_bad_' + msg_id }],
            [{ text: '⬅️ Назад', callback_data: 'preview_' + msg_id }]
          ]
        }, { chat_id: message.chat.id, message_id: message.message_id });
      } catch (e) { console.error('[EDIT RM choose_recipient_single] error:', e && e.response && e.response.body ? e.response.body : e); }
      return bot.answerCallbackQuery(query.id);
    }
  } catch (e) {
    console.error('[CALLBACK handler] error:', e);
    try { await bot.answerCallbackQuery(query.id, { text: '❌ Ошибка обработчика' }); } catch {}
  }
});

// --- Сохраняем последние сообщения для поиска по message_id ---
if (!global._lastMessages) global._lastMessages = [];
if (bot) bot.on('message', (msg) => {
  // Сохраняем только последние 30 сообщений
  global._lastMessages.push(msg);
  if (global._lastMessages.length > 30) global._lastMessages.shift();
});

// --- Антиспам на приветствие ---
const lastWelcome = {};

if (bot) bot.onText(/\/start/, async (msg) => {
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
if (bot) bot.on('message', (msg) => {
  console.log('chat_id:', msg.chat?.id, 'thread_id:', msg.message_thread_id, 'text:', msg.text);
  // Можно добавить кастомную логику, если нужно, но автоответ убран для предотвращения спама
});
