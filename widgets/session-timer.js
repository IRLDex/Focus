export default {
  id: 'session-timer',
  title: 'Session Timer',
  size: 'medium',

  _elapsed: 0,
  _running: false,
  _startedAt: null,
  _interval: null,
  _log: [],

  render(container) {
    this._container = container;
    this._buildUI();
  },

  onSync(data) {
    if (data.log) {
      this._log = data.log;
      if (this._container) this._buildUI();
    }
  },

  getData() {
    return { log: this._log };
  },

  _buildUI() {
    this._container.innerHTML = `
      <input class="session-label" type="text" placeholder="What are you working on?…" maxlength="80">
      <div class="session-display">00:00:00</div>
      <div class="session-controls">
        <button class="btn session-start">Start</button>
        <button class="btn btn-ghost session-pause" disabled>Pause</button>
        <button class="btn btn-ghost session-log" disabled>Log Session</button>
      </div>
      <div class="session-log-wrap">
        <div class="session-log-header">
          <span class="session-log-title">Session Log</span>
          <button class="btn btn-ghost btn-sm session-clear" style="display:none">Clear all</button>
        </div>
        <ul class="session-log-list"></ul>
      </div>
    `;

    this._el = {
      label:   this._container.querySelector('.session-label'),
      display: this._container.querySelector('.session-display'),
      start:   this._container.querySelector('.session-start'),
      pause:   this._container.querySelector('.session-pause'),
      log:     this._container.querySelector('.session-log'),
      list:    this._container.querySelector('.session-log-list'),
      clear:   this._container.querySelector('.session-clear'),
    };

    this._el.start.addEventListener('click', () => {
      if (!this._el.label.value.trim()) {
        this._el.label.classList.add('session-label-error');
        this._el.label.focus();
        return;
      }
      this._start();
    });
    this._el.label.addEventListener('input', () => this._el.label.classList.remove('session-label-error'));
    this._el.pause.addEventListener('click', () => this._pause());
    this._el.log.addEventListener('click', () => this._logSession());
    this._el.clear.addEventListener('click', () => this._clearLog());

    this._renderLog();
  },

  _start() {
    this._running = true;
    this._startedAt = Date.now();
    this._interval = setInterval(() => this._tick(), 500);
    this._el.start.textContent = 'Running…';
    this._el.start.disabled = true;
    this._el.pause.disabled = false;
    this._el.log.disabled = false;
  },

  _pause() {
    if (this._running) {
      // Pause
      this._elapsed += Date.now() - this._startedAt;
      this._running = false;
      clearInterval(this._interval);
      this._el.pause.textContent = 'Resume';
      this._el.start.textContent = 'Paused';
    } else {
      // Resume
      this._running = true;
      this._startedAt = Date.now();
      this._interval = setInterval(() => this._tick(), 500);
      this._el.pause.textContent = 'Pause';
      this._el.start.textContent = 'Running…';
    }
  },

  _logSession() {
    // Capture current elapsed
    const total = this._elapsed + (this._running ? Date.now() - this._startedAt : 0);
    if (total < 1000) return; // ignore sub-second logs

    // Stop timer
    clearInterval(this._interval);
    this._running = false;
    this._elapsed = 0;
    this._startedAt = null;

    // Log entry
    const label = this._el.label.value.trim() || 'Untitled session';
    const now = new Date();
    this._log.unshift({
      id: Date.now(),
      label,
      duration: total,
      time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      date: now.toLocaleDateString([], { month: 'short', day: 'numeric' }),
    });

    // Reset UI for new session
    this._el.display.textContent = '00:00:00';
    this._el.label.value = '';
    this._el.start.textContent = 'Start';
    this._el.start.disabled = false;
    this._el.pause.textContent = 'Pause';
    this._el.pause.disabled = true;
    this._el.log.disabled = true;

    this._renderLog();
    window.dispatchEvent(new CustomEvent('widget:save', { detail: { id: 'session-timer' } }));
  },

  _clearLog() {
    this._log = [];
    this._renderLog();
    window.dispatchEvent(new CustomEvent('widget:save', { detail: { id: 'session-timer' } }));
  },

  _tick() {
    const total = Math.floor((this._elapsed + Date.now() - this._startedAt) / 1000);
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    this._el.display.textContent =
      `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  },

  _renderLog() {
    if (!this._el) return;
    this._el.clear.style.display = this._log.length ? '' : 'none';

    this._el.list.innerHTML = '';
    if (this._log.length === 0) {
      this._el.list.innerHTML = '<li class="session-log-empty">No sessions logged yet</li>';
      return;
    }

    this._log.forEach(entry => {
      const li = document.createElement('li');
      li.className = 'session-log-entry';
      li.innerHTML = `
        <div class="sle-main">
          <span class="sle-label">${this._escape(entry.label)}</span>
          <span class="sle-duration">${this._formatDuration(entry.duration)}</span>
          <button class="sle-del" title="Delete">×</button>
        </div>
        <div class="sle-meta">${entry.date} · ${entry.time}</div>
      `;
      li.querySelector('.sle-del').addEventListener('click', () => {
        this._log = this._log.filter(e => e.id !== entry.id);
        this._renderLog();
        window.dispatchEvent(new CustomEvent('widget:save', { detail: { id: 'session-timer' } }));
      });
      this._el.list.appendChild(li);
    });
  },

  _formatDuration(ms) {
    const total = Math.floor(ms / 1000);
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  },

  _escape(str) {
    return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  },
};
