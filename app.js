import { SUPABASE_URL, SUPABASE_ANON_KEY } from './supabase.js';
import pomodoroWidget from './widgets/pomodoro.js';
import waterWidget from './widgets/water.js';
import checklistWidget from './widgets/checklist.js';
import notesWidget from './widgets/notes.js';
import lofiWidget from './widgets/lofi.js';

// ── Widget registry ──────────────────────────────────────────────────────────
// To add a new widget: import it above and add it to this array.
const WIDGETS = [
  pomodoroWidget,
  waterWidget,
  lofiWidget,
  checklistWidget,
  notesWidget,
];

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
    if (data.access_token) {
      localStorage.setItem('sb_session', JSON.stringify(data));
    }
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

// ── Mount widgets ─────────────────────────────────────────────────────────────
function mountWidgets() {
  const grid = document.getElementById('dashboard');
  grid.innerHTML = '';

  WIDGETS.forEach(widget => {
    const card = document.createElement('div');
    card.className = `card card-${widget.size || 'small'}`;

    const header = document.createElement('div');
    header.className = 'card-header';
    header.innerHTML = `<h2 class="card-title">${widget.title}</h2>`;

    const body = document.createElement('div');
    body.className = 'card-body';

    card.appendChild(header);
    card.appendChild(body);
    grid.appendChild(card);

    widget.render(body);
  });
}

// ── Sync ──────────────────────────────────────────────────────────────────────
async function loadAll() {
  if (!session) {
    // Guest: load from localStorage
    WIDGETS.forEach(w => {
      if (!w.onSync) return;
      const raw = localStorage.getItem(`widget_${w.id}`);
      if (raw) w.onSync(JSON.parse(raw));
    });
    return;
  }

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
  const data = widget.getData();

  localStorage.setItem(`widget_${widgetId}`, JSON.stringify(data));

  if (session) {
    sb.saveWidgetData(session, widgetId, data).catch(() => {});
  }
}

window.addEventListener('widget:save', e => saveWidget(e.detail.id));

// ── Auth UI ───────────────────────────────────────────────────────────────────
function renderAuthUI() {
  const authEl = document.getElementById('auth-area');

  if (session) {
    authEl.innerHTML = `
      <span class="auth-email">${session.user.email}</span>
      <button class="btn btn-ghost btn-sm" id="signout-btn">Sign out</button>
    `;
    document.getElementById('signout-btn').addEventListener('click', async () => {
      await sb.signOut();
      session = null;
      renderAuthUI();
      loadAll();
    });
    return;
  }

  authEl.innerHTML = `
    <button class="btn btn-sm" id="signin-btn">Sign in / Register</button>
  `;

  document.getElementById('signin-btn').addEventListener('click', () => {
    document.getElementById('auth-modal').classList.add('open');
  });
}

function setupAuthModal() {
  const modal = document.getElementById('auth-modal');
  const closeBtn = document.getElementById('modal-close');
  const form = document.getElementById('auth-form');
  const errEl = document.getElementById('auth-error');
  const submitBtn = document.getElementById('auth-submit');
  const toggleBtn = document.getElementById('auth-toggle');
  let mode = 'signin'; // 'signin' | 'signup'

  closeBtn.addEventListener('click', () => modal.classList.remove('open'));
  modal.addEventListener('click', e => { if (e.target === modal) modal.classList.remove('open'); });

  toggleBtn.addEventListener('click', () => {
    mode = mode === 'signin' ? 'signup' : 'signin';
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

    const email = document.getElementById('auth-email').value.trim();
    const password = document.getElementById('auth-password').value;

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
        if (data.access_token) {
          localStorage.setItem('sb_session', JSON.stringify(data));
        }
      }

      if (data.access_token) {
        session = data;
        modal.classList.remove('open');
        renderAuthUI();
        loadAll();
      } else {
        errEl.textContent = data.error_description || data.msg || 'Authentication failed.';
      }
    } catch (err) {
      errEl.textContent = 'Network error. Check your Supabase config.';
    }

    submitBtn.disabled = false;
    submitBtn.textContent = mode === 'signin' ? 'Sign in' : 'Create account';
  });
}

// ── Theme ─────────────────────────────────────────────────────────────────────
function setupTheme() {
  const btn = document.getElementById('theme-toggle');
  const saved = localStorage.getItem('theme') || 'dark';
  document.documentElement.setAttribute('data-theme', saved);
  btn.textContent = saved === 'dark' ? '☀️' : '🌙';

  btn.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
    btn.textContent = next === 'dark' ? '☀️' : '🌙';
  });
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
  mountWidgets();

  session = await sb.getSession();

  // Validate stored session minimally
  if (session && !session.access_token) session = null;

  renderAuthUI();
  setupAuthModal();
  await loadAll();
  await requestNotifications();
}

init();
