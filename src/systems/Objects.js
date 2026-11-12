// Objetos del mapa (capa "objects" de Tiled): escenario, NPCs y puzles.
//
// Cada objeto interactivo es un registro { type, room, p (propiedades), sprite, zone }.
// 'zone' es un cuerpo estático de Arcade Physics que bloquea el paso.
// El estado persistente se guarda como banderas en la partida:
//   torch:<id>  crystal:<id>  plate:<id>  chest:<id>  door:<id>  burn:<id>  fog:<id>
//   reveal:<id>  torches:<grupo>  clear:<sala>
// Un objeto con la propiedad opens_on / appears_on reacciona cuando se activa esa bandera.
import { TILE, SCREEN_W, SCREEN_H } from '../config.js';
import { Save } from '../save.js';
import { Sfx } from '../sfx.js';

const props = (o) => {
  const r = {};
  (o.properties || []).forEach((p) => { r[p.name] = p.value; });
  return r;
};

export default class Objects {
  constructor(scene) {
    this.scene = scene;
    this.list = [];
    this.spawns = {};
    this.warps = [];
    this.inspect = [];
    this.enemySpawns = {};
    this.tall = [];     // árboles y casas: se vuelven translúcidos si tapan al héroe
  }

  build() {
    const layer = this.scene.map.getObjectLayer('objects');
    for (const o of layer.objects) {
      const p = props(o);
      const cx = o.x + o.width / 2, cy = o.y + o.height / 2;
      const make = this['make_' + o.type];
      if (make) make.call(this, o, p, cx, cy, this.scene.rooms.keyAt(cx, cy));
    }
    // Reaplicar el estado guardado, sin efectos
    Object.keys(Save.data.flags).forEach((f) => this.onFlag(f, false));
  }

  rec(type, room, p, extra) {
    const r = Object.assign({ type, room, p, id: p.id, alive: true, present: true }, extra);
    this.list.push(r);
    return r;
  }

  zone(r, x, y, w, h) {
    const z = this.scene.add.zone(x, y, w, h);
    this.scene.obstacles.add(z);
    z.owner = r;
    r.zone = z;
    return z;
  }

  setPresent(r, on) {
    r.present = on;
    r.sprite.setVisible(on);
    r.zone.body.enable = on;
  }

  kill(r) {
    r.alive = false;
    r.present = false;
    if (r.sprite) r.sprite.destroy();
    if (r.extra) r.extra.destroy();
    if (r.zone) r.zone.destroy();
  }

  // ------------------------------------------------------------ escenario
  make_spawn(o, p, cx, cy) { this.spawns[o.name] = { x: cx, y: cy - 14 }; }

  make_warp(o, p) {
    this.warps.push({ rect: new Phaser.Geom.Rectangle(o.x + 8, o.y + 8, o.width - 16, o.height - 16), to: p.to, spawn: p.spawn });
  }

  make_enemy(o, p, cx, cy, room) {
    (this.enemySpawns[room] || (this.enemySpawns[room] = [])).push({ kind: p.kind, x: cx, y: cy });
  }

  make_boss(o, p, cx, cy, room) {
    (this.enemySpawns[room] || (this.enemySpawns[room] = [])).push({ kind: 'boss', x: cx, y: cy });
  }

  make_tree(o, p, cx) {
    const y = o.y + TILE - 6;
    const img = this.scene.add.image(cx, y, p.sprite).setOrigin(0.5, 0.943).setDepth(y);
    this.tall.push({ img, room: this.scene.rooms.keyAt(cx, o.y + 32) });
  }

  make_deco(o, p, cx) {
    const y = o.y + o.height - 4;
    this.scene.add.image(cx, y, p.sprite).setOrigin(0.5, 1).setDepth(y - 6);
  }

  make_house(o, p, cx) {
    const img = this.scene.add.image(cx, o.y + o.height + 8, p.sprite).setOrigin(0.5, 1).setDepth(o.y + o.height - 4);
    this.tall.push({ img, room: this.scene.rooms.keyAt(cx, o.y + 32) });
  }

  make_gate(o, p, cx) {
    this.scene.add.image(cx, o.y + o.height, p.sprite).setOrigin(0.5, 1).setDepth(o.y + o.height);
    this.inspect.push({ rect: new Phaser.Geom.Rectangle(o.x, o.y, o.width, o.height + 24), text: p.text });
  }

