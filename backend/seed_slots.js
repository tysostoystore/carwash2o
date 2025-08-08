// Скрипт для наполнения слотов (дат и времени)
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('/app/backend/data/carwash.db');

const dates = ['2025-07-29', '2025-07-30', '2025-07-31'];
const times = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00'];

db.serialize(() => {
  dates.forEach(date => {
    times.forEach(time => {
      db.run('INSERT INTO slots (date, time, status) VALUES (?, ?, ?)', [date, time, 'free']);
    });
  });
  console.log('Слоты добавлены');
  db.close();
});
