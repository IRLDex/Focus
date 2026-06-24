// Load emoji-picker-element once (web component, CDN)
if (!customElements.get('emoji-picker')) {
  const s = document.createElement('script');
  s.type = 'module';
  s.src = 'https://cdn.jsdelivr.net/npm/emoji-picker-element@1/index.js';
  document.head.appendChild(s);
}

export default {
  id: 'quick-links',
  title: 'Quick Links',
  size: 'medium',

  _links: [],
  _nextId: 1,
  _selectedEmoji: '🔗',

  render(container) {
    this._container = container;
    this._buildUI();
  },

  onSync(data) {
    if (data.links) {
      this._links = data.links;
      this._nextId = data.nextId ?? (Math.max(0, ...this._links.map(l => l.id)) + 1);
      if (this._container) this._buildUI();
    }
  },

  getData() {
    return { links: this._links, nextId: this._nextId };
  },

  _buildUI() {
    this._selectedEmoji = '🔗';

    this._container.innerHTML = `
      <div class="ql-grid"></div>
      <div class="ql-add-form" style="display:none">
        <div class="ql-form-row">
          <div class="ql-emoji-wrap">
            <button class="ql-emoji-btn" title="Pick emoji">🔗</button>
            <div class="ql-picker-popover" style="display:none">
              <emoji-picker class="ql-picker"></emoji-picker>
            </div>
          </div>
          <input class="ql-name" type="text" placeholder="Name" maxlength="30">
        </div>
        <input class="ql-url" type="url" placeholder="https://…">
        <div class="ql-form-btns">
          <button class="btn ql-save-btn">Save</button>
          <button class="btn btn-ghost ql-cancel-btn">Cancel</button>
        </div>
      </div>
      <button class="btn btn-ghost btn-sm ql-add-btn">＋ Add link</button>
    `;

    this._el = {
      grid:      this._container.querySelector('.ql-grid'),
      form:      this._container.querySelector('.ql-add-form'),
      emojiBtn:  this._container.querySelector('.ql-emoji-btn'),
      pickerWrap:this._container.querySelector('.ql-picker-popover'),
      picker:    this._container.querySelector('emoji-picker'),
      name:      this._container.querySelector('.ql-name'),
      url:       this._container.querySelector('.ql-url'),
      addBtn:    this._container.querySelector('.ql-add-btn'),
      saveBtn:   this._container.querySelector('.ql-save-btn'),
      cancelBtn: this._container.querySelector('.ql-cancel-btn'),
    };

    // Toggle picker popover
    this._el.emojiBtn.addEventListener('click', e => {
      e.stopPropagation();
      const open = this._el.pickerWrap.style.display !== 'none';
      this._el.pickerWrap.style.display = open ? 'none' : 'block';
    });

    // Pick an emoji
    this._el.picker.addEventListener('emoji-click', e => {
      this._selectedEmoji = e.detail.unicode;
      this._el.emojiBtn.textContent = this._selectedEmoji;
      this._el.pickerWrap.style.display = 'none';
    });

    // Prevent clicks inside the picker wrap from reaching the document close handler
    this._el.pickerWrap.addEventListener('click', e => e.stopPropagation());

    // Close picker when clicking outside
    document.addEventListener('click', () => {
      if (this._el) this._el.pickerWrap.style.display = 'none';
    });

    this._el.addBtn.addEventListener('click', () => this._showForm());
    this._el.cancelBtn.addEventListener('click', () => this._hideForm());
    this._el.saveBtn.addEventListener('click', () => this._save());
    this._el.url.addEventListener('keydown', e => { if (e.key === 'Enter') this._save(); });

    this._renderGrid();
  },

  _showForm() {
    this._el.form.style.display = 'flex';
    this._el.addBtn.style.display = 'none';
    this._el.name.focus();
  },

  _hideForm() {
    this._el.form.style.display = 'none';
    this._el.addBtn.style.display = '';
    this._el.pickerWrap.style.display = 'none';
    this._selectedEmoji = '🔗';
    this._el.emojiBtn.textContent = '🔗';
    this._el.name.value = '';
    this._el.url.value = '';
  },

  _save() {
    const name = this._el.name.value.trim();
    const url  = this._el.url.value.trim();
    if (!name || !url) return;
    const href = url.startsWith('http') ? url : `https://${url}`;
    this._links.push({ id: this._nextId++, emoji: this._selectedEmoji, name, url: href });
    this._hideForm();
    this._renderGrid();
    window.dispatchEvent(new CustomEvent('widget:save', { detail: { id: 'quick-links' } }));
  },

  _delete(id) {
    this._links = this._links.filter(l => l.id !== id);
    this._renderGrid();
    window.dispatchEvent(new CustomEvent('widget:save', { detail: { id: 'quick-links' } }));
  },

  _renderGrid() {
    if (!this._el) return;
    this._el.grid.innerHTML = '';
    this._links.forEach(link => {
      const tile = document.createElement('a');
      tile.className = 'ql-tile';
      tile.href = link.url;
      tile.target = '_blank';
      tile.rel = 'noopener';
      tile.innerHTML = `
        <span class="ql-tile-emoji">${link.emoji}</span>
        <span class="ql-tile-name">${this._escape(link.name)}</span>
        <button class="ql-tile-del" title="Remove">×</button>
      `;
      tile.querySelector('.ql-tile-del').addEventListener('click', e => {
        e.preventDefault();
        e.stopPropagation();
        this._delete(link.id);
      });
      this._el.grid.appendChild(tile);
    });

    if (this._links.length === 0) {
      this._el.grid.innerHTML = '<p class="ql-empty">No links yet</p>';
    }
  },

  _escape(str) {
    return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  },
};