  make_arch(o, p) {
    this.scene.add.image(o.x, o.y, p.sprite).setOrigin(0, 0).setDepth(o.y + o.height - 8);
  }

  /** Atenúa lo que queda delante del héroe y lo tapa. */
  fadeTall(player, room) {
    const px = player.x, py = player.y - 6;
    for (const t of this.tall) {
      if (t.room !== room) continue;
      const img = t.img;
      const w = img.displayWidth * 0.36;
      const top = img.y - img.displayHeight * img.originY;
      const hide = img.depth > player.depth && Math.abs(px - img.x) < w && py > top + 8 && py < img.y - 26;
      const target = hide ? 0.38 : 1;
      if (img.alpha !== target) img.alpha += (target - img.alpha) * 0.25;
      if (Math.abs(img.alpha - target) < 0.02) img.alpha = target;
    }
  }

  // ------------------------------------------------------------ personajes y texto
  make_npc(o, p, cx, cy, room) {
    const s = this.scene.add.sprite(cx, cy - 16, 'npc_' + p.who, 0).setDepth(cy + 22);
    s.play(`npc_${p.who}-idle-down`);
    const r = this.rec('npc', room, p, { sprite: s, talk: true });
    this.zone(r, cx, cy + 10, 44, 36);
  }

  /** El NPC se gira hacia el héroe al hablar. */
  faceNpc(r, player) {
    const dx = player.x - r.sprite.x, dy = player.y - r.sprite.y;
    const dir = Math.abs(dx) > Math.abs(dy) ? 'side' : (dy > 0 ? 'down' : 'up');
    r.sprite.setFlipX(dir === 'side' && dx < 0);
    r.sprite.play(`npc_${r.p.who}-idle-${dir}`);
  }

  make_sign(o, p, cx, cy, room) {
    const y = o.y + TILE - 4;
    const s = this.scene.add.image(cx, y, p.sprite || 'sign').setOrigin(0.5, 1).setDepth(y - 6);
    const r = this.rec('sign', room, p, { sprite: s, talk: true });
    this.zone(r, cx, cy + 8, 48, 44);
  }

  // ------------------------------------------------------------ puzles
  make_chest(o, p, cx, cy, room) {
    const x = cx + (p.ox || 0);
    const s = this.scene.add.sprite(x, cy, 'chest', 0).setDepth(cy + 20);
    const r = this.rec('chest', room, p, { sprite: s, talk: true, open: false, x, y: cy });
    this.zone(r, x, cy + 6, 52, 44);
    if (p.hidden || p.appears_on) this.setPresent(r, false);
  }

  make_torch(o, p, cx, cy, room) {
    const y = o.y + TILE - 2;
    const s = this.scene.add.sprite(cx, y, 'torch', 0).setOrigin(0.5, 1).setDepth(y - 8);
    const r = this.rec('torch', room, p, { sprite: s, lit: false, x: cx, y: cy });
    this.zone(r, cx, cy + 14, 30, 26);
    if (p.lit) this.light(r, false);
  }

  light(r, fx) {
    if (r.lit) return;
    r.lit = true;
    r.sprite.play('torch-lit');
    r.extra = this.scene.add.image(r.sprite.x, r.sprite.y - 60, 'glow').setTint(0xff9a40).setBlendMode('ADD')
      .setAlpha(0.4).setScale(1.5).setDepth(8000);
    this.scene.tweens.add({ targets: r.extra, alpha: 0.3, scale: 1.4, duration: 260 + Math.random() * 200, yoyo: true, repeat: -1 });
    if (fx) { Sfx.play('torch'); this.scene.puff(r.sprite.x, r.sprite.y - 64, 0xffb050, 14); }
  }

  make_crystal(o, p, cx, cy, room) {
    const s = this.scene.add.sprite(cx, cy, 'crystal', 0).setDepth(cy + 22);
    const r = this.rec('crystal', room, p, { sprite: s, on: false });
    this.zone(r, cx, cy + 4, 40, 44);
  }

  make_plate(o, p, cx, cy, room) {
    const s = this.scene.add.sprite(cx, cy, 'plate', 0).setDepth(2);
    this.rec('plate', room, p, { sprite: s, down: false, x: cx, y: cy });
  }

