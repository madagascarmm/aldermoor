// Efectos de sonido sintetizados con WebAudio: no hace falta ningún archivo.
let ctx = null;
let master = null;

function ac() {
  if (!ctx) {
    const A = window.AudioContext || window.webkitAudioContext;
    if (!A) return null;
    ctx = new A();
    master = ctx.createGain();
    master.gain.value = 0.5;
    master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function tone(freq, dur, { type = 'square', vol = 0.12, to = null, delay = 0 } = {}) {
  const c = ac(); if (!c) return;
  const t = c.currentTime + delay;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(master);
  o.start(t); o.stop(t + dur + 0.02);
}

function noise(dur, { vol = 0.15, freq = 1200, to = null, q = 1, delay = 0, type = 'bandpass' } = {}) {
  const c = ac(); if (!c) return;
  const t = c.currentTime + delay;
  const len = Math.max(1, Math.floor(c.sampleRate * dur));
  const buf = c.createBuffer(1, len, c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource(); src.buffer = buf;
  const f = c.createBiquadFilter(); f.type = type; f.Q.value = q;
  f.frequency.setValueAtTime(freq, t);
  if (to) f.frequency.exponentialRampToValueAtTime(to, t + dur);
  const g = c.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f); f.connect(g); g.connect(master);
  src.start(t); src.stop(t + dur + 0.02);
}

const arp = (notes, step, opt) => notes.forEach((n, i) => tone(n, step * 1.6, Object.assign({ delay: i * step }, opt)));

const SOUNDS = {
  sword:  () => noise(0.14, { freq: 2600, to: 700, vol: 0.16 }),
  hit:    () => { noise(0.08, { freq: 900, vol: 0.2 }); tone(190, 0.1, { to: 80, vol: 0.14 }); },
  clang:  () => { tone(1250, 0.12, { type: 'triangle', vol: 0.14 }); tone(1870, 0.16, { type: 'triangle', vol: 0.08 }); },
  block:  () => { tone(420, 0.09, { type: 'triangle', vol: 0.16 }); noise(0.06, { freq: 1800, vol: 0.1 }); },
  hurt:   () => tone(330, 0.26, { to: 90, type: 'sawtooth', vol: 0.15 }),
  die:    () => arp([392, 330, 262, 196, 131], 0.13, { type: 'triangle', vol: 0.16 }),
  kill:   () => { noise(0.22, { freq: 500, to: 120, vol: 0.2 }); tone(140, 0.2, { to: 50, vol: 0.12 }); },
  fire:   () => noise(0.28, { freq: 500, to: 1700, vol: 0.2, q: 0.7 }),
  wind:   () => noise(0.34, { freq: 2400, to: 500, vol: 0.16, q: 2 }),
  reveal: () => arp([523, 659, 784, 1047, 1319], 0.07, { type: 'sine', vol: 0.12 }),
  egida:  () => arp([392, 523, 659], 0.08, { type: 'triangle', vol: 0.14 }),
  nomana: () => tone(120, 0.16, { type: 'square', vol: 0.1 }),
  boom:   () => noise(0.3, { freq: 380, to: 90, vol: 0.24, type: 'lowpass' }),
  torch:  () => { noise(0.3, { freq: 800, to: 2200, vol: 0.14 }); tone(660, 0.2, { type: 'sine', vol: 0.08 }); },
  switch: () => arp([784, 1175], 0.08, { type: 'sine', vol: 0.14 }),
  door:   () => { noise(0.3, { freq: 220, vol: 0.2, type: 'lowpass' }); tone(98, 0.3, { to: 62, type: 'sawtooth', vol: 0.1 }); },
  push:   () => noise(0.2, { freq: 180, vol: 0.2, type: 'lowpass' }),
  cut:    () => noise(0.1, { freq: 3200, vol: 0.1 }),
  pot:    () => noise(0.16, { freq: 1500, to: 600, vol: 0.2, q: 3 }),
  heart:  () => arp([659, 880], 0.07, { type: 'sine', vol: 0.14 }),
  mana:   () => arp([587, 784], 0.07, { type: 'triangle', vol: 0.12 }),
  key:    () => arp([988, 1319], 0.06, { type: 'square', vol: 0.07 }),
  chest:  () => arp([392, 440, 494, 523], 0.11, { type: 'triangle', vol: 0.15 }),
  item:   () => arp([523, 659, 784, 1047], 0.13, { type: 'square', vol: 0.09 }),
  secret: () => arp([784, 740, 622, 440, 415, 659, 831, 1047], 0.09, { type: 'triangle', vol: 0.13 }),
  blip:   () => tone(700 + Math.random() * 90, 0.03, { type: 'square', vol: 0.035 }),
  select: () => tone(880, 0.06, { type: 'triangle', vol: 0.1 }),
  alert:  () => arp([880, 1320], 0.06, { type: 'square', vol: 0.08 }),
  bosshit: () => { noise(0.12, { freq: 600, vol: 0.24 }); tone(110, 0.2, { to: 55, type: 'sawtooth', vol: 0.16 }); },
  roar:   () => { tone(82, 0.9, { to: 48, type: 'sawtooth', vol: 0.2 }); noise(0.9, { freq: 260, vol: 0.16, type: 'lowpass' }); },
  steam:  () => noise(0.7, { freq: 4200, to: 1500, vol: 0.16 }),
  win:    () => arp([523, 659, 784, 1047, 784, 1047, 1319], 0.14, { type: 'triangle', vol: 0.16 }),
};

export const Sfx = {
  muted: false,
  unlock() { ac(); },
  play(name) {
    if (this.muted) return;
    try { (SOUNDS[name] || (() => {}))(); } catch (e) { /* sin audio: se ignora */ }
  },
};
