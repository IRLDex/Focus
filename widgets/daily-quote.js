const FALLBACK_QUOTES = [
  { q: 'The secret of getting ahead is getting started.', a: 'Mark Twain' },
  { q: 'It always seems impossible until it\'s done.', a: 'Nelson Mandela' },
  { q: 'Don\'t watch the clock; do what it does. Keep going.', a: 'Sam Levenson' },
  { q: 'The way to get started is to quit talking and begin doing.', a: 'Walt Disney' },
  { q: 'You don\'t have to be great to start, but you have to start to be great.', a: 'Zig Ziglar' },
  { q: 'Success is not final, failure is not fatal: it is the courage to continue that counts.', a: 'Winston Churchill' },
  { q: 'Believe you can and you\'re halfway there.', a: 'Theodore Roosevelt' },
  { q: 'Act as if what you do makes a difference. It does.', a: 'William James' },
];

export default {
  id: 'daily-quote',
  title: 'Daily Quote',
  size: 'small',

  render(container) {
    container.innerHTML = `
      <div class="quote-body">
        <p class="quote-text">Loading…</p>
        <p class="quote-author"></p>
      </div>
      <button class="btn btn-ghost btn-sm quote-refresh">↻ New quote</button>
    `;

    this._el = {
      text:    container.querySelector('.quote-text'),
      author:  container.querySelector('.quote-author'),
      refresh: container.querySelector('.quote-refresh'),
    };

    this._el.refresh.addEventListener('click', () => this._fetchRandom());
    this._loadToday();
  },

  async _loadToday() {
    const today = new Date().toDateString();
    const cached = localStorage.getItem('daily_quote');
    if (cached) {
      const { date, quote } = JSON.parse(cached);
      if (date === today) { this._show(quote); return; }
    }
    await this._fetchToday();
  },

  async _fetchToday() {
    try {
      const res = await fetch('https://zenquotes.io/api/today', {
        signal: AbortSignal.timeout(5000),
      });
      const [q] = await res.json();
      const quote = { q: q.q, a: q.a };
      localStorage.setItem('daily_quote', JSON.stringify({ date: new Date().toDateString(), quote }));
      this._show(quote);
    } catch {
      this._show(this._randomFallback());
    }
  },

  async _fetchRandom() {
    if (!this._el) return;
    this._el.text.textContent = 'Loading…';
    this._el.author.textContent = '';
    try {
      const res = await fetch('https://zenquotes.io/api/random', {
        signal: AbortSignal.timeout(5000),
      });
      const [q] = await res.json();
      this._show({ q: q.q, a: q.a });
    } catch {
      this._show(this._randomFallback());
    }
  },

  _show(quote) {
    if (!this._el) return;
    this._el.text.textContent = `"${quote.q}"`;
    this._el.author.textContent = `— ${quote.a}`;
  },

  _randomFallback() {
    return FALLBACK_QUOTES[Math.floor(Math.random() * FALLBACK_QUOTES.length)];
  },
};
