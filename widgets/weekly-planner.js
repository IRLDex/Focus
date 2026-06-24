const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function getWeekKey() {
  const d = new Date();
  const day = d.getDay() || 7; // Mon=1 … Sun=7
  const mon = new Date(d);
  mon.setDate(d.getDate() - day + 1);
  return mon.toISOString().slice(0, 10); // YYYY-MM-DD of Monday
}

function getTodayLabel() {
  const idx = (new Date().getDay() || 7) - 1; // 0=Mon … 6=Sun
  return DAYS[idx];
}

export default {
  id: 'weekly-planner',
  title: 'Weekly Planner',
  size: 'large',

  _weeks: {},
  _saveTimer: null,

  render(container) {
    this._container = container;
    this._buildUI();
  },

  onSync(data) {
    if (data.weeks) {
      this._weeks = data.weeks;
      if (this._container) this._buildUI();
    }
  },

  getData() {
    // Keep only last 4 weeks
    const keys = Object.keys(this._weeks).sort().slice(-4);
    const trimmed = {};
    keys.forEach(k => { trimmed[k] = this._weeks[k]; });
    this._weeks = trimmed;
    return { weeks: this._weeks };
  },

  _buildUI() {
    const weekKey = getWeekKey();
    const today = getTodayLabel();
    if (!this._weeks[weekKey]) this._weeks[weekKey] = {};
    const week = this._weeks[weekKey];

    this._container.innerHTML = `
      <div class="wp-grid">
        ${DAYS.map(day => `
          <div class="wp-col ${day === today ? 'wp-today' : ''}">
            <div class="wp-day-label">${day}${day === today ? ' ·today' : ''}</div>
            <textarea class="wp-area" data-day="${day}" placeholder="…">${this._escape(week[day] || '')}</textarea>
          </div>
        `).join('')}
      </div>
    `;

    this._container.querySelectorAll('.wp-area').forEach(area => {
      area.addEventListener('input', () => {
        const weekKey = getWeekKey();
        if (!this._weeks[weekKey]) this._weeks[weekKey] = {};
        this._weeks[weekKey][area.dataset.day] = area.value;
        clearTimeout(this._saveTimer);
        this._saveTimer = setTimeout(() => {
          window.dispatchEvent(new CustomEvent('widget:save', { detail: { id: 'weekly-planner' } }));
        }, 1000);
      });
    });
  },

  _escape(str) {
    return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  },
};
