export default {
  id: 'session-timer',
  title: 'Session Timer',
  size: 'small',

  _elapsed: 0,
  _running: false,
  _startedAt: null,
  _interval: null,

  render(container) {
    container.innerHTML = `
      <input class="session-label" type="text" placeholder="Working on…" maxlength="60">
      <div class="session-display">00:00:00</div>
      <div class="session-controls">
        <button class="btn session-start">Start</button>
        <button class="btn btn-ghost session-reset">Reset</button>
      </div>
    `;

    this._el = {
      label:   container.querySelector('.session-label'),
      display: container.querySelector('.session-display'),
      start:   container.querySelector('.session-start'),
      reset:   container.querySelector('.session-reset'),
    };

    this._el.start.addEventListener('click', () => this._toggle());
    this._el.reset.addEventListener('click', () => this._reset());
  },

  // Ephemeral — no sync/persist

  _toggle() {
    if (this._running) {
      this._elapsed += Date.now() - this._startedAt;
      this._running = false;
      clearInterval(this._interval);
      this._el.start.textContent = 'Resume';
    } else {
      this._running = true;
      this._startedAt = Date.now();
      this._interval = setInterval(() => this._tick(), 500);
      this._el.start.textContent = 'Pause';
    }
  },

  _reset() {
    clearInterval(this._interval);
    this._running = false;
    this._elapsed = 0;
    this._startedAt = null;
    this._el.start.textContent = 'Start';
    this._el.display.textContent = '00:00:00';
    this._el.label.value = '';
  },

  _tick() {
    const total = Math.floor((this._elapsed + Date.now() - this._startedAt) / 1000);
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    this._el.display.textContent =
      `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  },
};
