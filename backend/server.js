// Minimal Express server setup with SQLite placeholder

// === Глобальные обработчики ошибок процесса ===
process.on('uncaughtException', err => {
  console.error('Uncaught Exception:', err && err.stack ? err.stack : err);
  process.exit(1);
});
process.on('unhandledRejection', err => {
  console.error('Unhandled Rejection:', err && err.stack ? err.stack : err);
  process.exit(1);
});
process.on('exit', code => {
  console.log('Process exited with code', code);
});

const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');
const path = require('path');
const app = express();

// Временно разрешаем CORS для всех доменов для диагностики
app.use(cors());
app.options('*', cors());

// Get port from environment or default to 3000 for local development
const PORT = process.env.PORT || 3000;

// Start the server
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});

// Handle any unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
  server.close(() => process.exit(1));
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  server.close(() => process.exit(1));
});

// === Telegram notification config ===
const TG_TOKEN = process.env.TG_TOKEN || '<YOUR_BOT_TOKEN_HERE>';
const TG_CHAT_ID = -1002856721715;
const TG_REVIEWS_THREAD_ID = 26;
const TG_ORDERS_THREAD_ID = 29;
const bot = new TelegramBot(TG_TOKEN, { polling: false });

app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));


// === Serve static frontend ===
app.use(express.static(path.join(__dirname, '../frontend')));
// SPA fallback: serve index.html for unknown routes (except API)
app.get(/^\/(?!api|admin|backend|orders|reviews|catalog).*/, (req, res, next) => {
  if (req.accepts('html')) {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
  } else {
    next();
  }
});

// SQLite DB setup (file-based)
const db = new sqlite3.Database('/app/backend/data/carwash.db', (err) => {
  if (err) {
    console.error('Could not connect to database', err);
  } else {
    console.log('Connected to SQLite database');
    // Автоматическое создание таблицы reviews при запуске
    db.run(`CREATE TABLE IF NOT EXISTS reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      rating INTEGER NOT NULL,
      text TEXT,
      photo TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`, (err) => {
      if (err) {
        console.error('Could not create reviews table:', err.message);
      } else {
        console.log('Table reviews ensured.');
      }
    });
    // Автоматическое создание таблицы orders при запуске
    db.run(`CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      services TEXT NOT NULL,
      date TEXT NOT NULL,
      time TEXT NOT NULL,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      car TEXT NOT NULL,
      status TEXT NOT NULL
    )`, (err) => {
      if (err) {
        console.error('Could not ensure orders table:', err);
      } else {
        console.log('Table orders ensured.');
      }
    });
  }
});

// Получение списка услуг
app.get('/services', (req, res) => {
  db.all('SELECT name, price, duration FROM services', (err, rows) => {
    if (err) {
      console.error('DB error in /services:', err);
      return res.status(500).json({ error: 'Ошибка сервера (services:select)' });
    }
    const services = rows.map(row => ({
      name: row.name,
      price: row.price,
      duration: row.duration
    }));
    res.json(services);
  });
});

// Получение доступных дат
app.get('/available-dates', (req, res) => {
  db.all('SELECT DISTINCT date FROM slots WHERE status = "free"', (err, rows) => {
    if (err) {
      console.error('DB error in /available-dates:', err);
      return res.status(500).json({ error: 'Ошибка сервера (available-dates:select)' });
    }
    res.json(rows.map(r => r.date));
  });
});

// Получение каталога услуг
app.get('/catalog', (req, res) => {
  try {
    const catalogPath = path.join(__dirname, '..', 'services_catalog.json');
    const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
    res.json(catalog);
  } catch (err) {
    console.error('Error loading catalog:', err);
    res.status(500).json({ error: 'Ошибка загрузки каталога услуг' });
  }
});

// Получение доступного времени на дату
app.get('/available-times', (req, res) => {
  const date = req.query.date;
  if (!date) return res.status(400).json({ error: 'Не указана дата' });
  db.all('SELECT time FROM slots WHERE date = ? AND status = "free"', [date], (err, rows) => {
    if (err) {
      console.error('DB error in /available-times:', err);
      return res.status(500).json({ error: 'Ошибка сервера (available-times:select)' });
    }
    res.json(rows.map(r => r.time));
  });
});

