export default {
  id: 'lofi',
  title: 'Lo-fi Radio',
  size: 'medium',

  // Stream IDs to try in order if one goes down
  _streams: [
    { label: 'Lo-fi Girl', id: '5qap5aO4i9A' },
    { label: 'Lo-fi Girl (study)', id: 'jfKfPfyJRdk' },
    { label: 'Lofi Café', id: 'rUxyKA_-grg' },
  ],
  _current: 0,

  render(container) {
    this._container = container;
    this._buildUI();
  },

  _buildUI() {
    const stream = this._streams[this._current];
    this._container.innerHTML = `
      <div class="lofi-wrap">
        <iframe
          class="lofi-frame"
          src="https://www.youtube.com/embed/${stream.id}?rel=0&modestbranding=1"
          title="${stream.label}"
          frameborder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowfullscreen>
        </iframe>
      </div>
      <div class="lofi-footer">
        <span class="lofi-hint">▶ Click to play 🎵</span>
        <div class="lofi-stream-btns">
          ${this._streams.map((s, i) =>
            `<button class="btn btn-ghost btn-sm lofi-stream-btn ${i === this._current ? 'active' : ''}" data-idx="${i}">${s.label}</button>`
          ).join('')}
        </div>
      </div>
    `;

    this._container.querySelectorAll('.lofi-stream-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this._current = parseInt(btn.dataset.idx);
        this._buildUI();
      });
    });
  },

  // No data to persist for this widget
};
