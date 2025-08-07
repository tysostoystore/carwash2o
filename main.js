// Логика для фронтенда: форма записи, мобильная, тёмная, всё на русском

// Обработчик главной кнопки записи
window.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('main-booking-btn');
  if (btn) btn.onclick = () => renderBookingForm();
});
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
    catalog = await api('/catalog');
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
      <button type="button" class="mb-4 text-base text-gray-400 hover:text-white transition flex items-center gap-2 back-btn btn-press" style="align-self:flex-start"><span style="font-size:1.3em">←</span> На главную</button>
      <form id="booking-form" class="flex flex-col gap-6 animate-fade-in">
        <div>
          <div class="mb-2 text-base font-semibold text-gray-200">Тип кузова</div>
          <div class="grid grid-cols-2 gap-2 mb-4">
            ${catalog.bodyTypes.map((type, i) => `
              <button type="button" class="rounded-xl py-3 px-2 flex flex-col items-center border ${selectedBody===i?'border-[#f97316] bg-[#18181b] text-white':'border-gray-700 bg-gray-900 text-gray-300'} font-semibold text-base focus:outline-none transition-all btn-press" data-body="${i}">
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
                <span class="ml-2 text-[#f97316] text-lg">${selectedService===i?'✓':''}</span>
              </button>
            `).join('')}
          </div>
        </div>
        <div class="flex flex-col gap-3 mt-4">
          <input name="name" type="text" required class="w-full rounded-lg bg-gray-900/90 text-white border border-gray-700 focus:ring-2 focus:ring-[#f97316] focus:border-[#f97316] outline-none px-4 py-3 placeholder-gray-400 transition-all duration-200" placeholder="Ваше имя">
          <input name="phone" type="tel" required class="w-full rounded-lg bg-gray-900/90 text-white border border-gray-700 focus:ring-2 focus:ring-[#f97316] focus:border-[#f97316] outline-none px-4 py-3 placeholder-gray-400 transition-all duration-200" placeholder="Телефон">
          <input name="car" type="text" required class="w-full rounded-lg bg-gray-900/90 text-white border border-gray-700 focus:ring-2 focus:ring-[#f97316] focus:border-[#f97316] outline-none px-4 py-3 placeholder-gray-400 transition-all duration-200" placeholder="Марка и модель авто">
          <div class="flex flex-col gap-2">
            <div>
              <div class="mb-2 text-base font-semibold text-gray-200">Дата</div>
              <div id="datepicker" class="flex flex-wrap gap-2"></div>
            </div>
            <div>
              <div class="mb-2 text-base font-semibold text-gray-200">Время</div>
              <div id="timegrid" class="grid grid-cols-3 gap-2"></div>
            </div>
          </div>
        </div>
        <button type="submit" class="w-full py-3 rounded-lg bg-gradient-to-r from-[#f97316] to-[#fb923c] hover:from-[#fb923c] hover:to-[#f97316] text-white font-bold shadow-lg transition-all duration-200 transform hover:-translate-y-0.5 active:scale-95 focus:outline-none focus:ring-2 focus:ring-[#f97316] text-lg">Записаться на услугу за ${catalog.categories[selectedCategory].services[selectedService].prices[selectedBody]}₽</button>
        <div id="form-msg" class="text-center text-sm mt-2"></div>
      </form>
    `;
    // Назад на главную
    app.querySelector('.back-btn').onclick = () => renderMainScreen();
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
    // --- КАЛЕНДАРЬ + GRID ВРЕМЕНИ (Flowbite style) ---
    // Состояния
    let selectedDate = null;
    let selectedTime = null;
    // Генерируем 7 дней вперёд
    const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/Moscow' }));
    const pad = n => n.toString().padStart(2, '0');
    const dates = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(now);
      d.setDate(now.getDate() + i);
      let label = i === 0 ? 'Сегодня' : (i === 1 ? 'Завтра' : d.toLocaleDateString('ru-RU', { weekday: 'short', day: 'numeric', month: 'short' }));
      dates.push({
        value: d.toISOString().slice(0,10),
        label: label + ' ' + d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
      });
    }
    // Рендер календаря
    const datepicker = app.querySelector('#datepicker');
    datepicker.innerHTML = dates.map((d, i) => `
      <button type="button" class="px-3 py-2 rounded-lg border text-sm font-semibold transition-all focus:outline-none ${selectedDate===d.value?'bg-[#f97316] border-[#f97316] text-white':'bg-gray-900 border-gray-700 text-gray-200 hover:border-[#f97316] hover:text-[#f97316]'}" data-date="${d.value}">${d.label}</button>
    `).join('');
    datepicker.querySelectorAll('button').forEach(btn => {
      btn.onclick = () => {
        selectedDate = btn.dataset.date;
        // Перерисовать календарь для подсветки
        datepicker.querySelectorAll('button').forEach(b => b.classList.remove('bg-[#f97316]', 'border-[#f97316]', 'text-white'));
        btn.classList.add('bg-[#f97316]', 'border-[#f97316]', 'text-white');
      };
    });
    // Время — круглосуточно, шаг 30 мин (00:00–23:30)
    const timegrid = app.querySelector('#timegrid');
    let times = [];
    for (let h = 0; h < 24; h++) {
      times.push(`${pad(h)}:00`);
      times.push(`${pad(h)}:30`);
    }
    // Используем уже объявленный now выше
    let isToday = selectedDate === now.toISOString().slice(0,10);
    let currentMinutes = now.getHours() * 60 + now.getMinutes();
    let nextSlotIdx = times.findIndex(t => {
      let [h, m] = t.split(':').map(Number);
      return h * 60 + m > currentMinutes;
    });
    if (nextSlotIdx === -1) nextSlotIdx = 0;
    // По умолчанию показываем только ближайшие 12 часов (24 слота)
    let showAllTimes = false;
    function renderTimes() {
      let visibleTimes = showAllTimes ? times : times.slice(nextSlotIdx, nextSlotIdx + 24);
      let html = visibleTimes.map((t, i) => {
        let [h, m] = t.split(':').map(Number);
        let isNight = h < 7 || h >= 22;
        let isPast = isToday && (h * 60 + m <= currentMinutes);
        let classes = [
          'py-2 rounded-lg border text-sm font-semibold transition-all focus:outline-none',
          selectedTime===t ? 'bg-[#f97316] border-[#f97316] text-white' : 'bg-gray-900 border-gray-700 text-gray-200 hover:border-[#f97316] hover:text-[#f97316]',
          isNight ? 'opacity-60' : '',
          isPast ? 'opacity-30 pointer-events-none' : ''
        ].join(' ');
        return `<button type="button" class="${classes}" data-time="${t}" ${isPast?'disabled':''}>${t}</button>`;
      }).join('');
      if (!showAllTimes && times.length - nextSlotIdx > 24) {
        html += `<button type="button" class="col-span-3 py-2 mt-2 rounded-lg border border-gray-700 text-gray-400 hover:text-[#f97316] hover:border-[#f97316] transition" id="show-all-times">Показать все слоты</button>`;
      }
      timegrid.innerHTML = html;
      timegrid.querySelectorAll('button[data-time]').forEach(btn => {
        btn.onclick = () => {
          selectedTime = btn.dataset.time;
          renderTimes();
        };
      });
      const showAllBtn = timegrid.querySelector('#show-all-times');
      if (showAllBtn) {
        showAllBtn.onclick = () => {
          showAllTimes = true;
          renderTimes();
        };
      }
    }
    renderTimes();
    // --- END КАЛЕНДАРЬ + GRID ---
    // Сабмит
    app.querySelector('#booking-form').onsubmit = async e => {
      e.preventDefault();
      if (!selectedDate || !selectedTime) {
        document.getElementById('form-msg').textContent = 'Пожалуйста, выберите дату и время';
        return;
      }
      // Добавляем выбранные дату и время в FormData
      const fd = new FormData(app.querySelector('#booking-form'));
      fd.set('date', selectedDate);
      fd.set('time', selectedTime);
      // Отправка заявки
      try {
        const res = await fetch(BACKEND_URL + '/orders', {
          method: 'POST',
          body: fd
        });
        const result = await res.json();
        if (result.success) {
          document.getElementById('form-msg').textContent = 'Заявка успешно отправлена!';
          // Очистить выбор
          selectedDate = null;
          selectedTime = null;
          datepicker.querySelectorAll('button').forEach(b => b.classList.remove('bg-[#f97316]', 'border-[#f97316]', 'text-white'));
          timegrid.querySelectorAll('button').forEach(b => b.classList.remove('bg-[#f97316]', 'border-[#f97316]', 'text-white'));
          app.querySelector('#booking-form').reset();
        } else {
          document.getElementById('form-msg').textContent = result.error || 'Ошибка отправки';
        }
      } catch {
        document.getElementById('form-msg').textContent = 'Ошибка сервера';
      }
    };
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
          price: catalog.categories[selectedCategory].services[selectedService].prices[selectedBody],
          date: app.querySelector('select[name="date"]').value,
          time: app.querySelector('select[name="time"]').value
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

// Главный экран (рендерим то, что в index.html внутри #app)
function renderMainScreen() {
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="min-h-screen flex flex-col justify-between items-center w-full" style="background: linear-gradient(180deg, #23272f 0%, #18181b 100%);">
      <div class="w-full max-w-md mx-auto flex flex-col gap-8 py-8 px-4">
        <div class="flex flex-col items-center gap-2">
          <div class="w-32 h-32 rounded-full bg-[#18181b] flex items-center justify-center mb-2">
            <img src="h2o_logo.png" alt="H2O logo" class="w-28 h-28 object-contain">
          </div>
          <div class="text-2xl font-extrabold text-white tracking-wide drop-shadow mb-1">H<sub class='text-base align-super text-[#f97316]'>2</sub>O <span class="text-base font-semibold text-gray-300 ml-1">автомойка 24/7</span></div>
          <div class="text-gray-400 text-base font-medium mb-2">Чисто. Быстро. Удобно.</div>
        </div>
        <button class="w-full py-3 rounded-xl bg-[#f97316] text-white text-lg font-semibold shadow-sm hover:bg-[#fb923c] active:scale-95 transition mb-2 btn-glow" id="main-booking-btn">Записаться на мойку</button>
        <button id="review-btn" class="w-full py-3 rounded-xl bg-white text-gray-900 text-base font-medium shadow-sm hover:bg-gray-100 active:scale-95 transition mb-2 flex items-center justify-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 17.75l-6.172 3.243 1.179-6.873-5-4.873 6.9-1.002L12 2.25l3.093 6.995 6.9 1.002-5 4.873 1.179 6.873z"/></svg>
          Оставить отзыв
        </button>
        <a href="http://t.me/tysostoystore" target="_blank" rel="noopener noreferrer"
          class="w-full py-3 rounded-xl bg-white text-gray-900 text-base font-medium shadow-sm hover:bg-gray-100 active:scale-95 transition flex items-center justify-center gap-2 no-underline">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z"/></svg>
          Связаться с оператором
        </a>
      </div>
      <div class="w-full max-w-md mx-auto mb-6">
        <div class="bg-[#23272f] rounded-xl p-4 flex flex-col gap-2 text-white text-base font-medium">
          <div class="flex items-center gap-2"><svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><circle cx="12" cy="12" r="9" stroke-width="2"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 7v5l3 2.5"/></svg> Работаем круглосуточно</div>
          <div class="flex items-center gap-2"><svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5A2.5 2.5 0 1 1 12 6a2.5 2.5 0 0 1 0 5.5z"/></svg> Санкт-Петербург, Кузнецовская 60</div>
          <div class="flex items-center gap-2"><svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-[#f97316] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M22 16.92v3a2 2 0 0 1-2.18 2A19.79 19.79 0 0 1 3.09 5.18 2 2 0 0 1 5 3h3a2 2 0 0 1 2 1.72c.13.81.36 1.6.68 2.34a2 2 0 0 1-.45 2.11l-1.27 1.27a16.06 16.06 0 0 0 6.18 6.18l1.27-1.27a2 2 0 0 1 2.11-.45c.74.32 1.53.55 2.34.68A2 2 0 0 1 22 16.92z"/></svg> <a href="tel:+79669399000" class="text-[#f97316] underline hover:text-white transition">+7 (966) 939-90-00</a></div>
        </div>
      </div>
    </div>
  `;
  // Повторно назначаем обработчик для кнопки записи
  const btn = document.getElementById('main-booking-btn');
  if (btn) btn.onclick = renderBookingForm;
  
  // Обработчик для кнопки "Оставить отзыв"
  const reviewBtn = document.getElementById('review-btn');
  if (reviewBtn) {
    reviewBtn.onclick = () => {
      const modal = document.getElementById('review-modal');
      if (modal) {
        modal.classList.remove('modal-leave');
        modal.classList.remove('hidden');
      }
    };
  }
}

// Показываем главный экран при загрузке
window.addEventListener('DOMContentLoaded', renderMainScreen);
