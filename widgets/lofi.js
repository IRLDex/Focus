export default {
  id: 'lofi',
  title: 'Lo-fi Radio',
  size: 'small',

  _streams: [
    { id: 'EWrX250Zhko', label: 'beats to relax/study to',  emoji: '📚' },
    { id: '28KRPhVzCus', label: 'beats to sleep/chill to',  emoji: '💤' },
    { id: 'HuFYqnbVbzY', label: 'synthwave radio',           emoji: '🌌' },
    { id: '1oDrJba2PSs', label: 'jazz lofi radio',           emoji: '🎷' },
  ],
  _live: [],
  _checkInterval: null,

  render(container) {
    this._container = container;
    container.innerHTML = `
      <div class="lofi-status">Checking streams…</div>
      <ul class="lofi-list"></ul>
      <div class="lofi-footer">
        <span class="lofi-updated"></span>
        <button class="btn btn-ghost btn-sm lofi-refresh">↻ Refresh</button>
      </div>
    `;

    this._el = {
      status: container.querySelector('.lofi-status'),
      list: container.querySelector('.lofi-list'),
      updated: container.querySelector('.lofi-updated'),
      refresh: container.querySelector('.lofi-refresh'),
    };

    this._el.refresh.addEventListener('click', () => this._check());

    this._check();
    // Recheck every 5 minutes
    this._checkInterval = setInterval(() => this._check(), 5 * 60 * 1000);
  },

  async _check() {
    if (this._el) {
      this._el.status.textContent = 'Checking streams…';
      this._el.status.className = 'lofi-status checking';
      this._el.refresh.disabled = true;
    }

    const results = await Promise.all(
      this._streams.map(s => this._isLive(s))
    );

    this._live = results.filter(Boolean);
    this._render();
  },

  async _isLive(stream) {
    try {
      const res = await fetch(
        `https://noembed.com/embed?url=https://www.youtube.com/watch?v=${stream.id}`,
        { signal: AbortSignal.timeout(6000) }
      );
      if (!res.ok) return null;
      const data = await res.json();
      // noembed returns an error field if the video is unavailable
      if (data.error) return null;
      return { ...stream, title: data.title || stream.label };
    } catch {
      return null;
    }
  },

  _render() {
    if (!this._el) return;

    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    if (this._live.length === 0) {
      this._el.status.textContent = 'No streams detected live right now.';
      this._el.status.className = 'lofi-status offline';
      this._el.list.innerHTML = '';
    } else {
      this._el.status.textContent = `${this._live.length} stream${this._live.length > 1 ? 's' : ''} live`;
      this._el.status.className = 'lofi-status live';
      this._el.list.innerHTML = this._live.map(s => `
        <li class="lofi-item">
          <a class="lofi-link" href="https://www.youtube.com/watch?v=${s.id}" target="_blank" rel="noopener">
            <span class="lofi-dot"></span>
            <span class="lofi-emoji">${s.emoji}</span>
            <span class="lofi-label">${s.label}</span>
            <span class="lofi-arrow">↗</span>
          </a>
        </li>
      `).join('');
    }

    this._el.updated.textContent = `Updated ${now}`;
    this._el.refresh.disabled = false;
  },
};
