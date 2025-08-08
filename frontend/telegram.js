// telegram.js — получение Telegram user info из WebApp
// Использовать только если WebApp открыт через Telegram

function getTelegramUser() {
  if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initDataUnsafe && window.Telegram.WebApp.initDataUnsafe.user) {
    const user = window.Telegram.WebApp.initDataUnsafe.user;
    return {
      tg_user_id: user.id,
      tg_username: user.username || '',
      tg_first_name: user.first_name || '',
      tg_last_name: user.last_name || ''
    };
  }
  return {
    tg_user_id: '',
    tg_username: '',
    tg_first_name: '',
    tg_last_name: ''
  };
}

// Экспорт для import
export { getTelegramUser };
// Глобально для window (index.html)
window.getTelegramUser = getTelegramUser;
