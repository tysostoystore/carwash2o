// telegram.js — получение Telegram user info из WebApp
// Использовать только если WebApp открыт через Telegram

(function initTelegramWebApp() {
  try {
    if (window.Telegram && window.Telegram.WebApp) {
      // Сообщаем Telegram, что WebApp готов
      if (typeof window.Telegram.WebApp.ready === 'function') {
        window.Telegram.WebApp.ready();
      }
      // Кешируем пользователя для быстрых обращений
      const u = window.Telegram.WebApp.initDataUnsafe && window.Telegram.WebApp.initDataUnsafe.user;
      if (u && u.id) {
        window.__tgUser = {
          tg_user_id: u.id,
          tg_username: u.username || '',
          tg_first_name: u.first_name || '',
          tg_last_name: u.last_name || ''
        };
        console.log('[TG WebApp] user detected:', window.__tgUser.tg_user_id);
      } else {
        console.log('[TG WebApp] no user in initDataUnsafe');
      }
    } else {
      console.log('[TG WebApp] window.Telegram.WebApp is not available');
    }
  } catch (e) {
    console.warn('[TG WebApp] init error:', e);
  }
})();

function getTelegramUser() {
  if (window.__tgUser) return window.__tgUser;
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

// Глобально для window (index.html)
window.getTelegramUser = getTelegramUser;
