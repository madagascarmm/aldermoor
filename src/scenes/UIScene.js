// Interfaz: HUD (corazones, maná, hechizos, llaves), diálogos, mapa y pausa.
import { GAME_W, GAME_H, HUD_H, VIEW_W, VIEW_H, SPELLS, SPELL_ORDER, ROOM_NAMES, MAP_TITLES, BOSS_ROOM, FONT_TITLE, FONT_TEXT } from '../config.js';
import { Save } from '../save.js';
import { Sfx } from '../sfx.js';

const JustDown = Phaser.Input.Keyboard.JustDown;
const GOLD = 0xe6c46e;

export default class UIScene extends Phaser.Scene {
  constructor() { super('UI'); }

  create() {
    this.world = this.scene.get('World');
    this.dialogOpen = false;
    this.overlayOpen = false;
    this.overlayKind = null;

    // ---- Ambiente sobre la vista del juego
    this.dark = this.add.rectangle(0, HUD_H, VIEW_W, VIEW_H, 0x0a0626, 0.22).setOrigin(0);
    this.vignette = this.add.image(0, HUD_H, 'vignette').setOrigin(0);

    // ---- Barra superior
    const g = this.add.graphics();
    g.fillStyle(0x14101c).fillRect(0, 0, GAME_W, HUD_H);
    g.fillStyle(0x3a3050).fillRect(0, HUD_H - 3, GAME_W, 3);
    g.fillStyle(GOLD, 0.55).fillRect(0, HUD_H - 1, GAME_W, 1);

    this.hearts = [];
    this.manaG = this.add.graphics();
    this.manaFlash = 0;

    this.slots = SPELL_ORDER.map((id, i) => {
      const x = 368 + i * 56;
      const icon = this.add.image(x, 32, 'spells', SPELLS[id].icon).setScale(0.92);
      const num = this.add.text(x - 22, 8, String(i + 1), { fontFamily: FONT_TITLE, fontSize: '13px', color: '#a89fc0' });
      return { id, icon, num, x };
    });
    this.slotSel = this.add.graphics();
    this.spellLabel = this.add.text(568, 32, '', { fontFamily: FONT_TEXT, fontSize: '19px', color: '#d9cfe6' }).setOrigin(0, 0.5);

    this.keyIcon = this.add.image(718, 32, 'items', 0);
    this.keyText = this.add.text(738, 32, '×0', { fontFamily: FONT_TEXT, fontStyle: '700', fontSize: '22px', color: '#ffffff' }).setOrigin(0, 0.5);
    this.bossKeyIcon = this.add.image(800, 32, 'items', 1);
    this.mapIcon = this.add.image(842, 32, 'items', 2);
    this.frags = [0, 1, 2].map((i) => this.add.image(896 + i * 34, 32, 'items', 3).setScale(0.9));

    this.roomText = this.add.text(GAME_W - 18, 32, '', { fontFamily: FONT_TITLE, fontSize: '20px', color: '#f0d489' }).setOrigin(1, 0.5);

    this.toastText = this.add.text(GAME_W / 2, HUD_H + 54, '', {
      fontFamily: FONT_TEXT, fontStyle: 'italic', fontSize: '24px', color: '#ffffff',
      backgroundColor: 'rgba(16,12,24,0.82)', padding: { x: 18, y: 8 },
    }).setOrigin(0.5).setAlpha(0);

    // ---- Barra del jefe
    this.bossBox = this.add.container(GAME_W / 2, GAME_H - 44).setVisible(false);
    this.bossG = this.add.graphics();
    this.bossName = this.add.text(0, -22, '', { fontFamily: FONT_TITLE, fontSize: '20px', color: '#ffb070', stroke: '#1a1226', strokeThickness: 5 }).setOrigin(0.5);
    this.bossBox.add([this.bossG, this.bossName]);

    // ---- Caja de diálogo
    const bx = 150, by = GAME_H - 232, bw = GAME_W - 300, bh = 200;
    this.dBox = this.add.container(0, 0).setVisible(false);
    const dg = this.add.graphics();
    dg.fillStyle(0x100c18, 0.94).fillRoundedRect(bx, by, bw, bh, 16);
    dg.lineStyle(3, GOLD, 1).strokeRoundedRect(bx, by, bw, bh, 16);
    dg.lineStyle(1, 0x6a5a8a, 1).strokeRoundedRect(bx + 7, by + 7, bw - 14, bh - 14, 11);
    this.dName = this.add.text(bx + 32, by - 2, '', {
      fontFamily: FONT_TITLE, fontStyle: '700', fontSize: '21px', color: '#1a1226',
      backgroundColor: '#e6c46e', padding: { x: 14, y: 4 },
    }).setOrigin(0, 0.5);
    this.dText = this.add.text(bx + 34, by + 30, '', {
      fontFamily: FONT_TEXT, fontSize: '27px', color: '#f2ecff', lineSpacing: 6,
      wordWrap: { width: bw - 68 },
    });
    this.dArrow = this.add.triangle(bx + bw - 36, by + bh - 34, 0, 0, 18, 0, 9, 12, GOLD);
    this.tweens.add({ targets: this.dArrow, y: '+=6', duration: 420, yoyo: true, repeat: -1 });
    this.dBox.add([dg, this.dName, this.dText, this.dArrow]);

    // ---- Superposición (mapa / pausa)
    this.overlay = this.add.container(0, 0).setVisible(false);

    // ---- Teclado
    const K = Phaser.Input.Keyboard.KeyCodes;
    this.keys = this.input.keyboard.addKeys({ e: K.E, enter: K.ENTER, space: K.SPACE, m: K.M, esc: K.ESC, p: K.P });

    // ---- Eventos del juego
    const ev = this.game.events;
    ev.on('hud:room', (name) => this.setRoom(name));
    ev.on('hud:toast', (msg) => this.toast(msg));
    ev.on('hud:nomana', () => { this.manaFlash = 350; });
    ev.on('boss:show', (name, hp, max) => { this.bossName.setText(name); this.bossBox.setVisible(true); this.drawBoss(hp, max); });
    ev.on('boss:hp', (hp, max) => this.drawBoss(hp, max));
    ev.on('boss:hide', () => this.bossBox.setVisible(false));
    ev.on('world:ready', () => this.syncWorld());
    this.syncWorld();
    if (this.world.rooms) this.setRoom((ROOM_NAMES[this.world.mapKey] || {})[this.world.rooms.key] || '');
  }

