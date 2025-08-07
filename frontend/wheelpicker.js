// Кастомный wheel picker для выбора даты и времени
// Используется чистый JS, Tailwind, без сторонних зависимостей

class WheelPicker {
  constructor({ trigger, title, wheels, onSelect }) {
    this.trigger = trigger;
    this.title = title;
    this.wheels = wheels; // [{ data: [...] }, ...]
    this.onSelect = onSelect;
    this.selected = wheels.map(() => 0);
    this.createModal();
    this.attachTrigger();
  }

  attachTrigger() {
    this.trigger.addEventListener('click', () => this.show());
  }

  createModal() {
    // Remove if exists
    const old = document.getElementById('wheelpicker-modal');
    if (old) old.remove();
    // Modal wrapper
    this.modal = document.createElement('div');
    this.modal.id = 'wheelpicker-modal';
    this.modal.className = 'fixed inset-0 z-50 flex items-end justify-center bg-black bg-opacity-60';
    this.modal.innerHTML = `
      <div class="w-full max-w-md mx-auto bg-[#23272f] rounded-t-2xl shadow-xl animate-slide-up">
        <div class="flex justify-between items-center px-5 pt-4 pb-2 border-b border-gray-700">
          <span class="text-white text-base font-semibold">${this.title}</span>
          <button class="text-gray-400 hover:text-white text-2xl leading-none close-btn">&times;</button>
        </div>
        <div class="flex px-5 py-4 gap-2 overflow-x-auto justify-center">
          ${this.wheels.map((wheel, idx) => `
            <div class="relative w-24 h-48 flex flex-col items-center">
              <div class="absolute top-1/2 left-0 w-full h-10 -translate-y-1/2 border-y-2 border-orange-400 pointer-events-none"></div>
              <ul data-wheel="${idx}" class="wheel-list flex-1 overflow-y-scroll no-scrollbar text-center text-white text-lg select-none">
                ${wheel.data.map((item, i) => `<li class="py-2 ${i === 0 ? 'text-orange-400 font-bold' : 'text-gray-300'}">${item}</li>`).join('')}
              </ul>
            </div>
          `).join('')}
        </div>
        <div class="flex justify-center p-4">
          <button class="px-8 py-2 rounded-full bg-orange-500 text-white font-semibold shadow btn-press text-lg" id="wheelpicker-ok">Ок</button>
        </div>
      </div>
    `;
    document.body.appendChild(this.modal);
    // Close events
    this.modal.querySelector('.close-btn').onclick = () => this.hide();
    this.modal.onclick = (e) => { if (e.target === this.modal) this.hide(); };
    // Wheel scroll events
    this.modal.querySelectorAll('.wheel-list').forEach((ul, idx) => {
      ul.addEventListener('scroll', () => this.onScroll(ul, idx));
      ul.addEventListener('wheel', e => e.stopPropagation());
      ul.addEventListener('touchmove', e => e.stopPropagation());
    });
    // Ok button
    this.modal.querySelector('#wheelpicker-ok').onclick = () => {
      this.hide();
      const values = this.selected.map((i, idx) => this.wheels[idx].data[i]);
      this.onSelect(this.selected, values);
    };
  }

  onScroll(ul, idx) {
    // Определить ближайший элемент к центру
    const scrollTop = ul.scrollTop;
    const itemHeight = ul.firstElementChild.offsetHeight;
    const centerIdx = Math.round(scrollTop / itemHeight);
    this.selected[idx] = Math.max(0, Math.min(centerIdx, this.wheels[idx].data.length - 1));
    // Подсветка выбранного
    [...ul.children].forEach((li, i) => {
      li.classList.toggle('text-orange-400', i === this.selected[idx]);
      li.classList.toggle('font-bold', i === this.selected[idx]);
      li.classList.toggle('text-gray-300', i !== this.selected[idx]);
    });
    // Прокрутить к центру
    ul.scrollTo({ top: this.selected[idx] * itemHeight, behavior: 'smooth' });
  }

  show() {
    this.modal.style.display = 'flex';
    // Для каждого колеса — выставить scroll к выбранному
    this.modal.querySelectorAll('.wheel-list').forEach((ul, idx) => {
      const itemHeight = ul.firstElementChild.offsetHeight;
      ul.scrollTo({ top: this.selected[idx] * itemHeight });
      this.onScroll(ul, idx);
    });
  }

  hide() {
    this.modal.style.display = 'none';
  }
}

// Для использования:
// new WheelPicker({
//   trigger: document.getElementById('dateInput'),
//   title: 'Выберите дату и время',
//   wheels: [ { data: [...] }, { data: [...] }, ... ],
//   onSelect: (indexes, values) => { ... }
// });
