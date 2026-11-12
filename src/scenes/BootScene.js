// Carga de recursos y definición de animaciones.
import { GAME_W, GAME_H, FONT_TITLE } from '../config.js';

const SHEETS = [
  // [clave, ruta, ancho, alto]
  ['hero', 'sprites/hero.png', 96, 96], ['knight', 'sprites/knight.png', 96, 96], ['boss', 'sprites/boss.png', 160, 160],
  ['npc_maelis', 'sprites/npc_maelis.png', 96, 96], ['npc_bruna', 'sprites/npc_bruna.png', 96, 96],
  ['npc_lina', 'sprites/npc_lina.png', 96, 96], ['npc_tobias', 'sprites/npc_tobias.png', 96, 96],
  ['npc_oswin', 'sprites/npc_oswin.png', 96, 96],
  ['slime', 'sprites/slime.png', 64, 64], ['bat', 'sprites/bat.png', 64, 64],
  ['torch', 'sprites/torch.png', 64, 96], ['crystal', 'sprites/crystal.png', 64, 64],
  ['plate', 'sprites/plate.png', 64, 64], ['chest', 'sprites/chest.png', 64, 64], ['fog', 'sprites/fog.png', 64, 64],
  ['fire', 'sprites/fire.png', 48, 48], ['bossfire', 'sprites/bossfire.png', 48, 48],
  ['wind', 'sprites/wind.png', 64, 64], ['boom', 'sprites/boom.png', 64, 64],
  ['hearts', 'ui/hearts.png', 40, 40], ['spells', 'ui/spells.png', 48, 48], ['items', 'ui/items.png', 40, 40],
];
const IMAGES = ['block', 'bars', 'lockdoor', 'bossdoor', 'bramble', 'bush', 'rock', 'stump', 'sign', 'pot', 'fence',
  'well', 'tree_oak', 'tree_dark', 'tree_pine', 'tree_dead', 'house_a', 'house_b', 'gate', 'arch', 'column',
  'column_broken', 'statue', 'altar', 'dot', 'glow'];

// Hoja de humanoide: 16 columnas x 3 filas (abajo, arriba, lado)
const ROWS = { down: 0, up: 1, side: 2 };
const POSES = {
  idle: { from: 0, n: 2, rate: 3, loop: true },
  walk: { from: 2, n: 6, rate: 12, loop: true },
  attack: { from: 8, n: 4, rate: 18, loop: false },
  cast: { from: 12, n: 2, rate: 10, loop: false },
  guard: { from: 14, n: 1, rate: 1, loop: false },
  hurt: { from: 15, n: 1, rate: 1, loop: false },
};

export default class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }

  preload() {
    const bar = this.add.graphics();
    const label = this.add.text(GAME_W / 2, GAME_H / 2 - 40, 'Cargando...', {
      fontFamily: FONT_TITLE, fontSize: '28px', color: '#e6c46e',
    }).setOrigin(0.5);
    this.load.on('progress', (p) => {
      bar.clear();
      bar.fillStyle(0x2a2438).fillRect(GAME_W / 2 - 200, GAME_H / 2, 400, 14);
      bar.fillStyle(0xe6c46e).fillRect(GAME_W / 2 - 200, GAME_H / 2, 400 * p, 14);
    });
    this.load.on('loaderror', (f) => label.setText('No se pudo cargar: ' + f.key));

    this.load.setPath('assets/');
    this.load.image('tiles', 'tilesets/tiles.png');
    this.load.tilemapTiledJSON('overworld', 'maps/overworld.json');
    this.load.tilemapTiledJSON('cripta', 'maps/cripta.json');
    SHEETS.forEach(([k, p, w, h]) => this.load.spritesheet(k, p, { frameWidth: w, frameHeight: h }));
    IMAGES.forEach((k) => this.load.image(k, `sprites/${k}.png`));
    this.load.image('title', 'ui/title.png');
    this.load.image('vignette', 'ui/vignette.png');
  }

  create() {
    this.makeAnims();
    // Esperar a las tipografías (con límite de tiempo por si fallan)
    const fonts = ['700 32px Cinzel', '400 20px Cinzel', '400 24px Alegreya', '700 24px Alegreya', 'italic 24px Alegreya'];
    const ready = document.fonts && document.fonts.load
      ? Promise.all(fonts.map((f) => document.fonts.load(f))).catch(() => {})
      : Promise.resolve();
    let started = false;
    const go = () => { if (!started) { started = true; this.scene.start('Title'); } };
    ready.then(go);
    this.time.delayedCall(2500, go);
  }

  makeAnims() {
    const A = this.anims;
    const human = (key, cols, poses) => {
      for (const [dir, row] of Object.entries(ROWS)) {
        for (const pose of poses) {
          const p = POSES[pose];
          A.create({
            key: `${key}-${pose}-${dir}`,
            frames: A.generateFrameNumbers(key, { start: row * cols + p.from, end: row * cols + p.from + p.n - 1 }),
            frameRate: p.rate, repeat: p.loop ? -1 : 0,
          });
        }
      }
    };
    human('hero', 16, Object.keys(POSES));
    human('knight', 16, ['idle', 'walk', 'attack', 'hurt']);
    human('boss', 16, ['idle', 'walk', 'attack', 'hurt']);
    ['maelis', 'bruna', 'lina', 'tobias', 'oswin'].forEach((n) => human('npc_' + n, 8, ['idle', 'walk']));

    const loop = (key, sheet, start, end, rate, repeat = -1) => A.create({
      key, frames: A.generateFrameNumbers(sheet, { start, end }), frameRate: rate, repeat,
    });
    loop('slime-move', 'slime', 0, 3, 8);
    loop('bat-fly', 'bat', 0, 3, 14);
    loop('torch-lit', 'torch', 1, 4, 10);
    loop('fog-drift', 'fog', 0, 1, 2);
    loop('fire-fly', 'fire', 0, 3, 16);
    loop('bossfire-fly', 'bossfire', 0, 3, 16);
    loop('wind-fly', 'wind', 0, 3, 16);
    loop('boom', 'boom', 0, 4, 20, 0);
  }
}