  syncWorld() {
    const dungeon = this.world.mapKey !== 'overworld';
    this.dark.setVisible(dungeon);
    this.vignette.setAlpha(dungeon ? 1 : 0.5);
    this.bossBox.setVisible(false);
    // Tras reiniciar la escena del mundo no puede quedar nada abierto
    this.dialogOpen = false;
    this.onDone = null;
    this.dBox.setVisible(false);
  }

  setRoom(name) {
    this.roomText.setText(name).setAlpha(0);
    this.tweens.add({ targets: this.roomText, alpha: 1, duration: 500 });
  }

  toast(msg) {
    this.tweens.killTweensOf(this.toastText);
    this.toastText.setText(msg).setAlpha(0);
    this.tweens.add({ targets: this.toastText, alpha: 1, duration: 200, hold: 2600, yoyo: true });
  }

  drawBoss(hp, max) {
    const w = 520, h = 14;
    this.bossG.clear();
    this.bossG.fillStyle(0x100c18, 0.9).fillRoundedRect(-w / 2 - 4, -4, w + 8, h + 8, 6);
    this.bossG.fillStyle(0x4a2030).fillRect(-w / 2, 0, w, h);
    this.bossG.fillStyle(0xff7030).fillRect(-w / 2, 0, w * Math.max(0, hp / max), h);
    this.bossG.lineStyle(2, GOLD, 0.9).strokeRoundedRect(-w / 2 - 4, -4, w + 8, h + 8, 6);
  }

