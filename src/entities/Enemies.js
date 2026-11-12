// Enemigos comunes: limo de ceniza, murciélago de cripta y Caballero Hueco.
import { ENEMIES, TILE } from '../config.js';
import { Sfx } from '../sfx.js';

const DIRS = { down: [0, 1], up: [0, -1], left: [-1, 0], right: [1, 0] };
const side = (d) => (d === 'left' || d === 'right' ? 'side' : d);

export class Enemy extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, texture, kind) {
    super(scene, x, y, texture, 0);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.kind = kind;
    this.cfg = ENEMIES[kind] || {};
    this.hp = this.cfg.hp || 1;
    this.damage = this.cfg.damage || 1;
    this.flying = false;
    this.dead = false;
    this.awake = true;
    this.stun = 0;
    this.knock = 0;
    this.timer = 0;
    this.lastSwing = -1;
    this.room = null;        // rectángulo de la sala (lo asigna Rooms)
  }

  get center() { return this.body.center; }

  tick(delta, player) {
    this.setDepth(this.body.bottom + (this.flying ? 60 : 0));
    if (this.dead || !this.awake) return;
    if (this.knock > 0) {
      this.knock -= delta;
      if (this.knock <= 0) this.setVelocity(0, 0);
      this.clamp();
      return;
    }
    if (this.stun > 0) { this.stun -= delta; this.setVelocity(0, 0); return; }
    this.think(delta, player);
    this.clamp();
  }

  think() {}

  /** Mantiene al enemigo dentro de su sala. */
  clamp() {
    const r = this.room;
    if (!r) return;
    const m = 70;
    const c = this.body.center;
    if (c.x < r.x + m) this.x += r.x + m - c.x;
    if (c.x > r.right - m) this.x -= c.x - (r.right - m);
    if (c.y < r.y + m) this.y += r.y + m - c.y;
    if (c.y > r.bottom - m) this.y -= c.y - (r.bottom - m);
  }

  /**
   * Golpe recibido. type: 'sword' | 'fire' | 'wind'.
   * Devuelve true (herido), 'block' (desviado) o 'absorb' (sin efecto).
   */
  hurt(dmg, src, type) {
    if (this.dead) return false;
    this.takeDamage(dmg, src, type === 'wind' ? 520 : 300, type === 'wind' ? 240 : 150);
    if (type === 'wind' && !this.dead) this.stun = 1000;
    return true;
  }

  takeDamage(dmg, src, knockSpeed = 300, knockMs = 150) {
    this.hp -= dmg;
    this.setTintFill(0xffffff);
    this.scene.time.delayedCall(90, () => { if (this.active) this.clearTint(); });
    if (knockSpeed && src) {
      const c = this.body.center;
      const a = Math.atan2(c.y - src.y, c.x - src.x);
      this.setVelocity(Math.cos(a) * knockSpeed, Math.sin(a) * knockSpeed);
      this.knock = knockMs;
    }
    Sfx.play('hit');
    if (this.hp <= 0) this.die();
  }

  die() {
    this.dead = true;
    this.body.enable = false;
    Sfx.play('kill');
    this.scene.boom(this.body.center.x, this.body.center.y);
    this.scene.dropLoot(this.body.center.x, this.body.center.y, 'enemy');
    this.scene.tweens.add({
      targets: this, alpha: 0, scale: 0.4, duration: 180,
      onComplete: () => { this.scene.onEnemyDead(this); this.destroy(); },
    });
  }
}

// ---------------------------------------------------------------- Limo de ceniza
export class Slime extends Enemy {
  constructor(scene, x, y) {
    super(scene, x, y, 'slime', 'slime');
    this.body.setSize(40, 26).setOffset(12, 30);
    this.play('slime-move');
    this.mode = 'wait';
    this.timer = 400 + Math.random() * 800;
  }

  think(delta, player) {
    this.timer -= delta;
    if (this.timer > 0) return;
    if (this.mode === 'wait') {
      const c = this.body.center, f = player.feet;
      const far = Phaser.Math.Distance.Between(c.x, c.y, f.x, f.y) > 9 * TILE;
      const a = far ? Math.random() * Math.PI * 2 : Math.atan2(f.y - c.y, f.x - c.x) + (Math.random() - 0.5) * 0.5;
      this.setVelocity(Math.cos(a) * this.cfg.hop, Math.sin(a) * this.cfg.hop);
      this.mode = 'hop';
      this.timer = this.cfg.hopTime;
    } else {
      this.setVelocity(0, 0);
      this.mode = 'wait';
      this.timer = this.cfg.wait + Math.random() * 300;
    }
  }
}

// ---------------------------------------------------------------- Murciélago
export class Bat extends Enemy {
  constructor(scene, x, y) {
    super(scene, x, y, 'bat', 'bat');
    this.body.setSize(30, 24).setOffset(17, 20);
    this.flying = true;
    this.play('bat-fly');
    this.mode = 'rest';
    this.t = Math.random() * 1000;
  }

