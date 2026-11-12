// Guardado de partida en LocalStorage.
import { PLAYER } from './config.js';

const KEY = 'aldermoor.save.v1';

function fresh() {
  return {
    v: 1,
    map: 'overworld', spawn: 'start', x: null, y: null, dir: 'down',
    hp: PLAYER.startHp, maxHp: PLAYER.startHp,
    mana: PLAYER.startMana, maxMana: PLAYER.startMana,
    spells: [], spell: null,
    keys: 0,
    items: { map: false, bossKey: false },
    fragments: 0,
    flags: {},                    // cofres, puertas, puzles, diálogos...
    visited: {},                  // { mapa: ['1,2', ...] }
    checkpoint: { map: 'overworld', spawn: 'start' },
  };
}

function storage() {
  try {
    const s = window.localStorage;
    s.setItem('__t', '1'); s.removeItem('__t');
    return s;
  } catch (e) {
    return null;                  // navegación privada o almacenamiento bloqueado
  }
}

export const Save = {
  data: fresh(),

  has() {
    const s = storage();
    return !!(s && s.getItem(KEY));
  },

  load() {
    const s = storage();
    if (!s) return false;
    try {
      const raw = JSON.parse(s.getItem(KEY));
      if (!raw || raw.v !== 1) return false;
      this.data = Object.assign(fresh(), raw);
      this.data.items = Object.assign({ map: false, bossKey: false }, raw.items);
      return true;
    } catch (e) {
      return false;
    }
  },

  write() {
    const s = storage();
    if (!s) return;
    try {
      const d = Object.assign({}, this.data, { mana: Math.round(this.data.mana) });
      s.setItem(KEY, JSON.stringify(d));
    } catch (e) { /* cuota llena: se ignora */ }
  },

  reset() {
    this.data = fresh();
    const s = storage();
    if (s) s.removeItem(KEY);
  },

  flag(name) { return !!this.data.flags[name]; },
  setFlag(name) { this.data.flags[name] = true; },

  visit(map, key) {
    const list = this.data.visited[map] || (this.data.visited[map] = []);
    if (!list.includes(key)) list.push(key);
  },
};
