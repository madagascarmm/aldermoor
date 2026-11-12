// Salas/pantallas: cámara por cuadrícula con desplazamiento suave,
// aparición de enemigos por sala y salas de emboscada.
import { TILE, SCREEN_W, SCREEN_H, ROOM_NAMES } from '../config.js';
import { Save } from '../save.js';
import { Sfx } from '../sfx.js';
import { ENEMY_CLASSES } from '../entities/Enemies.js';
import Boss from '../entities/Boss.js';

export default class Rooms {
  constructor(scene) {
    this.scene = scene;
    this.w = SCREEN_W * TILE;
    this.h = SCREEN_H * TILE;
    this.rx = 0; this.ry = 0;
    this.key = '0,0';
    this.moving = false;
    this.ambushOn = false;
  }

  at(x, y) { return { rx: Math.floor(x / this.w), ry: Math.floor(y / this.h) }; }
  keyAt(x, y) { const r = this.at(x, y); return `${r.rx},${r.ry}`; }
  rect(rx = this.rx, ry = this.ry) { return new Phaser.Geom.Rectangle(rx * this.w, ry * this.h, this.w, this.h); }

  /** Entrada inicial (sin animación). */
  start(x, y) {
    const r = this.at(x, y);
    this.rx = r.rx; this.ry = r.ry; this.key = `${r.rx},${r.ry}`;
    this.scene.cameras.main.setScroll(this.rx * this.w, this.ry * this.h);
    this.spawn(this.key);
    this.entered();
  }

  spawn(key) {
    const scene = this.scene;
    if (Save.flag('clear:' + key)) return;
    const rect = this.rect(...key.split(',').map(Number));
    for (const sp of scene.objects.enemySpawns[key] || []) {
      const e = sp.kind === 'boss' ? new Boss(scene, sp.x, sp.y - 40) : new ENEMY_CLASSES[sp.kind](scene, sp.x, sp.y - 10);
      e.roomKey = key;
      e.room = rect;
      scene.enemies.add(e);
      if (sp.kind === 'boss') scene.boss = e;
    }
  }

  alive(key = this.key) {
    return this.scene.enemies.getChildren().filter((e) => e.roomKey === key && !e.dead);
  }

  update() {
    if (this.moving) return;
    const p = this.scene.player;
    const f = p.feet;
    const r = this.at(f.x, f.y);
    if (r.rx !== this.rx || r.ry !== this.ry) { this.slide(r); return; }

    // Emboscada: las rejas se cierran cuando el héroe ya está dentro
    if (!this.ambushOn && !Save.flag('clear:' + this.key)) {
      const doors = this.scene.objects.ambushDoors(this.key);
      if (doors.length && this.alive().length) {
        const inner = this.rect();
        Phaser.Geom.Rectangle.Inflate(inner, -110, -110);
        if (inner.contains(f.x, f.y)) {
          this.ambushOn = true;
          doors.forEach((d) => this.scene.objects.setDoor(d, true));
          this.alive().forEach((e) => { if (e.wake) e.wake(); });
        }
      }
    }
  }

  /** Transición suave a la sala vecina. */
  slide(r) {
    const scene = this.scene;
    const cam = scene.cameras.main;
    const dx = Math.sign(r.rx - this.rx), dy = Math.sign(r.ry - this.ry);
    const oldKey = this.key;
    this.moving = true;
    scene.physics.world.pause();
    scene.player.setVelocity(0, 0);
    scene.clearEnemyShots();
    this.rx = r.rx; this.ry = r.ry; this.key = `${r.rx},${r.ry}`;
    this.spawn(this.key);
    scene.tweens.add({ targets: scene.player, x: scene.player.x + dx * 54, y: scene.player.y + dy * 54, duration: 550 });
    scene.tweens.add({
      targets: cam, scrollX: this.rx * this.w, scrollY: this.ry * this.h, duration: 550, ease: 'Sine.inOut',
      onComplete: () => {
        scene.enemies.getChildren().filter((e) => e.roomKey === oldKey).forEach((e) => e.destroy());
        scene.pickups.clear(true, true);
        scene.physics.world.resume();
        this.moving = false;
        this.ambushOn = false;
        this.entered();
      },
    });
  }

  entered() {
    const scene = this.scene;
    const S = Save.data;
    const p = scene.player;
    Save.visit(scene.mapKey, this.key);
    scene.objects.resetBlocks(this.key);
    // Puntos de control: la aldea y la entrada de cada mazmorra
    if (scene.mapKey === 'overworld' && this.key === '1,2') S.checkpoint = { map: 'overworld', spawn: 'start' };
    S.map = scene.mapKey; S.x = Math.round(p.x); S.y = Math.round(p.y); S.dir = p.dir;
    Save.write();
    const name = (ROOM_NAMES[scene.mapKey] || {})[this.key] || '';
    scene.game.events.emit('hud:room', name);
    scene.roomHook();
  }

  /** Llamado cuando muere un enemigo: ¿sala despejada? */
  check() {
    if (this.alive().length) return;
    const doors = this.scene.objects.ambushDoors(this.key);
    if (doors.length && !Save.flag('clear:' + this.key)) {
      this.ambushOn = false;
      this.scene.time.delayedCall(300, () => { Sfx.play('secret'); this.scene.setFlag('clear:' + this.key); });
    }
  }
}