  // ================================================================ HUD
  drawHud(delta) {
    const S = Save.data;
    const n = Math.ceil(S.maxHp / 2);
    while (this.hearts.length < n) this.hearts.push(this.add.image(30 + this.hearts.length * 34, 22, 'hearts', 0).setScale(0.82));
    this.hearts.forEach((h, i) => {
      h.setVisible(i < n);
      const v = S.hp - i * 2;
      h.setFrame(v >= 2 ? 0 : v === 1 ? 1 : 2);
    });

    // barra de maná
    const mx = 16, my = 44, mw = 300, mh = 12;
    this.manaFlash = Math.max(0, this.manaFlash - delta);
    const flash = this.manaFlash > 0 && Math.floor(this.manaFlash / 60) % 2 === 0;
    this.manaG.clear();
    this.manaG.fillStyle(0x0c0a14).fillRoundedRect(mx - 2, my - 2, mw + 4, mh + 4, 5);
    this.manaG.fillStyle(flash ? 0xa03040 : 0x232a4a).fillRect(mx, my, mw, mh);
    this.manaG.fillStyle(0x4a8cf0).fillRect(mx, my, mw * (S.mana / S.maxMana), mh);
    this.manaG.fillStyle(0x9cc8ff, 0.7).fillRect(mx, my, mw * (S.mana / S.maxMana), 3);
    this.manaG.lineStyle(1, 0x8a80a8, 1).strokeRoundedRect(mx - 2, my - 2, mw + 4, mh + 4, 5);

    // hechizos
    this.slotSel.clear();
    this.slots.forEach((s) => {
      const known = S.spells.includes(s.id);
      s.icon.setAlpha(known ? 1 : 0.16);
      s.num.setAlpha(known ? 1 : 0.3);
      if (S.spell === s.id) this.slotSel.lineStyle(3, GOLD, 1).strokeRoundedRect(s.x - 25, 7, 50, 50, 9);
    });
    const sp = S.spell && SPELLS[S.spell];
    this.spellLabel.setText(sp ? `${sp.name}\n${sp.cost} maná` : (S.spells.length ? '' : 'Sin magia'));
    this.spellLabel.setLineSpacing(-4);

    this.keyText.setText('×' + S.keys);
    this.keyIcon.setAlpha(S.keys ? 1 : 0.35);
    this.keyText.setAlpha(S.keys ? 1 : 0.45);
    this.bossKeyIcon.setAlpha(S.items.bossKey ? 1 : 0.14);
    this.mapIcon.setAlpha(S.items.map ? 1 : 0.14);
    this.frags.forEach((f, i) => f.setAlpha(i < S.fragments ? 1 : 0.16));
  }

  // ================================================================ diálogos
  /**
   * Muestra un diálogo por páginas. Pausa la física del mundo mientras dura.
   * @param {string} name   nombre del hablante ('' para narración)
   * @param {string[]} pages
   * @param {Function} [done]
   */
  dialog(name, pages, done) {
    this.dialogOpen = true;
    this.guard = true;                // ignora la pulsación que abrió el diálogo
    this.pages = pages.slice();
    this.page = 0;
    this.onDone = done || null;
    this.dName.setText(name).setVisible(!!name);
    this.dBox.setVisible(true);
    this.world.physics.world.pause();
    this.showPage();
  }

  showPage() {
    this.dText.setText(this.pages[this.page]);
    this.full = this.dText.getWrappedText(this.pages[this.page]).join('\n');
    this.dText.setText('');
    this.shown = 0;
    this.acc = 0;
    this.typing = true;
    this.dArrow.setVisible(false);
  }

  updateDialog(delta, press) {
    if (this.typing) {
      this.acc += delta;
      const n = Math.min(this.full.length, Math.floor(this.acc / 16));
      if (n !== this.shown) {
        if (n % 3 === 0) Sfx.play('blip');
        this.shown = n;
        this.dText.setText(this.full.slice(0, n));
      }
      if (n >= this.full.length) { this.typing = false; this.dArrow.setVisible(true); }
    }
    if (this.guard) { this.guard = false; return; }
    if (!press) return;
    if (this.typing) {
      this.typing = false;
      this.dText.setText(this.full);
      this.dArrow.setVisible(true);
    } else if (this.page < this.pages.length - 1) {
      this.page++;
      Sfx.play('select');
      this.showPage();
    } else {
      this.closeDialog();
    }
  }

  closeDialog() {
    this.dialogOpen = false;
    // La UI se actualiza antes que el mundo: esta pulsación no debe llegar al juego
    this.closedFrame = this.game.loop.frame;
    this.dBox.setVisible(false);
    const w = this.world;
    if (!w.rooms.moving && !w.leaving) w.physics.world.resume();
    const cb = this.onDone;
    this.onDone = null;
    if (cb) cb();
  }

  // ================================================================ mapa y pausa
  openOverlay(kind) {
    this.overlayOpen = true;
    this.overlayKind = kind;
    this.scene.pause('World');
    this.overlay.removeAll(true);
    const o = this.overlay;
    o.add(this.add.rectangle(0, 0, GAME_W, GAME_H, 0x08060e, 0.86).setOrigin(0));
    const title = (t, y) => o.add(this.add.text(GAME_W / 2, y, t, { fontFamily: FONT_TITLE, fontStyle: '700', fontSize: '46px', color: '#f0d489' }).setOrigin(0.5));
    if (kind === 'pause') {
      title('PAUSA', 170);
      const lines = [
        ['WASD / Flechas', 'Moverse'], ['Espacio / J', 'Espada'], ['Shift / K (mantener)', 'Escudo'],
        ['L / F', 'Lanzar hechizo'], ['1-4 / Q', 'Cambiar hechizo'], ['E / Enter', 'Hablar, abrir, leer'],
        ['M', 'Mapa'], ['Esc / P', 'Pausa'],
      ];
      lines.forEach(([k, v], i) => {
        o.add(this.add.text(GAME_W / 2 - 30, 270 + i * 44, k, { fontFamily: FONT_TITLE, fontSize: '24px', color: '#e6c46e' }).setOrigin(1, 0.5));
        o.add(this.add.text(GAME_W / 2 + 30, 270 + i * 44, v, { fontFamily: FONT_TEXT, fontSize: '26px', color: '#f2ecff' }).setOrigin(0, 0.5));
      });
      o.add(this.add.text(GAME_W / 2, 690, 'La partida se guarda sola al cambiar de pantalla.', { fontFamily: FONT_TEXT, fontStyle: 'italic', fontSize: '22px', color: '#a89fc0' }).setOrigin(0.5));
    } else {
      this.drawMap(title);
    }
    o.setVisible(true);
    Sfx.play('select');
  }

