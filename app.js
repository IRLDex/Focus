import { SUPABASE_URL, SUPABASE_ANON_KEY } from './supabase.js';
import pomodoroWidget from './widgets/pomodoro.js';
import waterWidget from './widgets/water.js';
import checklistWidget from './widgets/checklist.js';
import notesWidget from './widgets/notes.js';
import lofiWidget from './widgets/lofi.js';
import breakReminderWidget from './widgets/break-reminder.js';
import sessionTimerWidget from './widgets/session-timer.js';
import habitTrackerWidget from './widgets/habit-tracker.js';
import quickLinksWidget from './widgets/quick-links.js';
import ambientSoundsWidget from './widgets/ambient-sounds.js';
import dailyQuoteWidget from './widgets/daily-quote.js';
import weeklyPlannerWidget from './widgets/weekly-planner.js';

// ── Widget registry ──────────────────────────────────────────────────────────
// To add a new widget: import it above and add it to this array.
const WIDGETS = [
  pomodoroWidget,
  waterWidget,
  lofiWidget,
  checklistWidget,
  notesWidget,
  breakReminderWidget,
  sessionTimerWidget,
  habitTrackerWidget,
  quickLinksWidget,
  ambientSoundsWidget,
  dailyQuoteWidget,
  weeklyPlannerWidget,
];

// ── Layout state ──────────────────────────────────────────────────────────────
// order: array of widget ids in display order
// hidden: set of widget ids that are hidden
let layout = {
  order: WIDGETS.map(w => w.id),
  hidden: [],
};

function saveLayout() {
  sb.saveWidgetData(session, '__layout__', layout).catch(() => {});
}

function orderedWidgets() {
  return layout.order
    .map(id => WIDGETS.find(w => w.id === id))
    .filter(w => w && !layout.hidden.includes(w.id));
}

