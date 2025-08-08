// Скрипт для наполнения таблицы услуг начальными данными
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('/app/backend/data/carwash.db');

const services = [
  { name: 'Мойка кузова', price: 500, duration: 30 },
  { name: 'Химчистка салона', price: 2000, duration: 90 },
  { name: 'Полировка', price: 1500, duration: 60 },
];

db.serialize(() => {
  services.forEach(s => {
    db.run('INSERT INTO services (name, price, duration) VALUES (?, ?, ?)', [s.name, s.price, s.duration]);
  });
  console.log('Услуги добавлены');
  db.close();
});
