// Pantalla de título: Continuar / Nueva partida.
import { GAME_W, GAME_H, FONT_TITLE, FONT_TEXT } from '../config.js';
import { Save } from '../save.js';
import { Sfx } from '../sfx.js';

export default class TitleScene extends Phaser.Scene {
  constructor() { super('Title'); }

  create() {
    this.add.image(0, 0, 'title').setOrigin(0);
    this.add.particles(0, 0, 'dot', {
      x: { min: 0, max: GAME_W }, y: GAME_H + 10,
      lifespan: 7000, speedY: { min: -60, max: -25 }, speedX: { min: -12, max: 12 },
      scale: { start: 0.28, end: 0 }, alpha: { start: 0.9, end: 0 },
      tint: [0xff9a40, 0xffc060, 0xff6a30], blendMode: 'ADD', frequency: 140,
    });

    const title = this.add.text(GAME_W / 2, 150, 'ALDERMOOR', {
      fontFamily: FONT_TITLE, fontStyle: '700', fontSize: '112px', color: '#f0d489',
      stroke: '#1a1226', strokeThickness: 10,
    }).setOrigin(0.5).setShadow(0, 6, '#000000', 12, true, true);
    this.add.text(GAME_W / 2, 236, 'EL SELLO QUEBRADO', {
      fontFamily: FONT_TITLE, fontSize: '34px', color: '#d9cfe6', letterSpacing: 12,
    }).setOrigin(0.5).setShadow(0, 3, '#000000', 6, true, true);
    this.tweens.add({ targets: title, y: 156, duration: 2600, yoyo: true, repeat: -1, ease: 'Sine.inOut' });

    this.options = [];
    if (Save.has()) this.options.push({ label: 'Continuar', run: () => this.begin(false) });
    this.options.push({ label: 'Nueva partida', run: () => this.begin(true) });
    this.items = this.options.map((o, i) => this.add.text(GAME_W / 2, 690 + i * 52, o.label, {
      fontFamily: FONT_TITLE, fontSize: '34px', color: '#ffffff',
    }).setOrigin(0.5).setShadow(0, 3, '#000000', 6, true, true).setInteractive({ useHandCursor: true })
      .on('pointerover', () => this.pick(i))
      .on('pointerdown', () => { this.pick(i); this.choose(); }));
    this.add.text(GAME_W / 2, GAME_H - 22, 'Flechas / W-S: elegir   ·   Enter / Espacio: confirmar', {
      fontFamily: FONT_TEXT, fontSize: '18px', color: '#a89fc0',
    }).setOrigin(0.5);

    this.sel = 0;
    this.pick(0);
    this.busy = false;
    const kb = this.input.keyboard;
    kb.on('keydown-UP', () => this.pick(this.sel - 1));
    kb.on('keydown-W', () => this.pick(this.sel - 1));
    kb.on('keydown-DOWN', () => this.pick(this.sel + 1));
    kb.on('keydown-S', () => this.pick(this.sel + 1));
    kb.on('keydown-ENTER', () => this.choose());
    kb.on('keydown-SPACE', () => this.choose());
    this.cameras.main.fadeIn(600, 0, 0, 0);
  }

  pick(i) {
    const n = this.options.length;
    const next = (i + n) % n;
    if (next !== this.sel) Sfx.play('select');
    this.sel = next;
    this.items.forEach((t, k) => {
      t.setColor(k === this.sel ? '#f0d489' : '#8f86a6');
      t.setText((k === this.sel ? '«  ' : '') + this.options[k].label + (k === this.sel ? '  »' : ''));
    });
  }

  choose() {
    if (this.busy) return;
    this.busy = true;
    Sfx.unlock();
    Sfx.play('chest');
    this.options[this.sel].run();
  }

  begin(fresh) {
    if (fresh) Save.reset(); else Save.load();
    this.cameras.main.fadeOut(500, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start('World');
    });
  }
}