// Создание заказа
app.post('/order', (req, res) => {
  const { name, phone, car, bodyType, category, service, price, tg_user_id, tg_username } = req.body;
  if (!name || !phone || !car || !service) {
    return res.status(400).json({ error: 'Заполните все поля' });
  }
  // Создать заказ
  const currentDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const currentTime = new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  
  db.run('INSERT INTO orders (services, date, time, name, phone, car, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [`${category}: ${service}`, currentDate, currentTime, name, phone, car, 'новый'], function(err) {
      if (err) {
        console.error('DB error in /order (insert):', err);
        return res.status(500).json({ error: 'Ошибка сервера (order:insert)' });
      }
      // Отправить уведомление в Telegram
      try {
        let msg = `🆕 <b>Новая заявка</b>\n\n<b>Услуга:</b> ${service}\n<b>Тип кузова:</b> ${bodyType}\n<b>Цена:</b> ${price}₽\n<b>Имя:</b> ${name}\n<b>Телефон:</b> ${phone}\n<b>Авто:</b> ${car}`;
        if (tg_username) {
          msg += `\n<b>Telegram:</b> <a href='https://t.me/${tg_username}'>@${tg_username}</a>`;
        } else if (tg_user_id) {
          msg += `\n<b>Telegram ID:</b> <code>${tg_user_id}</code>`;
        }
        bot.sendMessage(TG_CHAT_ID, msg, {
          parse_mode: 'HTML',
          message_thread_id: TG_ORDERS_THREAD_ID
        }).then(tgRes => {
          console.log('[TG] Order sent:', {
              chat_id: TG_CHAT_ID,
              thread_id: TG_ORDERS_THREAD_ID,
              text: msg,
              tg_message_id: tgRes && tgRes.message_id,
              date: new Date().toISOString()
            });
          }).catch(e => {
            console.error('[TG] Order ERROR:', {
              chat_id: TG_CHAT_ID,
              thread_id: TG_ORDERS_THREAD_ID,
              text: msg,
              error: e && e.response && e.response.body ? e.response.body : (e && e.stack ? e.stack : e),
              date: new Date().toISOString()
            });
          });
        } catch(e) {
          console.error('[TG] Order send EXCEPTION:', e);
        }
        res.json({ success: true, orderId: this.lastID });
      });
    });