  drawMap(title) {
    const o = this.overlay;
    const w = this.world;
    const S = Save.data;
    const mapKey = w.mapKey;
    const dungeon = mapKey !== 'overworld';
    title(MAP_TITLES[mapKey] || 'Mapa', 130);
    const names = ROOM_NAMES[mapKey] || {};
    const visited = S.visited[mapKey] || [];
    const hasMap = dungeon && S.items.map;
    const cw = 290, ch = 150, gap = 12;
    const x0 = GAME_W / 2 - (cw * 3 + gap * 2) / 2, y0 = 210;
    const g = this.add.graphics();
    o.add(g);
    for (let ry = 0; ry < 3; ry++) {
      for (let rx = 0; rx < 3; rx++) {
        const key = `${rx},${ry}`;
        if (!names[key]) continue;
        const seen = visited.includes(key);
        if (!seen && !hasMap && dungeon) continue;
        const x = x0 + rx * (cw + gap), y = y0 + ry * (ch + gap);
        const here = key === w.rooms.key;
        g.fillStyle(seen ? (dungeon ? 0x3c3658 : 0x35553a) : 0x1c1828, 1).fillRoundedRect(x, y, cw, ch, 10);
        g.lineStyle(here ? 4 : 2, here ? GOLD : 0x6a5a8a, 1).strokeRoundedRect(x, y, cw, ch, 10);
        const label = seen || hasMap ? names[key] : '???';
        o.add(this.add.text(x + cw / 2, y + ch / 2 - (here ? 14 : 0), label, {
          fontFamily: FONT_TITLE, fontSize: '19px', color: seen ? '#f2ecff' : '#7a7090', align: 'center', wordWrap: { width: cw - 30 },
        }).setOrigin(0.5));
        if (here) {
          const dot = this.add.text(x + cw / 2, y + ch / 2 + 26, 'Estás aquí', { fontFamily: FONT_TEXT, fontSize: '20px', color: '#f0d489' }).setOrigin(0.5);
          o.add(dot);
          this.tweens.add({ targets: dot, alpha: 0.35, duration: 500, yoyo: true, repeat: -1 });
        }
        if (hasMap && BOSS_ROOM[mapKey] === key && !here) {
          o.add(this.add.text(x + cw / 2, y + ch - 26, 'JEFE', { fontFamily: FONT_TITLE, fontStyle: '700', fontSize: '18px', color: '#ff7a50' }).setOrigin(0.5));
        }
      }
    }
    const note = dungeon && !hasMap ? 'Sin mapa: solo se muestran las salas visitadas.' : 'M o Esc para cerrar';
    o.add(this.add.text(GAME_W / 2, 742, note, { fontFamily: FONT_TEXT, fontStyle: 'italic', fontSize: '22px', color: '#a89fc0' }).setOrigin(0.5));
  }

  closeOverlay() {
    this.overlayOpen = false;
    this.overlayKind = null;
    this.overlay.setVisible(false);
    this.overlay.removeAll(true);
    this.scene.resume('World');
  }

  update(time, delta) {
    const k = this.keys;
    const press = [JustDown(k.e), JustDown(k.enter), JustDown(k.space)].some(Boolean);
    const m = JustDown(k.m);
    const esc = [JustDown(k.esc), JustDown(k.p)].some(Boolean);
    this.drawHud(delta);

    if (this.dialogOpen) { this.updateDialog(delta, press); return; }
    const w = this.world;
    if (this.overlayOpen) {
      if (esc || (m && this.overlayKind === 'map') || (press && this.overlayKind === 'pause')) this.closeOverlay();
      else if (m) this.openOverlay('map');
      return;
    }
    if (!w.rooms || w.rooms.moving || w.leaving || w.cutscene || !w.player || w.player.mode === 'dead') return;
    if (m) this.openOverlay('map');
    else if (esc) this.openOverlay('pause');
  }
}
