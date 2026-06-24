export default {
  id: 'habit-tracker',
  title: 'Habit Tracker',
  size: 'medium',

  _habits: [],
  _nextId: 1,

  render(container) {
    this._container = container;
    this._buildUI();
  },

  onSync(data) {
    if (data.habits) {
      this._habits = data.habits;
      this._nextId = data.nextId ?? (Math.max(0, ...this._habits.map(h => h.id)) + 1);
      this._checkDayReset();
      if (this._container) this._buildUI();
    }
  },

  getData() {
    return { habits: this._habits, nextId: this._nextId };
  },

  _checkDayReset() {
    const today = new Date().toDateString();
    this._habits.forEach(h => {
      if (h.lastChecked && h.lastChecked !== today) {
        // If yesterday was checked, streak continues; otherwise reset
        const yesterday = new Date(Date.now() - 86400000).toDateString();
        if (h.doneToday && h.lastChecked === yesterday) {
          h.streak = (h.streak || 0) + 1;
        } else if (h.doneToday) {
          // Was done but not yesterday — means we passed midnight, keep streak logic
        } else {
          h.streak = 0;
        }
        h.doneToday = false;
      }
    });
  },

  _buildUI() {
    this._container.innerHTML = `
      <ul class="habit-list"></ul>
      <div class="habit-add">
        <input class="habit-input" type="text" placeholder="Add a habit…" maxlength="60">
        <button class="btn habit-add-btn">Add</button>
      </div>
    `;

    this._el = {
      list:   this._container.querySelector('.habit-list'),
      input:  this._container.querySelector('.habit-input'),
      addBtn: this._container.querySelector('.habit-add-btn'),
    };

    this._el.addBtn.addEventListener('click', () => this._add());
    this._el.input.addEventListener('keydown', e => { if (e.key === 'Enter') this._add(); });

    this._renderList();
  },

  _add() {
    const name = this._el.input.value.trim();
    if (!name) return;
    this._habits.push({ id: this._nextId++, name, streak: 0, doneToday: false, lastChecked: null });
    this._el.input.value = '';
    this._renderList();
    this._save();
  },

  _toggle(id) {
    const h = this._habits.find(h => h.id === id);
    if (!h) return;
    const today = new Date().toDateString();
    if (h.doneToday) {
      h.doneToday = false;
    } else {
      h.doneToday = true;
      h.lastChecked = today;
    }
    this._renderList();
    this._save();
  },

  _delete(id) {
    this._habits = this._habits.filter(h => h.id !== id);
    this._renderList();
    this._save();
  },

  _renderList() {
    if (!this._el) return;
    this._el.list.innerHTML = '';
    if (this._habits.length === 0) {
      this._el.list.innerHTML = '<li class="habit-empty">No habits yet — add one below!</li>';
      return;
    }
    this._habits.forEach(h => {
      const li = document.createElement('li');
      li.className = `habit-item ${h.doneToday ? 'done' : ''}`;
      li.innerHTML = `
        <label class="habit-label">
          <input type="checkbox" ${h.doneToday ? 'checked' : ''}>
          <span class="habit-name">${this._escape(h.name)}</span>
        </label>
        <span class="habit-streak" title="Day streak">🔥 ${h.streak}</span>
        <button class="habit-del" title="Delete">×</button>
      `;
      li.querySelector('input').addEventListener('change', () => this._toggle(h.id));
      li.querySelector('.habit-del').addEventListener('click', () => this._delete(h.id));
      this._el.list.appendChild(li);
    });
  },

  _save() {
    window.dispatchEvent(new CustomEvent('widget:save', { detail: { id: 'habit-tracker' } }));
  },

  _escape(str) {
    return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  },
};
