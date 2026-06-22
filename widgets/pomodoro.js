export default {
  id: 'pomodoro',
  title: 'Pomodoro Timer',
  size: 'small',

  _state: {
    mode: 'work',       // 'work' | 'break'
    seconds: 25 * 60,
    running: false,
    sessions: 0,
    workMins: 25,
    breakMins: 5,
  },
  _interval: null,

  render(container) {
    container.innerHTML = `
      <div class="pomo-ring-wrap">
        <svg class="pomo-ring" viewBox="0 0 120 120">
          <circle class="pomo-ring-bg" cx="60" cy="60" r="52"/>
          <circle class="pomo-ring-fg" cx="60" cy="60" r="52"
            stroke-dasharray="326.7" stroke-dashoffset="0"/>
        </svg>
        <div class="pomo-time">25:00</div>
        <div class="pomo-mode-label">Work</div>
      </div>
      <div class="pomo-controls">
        <button class="btn pomo-start">Start</button>
        <button class="btn btn-ghost pomo-reset">Reset</button>
      </div>
      <div class="pomo-sessions">🍅 × <span class="pomo-count">0</span></div>
      <div class="pomo-settings">
        <label>Work <input class="pomo-work-input" type="number" min="1" max="90" value="25"> min</label>
        <label>Break <input class="pomo-break-input" type="number" min="1" max="30" value="5"> min</label>
      </div>
    `;

    this._el = {
      time: container.querySelector('.pomo-time'),
      label: container.querySelector('.pomo-mode-label'),
      fg: container.querySelector('.pomo-ring-fg'),
      start: container.querySelector('.pomo-start'),
      reset: container.querySelector('.pomo-reset'),
      count: container.querySelector('.pomo-count'),
      workInput: container.querySelector('.pomo-work-input'),
      breakInput: container.querySelector('.pomo-break-input'),
    };

    this._el.start.addEventListener('click', () => this._toggle());
    this._el.reset.addEventListener('click', () => this._reset());
    this._el.workInput.addEventListener('change', () => {
      this._state.workMins = parseInt(this._el.workInput.value) || 25;
      if (!this._state.running) this._reset();
    });
    this._el.breakInput.addEventListener('change', () => {
      this._state.breakMins = parseInt(this._el.breakInput.value) || 5;
    });

    this._render();
  },

  onSync(data) {
    if (data.sessions !== undefined) {
      this._state.sessions = data.sessions;
      this._state.workMins = data.workMins || 25;
      this._state.breakMins = data.breakMins || 5;
      if (this._el) {
        this._el.count.textContent = this._state.sessions;
        this._el.workInput.value = this._state.workMins;
        this._el.breakInput.value = this._state.breakMins;
      }
    }
  },

  getData() {
    return {
      sessions: this._state.sessions,
      workMins: this._state.workMins,
      breakMins: this._state.breakMins,
    };
  },

  _toggle() {
    this._state.running = !this._state.running;
    this._el.start.textContent = this._state.running ? 'Pause' : 'Resume';
    if (this._state.running) {
      this._interval = setInterval(() => this._tick(), 1000);
    } else {
      clearInterval(this._interval);
    }
  },

  _reset() {
    clearInterval(this._interval);
    this._state.running = false;
    this._state.mode = 'work';
    this._state.seconds = this._state.workMins * 60;
    this._el.start.textContent = 'Start';
    this._render();
  },

  _tick() {
    this._state.seconds--;
    if (this._state.seconds <= 0) {
      this._complete();
    } else {
      this._render();
    }
  },

  _complete() {
    clearInterval(this._interval);
    this._state.running = false;
    this._el.start.textContent = 'Start';

    if (this._state.mode === 'work') {
      this._state.sessions++;
      this._el.count.textContent = this._state.sessions;
      this._notify('Work session done! Time for a break 🎉');
      this._state.mode = 'break';
      this._state.seconds = this._state.breakMins * 60;
      window.dispatchEvent(new CustomEvent('widget:save', { detail: { id: 'pomodoro' } }));
    } else {
      this._notify('Break over! Back to work 💪');
      this._state.mode = 'work';
      this._state.seconds = this._state.workMins * 60;
    }

    this._render();
    this._chime();
  },

  _render() {
    const total = this._state.mode === 'work'
      ? this._state.workMins * 60
      : this._state.breakMins * 60;
    const s = this._state.seconds;
    const mins = String(Math.floor(s / 60)).padStart(2, '0');
    const secs = String(s % 60).padStart(2, '0');
    this._el.time.textContent = `${mins}:${secs}`;
    this._el.label.textContent = this._state.mode === 'work' ? 'Work' : 'Break';

    const circ = 2 * Math.PI * 52;
    const progress = s / total;
    this._el.fg.style.strokeDashoffset = circ * (1 - progress);
    this._el.fg.style.stroke = this._state.mode === 'work' ? 'var(--accent)' : 'var(--green)';
  },

  _notify(msg) {
    if (Notification.permission === 'granted') {
      new Notification('Pomodoro', { body: msg, icon: '🍅' });
    }
  },

  _chime() {
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
      osc.start();
      osc.stop(ctx.currentTime + 0.8);
    } catch (_) {}
  },
};
