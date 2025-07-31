// Общий конфиг для фронта и бота
require('dotenv').config();
module.exports = {
  BACKEND_URL: "https://carwash2o.fly.dev",
  WEBAPP_URL: "https://carwash2o.fly.dev/",
  TG_TOKEN: process.env.TG_TOKEN
};
