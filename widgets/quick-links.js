export default {
  id: 'quick-links',
  title: 'Quick Links',
  size: 'medium',

  _links: [],
  _nextId: 1,
  _adding: false,

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
    this._container.innerHTML = `
      <div class="ql-grid"></div>
      <div class="ql-add-form" style="display:none">
        <div class="ql-form-row">
          <input class="ql-emoji" type="text" placeholder="🔗" maxlength="2" value="🔗">
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
      emoji:     this._container.querySelector('.ql-emoji'),
      name:      this._container.querySelector('.ql-name'),
      url:       this._container.querySelector('.ql-url'),
      addBtn:    this._container.querySelector('.ql-add-btn'),
      saveBtn:   this._container.querySelector('.ql-save-btn'),
      cancelBtn: this._container.querySelector('.ql-cancel-btn'),
    };

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
    this._el.emoji.value = '🔗';
    this._el.name.value = '';
    this._el.url.value = '';
  },

  _save() {
    const name  = this._el.name.value.trim();
    const url   = this._el.url.value.trim();
    const emoji = this._el.emoji.value.trim() || '🔗';
    if (!name || !url) return;
    const href = url.startsWith('http') ? url : `https://${url}`;
    this._links.push({ id: this._nextId++, emoji, name, url: href });
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