// === ОТЗЫВЫ ===
// Добавить отзыв
app.post('/reviews', (req, res) => {
  console.log('--- POST /reviews received ---', new Date().toISOString(), req.body);
  console.log('--- POST /reviews ---');
  console.log('Headers:', req.headers);
  console.log('Method:', req.method);
  console.log('URL:', req.url);
  console.log('Body:', req.body);
  const { name, rating, text, photo, tg_user_id, tg_username } = req.body;
  if (!name || !rating) {
    console.log('Validation failed:', { name, rating, body: req.body });
    return res.status(400).json({ error: 'Имя и рейтинг обязательны' });
  }
  console.log('DB insert params:', [name, rating, text || '', photo ? '[photo present]' : '[no photo]'], 'at', new Date().toISOString());
  db.run('INSERT INTO reviews (name, rating, text, photo) VALUES (?, ?, ?, ?)', [name, rating, text || '', photo || ''], function(err) {
    // === Автоматическое обновление badReviewUsers ===
    try {
      // Подключаем global из бота
      let botGlobals;
      try { botGlobals = require('../bot'); } catch(e) { botGlobals = global; }
      if (!botGlobals._badReviewUsers) botGlobals._badReviewUsers = [];
      if (tg_user_id && Number.isInteger(Number(tg_user_id))) {
        const uid = Number(tg_user_id);
        if (rating < 5) {
          if (!botGlobals._badReviewUsers.includes(uid)) {
            botGlobals._badReviewUsers.push(uid);
            console.log(`[REVIEW] User ${uid} added to badReviewUsers (rating: ${rating})`);
          }
        } else {
          // Если 5★ — удалить из badReviewUsers
          const prevLength = botGlobals._badReviewUsers.length;
          botGlobals._badReviewUsers = botGlobals._badReviewUsers.filter(id => id !== uid);
          if (botGlobals._badReviewUsers.length < prevLength) {
            console.log(`[REVIEW] User ${uid} removed from badReviewUsers (rating: ${rating})`);
          }
        }
        
        // Обновляем allUserIds
        if (!botGlobals._allUserIds.includes(uid)) {
          botGlobals._allUserIds.push(uid);
          console.log(`[REVIEW] New user ${uid} added to allUserIds`);
        }
        // --- Сохраняем badReviewUsers и allUserIds в users.json ---
        try {
          const usersPath = path.join(__dirname, 'data/users.json');
          let usersObj = { allUserIds: [], badReviewUsers: [] };
          if (fs.existsSync(usersPath)) {
            usersObj = JSON.parse(fs.readFileSync(usersPath, 'utf8'));
          }
          usersObj.badReviewUsers = botGlobals._badReviewUsers;
          // Добавляем user_id в allUserIds, если его там нет
          if (uid && !usersObj.allUserIds.includes(uid)) usersObj.allUserIds.push(uid);
          fs.writeFileSync(usersPath, JSON.stringify(usersObj, null, 2));
        } catch(e) { console.error('Не удалось сохранить badReviewUsers/allUserIds в users.json:', e); }
      }
    } catch(e) { console.error('badReviewUsers update error:', e); }
    if (err) {
      console.error('DB error in /reviews:', err && err.stack ? err.stack : err);
      return res.status(500).json({ error: 'Ошибка сервера (БД): ' + (err && err.message ? err.message : err) });
    }
    // Отправить уведомление в Telegram
    const stars = '★'.repeat(rating) + '☆'.repeat(5 - rating);
    let msg = `⭐️ Новый отзыв (${stars})\n<b>${name}</b>`;
    if (tg_username) {
      msg += `\n<b>Telegram:</b> <a href='https://t.me/${tg_username}'>@${tg_username}</a>`;
    } else if (tg_user_id) {
      msg += `\n<b>Telegram ID:</b> <code>${tg_user_id}</code>`;
    }
    if (text) msg += `\n${text}`;
    console.log('Sending Telegram notification...');
    if (photo && photo.startsWith('data:image/')) {
      // Отправить фото с подписью
      const base64Data = photo.split(',')[1];
      const imgBuffer = Buffer.from(base64Data, 'base64');
      bot.sendPhoto(TG_CHAT_ID, imgBuffer, {
        caption: msg,
        parse_mode: 'HTML',
        message_thread_id: TG_REVIEWS_THREAD_ID
      })
      .then((tgRes) => {
        console.log('[TG] Photo sent:', {
          chat_id: TG_CHAT_ID,
          thread_id: TG_REVIEWS_THREAD_ID,
          caption: msg,
          tg_message_id: tgRes && tgRes.message_id,
          date: new Date().toISOString()
        });
      })
      .catch(e => {
        console.error('[TG] Photo ERROR:', {
          chat_id: TG_CHAT_ID,
          thread_id: TG_REVIEWS_THREAD_ID,
          caption: msg,
          error: e && e.response && e.response.body ? e.response.body : (e && e.stack ? e.stack : e),
          date: new Date().toISOString()
        });
      });
    } else {
      bot.sendMessage(TG_CHAT_ID, msg, {
        parse_mode: 'HTML',
        message_thread_id: TG_REVIEWS_THREAD_ID
      })
      .then((tgRes) => {
        console.log('[TG] Message sent:', {
          chat_id: TG_CHAT_ID,
          thread_id: TG_REVIEWS_THREAD_ID,
          text: msg,
          tg_message_id: tgRes && tgRes.message_id,
          date: new Date().toISOString()
        });
      })
      .catch(e => {
        console.error('[TG] Message ERROR:', {
          chat_id: TG_CHAT_ID,
          thread_id: TG_REVIEWS_THREAD_ID,
          text: msg,
          error: e && e.response && e.response.body ? e.response.body : (e && e.stack ? e.stack : e),
          date: new Date().toISOString()
        });
      });
    }
    console.log('Review saved, reviewId:', this.lastID);
    res.json({ success: true, reviewId: this.lastID });
  });
});
// Публичные отзывы (только 5 звёзд)
app.get('/reviews', (req, res) => {
  db.all('SELECT id, name, rating, text, photo, created_at FROM reviews WHERE rating = 5 ORDER BY created_at DESC', (err, rows) => {
    if (err) {
      console.error('DB error in /reviews (public):', err);
      return res.status(500).json({ error: 'Ошибка сервера (reviews:select)' });
    }
    res.json(rows);
  });
});
// Все отзывы для админа
app.get('/admin/reviews', (req, res) => {
  const token = req.headers['authorization'];
  if (token !== 'Bearer secret-admin-token') {
    return res.status(401).json({ error: 'Нет доступа' });
  }
  db.all('SELECT * FROM reviews ORDER BY created_at DESC', (err, rows) => {
    if (err) {
      console.error('DB error in /admin/reviews:', err);
      return res.status(500).json({ error: 'Ошибка сервера (admin-reviews:select)' });
    }
    res.json(rows);
  });
});

// Получение заказов для админа (простой токен)
app.get('/admin/orders', (req, res) => {
  const token = req.headers['authorization'];
  if (token !== 'Bearer secret-admin-token') {
    return res.status(401).json({ error: 'Нет доступа' });
  }
  db.all('SELECT * FROM orders', (err, rows) => {
    if (err) {
      console.error('DB error in /admin/orders:', err);
      return res.status(500).json({ error: 'Ошибка сервера (admin-orders:select)' });
    }
    res.json(rows);
  });
});

// Server already started above (line 11-13)
// Duplicate app.listen() removed to fix EADDRINUSE on Fly.io

// === Запускаем Telegram-бота в этом же процессе ===
require('../bot');