// ── Supabase client (minimal, no SDK required) ───────────────────────────────
const sb = {
  headers: {
    apikey: SUPABASE_ANON_KEY,
    'Content-Type': 'application/json',
  },

  async getSession() {
    const raw = localStorage.getItem('sb_session');
    return raw ? JSON.parse(raw) : null;
  },

  authHeader(session) {
    return session ? { Authorization: `Bearer ${session.access_token}` } : {};
  },

  async signInWithEmail(email, password) {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (data.access_token) localStorage.setItem('sb_session', JSON.stringify(data));
    return data;
  },

  async signUp(email, password) {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({ email, password }),
    });
    return res.json();
  },

  async signOut() {
    const session = await this.getSession();
    if (session) {
      await fetch(`${SUPABASE_URL}/auth/v1/logout`, {
        method: 'POST',
        headers: { ...this.headers, ...this.authHeader(session) },
      }).catch(() => {});
    }
    localStorage.removeItem('sb_session');
  },

  async loadWidgetData(session, widgetId) {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/widget_data?user_id=eq.${session.user.id}&widget_id=eq.${widgetId}&select=data`,
      { headers: { ...this.headers, ...this.authHeader(session) } }
    );
    const rows = await res.json();
    return rows?.[0]?.data ?? null;
  },

  async saveWidgetData(session, widgetId, data) {
    await fetch(`${SUPABASE_URL}/rest/v1/widget_data`, {
      method: 'POST',
      headers: {
        ...this.headers,
        ...this.authHeader(session),
        Prefer: 'resolution=merge-duplicates',
      },
      body: JSON.stringify({
        user_id: session.user.id,
        widget_id: widgetId,
        data,
        updated_at: new Date().toISOString(),
      }),
    });
  },
};

// ── App state ─────────────────────────────────────────────────────────────────
let session = null;

// ── Views ─────────────────────────────────────────────────────────────────────
function showLoginPage() {
  document.getElementById('login-page').style.display = 'flex';
  document.getElementById('app').style.display = 'none';
}

function showApp() {
  document.getElementById('login-page').style.display = 'none';
  document.getElementById('app').style.display = 'block';
}

// ── Mount widgets ─────────────────────────────────────────────────────────────
const _mountedWidgets = new Set();

function mountWidgets() {
  const grid = document.getElementById('dashboard');
  grid.innerHTML = '';
  _mountedWidgets.clear();

  orderedWidgets().forEach(widget => {
    const card = createCard(widget);
    grid.appendChild(card);
    if (!_mountedWidgets.has(widget.id)) {
      widget.render(card.querySelector('.card-body'));
      _mountedWidgets.add(widget.id);
    }
  });

  setupDragAndDrop();
}

function createCard(widget) {
  const card = document.createElement('div');
  card.className = `card card-${widget.size || 'small'}`;
  card.dataset.widgetId = widget.id;
  card.draggable = true;

  card.innerHTML = `
    <div class="card-header">
      <span class="drag-handle" title="Drag to reorder">⠿</span>
      <h2 class="card-title">${widget.title}</h2>
    </div>
    <div class="card-body"></div>
  `;
  return card;
}

// ── Drag and drop ─────────────────────────────────────────────────────────────
let dragSrcId = null;

function setupDragAndDrop() {
  const grid = document.getElementById('dashboard');

  grid.querySelectorAll('.card').forEach(card => {
    card.addEventListener('dragstart', e => {
      // Don't hijack drags that originate from interactive elements
      if (e.target.closest('input, textarea, select, button, a')) {
        e.preventDefault();
        return;
      }
      dragSrcId = card.dataset.widgetId;
      card.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
    });

    card.addEventListener('dragend', () => {
      card.classList.remove('dragging');
      grid.querySelectorAll('.card').forEach(c => c.classList.remove('drag-over'));
      dragSrcId = null;
    });

    card.addEventListener('dragover', e => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      if (card.dataset.widgetId !== dragSrcId) {
        grid.querySelectorAll('.card').forEach(c => c.classList.remove('drag-over'));
        card.classList.add('drag-over');
      }
    });

    card.addEventListener('dragleave', () => {
      card.classList.remove('drag-over');
    });

    card.addEventListener('drop', e => {
      e.preventDefault();
      card.classList.remove('drag-over');
      const targetId = card.dataset.widgetId;
      if (!dragSrcId || dragSrcId === targetId) return;

      // Reorder layout
      const from = layout.order.indexOf(dragSrcId);
      const to   = layout.order.indexOf(targetId);
      layout.order.splice(from, 1);
      layout.order.splice(to, 0, dragSrcId);

      mountWidgets();
      saveLayout();
    });
  });
}

// ── Customize panel ───────────────────────────────────────────────────────────
function setupCustomizePanel() {
  const btn   = document.getElementById('customize-btn');
  const panel = document.getElementById('customize-panel');
  const close = document.getElementById('customize-close');

  btn.addEventListener('click', () => {
    renderCustomizePanel();
    panel.classList.add('open');
  });
  close.addEventListener('click', () => panel.classList.remove('open'));
  panel.addEventListener('click', e => { if (e.target === panel) panel.classList.remove('open'); });
}

function renderCustomizePanel() {
  const list = document.getElementById('customize-list');
  list.innerHTML = '';

  layout.order.forEach(id => {
    const widget = WIDGETS.find(w => w.id === id);
    if (!widget) return;
    const hidden = layout.hidden.includes(id);

    const row = document.createElement('div');
    row.className = 'customize-row';
    row.innerHTML = `
      <span class="customize-name">${widget.title}</span>
      <button class="btn btn-sm ${hidden ? '' : 'btn-ghost'} customize-toggle" data-id="${id}">
        ${hidden ? 'Show' : 'Hide'}
      </button>
    `;
    row.querySelector('.customize-toggle').addEventListener('click', () => {
      if (hidden) {
        layout.hidden = layout.hidden.filter(h => h !== id);
      } else {
        layout.hidden.push(id);
      }
      mountWidgets();
      saveLayout();
      renderCustomizePanel();
    });
    list.appendChild(row);
  });
}

// ── Sync ──────────────────────────────────────────────────────────────────────
async function loadAll() {
  // Load layout first
  const savedLayout = await sb.loadWidgetData(session, '__layout__').catch(() => null);
  if (savedLayout?.order) {
    // Merge: keep any new widgets not in saved order
    const newIds = WIDGETS.map(w => w.id).filter(id => !savedLayout.order.includes(id));
    layout.order  = [...savedLayout.order, ...newIds];
    layout.hidden = savedLayout.hidden || [];
  }

  // Load widget data
  await Promise.all(WIDGETS.map(async w => {
    if (!w.onSync) return;
    try {
      const data = await sb.loadWidgetData(session, w.id);
      if (data) w.onSync(data);
    } catch (_) {}
  }));
}

async function saveWidget(widgetId) {
  const widget = WIDGETS.find(w => w.id === widgetId);
  if (!widget?.getData) return;
  sb.saveWidgetData(session, widgetId, widget.getData()).catch(() => {});
}

window.addEventListener('widget:save', e => saveWidget(e.detail.id));

// ── Header auth area ──────────────────────────────────────────────────────────
function renderHeaderAuth() {
  const authEl = document.getElementById('auth-area');
  authEl.innerHTML = `
    <span class="auth-email">${session.user.email}</span>
    <button class="btn btn-ghost btn-sm" id="signout-btn">Sign out</button>
  `;
  document.getElementById('signout-btn').addEventListener('click', async () => {
    await sb.signOut();
    session = null;
    showLoginPage();
  });
}

// ── Login page form ───────────────────────────────────────────────────────────
function setupLoginPage() {
  const form      = document.getElementById('login-form');
  const errEl     = document.getElementById('login-error');
  const submitBtn = document.getElementById('login-submit');
  const toggleBtn = document.getElementById('login-toggle');
  const titleEl   = document.getElementById('login-title');
  let mode = 'signin';

  toggleBtn.addEventListener('click', () => {
    mode = mode === 'signin' ? 'signup' : 'signin';
    titleEl.textContent   = mode === 'signin' ? 'Welcome back' : 'Create account';
    submitBtn.textContent = mode === 'signin' ? 'Sign in' : 'Create account';
    toggleBtn.textContent = mode === 'signin'
      ? "Don't have an account? Register"
      : 'Already have an account? Sign in';
    errEl.textContent = '';
  });

  form.addEventListener('submit', async e => {
    e.preventDefault();
    errEl.textContent = '';
    submitBtn.disabled = true;
    submitBtn.textContent = 'Please wait…';

    const email    = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;

    try {
      let data;
      if (mode === 'signin') {
        data = await sb.signInWithEmail(email, password);
      } else {
        data = await sb.signUp(email, password);
        if (data.id && !data.access_token) {
          errEl.textContent = 'Check your email to confirm your account, then sign in.';
          submitBtn.disabled = false;
          submitBtn.textContent = 'Create account';
          return;
        }
        if (data.access_token) localStorage.setItem('sb_session', JSON.stringify(data));
      }

      if (data.access_token) {
        session = data;
        await onSignedIn();
      } else {
        errEl.textContent = data.error_description || data.msg || 'Authentication failed.';
      }
    } catch {
      errEl.textContent = 'Network error. Check your connection.';
    }

    submitBtn.disabled = false;
    submitBtn.textContent = mode === 'signin' ? 'Sign in' : 'Create account';
  });
}

async function onSignedIn() {
  showApp();
  await loadAll();
  mountWidgets();
  renderHeaderAuth();
  setupCustomizePanel();
  await requestNotifications();
}

// ── Theme ─────────────────────────────────────────────────────────────────────
function setupTheme() {
  const btns = document.querySelectorAll('.theme-toggle');
  const saved = localStorage.getItem('theme') || 'dark';
  document.documentElement.setAttribute('data-theme', saved);
  btns.forEach(btn => btn.textContent = saved === 'dark' ? '☀️' : '🌙');

  btns.forEach(btn => btn.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
    btns.forEach(b => b.textContent = next === 'dark' ? '☀️' : '🌙');
  }));
}

// ── Notification permission ───────────────────────────────────────────────────
async function requestNotifications() {
  if ('Notification' in window && Notification.permission === 'default') {
    await Notification.requestPermission();
  }
}

// ── Init ──────────────────────────────────────────────────────────────────────
async function init() {
  setupTheme();
  setupLoginPage();

  session = await sb.getSession();
  if (session?.access_token) {
    await onSignedIn();
  } else {
    session = null;
    showLoginPage();
  }
}

init();
