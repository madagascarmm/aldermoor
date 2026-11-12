// Escena principal: mapa, jugador, enemigos, puzles e interacción.
import { TILE, HUD_H, VIEW_W, VIEW_H, PLAYER, DROPS, HEART_HEAL, VIAL_MANA, BOSS_ROOM } from '../config.js';
import { Save } from '../save.js';
import { Sfx } from '../sfx.js';
import { NPCS, TEXTS, ITEMS } from '../data/dialogs.js';
import Player, { dirVec } from '../entities/Player.js';
import Magic from '../systems/Magic.js';
import Objects from '../systems/Objects.js';
import Rooms from '../systems/Rooms.js';

const Rect = Phaser.Geom.Rectangle;
const JustDown = Phaser.Input.Keyboard.JustDown;

export default class WorldScene extends Phaser.Scene {
  constructor() { super('World'); }

  init(data) { this.spawnName = (data && data.spawn) || null; }

  create() {
    const S = Save.data;
    this.mapKey = S.map;
    this.hints = {};
    this.boss = null;
    this.cutscene = false;
    this.leaving = false;

    // ---- Mapa de Tiled
    this.map = this.make.tilemap({ key: this.mapKey });
    const ts = this.map.addTilesetImage('tiles', 'tiles', TILE, TILE, 1, 2);
    this.ground = this.map.createLayer('ground', ts, 0, 0).setDepth(0);
    this.solid = this.map.createLayer('solid', ts, 0, 0).setVisible(false);
    this.ground.setCollisionByProperty({ collides: true });     // agua, muros, fosos
    this.solid.setCollisionByExclusion([-1]);                   // árboles, casas, rocas
    const tp = ts.tileProperties;
    this.bridgeIndex = ts.firstgid + Number(Object.keys(tp).find((k) => tp[k].bridge));
    this.physics.world.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels);

    // ---- Grupos
    this.obstacles = this.physics.add.staticGroup();
    this.enemies = this.physics.add.group();
    this.enemyShots = this.physics.add.group();
    this.pickups = this.physics.add.group();

    // ---- Efectos compartidos
    this.sparks = this.add.particles(0, 0, 'dot', {
      lifespan: 260, speed: { min: 80, max: 260 }, scale: { start: 0.5, end: 0 },
      alpha: { start: 1, end: 0 }, blendMode: 'ADD', emitting: false,
    }).setDepth(9500);
    this.puffs = this.add.particles(0, 0, 'dot', {
      lifespan: { min: 400, max: 800 }, speed: { min: 20, max: 110 }, gravityY: -60,
      scale: { start: 0.8, end: 0 }, alpha: { start: 0.9, end: 0 }, emitting: false,
    }).setDepth(9400);

    // ---- Objetos, jugador y magia
    this.rooms = new Rooms(this);
    this.objects = new Objects(this);
    this.objects.build();

    let pos = null;
    if (this.spawnName) pos = this.objects.spawns[this.spawnName];
    else if (S.x != null) pos = { x: S.x, y: S.y };
    pos = pos || this.objects.spawns[S.spawn] || this.objects.spawns.start || this.objects.spawns.entry;
    this.player = new Player(this, pos.x, pos.y);
    this.magic = new Magic(this);

    // ---- Colisiones (Arcade Physics)
    const P = this.physics;
    P.add.collider(this.player, this.ground);
    P.add.collider(this.player, this.solid);
    P.add.collider(this.player, this.obstacles, (p, zone) => this.touch(zone.owner));
    const walks = (e) => !e.flying;
    P.add.collider(this.enemies, this.ground, null, walks);
    P.add.collider(this.enemies, this.solid, null, walks);
    P.add.collider(this.enemies, this.obstacles, null, walks);
    P.add.overlap(this.player, this.enemies, (p, e) => {
      if (e.dead || e.damage <= 0 || e.stun > 0) return;
      const res = p.damage(e.damage, e.body.center, { blockable: !e.unblockable });
      if (res === 'block' && e.onBlocked) e.onBlocked();
    });
    P.add.overlap(this.player, this.enemyShots, (p, s) => {
      if (!s.active) return;
      if (p.damage(s.damage, { x: s.x, y: s.y }) !== false) this.popShot(s);
    });
    P.add.collider(this.enemyShots, this.ground, (s) => this.popShot(s), (s, tile) => !!(tile.properties && tile.properties.wall));
    P.add.collider(this.enemyShots, this.solid, (s) => this.popShot(s));
    P.add.overlap(this.enemyShots, this.obstacles, (s) => this.popShot(s));
    P.add.overlap(this.player, this.pickups, (p, it) => this.collect(it));

