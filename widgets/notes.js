export default {
  id: 'notes',
  title: 'Notes',
  size: 'medium',

  _text: '',
  _saveTimer: null,

  render(container) {
    container.innerHTML = `
      <textarea class="notes-area" placeholder="Start typing…"></textarea>
      <div class="notes-footer">
        <span class="notes-chars">0 chars</span>
        <span class="notes-status"></span>
      </div>
    `;

    this._el = {
      area: container.querySelector('.notes-area'),
      chars: container.querySelector('.notes-chars'),
      status: container.querySelector('.notes-status'),
    };

    this._el.area.value = this._text;
    this._updateChars();

    this._el.area.addEventListener('input', () => {
      this._text = this._el.area.value;
      this._updateChars();
      this._el.status.textContent = 'Saving…';
      clearTimeout(this._saveTimer);
      this._saveTimer = setTimeout(() => {
        window.dispatchEvent(new CustomEvent('widget:save', { detail: { id: 'notes' } }));
        this._el.status.textContent = 'Saved';
        setTimeout(() => { if (this._el) this._el.status.textContent = ''; }, 1500);
      }, 1000);
    });
  },

  onSync(data) {
    this._text = data.text || '';
    if (this._el) {
      this._el.area.value = this._text;
      this._updateChars();
    }
  },

  getData() {
    return { text: this._text };
  },

  _updateChars() {
    if (this._el) {
      this._el.chars.textContent = `${this._text.length} chars`;
    }
  },
};
