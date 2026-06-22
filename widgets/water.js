export default {
  id: 'water',
  title: 'Water Reminder',
  size: 'small',

  _state: {
    glasses: 0,
    goal: 8,
    intervalMins: 30,
    lastDrink: null,
    streak: 0,
    lastDate: null,
  },
  _timer: null,

  render(container) {
    container.innerHTML = `
      <div class="water-glasses">
        <span class="water-count">0</span>
        <span class="water-goal">/ 8 glasses</span>
      </div>
      <div class="water-drops" aria-hidden="true"></div>
      <button class="btn water-drink">I drank! 💧</button>
      <div class="water-next">Next reminder: <span class="water-next-time">—</span></div>
      <div class="water-streak">🔥 <span class="water-streak-val">0</span> day streak</div>
      <div class="water-settings">
        <label>Every <input class="water-interval" type="number" min="5" max="120" value="30"> min</label>
        <label>Goal <input class="water-goal-input" type="number" min="1" max="20" value="8"> glasses</label>
      </div>
    `;

    this._el = {
      count: container.querySelector('.water-count'),
      goal: container.querySelector('.water-goal'),
      drops: container.querySelector('.water-drops'),
      drink: container.querySelector('.water-drink'),
      nextTime: container.querySelector('.water-next-time'),
      streak: container.querySelector('.water-streak-val'),
      interval: container.querySelector('.water-interval'),
      goalInput: container.querySelector('.water-goal-input'),
    };

    this._el.drink.addEventListener('click', () => this._drink());
    this._el.interval.addEventListener('change', () => {
      this._state.intervalMins = parseInt(this._el.interval.value) || 30;
      this._scheduleNext();
      window.dispatchEvent(new CustomEvent('widget:save', { detail: { id: 'water' } }));
    });
    this._el.goalInput.addEventListener('change', () => {
      this._state.goal = parseInt(this._el.goalInput.value) || 8;
      this._render();
      window.dispatchEvent(new CustomEvent('widget:save', { detail: { id: 'water' } }));
    });

    this._checkDayReset();
    this._scheduleNext();
    this._render();
  },

  onSync(data) {
    Object.assign(this._state, data);
    this._checkDayReset();
    if (this._el) {
      this._el.interval.value = this._state.intervalMins;
      this._el.goalInput.value = this._state.goal;
      this._render();
    }
  },

  getData() {
    return { ...this._state };
  },

  _checkDayReset() {
    const today = new Date().toDateString();
    if (this._state.lastDate && this._state.lastDate !== today) {
      const yesterday = new Date(Date.now() - 86400000).toDateString();
      if (this._state.lastDate === yesterday && this._state.glasses >= this._state.goal) {
        this._state.streak++;
      } else {
        this._state.streak = 0;
      }
      this._state.glasses = 0;
    }
    this._state.lastDate = today;
  },

  _drink() {
    this._state.glasses++;
    this._state.lastDrink = Date.now();
    this._scheduleNext();
    this._render();
    window.dispatchEvent(new CustomEvent('widget:save', { detail: { id: 'water' } }));
  },

  _scheduleNext() {
    clearTimeout(this._timer);
    const ms = this._state.intervalMins * 60 * 1000;
    this._nextAt = Date.now() + ms;
    this._timer = setTimeout(() => this._remind(), ms);
    this._updateNextLabel();

    clearInterval(this._tickInterval);
    this._tickInterval = setInterval(() => this._updateNextLabel(), 10000);
  },

  _updateNextLabel() {
    if (!this._el) return;
    const diff = Math.max(0, Math.round((this._nextAt - Date.now()) / 60000));
    this._el.nextTime.textContent = diff <= 0 ? 'now!' : `in ${diff} min`;
  },

  _remind() {
    if (Notification.permission === 'granted') {
      new Notification('Hydration check!', { body: 'Time to drink some water 💧', icon: '💧' });
    }
    this._el.drink.classList.add('pulse');
    setTimeout(() => this._el?.drink.classList.remove('pulse'), 2000);
    this._scheduleNext();
  },

  _render() {
    if (!this._el) return;
    this._el.count.textContent = this._state.glasses;
    this._el.goal.textContent = `/ ${this._state.goal} glasses`;
    this._el.streak.textContent = this._state.streak;
    this._el.goalInput.value = this._state.goal;

    const filled = Math.min(this._state.glasses, this._state.goal);
    const total = this._state.goal;
    this._el.drops.innerHTML = Array.from({ length: total }, (_, i) =>
      `<span class="drop ${i < filled ? 'filled' : ''}">${i < filled ? '💧' : '○'}</span>`
    ).join('');
  },
};
