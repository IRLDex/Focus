export default {
  id: 'break-reminder',
  title: 'Break Reminder',
  size: 'small',

  _state: { intervalMins: 20 },
  _running: false,
  _nextAt: null,
  _timer: null,
  _tickInterval: null,

  render(container) {
    container.innerHTML = `
      <p class="break-desc">Stand up, stretch, rest your eyes 👀</p>
      <div class="water-countdown">
        <div class="water-countdown-ring">
          <svg viewBox="0 0 80 80">
            <circle class="wc-bg" cx="40" cy="40" r="34"/>
            <circle class="wc-fg break-ring-fg" cx="40" cy="40" r="34"
              stroke-dasharray="213.6" stroke-dashoffset="213.6"/>
          </svg>
          <div class="water-countdown-text">
            <span class="wc-time break-time">--:--</span>
            <span class="wc-label break-label">not started</span>
          </div>
        </div>
        <button class="btn break-toggle">Start</button>
      </div>
      <div class="water-settings">
        <label>Every <input class="break-interval" type="number" min="1" max="120" value="20"> min</label>
      </div>
    `;

    this._el = {
      toggle:   container.querySelector('.break-toggle'),
      time:     container.querySelector('.break-time'),
      label:    container.querySelector('.break-label'),
      fg:       container.querySelector('.break-ring-fg'),
      interval: container.querySelector('.break-interval'),
    };

    this._el.toggle.addEventListener('click', () => this._toggleTimer());
    this._el.interval.addEventListener('change', () => {
      this._state.intervalMins = parseInt(this._el.interval.value) || 20;
      if (this._running) this._startTimer();
    });

    this._renderCountdown();
  },

  onSync(data) {
    if (data.intervalMins) {
      this._state.intervalMins = data.intervalMins;
      if (this._el) this._el.interval.value = data.intervalMins;
    }
  },

  getData() { return { ...this._state }; },

  _toggleTimer() {
    this._running ? this._stopTimer() : this._startTimer();
  },

  _startTimer() {
    this._stopTimer();
    this._running = true;
    this._nextAt = Date.now() + this._state.intervalMins * 60 * 1000;
    this._el.toggle.textContent = 'Stop';
    this._el.toggle.classList.add('btn-ghost');
    this._timer = setTimeout(() => this._remind(), this._state.intervalMins * 60 * 1000);
    this._tickInterval = setInterval(() => this._renderCountdown(), 1000);
    this._renderCountdown();
  },

  _stopTimer() {
    this._running = false;
    clearTimeout(this._timer);
    clearInterval(this._tickInterval);
    if (this._el) {
      this._el.toggle.textContent = 'Start';
      this._el.toggle.classList.remove('btn-ghost');
      this._renderCountdown();
    }
  },

  _remind() {
    if (Notification.permission === 'granted') {
      new Notification('Break time! 🧘', { body: 'Stand up, stretch, rest your eyes.' });
    }
    this._el.toggle.classList.add('pulse');
    setTimeout(() => this._el?.toggle.classList.remove('pulse'), 2000);
    this._startTimer();
  },

  _renderCountdown() {
    if (!this._el) return;
    if (!this._running) {
      this._el.time.textContent = '--:--';
      this._el.label.textContent = 'not started';
      this._el.fg.style.strokeDashoffset = 213.6;
      return;
    }
    const totalMs = this._state.intervalMins * 60 * 1000;
    const remainMs = Math.max(0, this._nextAt - Date.now());
    const mins = Math.floor(remainMs / 60000);
    const secs = Math.floor((remainMs % 60000) / 1000);
    this._el.time.textContent = `${String(mins).padStart(2,'0')}:${String(secs).padStart(2,'0')}`;
    this._el.label.textContent = 'remaining';
    this._el.fg.style.strokeDashoffset = 213.6 * (1 - remainMs / totalMs);
  },
};
