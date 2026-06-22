export default {
  id: 'notes',
  title: 'Notes',
  size: 'medium',

  _tabs: [{ id: 1, name: 'General', text: '' }],
  _activeId: 1,
  _saveTimer: null,
  _nextId: 2,

  render(container) {
    this._container = container;
    this._buildUI();
  },

  onSync(data) {
    if (data.tabs) {
      this._tabs = data.tabs;
      this._activeId = data.activeId ?? this._tabs[0]?.id;
      this._nextId = data.nextId ?? (Math.max(...this._tabs.map(t => t.id)) + 1);
      if (this._container) this._buildUI();
    }
  },

  getData() {
    return { tabs: this._tabs, activeId: this._activeId, nextId: this._nextId };
  },

  _buildUI() {
    this._container.innerHTML = `
      <div class="notes-tabs-bar">
        <div class="notes-tabs-list"></div>
        <button class="btn btn-ghost btn-sm notes-add-tab" title="New tab">＋</button>
      </div>
      <textarea class="notes-area" placeholder="Start typing…"></textarea>
      <div class="notes-footer">
        <span class="notes-chars">0 chars</span>
        <span class="notes-status"></span>
      </div>
    `;

    this._el = {
      tabsList: this._container.querySelector('.notes-tabs-list'),
      addTab:   this._container.querySelector('.notes-add-tab'),
      area:     this._container.querySelector('.notes-area'),
      chars:    this._container.querySelector('.notes-chars'),
      status:   this._container.querySelector('.notes-status'),
    };

    this._el.addTab.addEventListener('click', () => this._addTab());
    this._el.area.addEventListener('input', () => this._onType());

    this._renderTabs();
    this._loadActive();
  },

  _renderTabs() {
    this._el.tabsList.innerHTML = '';
    let activeBtn = null;
    this._tabs.forEach(tab => {
      const btn = document.createElement('button');
      btn.className = `notes-tab ${tab.id === this._activeId ? 'active' : ''}`;
      btn.dataset.id = tab.id;
      btn.innerHTML = `<span class="notes-tab-name">${this._escape(tab.name)}</span>`;

      // Single click — switch tab
      btn.addEventListener('click', () => this._switchTab(tab.id));

      // Double click — rename
      btn.addEventListener('dblclick', (e) => {
        e.stopPropagation();
        this._renameTab(tab.id, btn);
      });

      // Delete button (shows on hover via CSS)
      if (this._tabs.length > 1) {
        const del = document.createElement('span');
        del.className = 'notes-tab-del';
        del.textContent = '×';
        del.title = 'Delete tab';
        del.addEventListener('click', (e) => {
          e.stopPropagation();
          this._deleteTab(tab.id);
        });
        btn.appendChild(del);
      }

      this._el.tabsList.appendChild(btn);
      if (tab.id === this._activeId) activeBtn = btn;
    });
    // Scroll active tab into view
    if (activeBtn) activeBtn.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  },

  _loadActive() {
    const tab = this._tabs.find(t => t.id === this._activeId);
    if (!tab) return;
    this._el.area.value = tab.text;
    this._el.chars.textContent = `${tab.text.length} chars`;
  },

  _switchTab(id) {
    // Save current text before switching
    this._saveCurrentText();
    this._activeId = id;
    this._renderTabs();
    this._loadActive();
  },

  _addTab() {
    const name = `Note ${this._nextId}`;
    const newTab = { id: this._nextId++, name, text: '' };
    this._saveCurrentText();
    this._tabs.push(newTab);
    this._activeId = newTab.id;
    this._renderTabs();
    this._loadActive();
    this._save();

    // Immediately enter rename mode for the new tab
    const btn = this._el.tabsList.lastElementChild;
    this._renameTab(newTab.id, btn);
  },

  _renameTab(id, btn) {
    const tab = this._tabs.find(t => t.id === id);
    if (!tab) return;

    const nameEl = btn.querySelector('.notes-tab-name');
    const original = tab.name;

    const input = document.createElement('input');
    input.className = 'notes-tab-input';
    input.value = tab.name;
    input.maxLength = 24;
    nameEl.replaceWith(input);
    input.focus();
    input.select();

    const commit = () => {
      const newName = input.value.trim() || original;
      tab.name = newName;
      input.replaceWith(Object.assign(document.createElement('span'), {
        className: 'notes-tab-name',
        textContent: newName,
      }));
      this._save();
    };

    input.addEventListener('blur', commit);
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); input.blur(); }
      if (e.key === 'Escape') { input.value = original; input.blur(); }
    });
  },

  _deleteTab(id) {
    const idx = this._tabs.findIndex(t => t.id === id);
    this._tabs.splice(idx, 1);
    if (this._activeId === id) {
      this._activeId = this._tabs[Math.max(0, idx - 1)]?.id;
    }
    this._renderTabs();
    this._loadActive();
    this._save();
  },

  _saveCurrentText() {
    const tab = this._tabs.find(t => t.id === this._activeId);
    if (tab && this._el) tab.text = this._el.area.value;
  },

  _onType() {
    const tab = this._tabs.find(t => t.id === this._activeId);
    if (tab) tab.text = this._el.area.value;
    this._el.chars.textContent = `${this._el.area.value.length} chars`;
    this._el.status.textContent = 'Saving…';
    clearTimeout(this._saveTimer);
    this._saveTimer = setTimeout(() => {
      this._save();
      this._el.status.textContent = 'Saved';
      setTimeout(() => { if (this._el) this._el.status.textContent = ''; }, 1500);
    }, 1000);
  },

  _save() {
    window.dispatchEvent(new CustomEvent('widget:save', { detail: { id: 'notes' } }));
  },

  _escape(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  },
};