  think(delta, player) {
    this.timer -= delta;
    this.t += delta;
    const c = this.body.center, f = player.feet;
    const dist = Phaser.Math.Distance.Between(c.x, c.y, f.x, f.y - 20);
    if (this.mode === 'rest') {
      this.setVelocity(0, 0);
      if (this.timer <= 0 && dist < this.cfg.sight) { this.mode = 'swoop'; this.timer = 1300; }
    } else if (this.mode === 'swoop') {
      const a = Math.atan2(f.y - 20 - c.y, f.x - c.x);
      const w = Math.sin(this.t * 0.009) * 130;                 // vuelo en curva
      this.setVelocity(Math.cos(a) * this.cfg.speed - Math.sin(a) * w, Math.sin(a) * this.cfg.speed + Math.cos(a) * w);
      if (this.timer <= 0) {
        this.mode = 'flee';
        this.timer = 800;
        const b = a + Math.PI + (Math.random() - 0.5) * 1.6;
        this.setVelocity(Math.cos(b) * this.cfg.speed, Math.sin(b) * this.cfg.speed);
      }
    } else if (this.timer <= 0) {
      this.mode = 'rest';
      this.timer = 500;
    }
  }
}

// ---------------------------------------------------------------- Caballero Hueco
export class Knight extends Enemy {
  constructor(scene, x, y) {
    super(scene, x, y, 'knight', 'knight');
    this.body.setSize(38, 28).setOffset(29, 58);
    this.dir = 'down';
    this.mode = 'patrol';
    this.unblockable = false;
    this.anim('idle');
  }

  anim(pose) {
    this.setFlipX(this.dir === 'left');
    this.anims.play(`knight-${pose}-${side(this.dir)}`, true);
  }

  chargePose() {
    this.setFlipX(this.dir === 'left');
    this.anims.stop();
    this.setFrame({ down: 0, up: 16, left: 32, right: 32 }[this.dir] + 10);
  }

  think(delta, player) {
    this.timer -= delta;
    const c = this.body.center, f = player.feet;
    const dx = f.x - c.x, dy = f.y - c.y;
    if (this.mode === 'patrol') {
      if (this.timer <= 0) {
        if (Math.random() < 0.3) { this.setVelocity(0, 0); this.anim('idle'); this.timer = 500 + Math.random() * 500; } else {
          this.dir = Phaser.Utils.Array.GetRandom(Object.keys(DIRS));
          const [vx, vy] = DIRS[this.dir];
          this.setVelocity(vx * this.cfg.patrol, vy * this.cfg.patrol);
          this.anim('walk');
          this.timer = 900 + Math.random() * 900;
        }
      }
      // ¿Ve al héroe en línea recta?
      const aligned = Math.abs(dx) < 44 || Math.abs(dy) < 44;
      if (aligned && Math.hypot(dx, dy) < this.cfg.sight) {
        this.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
        this.mode = 'alert';
        this.timer = this.cfg.alert;
        this.setVelocity(0, 0);
        this.anim('idle');
        this.scene.exclaim(this.x, this.y - 54);
        Sfx.play('alert');
      }
    } else if (this.mode === 'alert') {
      this.x += Math.sin(this.timer * 0.09) * 0.8;               // temblor de aviso
      if (this.timer <= 0) {
        const [vx, vy] = DIRS[this.dir];
        this.mode = 'charge';
        this.timer = 900;
        this.setVelocity(vx * this.cfg.charge, vy * this.cfg.charge);
        this.chargePose();
      }
    } else if (this.mode === 'charge') {
      const b = this.body.blocked;
      if (this.timer <= 0 || b.left || b.right || b.up || b.down) this.recover();
    } else if (this.mode === 'recover') {
      this.setVelocity(0, 0);
      if (this.timer <= 0) { this.mode = 'patrol'; this.clearTint(); }
    }
  }

  recover() {
    this.mode = 'recover';
    this.timer = this.cfg.recover;
    this.setVelocity(0, 0);
    this.anim('idle');
    this.setTint(0xb8b8d8);                                      // expuesto
  }

  onBlocked() { if (this.mode === 'charge') this.recover(); }

  hurt(dmg, src, type) {
    if (this.dead) return false;
    if (type === 'sword' && this.mode !== 'recover' && this.stun <= 0) {
      // El escudo desvía los golpes que llegan de frente
      const [fx, fy] = DIRS[this.dir];
      const c = this.body.center;
      const ax = src.x - c.x, ay = src.y - c.y;
      const len = Math.hypot(ax, ay) || 1;
      if ((ax * fx + ay * fy) / len > 0.35) {
        Sfx.play('clang');
        this.scene.spark((c.x + src.x) / 2, (c.y + src.y) / 2 - 16, 0xfff0c0);
        return 'block';
      }
    }
    this.takeDamage(dmg, src, type === 'wind' ? 520 : 240, type === 'wind' ? 240 : 150);
    if (type === 'wind' && !this.dead) {
      this.stun = 1000;
      this.mode = 'patrol';
      this.timer = 0;
      this.anim('idle');
    }
    return true;
  }
}

export const ENEMY_CLASSES = { slime: Slime, bat: Bat, knight: Knight };
