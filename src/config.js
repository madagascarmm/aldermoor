// Constantes y tablas de equilibrio. Reflejan DISENO.md: si cambias un
// número aquí, cámbialo también en el documento.

export const TILE = 64;
export const SCREEN_W = 20;            // tiles por pantalla
export const SCREEN_H = 12;
export const VIEW_W = SCREEN_W * TILE; // 1280
export const VIEW_H = SCREEN_H * TILE; // 768
export const HUD_H = 64;
export const GAME_W = VIEW_W;
export const GAME_H = VIEW_H + HUD_H;  // 832

export const PLAYER = {
  speed: 250,
  guardSpeed: 110,
  swordDamage: 2,
  attackTime: 220,
  iframes: 1000,
  knockSpeed: 420,
  knockTime: 160,
  startHp: 6,          // medios corazones
  startMana: 40,
  manaRegen: 3,        // por segundo
  manaDelay: 1200,     // ms sin lanzar antes de regenerar
  castCooldown: 350,
};

export const SPELL_ORDER = ['brasa', 'vendaval', 'revelacion', 'egida'];
export const SPELLS = {
  brasa:      { name: 'Brasa',      cost: 6,  icon: 0, shot: 'fire', damage: 2, speed: 520, life: 1100, color: 0xff8a30 },
  vendaval:   { name: 'Vendaval',   cost: 6,  icon: 1, shot: 'wind', damage: 1, speed: 640, life: 900,  color: 0x9ff0e8, push: 2 * TILE, stun: 1000 },
  revelacion: { name: 'Revelación', cost: 12, icon: 2, color: 0xb884ff },
  egida:      { name: 'Égida',      cost: 20, icon: 3, color: 0xffd66e, duration: 4000 },
};

export const ENEMIES = {
  slime:  { hp: 2, damage: 1, hop: 150, wait: 900, hopTime: 420 },
  bat:    { hp: 1, damage: 1, speed: 210, sight: 5 * TILE },
  knight: { hp: 6, damage: 2, patrol: 70, charge: 320, sight: 6 * TILE, alert: 500, recover: 900 },
};

export const BOSS = {
  name: 'Ser Caldric, el Guardián Calcinado',
  hp: 20,
  contact: 2,
  fireball: 2,
  chargeDamage: 3,
  walk: 90,
  charge: 430,
  fireSpeed: 330,
  outTime: 3500,
};

// probabilidades [corazón, vial de maná]; el resto es "nada"
export const DROPS = {
  enemy: [0.22, 0.28],
  bush:  [0.12, 0.12],
  pot:   [0.25, 0.30],
};
export const HEART_HEAL = 2;
export const VIAL_MANA = 12;

export const ROOM_NAMES = {
  overworld: {
    '0,0': 'Santuario Olvidado', '1,0': 'Puerta de Cuervonegro', '2,0': 'Ruinas de Piedralba',
    '0,1': 'Claro de Ceniza',    '1,1': 'Cruce del Rey',         '2,1': 'Sauceumbrío Norte',
    '0,2': 'Lago del Espejo',    '1,2': 'Aldea de Brezal',       '2,2': 'Sauceumbrío Sur',
  },
  cripta: {
    '0,0': 'Sala del Abismo',  '1,0': 'Cámara del Guardián', '2,0': 'Sala de Emboscada',
    '0,1': 'Sala del Bloque',  '1,1': 'Galería Central',     '2,1': 'Sala del Cristal',
    '0,2': 'Armería',          '1,2': 'Vestíbulo',
  },
};
export const MAP_TITLES = { overworld: 'Aldermoor', cripta: 'Cripta de las Brasas' };
export const BOSS_ROOM = { cripta: '1,0' };

export const FONT_TITLE = 'Cinzel, Georgia, serif';
export const FONT_TEXT = 'Alegreya, Georgia, serif';
