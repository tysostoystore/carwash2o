// Minimal Express server setup with SQLite placeholder
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());
app.use(cors());

// SQLite DB setup (file-based)
const db = new sqlite3.Database('./carwash.db', (err) => {
  if (err) {
    console.error('Could not connect to database', err);
  } else {
    console.log('Connected to SQLite database');
  }
});

// Получение списка услуг
app.get('/services', (req, res) => {
  db.all('SELECT name, price, duration FROM services', (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Ошибка сервера' });
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
    if (err) return res.status(500).json({ error: 'Ошибка сервера' });
    res.json(rows.map(r => r.date));
  });
});

// Получение доступного времени на дату
app.get('/available-times', (req, res) => {
  const date = req.query.date;
  if (!date) return res.status(400).json({ error: 'Не указана дата' });
  db.all('SELECT time FROM slots WHERE date = ? AND status = "free"', [date], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Ошибка сервера' });
    res.json(rows.map(r => r.time));
  });
});

// Создание заказа
app.post('/order', (req, res) => {
  const { services, date, time, name, phone, car } = req.body;
  if (!services || !date || !time || !name || !phone || !car) {
    return res.status(400).json({ error: 'Заполните все поля' });
  }
  // Проверка слота
  db.get('SELECT status FROM slots WHERE date = ? AND time = ?', [date, time], (err, slot) => {
    if (err || !slot || slot.status !== 'free') {
      return res.status(400).json({ error: 'Слот недоступен' });
    }
    // Создать заказ
    db.run('INSERT INTO orders (services, date, time, name, phone, car, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [services, date, time, name, phone, car, 'новый'], function(err) {
        if (err) return res.status(500).json({ error: 'Ошибка сервера' });
        // Занять слот
        db.run('UPDATE slots SET status = "busy" WHERE date = ? AND time = ?', [date, time]);
        res.json({ success: true, orderId: this.lastID });
      });
  });
});

// Получение заказов для админа (простой токен)
app.get('/admin/orders', (req, res) => {
  const token = req.headers['authorization'];
  if (token !== 'Bearer secret-admin-token') {
    return res.status(401).json({ error: 'Нет доступа' });
  }
  db.all('SELECT * FROM orders', (err, rows) => {
    if (err) return res.status(500).json({ error: 'Ошибка сервера' });
    res.json(rows);
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
