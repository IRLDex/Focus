export default {
  id: 'ambient-sounds',
  title: 'Ambient Sounds',
  size: 'small',

  _sounds: [
    { id: 'rain',    emoji: '🌧', label: 'Rain' },
    { id: 'white',   emoji: '🤍', label: 'White Noise' },
    { id: 'brown',   emoji: '☕', label: 'Brown Noise' },
    { id: 'forest',  emoji: '🌲', label: 'Forest' },
    { id: 'ocean',   emoji: '🌊', label: 'Ocean' },
  ],
  _active: null,
  _ctx: null,
  _nodes: null,
  _volume: 0.5,

  render(container) {
    container.innerHTML = `
      <div class="ambient-btns"></div>
      <div class="ambient-volume">
        <span>🔈</span>
        <input class="ambient-slider" type="range" min="0" max="1" step="0.05" value="0.5">
        <span>🔊</span>
      </div>
      <p class="ambient-status">Tap a sound to play</p>
    `;

    this._el = {
      btns:   container.querySelector('.ambient-btns'),
      slider: container.querySelector('.ambient-slider'),
      status: container.querySelector('.ambient-status'),
    };

    this._el.slider.addEventListener('input', () => {
      this._volume = parseFloat(this._el.slider.value);
      if (this._nodes?.gain) this._nodes.gain.gain.value = this._volume;
    });

    this._sounds.forEach(s => {
      const btn = document.createElement('button');
      btn.className = 'btn btn-ghost ambient-btn';
      btn.dataset.id = s.id;
      btn.innerHTML = `<span>${s.emoji}</span><span>${s.label}</span>`;
      btn.addEventListener('click', () => this._toggle(s.id));
      this._el.btns.appendChild(btn);
    });
  },

  // No persistence

  _toggle(id) {
    if (this._active === id) {
      this._stop();
    } else {
      this._stop();
      this._play(id);
    }
  },

  _play(id) {
    try {
      this._ctx = new AudioContext();
      const gain = this._ctx.createGain();
      gain.gain.value = this._volume;
      gain.connect(this._ctx.destination);

      let source;
      if (id === 'white') {
        source = this._makeNoise('white');
      } else if (id === 'brown' || id === 'rain') {
        source = this._makeNoise('brown');
      } else if (id === 'forest') {
        source = this._makeNoise('pink');
        // Add subtle LFO tremolo for wind effect
        const lfo = this._ctx.createOscillator();
        const lfoGain = this._ctx.createGain();
        lfo.frequency.value = 0.3;
        lfoGain.gain.value = 0.15;
        lfo.connect(lfoGain);
        lfoGain.connect(gain.gain);
        lfo.start();
        this._nodes = { source, gain, lfo };
        source.connect(gain);
        source.start();
        this._active = id;
        this._updateButtons(id);
        this._el.status.textContent = `Playing: ${this._sounds.find(s=>s.id===id).emoji} ${this._sounds.find(s=>s.id===id).label}`;
        return;
      } else { // ocean
        source = this._makeNoise('brown');
        const lfo = this._ctx.createOscillator();
        const lfoGain = this._ctx.createGain();
        lfo.frequency.value = 0.1;
        lfoGain.gain.value = 0.4;
        lfo.connect(lfoGain);
        lfoGain.connect(gain.gain);
        lfo.start();
        this._nodes = { source, gain, lfo };
        source.connect(gain);
        source.start();
        this._active = id;
        this._updateButtons(id);
        this._el.status.textContent = `Playing: ${this._sounds.find(s=>s.id===id).emoji} ${this._sounds.find(s=>s.id===id).label}`;
        return;
      }

      source.connect(gain);
      source.start();
      this._nodes = { source, gain };
      this._active = id;
      this._updateButtons(id);
      const s = this._sounds.find(s => s.id === id);
      this._el.status.textContent = `Playing: ${s.emoji} ${s.label}`;
    } catch (e) {
      this._el.status.textContent = 'Audio not supported in this browser';
    }
  },

  _stop() {
    if (this._nodes) {
      try { this._nodes.source?.stop(); } catch (_) {}
      try { this._nodes.lfo?.stop(); } catch (_) {}
      try { this._ctx?.close(); } catch (_) {}
    }
    this._nodes = null;
    this._ctx = null;
    this._active = null;
    this._updateButtons(null);
    if (this._el) this._el.status.textContent = 'Tap a sound to play';
  },

  _makeNoise(type) {
    const bufferSize = this._ctx.sampleRate * 4; // 4s loop
    const buffer = this._ctx.createBuffer(1, bufferSize, this._ctx.sampleRate);
    const data = buffer.getChannelData(0);

    if (type === 'white') {
      for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    } else if (type === 'pink') {
      let b0=0,b1=0,b2=0,b3=0,b4=0,b5=0,b6=0;
      for (let i = 0; i < bufferSize; i++) {
        const w = Math.random() * 2 - 1;
        b0=0.99886*b0+w*0.0555179; b1=0.99332*b1+w*0.0750759;
        b2=0.96900*b2+w*0.1538520; b3=0.86650*b3+w*0.3104856;
        b4=0.55000*b4+w*0.5329522; b5=-0.7616*b5-w*0.0168980;
        data[i] = (b0+b1+b2+b3+b4+b5+b6+w*0.5362) * 0.11;
        b6 = w * 0.115926;
      }
    } else { // brown
      let last = 0;
      for (let i = 0; i < bufferSize; i++) {
        const w = Math.random() * 2 - 1;
        last = (last + (0.02 * w)) / 1.02;
        data[i] = last * 3.5;
      }
    }

    const source = this._ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    // Apply a low-pass filter to smooth
    const filter = this._ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = type === 'white' ? 8000 : type === 'pink' ? 4000 : 1200;
    source.connect(filter);
    filter.connect(this._ctx.createGain()); // will be reconnected by caller via .connect(gain)

    // Return just the source; caller connects source.connect(gain)
    // We need to restructure: return a "connectable" node
    const passthrough = this._ctx.createGain();
    passthrough.gain.value = 1;
    source.connect(filter);
    filter.connect(passthrough);

    // Expose connect method on source but route through filter
    source._output = passthrough;
    const origConnect = source.connect.bind(source);
    source.connect = (dest) => passthrough.connect(dest);

    return source;
  },

  _updateButtons(activeId) {
    if (!this._el) return;
    this._el.btns.querySelectorAll('.ambient-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.id === activeId);
    });
  },
};
