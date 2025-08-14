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
// getTelegramUser теперь глобально через window.getTelegramUser
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
      <button type="button" class="mb-4 text-base text-gray-400 hover:text-white transition flex items-center gap-2 back-btn btn-press animate-slide-up" style="align-self:flex-start"><span style="font-size:1.3em">←</span> На главную</button>
      <form id="booking-form" class="flex flex-col gap-6 animate-fade-in transition-all">
        <div>
          <div class="mb-2 text-base font-semibold text-gray-200">Тип кузова</div>
          <div class="grid grid-cols-2 gap-2 mb-4">
            ${catalog.bodyTypes.map((type, i) => `
              <button type="button" class="rounded-xl py-3 px-2 flex flex-col items-center border ${selectedBody===i?'border-[#f97316] bg-[#18181b] text-white':'border-gray-700 bg-gray-900 text-gray-300'} font-semibold text-base focus:outline-none transition-all btn-press animate-pop" data-body="${i}">
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
              <div class="w-full rounded-xl bg-gray-800 overflow-hidden animate-slide-up border border-gray-800 ${selectedService===i?'ring-2 ring-[#f97316]':''}">
                <button type="button" class="w-full px-4 py-3 text-left flex items-center justify-between focus:outline-none transition-all group" data-srv="${i}">
                  <span class="flex flex-col">
                    <span class="font-semibold text-white">${srv.name}</span>
                    <span class="text-sm text-gray-400">${srv.promo?'<span class=\'inline-block bg-[#f97316] text-xs text-white rounded px-2 py-0.5 mr-2\'>АКЦИЯ</span>':''}${catalog.bodyTypes[selectedBody]} — <span class="font-bold text-[#f97316]">${srv.prices[selectedBody]}₽</span>${srv.durationMinutes?` · <span class=\'text-gray-300\'>~${srv.durationMinutes} мин</span>`:''}</span>
                  </span>
                  <span class="ml-2 text-gray-300 text-lg flex items-center gap-2">
                    <span class="${selectedService===i?'text-[#f97316]':'text-gray-500]'}">${selectedService===i?'✓':''}</span>
                    ${srv.description?`<svg data-toggle="details" data-idx="${i}" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 ${srv._expanded?'rotate-180':''} transition-transform" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.084l3.71-3.853a.75.75 0 111.08 1.04l-4.24 4.4a.75.75 0 01-1.08 0l-4.24-4.4a.75.75 0 01.02-1.06z" clip-rule="evenodd"/></svg>`:''}
                  </span>
                </button>
                ${srv.description?`
                <div class="px-4 pb-3 ${srv._expanded?'':'hidden'} text-sm text-gray-300 bg-gray-900/50" data-details="${i}">
                  <div class="whitespace-pre-line">${srv.description}</div>
                </div>`:''}
              </div>
            `).join('')}
          </div>
        </div>
        <div class="flex flex-col gap-3 mt-4">
          <input name="name" type="text" required class="w-full rounded-lg bg-gray-900/90 text-white border border-gray-700 focus:ring-2 focus:ring-[#f97316] focus:border-[#f97316] outline-none px-4 py-3 placeholder-gray-400 transition-all duration-200" placeholder="Ваше имя" value="${window.userName || ''}">
          <input name="phone" type="tel" required class="w-full rounded-lg bg-gray-900/90 text-white border border-gray-700 focus:ring-2 focus:ring-[#f97316] focus:border-[#f97316] outline-none px-4 py-3 placeholder-gray-400 transition-all duration-200" placeholder="Телефон" value="${window.userPhone || ''}" maxlength="18" autocomplete="tel">
          <input name="car" type="text" required class="w-full rounded-lg bg-gray-900/90 text-white border border-gray-700 focus:ring-2 focus:ring-[#f97316] focus:border-[#f97316] outline-none px-4 py-3 placeholder-gray-400 transition-all duration-200" placeholder="Марка и модель авто" value="${window.userCar || ''}">
          <input name="plate" type="text" required class="w-full rounded-lg bg-gray-900/90 text-white border border-gray-700 focus:ring-2 focus:ring-[#f97316] focus:border-[#f97316] outline-none px-4 py-3 placeholder-gray-400 transition-all duration-200" placeholder="Госномер (например, А123ВС 178)" value="${window.userPlate || ''}">
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
    app.querySelector('.back-btn').onclick = () => {
  const appEl = document.getElementById('app');
  appEl.classList.add('animate-fade-out');
  setTimeout(() => {
    appEl.classList.remove('animate-fade-out');
    renderMainScreen();
  }, 220);
};
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
    // Тогглер описания
    app.querySelectorAll('svg[data-toggle="details"]').forEach(icon => {
      icon.addEventListener('click', (ev) => {
        ev.stopPropagation();
        const idx = +icon.getAttribute('data-idx');
        const srv = catalog.categories[selectedCategory].services[idx];
        srv._expanded = !srv._expanded;
        const details = app.querySelector(`[data-details="${idx}"]`);
        if (details) details.classList.toggle('hidden');
        icon.classList.toggle('rotate-180');
      });
    });
    // --- ПОЛЯ ФОРМЫ: сохраняем значения между рендерами ---
    if (typeof window.userName === 'undefined') window.userName = '';
    if (typeof window.userPhone === 'undefined') window.userPhone = '';
    if (typeof window.userCar === 'undefined') window.userCar = '';
    if (typeof window.userPlate === 'undefined') window.userPlate = '';
    const form = app.querySelector('#booking-form');
    form.querySelector('[name=name]').oninput = e => { window.userName = e.target.value; };
    // Маска телефона: +7 (___) ___-__-__ или 8 (___) ___-__-__
    const phoneInput = form.querySelector('[name=phone]');
    phoneInput.addEventListener('input', (e) => {
      let val = e.target.value.replace(/\D/g, '');
      if (val.startsWith('8')) {
        val = '8' + val.slice(1, 11);
      } else if (val.startsWith('7')) {
        val = '+7' + val.slice(1, 11);
      } else if (val.startsWith('9')) {
        val = '+7' + val;
      }
      let formatted = '';
      if (val.startsWith('+7')) {
        formatted = '+7';
        if (val.length > 2) formatted += ' (' + val.slice(2, 5);
        if (val.length >= 5) formatted += ') ' + val.slice(5, 8);
        if (val.length >= 8) formatted += '-' + val.slice(8, 10);
        if (val.length >= 10) formatted += '-' + val.slice(10, 12);
      } else if (val.startsWith('8')) {
        formatted = '8';
        if (val.length > 1) formatted += ' (' + val.slice(1, 4);
        if (val.length >= 4) formatted += ') ' + val.slice(4, 7);
        if (val.length >= 7) formatted += '-' + val.slice(7, 9);
        if (val.length >= 9) formatted += '-' + val.slice(9, 11);
      } else {
        formatted = val;
      }
      e.target.value = formatted;
      window.userPhone = e.target.value;
    });
    form.querySelector('[name=phone]').onblur = e => {
      // Если номер невалиден — подсветить и показать текст
      let val = e.target.value.replace(/\D/g, '');
      const phoneField = e.target;
      let msg = form.querySelector('.phone-error-msg');
      if (!msg) {
        msg = document.createElement('div');
        msg.className = 'phone-error-msg text-red-400 text-xs mt-1';
        phoneField.parentNode.appendChild(msg);
      }
      if (!(val.length === 11 && (val.startsWith('7') || val.startsWith('8')))) {
        phoneField.classList.add('border-red-500','focus:ring-red-500','animate-pop');
        msg.textContent = 'Введите корректный номер';
        msg.classList.add('animate-slide-up');
        setTimeout(()=>msg.classList.remove('animate-slide-up'),400);
      } else {
        phoneField.classList.remove('border-red-500','focus:ring-red-500');
        msg.textContent = '';
        msg.classList.remove('animate-slide-up');
      }
    };
    form.querySelector('[name=phone]').oninput = e => { window.userPhone = e.target.value; };

    form.querySelector('[name=car]').oninput = e => { window.userCar = e.target.value; };
    // --- Маска и валидация госномера ---
    const plateInput = form.querySelector('[name=plate]');
    const latinToCyrMap = {
      'A':'А','B':'В','C':'С','E':'Е','H':'Н','K':'К','M':'М','O':'О','P':'Р','T':'Т','X':'Х'
    };
    const toCyrillic = (s) => s.replace(/[ABCEHKMOPTUX]/g, ch => latinToCyrMap[ch] || ch);
    const ruLetter = /[АВЕКМНОРСТУХ]/;
    const cleanPlate = (s) => {
      // Uppercase, map latin to cyrillic, keep only RU letters, digits (remove user spaces)
      s = (s || '').toUpperCase();
      s = toCyrillic(s);
      return s.replace(/[^АВЕКМНОРСТУХ0-9]/g, '');
    };
    const formatPlate = (s) => {
      const raw = cleanPlate(s);
      if (!raw) return '';
      // Decide pattern by first two chars
      const firstIsL = ruLetter.test(raw[0] || '');
      const secondIsL = ruLetter.test(raw[1] || '');
      // Pattern 1: L DDD LL REG
      if (firstIsL && (!secondIsL || (secondIsL && /\d/.test(raw[2] || '')))) {
        let i = 0;
        const L1 = (raw[i] && ruLetter.test(raw[i])) ? raw[i++] : '';
        let D3 = '';
        while (i < raw.length && /\d/.test(raw[i]) && D3.length < 3) D3 += raw[i++];
        let LL = '';
        while (i < raw.length && ruLetter.test(raw[i]) && LL.length < 2) LL += raw[i++];
        let REG = '';
        while (i < raw.length && /\d/.test(raw[i]) && REG.length < 3) REG += raw[i++];
        let out = L1;
        if (D3) out += (out?' ':'') + D3;
        if (LL) out += ' ' + LL;
        if (REG) out += ' ' + REG;
        return out;
      }
      // Pattern 2: LL DDDD REG
      let i = 0;
      let LL = '';
      while (i < raw.length && ruLetter.test(raw[i]) && LL.length < 2) LL += raw[i++];
      let D4 = '';
      while (i < raw.length && /\d/.test(raw[i]) && D4.length < 4) D4 += raw[i++];
      let REG = '';
      while (i < raw.length && /\d/.test(raw[i]) && REG.length < 3) REG += raw[i++];
      let out = LL;
      if (D4) out += (out?' ':'') + D4;
      if (REG) out += ' ' + REG;
      return out;
    };
    const plateRegex = /^((([АВЕКМНОРСТУХ] [0-9]{3} [АВЕКМНОРСТУХ]{2})|([АВЕКМНОРСТУХ]{2} [0-9]{4})) [0-9]{2,3})$/;
    plateInput.addEventListener('input', (e) => {
      const v = formatPlate(e.target.value);
      e.target.value = v;
      window.userPlate = v;
    });
    // Disallow manual spaces and sanitize paste
    plateInput.addEventListener('keydown', (e) => {
      if (e.key === ' ') e.preventDefault();
    });
    plateInput.addEventListener('paste', (e) => {
      setTimeout(() => {
        e.target.value = formatPlate(e.target.value);
        window.userPlate = e.target.value;
      }, 0);
    });
    plateInput.addEventListener('blur', (e) => {
      const val = (e.target.value || '').trim();
      // Пустое поле допустимо, но если заполнено — валидируем по маске
      let msg = form.querySelector('.plate-error-msg');
      if (!msg) {
        msg = document.createElement('div');
        msg.className = 'plate-error-msg text-red-400 text-xs mt-1';
        plateInput.parentNode.appendChild(msg);
      }
      if (val && !plateRegex.test(val)) {
        plateInput.classList.add('border-red-500','focus:ring-red-500','animate-pop');
        msg.textContent = 'Формат номера: А 123 ВС 78/178 или АВ 1234 78/178 (только русские буквы)';
      } else {
        plateInput.classList.remove('border-red-500','focus:ring-red-500');
        msg.textContent = '';
      }
    });
    // --- КАЛЕНДАРЬ + GRID ВРЕМЕНИ (Flowbite style) ---
    // Состояния — выносим selectedDate/selectedTime во внешний scope, чтобы не сбрасывались между рендерами
    // Всегда вычисляем московскую сегодняшнюю дату
    const todayStr = new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/Moscow' })).toISOString().slice(0,10);
    if (typeof window.selectedDate === 'undefined' || window.selectedDate === null) window.selectedDate = todayStr;
    if (typeof window.selectedTime === 'undefined') window.selectedTime = null;
    let selectedDate = window.selectedDate;
    let selectedTime = window.selectedTime;
    // Генерируем 7 дней вперёд, лаконичные подписи
    const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/Moscow' }));
    const pad = n => n.toString().padStart(2, '0');
    const dates = [];
    const weekDays = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];
    const monthShort = ['янв.', 'февр.', 'марта', 'апр.', 'мая', 'июня', 'июля', 'авг.', 'сент.', 'окт.', 'нояб.', 'дек.'];
    for (let i = 0; i < 7; i++) {
      const d = new Date(now);
      d.setDate(now.getDate() + i);
      let label = i === 0 ? 'Сегодня' : (i === 1 ? 'Завтра' : `${weekDays[d.getDay()]}, ${d.getDate()} ${monthShort[d.getMonth()]}`);
      dates.push({
        value: d.toISOString().slice(0,10),
        label
      });
    }
    // Рендер календаря — центрируем, gap 3, min-w
    const datepicker = app.querySelector('#datepicker');
    datepicker.className = "flex flex-wrap justify-center gap-3";
    datepicker.innerHTML = dates.map((d, i) => `
      <button type="button" class="min-w-[90px] px-3 py-2 rounded-lg border text-sm font-semibold transition-all focus:outline-none ${selectedDate===d.value?'bg-[#f97316] border-[#f97316] text-white':'bg-gray-900 border-gray-700 text-gray-200 hover:border-[#f97316] hover:text-[#f97316]'}" data-date="${d.value}">${d.label}</button>
    `).join('');
    datepicker.querySelectorAll('button').forEach(btn => {
      btn.onclick = () => {
        selectedDate = btn.dataset.date;
        window.selectedDate = selectedDate;
        // Не сбрасываем выбранное время при смене даты
        render();
      };
    });
    // Время — круглосуточно, шаг 60 мин (00:00–23:00)
    const timegrid = app.querySelector('#timegrid');
    let times = [];
    for (let h = 0; h < 24; h++) {
      times.push(`${pad(h)}:00`);
    }
    let showAllTimes = false;
    // Добавляем вертикальный скролл для timegrid
    timegrid.className = "grid grid-cols-3 gap-2 max-h-72 md:max-h-96 overflow-y-auto scroll-smooth";
    timegrid.style.scrollBehavior = 'smooth';
    function renderTimes() {
      // Пересчитываем now и всё, что зависит от времени, при каждом рендере
      const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/Moscow' }));
      const todayStr = now.toISOString().slice(0,10);
      let isToday = selectedDate === todayStr;
      let currentMinutes = now.getHours() * 60 + now.getMinutes();
      let nextSlotIdx = times.findIndex(t => {
        let [h, m] = t.split(':').map(Number);
        return h * 60 + m > currentMinutes;
      });
      if (nextSlotIdx === -1) nextSlotIdx = 0;
      let visibleTimes;
      if (isToday) {
        visibleTimes = times.filter((t, idx) => idx >= nextSlotIdx);
      } else {
        visibleTimes = times;
      }
      let html = visibleTimes.map((t, i) => {
        let [h, m] = t.split(':').map(Number);
        // Не выделяем ночные часы, все одинаково яркие
        let isPast = isToday && (h * 60 + m <= currentMinutes);
        let classes = [
          'py-2 rounded-lg border text-sm font-semibold transition-all focus:outline-none',
          selectedTime===t ? 'bg-[#f97316] border-[#f97316] text-white' : 'bg-gray-900 border-gray-700 text-gray-200 hover:border-[#f97316] hover:text-[#f97316]',
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
          window.selectedTime = selectedTime;
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
    // Сабмит формы заявки (только один обработчик)
    app.querySelector('#booking-form').onsubmit = async e => {
      e.preventDefault();
      const msg = app.querySelector('#form-msg');
      msg.textContent = '';
      msg.className = 'text-center text-sm mt-2';
      // Проверка выбора даты и времени
      if (!selectedDate || !selectedTime) {
        msg.textContent = 'Пожалуйста, выберите дату и время';
        msg.className = 'text-red-400 text-center mt-2';
        return;
      }
      // Валидация телефона (маска)
      const phoneVal = app.querySelector('input[name="phone"]').value.replace(/\D/g, '');
      if (!(phoneVal.length === 11 && (phoneVal.startsWith('7') || phoneVal.startsWith('8')))) {
        msg.textContent = 'Введите корректный номер: +7 (XXX) XXX-XX-XX или 8 (XXX) XXX-XX-XX';
        msg.className = 'text-red-400 text-center mt-2';
        return;
      }
      // Валидация госномера (обязательно, с регионом)
      const plateVal = (app.querySelector('input[name="plate"]').value || '').trim();
      const plateRegex = /^((([АВЕКМНОРСТУХ] [0-9]{3} [АВЕКМНОРСТУХ]{2})|([АВЕКМНОРСТУХ]{2} [0-9]{4})) [0-9]{2,3})$/;
      if (!plateRegex.test(plateVal)) {
        msg.textContent = 'Введите корректный госномер: А 123 ВС 78/178 или АВ 1234 78/178 (только русские буквы)';
        msg.className = 'text-red-400 text-center mt-2';
        plateInput.classList.add('border-red-500','focus:ring-red-500','animate-pop');
        return;
      }
      const fd = new FormData(e.target);
      // Добавляем Telegram user info, если доступно
      const tgUser = window.getTelegramUser ? window.getTelegramUser() : {};
      const body = {
        name: fd.get('name'),
        phone: fd.get('phone'),
        car: fd.get('car'),
        plate: fd.get('plate') || '',
        bodyType: catalog.bodyTypes[selectedBody],
        category: catalog.categories[selectedCategory].name,
        service: catalog.categories[selectedCategory].services[selectedService].name,
        price: catalog.categories[selectedCategory].services[selectedService].prices[selectedBody],
        date: selectedDate,
        time: selectedTime,
        tg_user_id: tgUser.tg_user_id,
        tg_username: tgUser.tg_username,
        tg_first_name: tgUser.tg_first_name,
        tg_last_name: tgUser.tg_last_name
      };
      try {
        const res = await fetch(BACKEND_URL + '/order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });
        const data = await res.json();
        if (data.success) {
          showOrderSuccessModal();
          msg.textContent = 'Заявка успешно отправлена!';
          msg.className = 'text-green-400 text-center mt-2';
          e.target.reset();
          selectedDate = null;
          selectedTime = null;
          window.selectedDate = null;
          window.selectedTime = null;
          datepicker.querySelectorAll('button').forEach(b => b.classList.remove('bg-[#f97316]', 'border-[#f97316]', 'text-white'));
          timegrid.querySelectorAll('button').forEach(b => b.classList.remove('bg-[#f97316]', 'border-[#f97316]', 'text-white'));
        } else {
          msg.textContent = data.error || 'Ошибка отправки заявки';
          msg.className = 'text-red-400 text-center mt-2';
        }
      } catch {
        msg.textContent = 'Ошибка сервера';
        msg.className = 'text-red-400 text-center mt-2';
      }
    };

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
    <div class="min-h-screen flex flex-col justify-between items-center w-full animate-fade-in" style="background: linear-gradient(180deg, #23272f 0%, #18181b 100%);">
      <div class="w-full max-w-md mx-auto flex flex-col gap-8 py-8 px-4 animate-slide-up">
        <div class="flex flex-col items-center gap-2">
          <div class="w-32 h-32 rounded-full bg-[#18181b] flex items-center justify-center mb-2">
            <img src="h2o_logo.png" alt="H2O logo" class="w-28 h-28 object-contain">
          </div>
          <div class="text-2xl font-extrabold text-white tracking-wide drop-shadow mb-1">H<sub class='text-base align-super text-[#f97316]'>2</sub>O <span class="text-base font-semibold text-gray-300 ml-1">автомойка 24/7</span></div>
          <div class="text-gray-400 text-base font-medium mb-2">Чисто. Быстро. Удобно.</div>
        </div>
        <button class="w-full py-3 rounded-xl bg-[#f97316] text-white text-lg font-semibold shadow-sm hover:bg-[#fb923c] active:scale-95 transition mb-2 btn-glow animate-pop" id="main-booking-btn">Записаться на мойку</button>
        <button id="review-btn" class="w-full py-3 rounded-xl bg-white text-gray-900 text-base font-medium shadow-sm hover:bg-gray-100 active:scale-95 transition mb-2 flex items-center justify-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 17.75l-6.172 3.243 1.179-6.873-5-4.873 6.9-1.002L12 2.25l3.093 6.995 6.9 1.002-5 4.873 1.179 6.873z"/></svg>
          Оставить отзыв
        </button>
        <a href="https://t.me/+79669399900" target="_blank" rel="noopener noreferrer"
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
  if (btn) btn.onclick = () => {
    const appEl = document.getElementById('app');
    appEl.classList.add('animate-fade-out');
    setTimeout(() => {
      appEl.classList.remove('animate-fade-out');
      renderBookingForm();
    }, 220);
  };
  
  // Обработчик для кнопки "Оставить отзыв"
  const reviewBtn = document.getElementById('review-btn');
  if (reviewBtn) {
    reviewBtn.onclick = () => {
      const modal = document.getElementById('review-modal');
      if (modal) {
        modal.classList.remove('modal-leave','hidden');
        modal.classList.add('animate-fade-in');
        setTimeout(()=>modal.classList.remove('animate-fade-in'),400);
      }
    };
  }
}

// --- Модалка "Спасибо за заявку" ---
function showOrderSuccessModal() {
  // Проверяем, есть ли уже модалка
  let modal = document.getElementById('order-success-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'order-success-modal';
    modal.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm premium-blur';
    modal.innerHTML = `
      <div class="bg-[#23272f] rounded-2xl shadow-xl p-7 w-full max-w-xs flex flex-col gap-4 relative animate-fade-in border border-[#f97316]/30 modal-premium">
        <button id="close-order-success-modal" class="absolute top-3 right-3 text-gray-400 hover:text-white text-2xl leading-none">&times;</button>
        <div class="text-xl font-bold text-white mb-2 text-center">Спасибо за заявку!</div>
        <div class="text-gray-300 text-center mb-2">Наш оператор свяжется с вами для подтверждения бронирования.</div>
      </div>
    `;
    document.body.appendChild(modal);
  } else {
    modal.classList.remove('hidden');
modal.classList.add('animate-fade-in');
setTimeout(()=>modal.classList.remove('animate-fade-in'),400);
  }
  // Кнопка закрытия
  document.getElementById('close-order-success-modal').onclick = () => {
    modal.classList.add('animate-fade-out');
    setTimeout(()=>{
      modal.classList.remove('animate-fade-out');
      modal.classList.add('hidden');
      renderMainScreen();
    },220);
  };
  // Клик вне окна — тоже закрыть
  modal.onclick = (e) => {
    if (e.target === modal) {
      modal.classList.add('animate-fade-out');
      setTimeout(()=>{
        modal.classList.remove('animate-fade-out');
        modal.classList.add('hidden');
        const appEl = document.getElementById('app');
        appEl.classList.add('animate-fade-in');
        setTimeout(()=>appEl.classList.remove('animate-fade-in'),400);
        renderMainScreen();
      },220);
    }
  };
}

// Показываем главный экран при загрузке
window.addEventListener('DOMContentLoaded', () => {
  const app = document.getElementById('app');
  app.classList.add('transition-all');
  renderMainScreen();
});
