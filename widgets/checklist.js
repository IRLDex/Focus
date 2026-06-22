export default {
  id: 'checklist',
  title: 'Checklist',
  size: 'medium',

  _tasks: [],

  render(container) {
    container.innerHTML = `
      <div class="checklist-add">
        <input class="checklist-input" type="text" placeholder="Add a task…" maxlength="200">
        <button class="btn checklist-add-btn">Add</button>
      </div>
      <ul class="checklist-list"></ul>
      <div class="checklist-footer">
        <span class="checklist-remaining">0 remaining</span>
        <button class="btn btn-ghost checklist-clear">Clear done</button>
      </div>
    `;

    this._el = {
      input: container.querySelector('.checklist-input'),
      addBtn: container.querySelector('.checklist-add-btn'),
      list: container.querySelector('.checklist-list'),
      remaining: container.querySelector('.checklist-remaining'),
      clear: container.querySelector('.checklist-clear'),
    };

    this._el.addBtn.addEventListener('click', () => this._add());
    this._el.input.addEventListener('keydown', e => { if (e.key === 'Enter') this._add(); });
    this._el.clear.addEventListener('click', () => this._clearDone());

    this._render();
  },

  onSync(data) {
    if (Array.isArray(data.tasks)) {
      this._tasks = data.tasks;
      if (this._el) this._render();
    }
  },

  getData() {
    return { tasks: this._tasks };
  },

  _add() {
    const text = this._el.input.value.trim();
    if (!text) return;
    this._tasks.push({ id: Date.now(), text, done: false });
    this._el.input.value = '';
    this._render();
    window.dispatchEvent(new CustomEvent('widget:save', { detail: { id: 'checklist' } }));
  },

  _toggle(id) {
    const t = this._tasks.find(t => t.id === id);
    if (t) t.done = !t.done;
    this._render();
    window.dispatchEvent(new CustomEvent('widget:save', { detail: { id: 'checklist' } }));
  },

  _delete(id) {
    this._tasks = this._tasks.filter(t => t.id !== id);
    this._render();
    window.dispatchEvent(new CustomEvent('widget:save', { detail: { id: 'checklist' } }));
  },

  _clearDone() {
    this._tasks = this._tasks.filter(t => !t.done);
    this._render();
    window.dispatchEvent(new CustomEvent('widget:save', { detail: { id: 'checklist' } }));
  },

  _render() {
    const remaining = this._tasks.filter(t => !t.done).length;
    this._el.remaining.textContent = `${remaining} remaining`;

    this._el.list.innerHTML = '';
    this._tasks.forEach(task => {
      const li = document.createElement('li');
      li.className = `checklist-item ${task.done ? 'done' : ''}`;
      li.innerHTML = `
        <label class="checklist-label">
          <input type="checkbox" ${task.done ? 'checked' : ''}>
          <span>${this._escape(task.text)}</span>
        </label>
        <button class="checklist-del" title="Delete">×</button>
      `;
      li.querySelector('input').addEventListener('change', () => this._toggle(task.id));
      li.querySelector('.checklist-del').addEventListener('click', () => this._delete(task.id));
      this._el.list.appendChild(li);
    });
  },

  _escape(str) {
    return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  },
};
