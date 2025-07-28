// Логика для фронтенда: форма записи, мобильная, тёмная, всё на русском
const api = (path, opts = {}) => fetch('http://localhost:3001' + path, opts).then(r => r.json());

async function renderBookingForm() {
  const app = document.getElementById('app');
  let services = [];
  let dates = [];
  let times = [];
  let selectedDate = '';
  let selectedTime = '';
  let selectedService = '';

  try {
    services = await api('/services');
    dates = await api('/available-dates');
  } catch {
    app.innerHTML = '<p class="text-red-400 text-center">Ошибка загрузки данных</p>';
    return;
  }
  if (!services.length) {
    app.innerHTML = '<p class="text-center text-gray-400">Пока нет доступных услуг.</p>';
    return;
  }
  if (!dates.length) {
    app.innerHTML = '<p class="text-center text-gray-400">Нет доступных дат для записи.</p>';
    return;
  }
  selectedDate = dates[0];
  times = await api(`/available-times?date=${encodeURIComponent(selectedDate)}`);
  selectedTime = times[0] || '';
  selectedService = services[0].name;

  app.innerHTML = `
    <form id="booking-form" class="flex flex-col gap-6">
      <div class="relative">
        <select name="service" class="peer w-full rounded-lg bg-gray-900/90 text-white border border-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none px-4 py-3 appearance-none transition-all duration-200">
          ${services.map(s => `<option value="${s.name}">${s.name} — ${s.price}₽ / ${s.duration} мин</option>`).join('')}
        </select>
        <label class="absolute left-4 top-1 text-xs text-gray-400 pointer-events-none transition-all duration-200 peer-focus:text-blue-400">Услуга</label>
      </div>
      <div class="relative">
        <select name="date" class="peer w-full rounded-lg bg-gray-900/90 text-white border border-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none px-4 py-3 appearance-none transition-all duration-200">
          ${dates.map(d => `<option value="${d}">${d}</option>`).join('')}
        </select>
        <label class="absolute left-4 top-1 text-xs text-gray-400 pointer-events-none transition-all duration-200 peer-focus:text-blue-400">Дата</label>
      </div>
      <div class="relative">
        <select name="time" class="peer w-full rounded-lg bg-gray-900/90 text-white border border-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none px-4 py-3 appearance-none transition-all duration-200">
          ${times.map(t => `<option value="${t}">${t}</option>`).join('')}
        </select>
        <label class="absolute left-4 top-1 text-xs text-gray-400 pointer-events-none transition-all duration-200 peer-focus:text-blue-400">Время</label>
      </div>
      <div class="relative">
        <input name="name" type="text" required class="peer w-full rounded-lg bg-gray-900/90 text-white border border-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none px-4 py-3 placeholder-transparent transition-all duration-200" placeholder="Ваше имя">
        <label class="absolute left-4 top-1 text-xs text-gray-400 pointer-events-none transition-all duration-200 peer-focus:text-blue-400">Имя</label>
      </div>
      <div class="relative">
        <input name="phone" type="tel" required class="peer w-full rounded-lg bg-gray-900/90 text-white border border-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none px-4 py-3 placeholder-transparent transition-all duration-200" placeholder="+7...">
        <label class="absolute left-4 top-1 text-xs text-gray-400 pointer-events-none transition-all duration-200 peer-focus:text-blue-400">Телефон</label>
      </div>
      <div class="relative">
        <input name="car" type="text" required class="peer w-full rounded-lg bg-gray-900/90 text-white border border-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none px-4 py-3 placeholder-transparent transition-all duration-200" placeholder="Марка и модель">
        <label class="absolute left-4 top-1 text-xs text-gray-400 pointer-events-none transition-all duration-200 peer-focus:text-blue-400">Авто</label>
      </div>
      <button type="submit" class="w-full py-3 rounded-lg bg-gradient-to-r from-blue-600 via-cyan-500 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold shadow-lg transition-all duration-200 transform hover:-translate-y-0.5 active:scale-95 focus:outline-none focus:ring-2 focus:ring-blue-500">Записаться</button>
      <div id="form-msg" class="text-center text-sm mt-2"></div>
    </form>
  `;

  // Смена даты — обновить время
  app.querySelector('select[name="date"]').addEventListener('change', async e => {
    const date = e.target.value;
    const timeSel = app.querySelector('select[name="time"]');
    const newTimes = await api(`/available-times?date=${encodeURIComponent(date)}`);
    timeSel.innerHTML = newTimes.map(t => `<option value="${t}">${t}</option>`).join('');
  });

  // Сабмит формы
  app.querySelector('#booking-form').addEventListener('submit', async e => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const body = {
      services: fd.get('service'),
      date: fd.get('date'),
      time: fd.get('time'),
      name: fd.get('name'),
      phone: fd.get('phone'),
      car: fd.get('car')
    };
    const msg = app.querySelector('#form-msg');
    msg.textContent = '';
    try {
      const res = await fetch('http://localhost:3001/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (data.success) {
        msg.textContent = 'Запись успешно создана!';
        msg.className = 'text-green-400 text-center mt-2';
        e.target.reset();
      } else {
        msg.textContent = data.error || 'Ошибка записи';
        msg.className = 'text-red-400 text-center mt-2';
      }
    } catch {
      msg.textContent = 'Ошибка сервера';
      msg.className = 'text-red-400 text-center mt-2';
    }
  });
}

renderBookingForm();