  make_block(o, p, cx, cy, room) {
    const s = this.scene.add.image(cx, cy, 'block').setDepth(cy + 26);
    const r = this.rec('block', room, p, { sprite: s, x: cx, y: cy, home: { x: cx, y: cy }, pushT: 0, lastTouch: 0, moving: false });
    this.zone(r, cx, cy, 58, 58);
  }

  make_pot(o, p, cx, cy, room) {
    const s = this.scene.add.image(cx, cy, 'pot').setDepth(cy + 22);
    this.zone(this.rec('pot', room, p, { sprite: s }), cx, cy + 6, 40, 40);
  }

  make_bush(o, p, cx, cy, room) {
    const s = this.scene.add.image(cx, cy, 'bush').setDepth(cy + 20);
    this.zone(this.rec('bush', room, p, { sprite: s }), cx, cy + 6, 46, 40);
  }

  make_bramble(o, p, cx, cy, room) {
    const s = this.scene.add.image(cx, cy, 'bramble').setScale(1.12).setDepth(cy + 24);
    this.zone(this.rec('bramble', room, p, { sprite: s }), cx, cy, 64, 60);
  }

  make_fog(o, p, cx, cy, room) {
    const s = this.scene.add.sprite(cx, cy, 'fog', 0).setScale(1.5).setAlpha(0.95).setDepth(cy + 60);
    s.play({ key: 'fog-drift', startFrame: (o.x / TILE) % 2 });
    const r = this.rec('fog', room, p, { sprite: s });
    r.extra = this.scene.add.sprite(cx, cy - 26, 'fog', 1).setScale(1.3).setAlpha(0.7).setDepth(cy + 61);
    this.scene.tweens.add({ targets: [s, r.extra], x: '+=8', duration: 1700, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    this.zone(r, cx, cy, 64, 64);
  }

  make_door(o, p, cx, cy, room) {
    const key = { bars: 'bars', lock: 'lockdoor', boss: 'bossdoor' }[p.kind];
    const sprites = [];
    for (let y = 0; y < o.height / TILE; y++) {
      for (let x = 0; x < o.width / TILE; x++) {
        sprites.push(this.scene.add.image(o.x + x * TILE + 32, o.y + y * TILE + 32, key).setDepth(o.y + y * TILE + 58));
      }
    }
    const r = this.rec('door', room, p, { sprites, closed: true, talk: p.kind !== 'bars' });
    this.zone(r, cx, cy, o.width, o.height);
    if (p.ambush) this.setDoor(r, false, false);
  }

  setDoor(r, closed, fx = true) {
    if (r.closed === closed) return;
    r.closed = closed;
    r.present = closed;
    r.zone.body.enable = closed;
    if (fx) Sfx.play('door');
    r.sprites.forEach((s) => {
      this.scene.tweens.killTweensOf(s);
      if (fx) {
        if (closed) s.setVisible(true);
        this.scene.tweens.add({
          targets: s, alpha: closed ? 1 : 0, scaleY: closed ? 1 : 0.1, duration: 260,
          onComplete: () => s.setVisible(closed),
        });
      } else {
        s.setVisible(closed).setAlpha(closed ? 1 : 0).setScale(1, closed ? 1 : 0.1);
      }
    });
  }

  make_bridge(o, p, cx, cy, room) {
    this.rec('bridge', room, p, { rect: o, built: false });
  }

  buildBridge(r, fx) {
    if (r.built) return;
    r.built = true;
    const { ground } = this.scene;
    const idx = this.scene.bridgeIndex;
    let n = 0;
    for (let y = 0; y < r.rect.height / TILE; y++) {
      for (let x = 0; x < r.rect.width / TILE; x++) {
        const tx = r.rect.x / TILE + x, ty = r.rect.y / TILE + y;
        const tile = ground.putTileAt(idx, tx, ty);
        tile.properties = {};
        tile.setCollision(false);
        if (fx) {
          const g = this.scene.add.image(tx * TILE + 32, ty * TILE + 32, 'glow').setTint(0x9fd8ff).setBlendMode('ADD')
            .setScale(0.2).setAlpha(0).setDepth(9000);
          this.scene.tweens.add({ targets: g, alpha: 0.9, scale: 0.8, delay: n * 60, duration: 220, yoyo: true, onComplete: () => g.destroy() });
        }
        n++;
      }
    }
    ground.calculateFacesWithin(r.rect.x / TILE - 1, r.rect.y / TILE - 1, r.rect.width / TILE + 2, r.rect.height / TILE + 2);
    if (fx) Sfx.play('secret');
  }

  // ------------------------------------------------------------ banderas
  onFlag(name, fx) {
    const i = name.indexOf(':');
    const kind = name.slice(0, i), id = name.slice(i + 1);
    for (const r of this.list) {
      if (!r.alive) continue;
      if (r.p.opens_on === name || r.p.appears_on === name) this.trigger(r, fx);
      if (kind === 'clear' && r.type === 'door' && r.p.ambush && r.room === id) this.setDoor(r, false, fx);
      if (r.id !== id) continue;
      if (kind === 'torch' && r.type === 'torch') this.light(r, fx);
      else if (kind === 'crystal' && r.type === 'crystal') {
        r.on = true;
        r.sprite.setFrame(1);
        if (fx) this.scene.ring(r.sprite.x, r.sprite.y - 6, 0xffb050, 120, 350);
      } else if (kind === 'plate' && r.type === 'plate') {
        r.down = true;
        r.sprite.setFrame(1);
        if (!fx) {   // al cargar: dejar el bloque sobre la placa
          const b = this.list.find((q) => q.type === 'block' && q.room === r.room);
          if (b) this.placeBlock(b, r.x, r.y);
        }
      } else if (kind === 'chest' && r.type === 'chest') {
        r.open = true;
        r.sprite.setFrame(1);
        this.setPresent(r, true);
      } else if (kind === 'door' && r.type === 'door') this.setDoor(r, false, fx);
      else if (kind === 'burn' && (r.type === 'bramble')) this.burn(r, fx);
      else if (kind === 'fog' && r.type === 'fog') this.dispel(r, fx);
      else if (kind === 'reveal' && r.p.hidden) this.trigger(r, fx);
    }
  }

  trigger(r, fx) {
    if (r.type === 'door') this.setDoor(r, false, fx);
    else if (r.type === 'bridge') this.buildBridge(r, fx);
    else if (r.type === 'chest' && !r.present) {
      this.setPresent(r, true);
      if (fx) {
        Sfx.play('secret');
        this.scene.puff(r.x, r.y, 0xffffff, 18);
        r.sprite.setScale(0.2);
        this.scene.tweens.add({ targets: r.sprite, scale: 1, duration: 300, ease: 'Back.out' });
      }
    }
  }

  burn(r, fx) {
    if (fx) {
      Sfx.play('torch');
      this.scene.puff(r.sprite.x, r.sprite.y, 0xff8030, 26);
      const s = r.sprite;
      r.sprite = null;
      s.setTint(0xff7030);
      this.scene.tweens.add({ targets: s, alpha: 0, scale: 0.5, duration: 450, onComplete: () => s.destroy() });
    }
    this.kill(r);
  }

  dispel(r, fx) {
    if (fx) {
      const parts = [r.sprite, r.extra];
      r.sprite = null; r.extra = null;
      this.scene.tweens.add({ targets: parts, alpha: 0, scale: 2.4, y: '-=30', duration: 500, onComplete: () => parts.forEach((s) => s.destroy()) });
    }
    this.kill(r);
  }

  smash(r, kind) {
    const s = r.sprite;
    this.scene.puff(s.x, s.y, kind === 'bush' ? 0x7ac070 : 0xc08a60, 12, false);
    Sfx.play(kind === 'bush' ? 'cut' : 'pot');
    this.scene.dropLoot(s.x, s.y + 6, kind);
    this.kill(r);
  }

  // ------------------------------------------------------------ reacciones
  /** Un proyectil mágico ha tocado un objeto. */
  shotHit(shot, r) {
    if (!r || !r.alive) return;
    const scene = this.scene;
    const fire = shot.kind === 'fire', wind = shot.kind === 'wind';
    if (r.type === 'torch' && fire && !r.lit) {
      scene.setFlag('torch:' + r.id);
      const g = r.p.group;
      if (g && this.list.filter((q) => q.type === 'torch' && q.p.group === g).every((q) => q.lit)) {
        scene.time.delayedCall(350, () => { Sfx.play('secret'); scene.setFlag('torches:' + g); });
      }
    } else if (r.type === 'crystal' && !r.on) {
      Sfx.play('switch');
      scene.setFlag('crystal:' + r.id);
    } else if (r.type === 'bramble' && fire) {
      scene.setFlag('burn:' + r.id);
    } else if (r.type === 'bush' && fire) {
      this.smash(r, 'bush');
    } else if (r.type === 'pot') {
      this.smash(r, 'pot');
    } else if (r.type === 'fog' && wind) {
      Sfx.play('wind');
      this.list.filter((q) => q.type === 'fog' && q.room === r.room && q.alive).forEach((q) => scene.setFlag('fog:' + q.id));
    } else if (r.type === 'block' && wind) {
      this.tryPush(r, shot.dx, shot.dy);
    }
  }

  /** La espada barre el rectángulo dado. */
  swordHit(rect) {
    for (const r of this.list) {
      if (!r.alive || !r.zone || (r.type !== 'bush' && r.type !== 'pot')) continue;
      if (Phaser.Geom.Rectangle.Overlaps(rect, r.zone.getBounds())) this.smash(r, r.type);
    }
  }

  /** Objeto con el que se puede hablar/abrir delante del héroe. */
  talkable(rect) {
    for (const r of this.list) {
      if (!r.alive || !r.talk || !r.present || !r.zone) continue;
      if (Phaser.Geom.Rectangle.Overlaps(rect, r.zone.getBounds())) return r;
    }
    for (const q of this.inspect) {
      if (Phaser.Geom.Rectangle.Overlaps(rect, q.rect)) return { type: 'inspect', p: { text: q.text } };
    }
    return null;
  }

  revealRoom(room) {
    let n = 0;
    for (const r of this.list) {
      if (r.room === room && r.p.hidden && !Save.flag('reveal:' + r.id)) {
        this.scene.setFlag('reveal:' + r.id);
        n++;
      }
    }
    return n;
  }

  // ------------------------------------------------------------ bloques
  cellFree(x, y, self) {
    const { ground, solid, rooms } = this.scene;
    const g = ground.getTileAtWorldXY(x, y);
    if (!g || g.collides || solid.getTileAtWorldXY(x, y)) return false;
    if (rooms.keyAt(x, y) !== self.room) return false;
    const lx = Math.floor(x / TILE) % SCREEN_W, ly = Math.floor(y / TILE) % SCREEN_H;
    if (lx < 1 || lx > SCREEN_W - 2 || ly < 1 || ly > SCREEN_H - 2) return false;
    for (const r of this.list) {
      if (r === self || !r.alive || !r.zone || !r.zone.body.enable) continue;
      if (r.zone.getBounds().contains(x, y)) return false;
    }
    return true;
  }

  placeBlock(r, x, y) {
    r.x = x; r.y = y;
    r.zone.setPosition(x, y);
    r.zone.body.updateFromGameObject();
    r.sprite.setPosition(x, y).setDepth(y + 26);
  }

  tryPush(r, dx, dy) {
    if (r.moving) return false;
    const tx = r.x + dx * TILE, ty = r.y + dy * TILE;
    if (!this.cellFree(tx, ty, r)) return false;
    r.moving = true;
    r.x = tx; r.y = ty;
    r.zone.setPosition(tx, ty);
    r.zone.body.updateFromGameObject();     // el cuerpo salta ya; el sprite se desliza
    Sfx.play('push');
    this.scene.tweens.add({
      targets: r.sprite, x: tx, y: ty, duration: 180,
      onComplete: () => {
        r.moving = false;
        r.sprite.setDepth(ty + 26);
        const plate = this.list.find((q) => q.type === 'plate' && !q.down && Math.abs(q.x - tx) < 8 && Math.abs(q.y - ty) < 8);
        if (plate) { Sfx.play('switch'); this.scene.setFlag('plate:' + plate.id); }
      },
    });
    return true;
  }

  /** Al entrar en una sala, los bloques de puzles sin resolver vuelven a su sitio. */
  resetBlocks(room) {
    const solved = this.list.some((q) => q.type === 'plate' && q.room === room && q.down);
    if (solved) return;
    this.list.filter((q) => q.type === 'block' && q.room === room).forEach((b) => this.placeBlock(b, b.home.x, b.home.y));
  }

  ambushDoors(room) {
    return this.list.filter((r) => r.type === 'door' && r.p.ambush && r.room === room);
  }
}
