// Логика для фронтенда: форма записи, мобильная, тёмная, всё на русском
// Для фронтенда: BACKEND_URL и WEBAPP_URL из config.js (Node-style)
let BACKEND_URL = "";
let WEBAPP_URL = "";
try {
  // Если фронт собирается как Node (например, для SSR)
  ({ BACKEND_URL, WEBAPP_URL } = require("../config.js"));
} catch {
  // Если фронт работает в браузере, ищем window-переменные (например, через config.js для браузера)
  BACKEND_URL = window.BACKEND_URL || "https://carwash2o.fly.dev";
  WEBAPP_URL = window.WEBAPP_URL || "https://carwash2o.fly.dev/";
}
const api = (path, opts = {}) => fetch(BACKEND_URL + path, opts).then(r => r.json());

async function renderBookingForm() {
  const app = document.getElementById('app');
  app.innerHTML = '<div class="flex justify-center py-12"><span class="spinner"></span></div>';

  // Загрузка каталога услуг
  let catalog;
  try {
    catalog = await fetch('/services_catalog.json').then(r => r.json());
  } catch {
    app.innerHTML = '<p class="text-red-400 text-center">Ошибка загрузки услуг</p>';
    return;
  }

  // --- State ---
  let selectedBody = 0;
  let selectedCategory = 0;
  let selectedService = 0;

  render();

  function render() {
    app.innerHTML = `
      <form id="booking-form" class="flex flex-col gap-6 animate-fade-in">
        <div>
          <div class="mb-2 text-base font-semibold text-gray-200">Тип кузова</div>
          <div class="grid grid-cols-2 gap-2 mb-4">
            ${catalog.bodyTypes.map((type, i) => `
              <button type="button" class="rounded-xl py-3 px-2 flex flex-col items-center border ${selectedBody===i?'border-[#f97316] bg-[#18181b] text-white':'border-gray-700 bg-gray-900 text-gray-300'} font-semibold text-base focus:outline-none transition-all" data-body="${i}">
                <span class="text-2xl mb-1">${bodyIcon(i)}</span>
                ${type}
              </button>
            `).join('')}
          </div>
        </div>
        <div>
          <div class="flex gap-2 mb-3">
            ${catalog.categories.map((cat, i) => `
              <button type="button" class="rounded-lg px-4 py-2 text-base font-semibold ${selectedCategory===i?'bg-[#f97316] text-white':'bg-gray-800 text-gray-300'} focus:outline-none transition-all" data-cat="${i}">${cat.name}</button>
            `).join('')}
          </div>
          <div class="flex flex-col gap-2">
            ${catalog.categories[selectedCategory].services.map((srv, i) => `
              <button type="button" class="flex items-center justify-between w-full rounded-xl px-4 py-3 bg-gray-800 text-left ${selectedService===i?'ring-2 ring-[#f97316]':''} focus:outline-none transition-all group" data-srv="${i}">
                <span class="flex flex-col">
                  <span class="font-semibold text-white">${srv.name}</span>
                  <span class="text-sm text-gray-400">${srv.promo?'<span class=\'inline-block bg-[#f97316] text-xs text-white rounded px-2 py-0.5 mr-2\'>АКЦИЯ</span>':''}${catalog.bodyTypes[selectedBody]} — <span class="font-bold text-[#f97316]">${srv.prices[selectedBody]}₽</span></span>
                </span>
                <span class="ml-2 text-[#f97316] text-lg">{${selectedService===i?'✓':''}}</span>
              </button>
            `).join('')}
          </div>
        </div>
        <div class="flex flex-col gap-3 mt-4">
          <input name="name" type="text" required class="w-full rounded-lg bg-gray-900/90 text-white border border-gray-700 focus:ring-2 focus:ring-[#f97316] focus:border-[#f97316] outline-none px-4 py-3 placeholder-gray-400 transition-all duration-200" placeholder="Ваше имя">
          <input name="phone" type="tel" required class="w-full rounded-lg bg-gray-900/90 text-white border border-gray-700 focus:ring-2 focus:ring-[#f97316] focus:border-[#f97316] outline-none px-4 py-3 placeholder-gray-400 transition-all duration-200" placeholder="Телефон">
          <input name="car" type="text" required class="w-full rounded-lg bg-gray-900/90 text-white border border-gray-700 focus:ring-2 focus:ring-[#f97316] focus:border-[#f97316] outline-none px-4 py-3 placeholder-gray-400 transition-all duration-200" placeholder="Марка и модель авто">
        </div>
        <button type="submit" class="w-full py-3 rounded-lg bg-gradient-to-r from-[#f97316] to-[#fb923c] hover:from-[#fb923c] hover:to-[#f97316] text-white font-bold shadow-lg transition-all duration-200 transform hover:-translate-y-0.5 active:scale-95 focus:outline-none focus:ring-2 focus:ring-[#f97316] text-lg">Записаться на услугу за ${catalog.categories[selectedCategory].services[selectedService].prices[selectedBody]}₽</button>
        <div id="form-msg" class="text-center text-sm mt-2"></div>
      </form>
    `;
    // Кузова
    app.querySelectorAll('[data-body]').forEach(btn => {
      btn.onclick = e => { selectedBody = +btn.dataset.body; render(); };
    });
    // Категории
    app.querySelectorAll('[data-cat]').forEach(btn => {
      btn.onclick = e => { selectedCategory = +btn.dataset.cat; selectedService = 0; render(); };
    });
    // Услуги
    app.querySelectorAll('[data-srv]').forEach(btn => {
      btn.onclick = e => { selectedService = +btn.dataset.srv; render(); };
    });
    // Сабмит
    app.querySelector('#booking-form').onsubmit = async e => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const msg = app.querySelector('#form-msg');
      msg.textContent = '';
      try {
        const body = {
          name: fd.get('name'),
          phone: fd.get('phone'),
          car: fd.get('car'),
          bodyType: catalog.bodyTypes[selectedBody],
          category: catalog.categories[selectedCategory].name,
          service: catalog.categories[selectedCategory].services[selectedService].name,
          price: catalog.categories[selectedCategory].services[selectedService].prices[selectedBody]
        };
        const res = await fetch(BACKEND_URL + '/order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });
        const data = await res.json();
        if (data.success) {
          msg.textContent = 'Заявка успешно отправлена!';
          msg.className = 'text-green-400 text-center mt-2';
          e.target.reset();
        } else {
          msg.textContent = data.error || 'Ошибка отправки заявки';
          msg.className = 'text-red-400 text-center mt-2';
        }
      } catch {
        msg.textContent = 'Ошибка сервера';
        msg.className = 'text-red-400 text-center mt-2';
      }
    }
  }

  // Иконки кузова
  function bodyIcon(i) {
    return [
      '🚗', // Легковое авто
      '🚙', // Кроссовер
      '🚚', // Джип
      '🚐'  // Микроавтобус
    ][i] || '🚗';
  }
}

renderBookingForm();