    // ---- Cámara: una pantalla exacta bajo el HUD
    const cam = this.cameras.main;
    cam.setViewport(0, HUD_H, VIEW_W, VIEW_H);
    cam.setBackgroundColor('#0b0910');
    this.rooms.start(this.player.feet.x, this.player.feet.y);

    // ---- Teclado
    const K = Phaser.Input.Keyboard.KeyCodes;
    this.keys = this.input.keyboard.addKeys({
      up: K.UP, down: K.DOWN, left: K.LEFT, right: K.RIGHT, w: K.W, a: K.A, s: K.S, d: K.D,
      space: K.SPACE, j: K.J, shift: K.SHIFT, k: K.K, l: K.L, f: K.F, e: K.E, enter: K.ENTER,
      q: K.Q, one: K.ONE, two: K.TWO, three: K.THREE, four: K.FOUR,
    });
    this.input.keyboard.once('keydown', () => Sfx.unlock());

    this.prompt = this.add.text(0, 0, 'E', {
      fontFamily: 'Cinzel, serif', fontStyle: '700', fontSize: '20px', color: '#1a1226',
      backgroundColor: '#f0d489', padding: { x: 9, y: 3 },
    }).setOrigin(0.5).setDepth(99990).setVisible(false);

    // ---- Interfaz (escena aparte, por encima)
    if (!this.scene.isActive('UI')) this.scene.launch('UI');
    this.ui = this.scene.get('UI');
    this.game.events.emit('world:ready', this.mapKey);
    cam.fadeIn(450, 0, 0, 0);
  }

  get busy() {
    return this.cutscene || this.leaving || this.rooms.moving || !!(this.ui && (this.ui.dialogOpen || this.ui.overlayOpen));
  }

  update(time, delta) {
    const k = this.keys;
    // Leer siempre las pulsaciones para que no queden "en cola" durante un diálogo
    const pressed = {};
    for (const name of ['space', 'j', 'l', 'f', 'e', 'enter', 'q', 'one', 'two', 'three', 'four']) pressed[name] = JustDown(k[name]);
    if (this.ui && this.ui.closedFrame === this.game.loop.frame) Object.keys(pressed).forEach((n) => { pressed[n] = false; });
    const p = this.player;
    if (this.busy) {
      p.setDepth(p.y + 38);
      this.prompt.setVisible(false);
      this.magic.update(time, 0);
      return;
    }

    if (pressed.q) this.magic.next();
    ['one', 'two', 'three', 'four'].forEach((n, i) => { if (pressed[n]) this.magic.select(['brasa', 'vendaval', 'revelacion', 'egida'][i]); });

    const inp = {
      left: k.left.isDown || k.a.isDown, right: k.right.isDown || k.d.isDown,
      up: k.up.isDown || k.w.isDown, down: k.down.isDown || k.s.isDown,
      guard: k.shift.isDown || k.k.isDown,
      attack: pressed.space || pressed.j,
      cast: pressed.l || pressed.f,
    };
    this.inpX = (inp.right ? 1 : 0) - (inp.left ? 1 : 0);
    this.inpY = (inp.down ? 1 : 0) - (inp.up ? 1 : 0);

    p.tick(time, inp);
    this.enemies.getChildren().slice().forEach((e) => e.tick(delta, p));
    this.magic.update(time, delta);
    this.updateShots(time, delta);
    this.rooms.update();
    this.checkWarps();
    this.objects.fadeTall(p, this.rooms.key);

    const target = p.mode === 'move' ? this.objects.talkable(this.probe()) : null;
    this.showPrompt(target, time);
    if (target && (pressed.e || pressed.enter)) this.interact(target);
  }

  // ================================================================ combate
  /** Hitbox de la espada delante del héroe. */
  swordStrike() {
    const p = this.player;
    if (p.mode !== 'attack') return;
    const f = p.feet;
    const [dx, dy] = dirVec(p.dir);
    const r = new Rect(f.x + dx * 48 - 44, f.y - 16 + dy * 48 - 44, 88, 88);
    this.enemies.getChildren().slice().forEach((e) => {
      if (e.dead || e.lastSwing === p.swing) return;
      const b = e.body;
      if (!Rect.Overlaps(r, new Rect(b.x - 6, b.y - 24, b.width + 12, b.height + 32))) return;
      e.lastSwing = p.swing;
      const res = e.hurt(PLAYER.swordDamage, { x: f.x, y: f.y }, 'sword');
      if (res === 'block') p.knock(e.body.center, 260, 120);
    });
    this.objects.swordHit(r);
  }

  enemyShot(x, y, angle, speed, damage) {
    const s = this.enemyShots.create(x, y, 'bossfire');
    s.play('bossfire-fly');
    s.setRotation(angle);
    s.body.setCircle(11, 13, 13);
    s.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
    s.damage = damage;
    s.life = 3500;
    s.setDepth(y + 80);
  }

  popShot(s) {
    if (!s.active) return;
    this.boom(s.x, s.y, 0xff7040, 0.8);
    s.destroy();
  }

  clearEnemyShots() { this.enemyShots.clear(true, true); }

  updateShots(time, delta) {
    this.enemyShots.getChildren().slice().forEach((s) => {
      s.life -= delta;
      s.setDepth(s.y + 80);
      if (s.life <= 0) s.destroy();
    });
    this.pickups.getChildren().slice().forEach((it) => {
      if (it.life === Infinity) return;
      it.life -= delta;
      it.setVisible(it.life > 2000 || Math.floor(time / 100) % 2 === 0);
      if (it.life <= 0) it.destroy();
    });
  }

  onEnemyDead() { this.rooms.check(); }

  onBossDead() {
    this.boss = null;
    Sfx.play('win');
    this.time.delayedCall(700, () => this.bossRewards());
  }

  /** Recompensas del jefe (reaparecen si se salió sin recogerlas). */
  bossRewards() {
    const c = this.rooms.rect();
    if (!Save.flag('got:container')) this.spawnPickup(c.centerX - 60, c.centerY, 'container');
    if (!Save.flag('got:fragment')) this.spawnPickup(c.centerX + 60, c.centerY, 'fragment');
  }

  roomHook() {
    if (BOSS_ROOM[this.mapKey] === this.rooms.key && Save.flag('clear:' + this.rooms.key)) this.bossRewards();
  }

  onPlayerDeath() {
    const S = Save.data;
    this.leaving = true;
    this.game.events.emit('boss:hide');
    this.cameras.main.fadeOut(500, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      S.hp = Math.min(S.maxHp, Math.max(PLAYER.startHp, S.hp));
      S.mana = S.maxMana;
      S.map = S.checkpoint.map;
      S.x = S.y = null;
      S.dir = 'down';
      Save.write();
      this.scene.restart({ spawn: S.checkpoint.spawn });
    });
  }

  // ================================================================ botín
  dropLoot(x, y, source) {
    const [h, m] = DROPS[source];
    const r = Math.random();
    if (r < h) this.spawnPickup(x, y, 'heart');
    else if (r < h + m) this.spawnPickup(x, y, 'vial');
  }

  spawnPickup(x, y, kind) {
    const frame = { heart: 6, vial: 5, container: 4, fragment: 3 }[kind];
    const it = this.pickups.create(x, y, 'items', frame);
    const special = kind === 'container' || kind === 'fragment';
    it.kind = kind;
    it.life = special ? Infinity : 9000;
    it.setDepth(y + 14);
    it.body.setCircle(14, 6, 6);
    if (special) {
      it.setScale(1.3);
      this.tweens.add({ targets: it, y: y - 8, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
      this.puff(x, y, 0xffe090, 14);
    } else {
      this.tweens.add({ targets: it, y: y - 22, duration: 160, yoyo: true, ease: 'Quad.out' });
    }
  }

  collect(it) {
    if (!it.active || this.busy) return;
    const S = Save.data;
    const kind = it.kind;
    it.destroy();
    if (kind === 'heart') { S.hp = Math.min(S.maxHp, S.hp + HEART_HEAL); Sfx.play('heart'); } else if (kind === 'vial') { S.mana = Math.min(S.maxMana, S.mana + VIAL_MANA); Sfx.play('mana'); } else if (kind === 'container') { Save.setFlag('got:container'); this.giveItem('heart'); } else if (kind === 'fragment') { Save.setFlag('got:fragment'); this.giveItem('fragment'); }
  }

  /** Entrega un objeto o hechizo con la pose de "objeto conseguido". */
  giveItem(id) {
    const S = Save.data;
    const it = ITEMS[id];
    if (it.spell) this.magic.learn(id);
    else if (id === 'map') S.items.map = true;
    else if (id === 'key') S.keys++;
    else if (id === 'bossKey') S.items.bossKey = true;
    else if (id === 'heart') { S.maxHp += 2; S.hp = S.maxHp; } else if (id === 'fragment') { S.fragments++; S.hp = S.maxHp; }
    Save.write();

    const p = this.player;
    this.cutscene = true;
    p.itemPose();
    const glow = this.add.image(p.x, p.y - 70, 'glow').setTint(0xffe090).setBlendMode('ADD').setScale(0.1).setDepth(99980);
    const icon = this.add.image(p.x, p.y - 70, it.spell ? 'spells' : 'items', it.icon).setScale(0.3).setDepth(99981);
    this.tweens.add({ targets: icon, scale: 1.25, duration: 350, ease: 'Back.out' });
    this.tweens.add({ targets: glow, scale: 0.55, alpha: 0.8, duration: 350 });
    Sfx.play(id === 'fragment' ? 'win' : 'item');
    this.ui.dialog('', it.pages, () => {
      icon.destroy(); glow.destroy();
      p.release();
      this.cutscene = false;
      if (id === 'fragment') this.ui.dialog(TEXTS.ending.name, TEXTS.ending.pages);
    });
  }

  // ================================================================ interacción
  probe() {
    const f = this.player.feet;
    const [dx, dy] = dirVec(this.player.dir);
    return new Rect(f.x + dx * 40 - 22, f.y - 8 + dy * 40 - 22, 44, 44);
  }

  showPrompt(target, time) {
    if (!target || (target.type === 'chest' && target.open)) { this.prompt.setVisible(false); return; }
    const p = this.player;
    this.prompt.setPosition(p.x, p.y - 64 + Math.sin(time / 160) * 3).setVisible(true);
  }

  interact(r) {
    const S = Save.data;
    const p = this.player;
    p.setVelocity(0, 0);
    p.playAnim('idle');
    if (r.type === 'npc') {
      this.objects.faceNpc(r, p);
      const npc = NPCS[r.p.who];
      const d = npc.talk(S);
      this.ui.dialog(npc.name, d.pages, () => { if (d.give) this.giveItem(d.give); });
    } else if (r.type === 'sign' || r.type === 'inspect') {
      const t = TEXTS[r.p.text];
      const d = typeof t === 'function' ? t(S) : t;
      this.ui.dialog(d.name, d.pages);
    } else if (r.type === 'chest') {
      if (r.open) return;
      Sfx.play('chest');
      this.setFlag('chest:' + r.id);
      this.time.delayedCall(250, () => this.giveItem(r.p.item));
      this.cutscene = true;
    } else if (r.type === 'door') {
      if (!this.tryDoor(r)) {
        const t = r.p.kind === 'boss' ? TEXTS.bosslocked : TEXTS.locked;
        this.ui.dialog(t.name, t.pages);
      }
    }
  }

  tryDoor(r) {
    const S = Save.data;
    if (!r.closed) return true;
    if (r.p.kind === 'lock' && S.keys > 0) { S.keys--; Sfx.play('key'); this.setFlag('door:' + r.id); return true; }
    if (r.p.kind === 'boss' && S.items.bossKey) { Sfx.play('key'); this.setFlag('door:' + r.id); return true; }
    return false;
  }

  /** El héroe está chocando con un objeto sólido. */
  touch(r) {
    if (!r || this.busy) return;
    if (r.type === 'door' && r.closed && r.p.kind !== 'bars') { this.tryDoor(r); return; }
    if (r.type !== 'block') return;
    // Empujar bloques: caminar contra ellos 0,3 s
    const p = this.player;
    const [dx, dy] = dirVec(p.dir);
    if (!((dx && this.inpX === dx) || (dy && this.inpY === dy))) return;
    const f = p.feet;
    const ox = r.x - f.x, oy = r.y - f.y;
    if (ox * dx + oy * dy < 16 || Math.abs(ox * dy + oy * dx) > 40) return;
    const now = this.time.now;
    if (now - r.lastTouch > 120) r.pushT = 0;
    r.lastTouch = now;
    r.pushT += this.game.loop.delta;
    if (r.pushT >= 300) { r.pushT = 0; this.objects.tryPush(r, dx, dy); }
  }

  setFlag(name, fx = true) {
    if (Save.flag(name)) return;
    Save.setFlag(name);
    this.objects.onFlag(name, fx);
    Save.write();
  }

  // ================================================================ viajes
  checkWarps() {
    const f = this.player.feet;
    for (const w of this.objects.warps) {
      if (w.rect.contains(f.x, f.y)) { this.travel(w.to, w.spawn); return; }
    }
  }

  travel(map, spawn) {
    const S = Save.data;
    this.leaving = true;
    this.player.setVelocity(0, 0);
    this.physics.world.pause();
    Sfx.play('door');
    S.map = map; S.x = S.y = null; S.spawn = spawn;
    S.dir = map === 'overworld' ? 'down' : 'up';
    S.checkpoint = { map, spawn };
    Save.write();
    this.cameras.main.fadeOut(380, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.restart({ spawn }));
  }

  // ================================================================ efectos
  boom(x, y, tint = 0xffffff, scale = 1) {
    const s = this.add.sprite(x, y, 'boom').setDepth(9600).setScale(scale * 1.3).setBlendMode('ADD').setTint(tint);
    s.play('boom');
    s.once('animationcomplete', () => s.destroy());
  }

  spark(x, y, tint = 0xffffff) {
    this.sparks.setParticleTint(tint);
    this.sparks.emitParticleAt(x, y, 9);
  }

  puff(x, y, tint = 0xffffff, n = 12, add = true) {
    this.puffs.setParticleTint(tint);
    this.puffs.setBlendMode(add ? 'ADD' : 'NORMAL');
    this.puffs.emitParticleAt(x, y, n);
  }

  ring(x, y, color, radius, duration = 450) {
    const c = this.add.circle(x, y, 20).setStrokeStyle(5, color, 1).setDepth(9700);
    c.isFilled = false;
    this.tweens.add({ targets: c, scale: radius / 20, alpha: 0, duration, ease: 'Quad.out', onComplete: () => c.destroy() });
  }

  exclaim(x, y) {
    const t = this.add.text(x, y, '!', { fontFamily: 'Cinzel, serif', fontStyle: '700', fontSize: '40px', color: '#ff5040', stroke: '#1a1226', strokeThickness: 6 })
      .setOrigin(0.5).setDepth(99900);
    this.tweens.add({ targets: t, y: y - 18, alpha: 0, duration: 600, onComplete: () => t.destroy() });
  }

  toast(msg) { this.game.events.emit('hud:toast', msg); }

  /** Pista que solo se muestra una vez por visita. */
  hint(id, msg) {
    if (this.hints[id]) return;
    this.hints[id] = true;
    this.toast(msg);
  }
}
