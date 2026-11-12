// Jefe de la Cripta: Ser Caldric, el Guardián Calcinado.
// Ciclo: ARDIENTE (inmune) -> Vendaval lo apaga -> APAGADO (vulnerable) -> se reenciende.
import { BOSS } from '../config.js';
import { Sfx } from '../sfx.js';
import { Enemy } from './Enemies.js';

const ROW = { down: 0, up: 16, left: 32, right: 32 };
const side = (d) => (d === 'left' || d === 'right' ? 'side' : d);
const GREY = 0x7c8098;

export default class Boss extends Enemy {
  constructor(scene, x, y) {
    super(scene, x, y, 'boss', 'boss');
    this.hp = this.maxHp = BOSS.hp;
    this.damage = BOSS.contact;
    this.body.setSize(72, 50).setOffset(44, 92);
    this.dir = 'down';
    this.mode = 'sleep';
    this.awake = false;
    this.aura = true;
    this.fans = 0;
    this.charges = 0;
    this.unblockable = false;
    this.anim('idle');
    this.fx = scene.add.particles(0, 0, 'dot', {
      follow: this, followOffset: { x: 0, y: 14 },
      lifespan: 620, speedY: { min: -150, max: -60 }, speedX: { min: -50, max: 50 },
      x: { min: -34, max: 34 }, y: { min: -30, max: 30 },
      scale: { start: 1.0, end: 0 }, alpha: { start: 0.85, end: 0 },
      tint: [0xff7a20, 0xffb040, 0xff4a20], blendMode: 'ADD', frequency: 26,
    });
  }

  anim(pose) {
    this.setFlipX(this.dir === 'left');
    this.anims.play(`boss-${pose}-${side(this.dir)}`, true);
  }

  frameOf(col) {
    this.setFlipX(this.dir === 'left');
    this.anims.stop();
    this.setFrame(ROW[this.dir] + col);
  }

  wake() {
    if (this.awake) return;
    this.awake = true;
    this.mode = 'walk';
    this.timer = 1300;
    Sfx.play('roar');
    this.scene.cameras.main.shake(400, 0.008);
    this.scene.game.events.emit('boss:show', BOSS.name, this.hp, this.maxHp);
  }

  faceTo(dx, dy) {
    this.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
  }

  tick(delta, player) {
    super.tick(delta, player);
    if (this.fx) this.fx.setDepth(this.depth + 1);
  }

  think(delta, player) {
    this.timer -= delta;
    const c = this.body.center, f = player.feet;
    const dx = f.x - c.x, dy = f.y - c.y;
    const a = Math.atan2(dy, dx);
    const rage = this.hp <= this.maxHp / 2;                    // fase 2

    if (this.mode === 'walk') {
      this.faceTo(dx, dy);
      const sp = BOSS.walk * (rage ? 1.35 : 1);
      this.setVelocity(Math.cos(a) * sp, Math.sin(a) * sp);
      this.anim('walk');
      if (this.timer <= 0) {
        this.mode = 'aim';
        this.timer = rage ? 320 : 480;
        this.setVelocity(0, 0);
        this.anim('idle');
        this.setTint(0xffc080);
      }
    } else if (this.mode === 'aim') {
      if (this.timer <= 0) {
        this.clearTint();
        this.fan(a, rage ? 5 : 3);
        this.fans++;
        if (this.fans % 2 === 0) {
          this.mode = 'windup';
          this.timer = 650;
          this.charges = rage ? 2 : 1;
        } else {
          this.mode = 'walk';
          this.timer = rage ? 1000 : 1500;
        }
      }
    } else if (this.mode === 'windup') {
      this.faceTo(dx, dy);
      this.setVelocity(0, 0);
      this.frameOf(10);
      this.x += Math.sin(this.timer * 0.08) * 1.4;
      if (this.timer <= 0) {
        this.mode = 'charge';
        this.timer = 850;
        this.damage = BOSS.chargeDamage;
        this.unblockable = true;
        this.setVelocity(Math.cos(a) * BOSS.charge, Math.sin(a) * BOSS.charge);
        Sfx.play('fire');
      }
    } else if (this.mode === 'charge') {
      const b = this.body.blocked;
      const hitWall = b.left || b.right || b.up || b.down;
      if (this.timer <= 0 || hitWall) {
        if (hitWall) { this.scene.cameras.main.shake(160, 0.008); Sfx.play('boom'); }
        this.setVelocity(0, 0);
        this.damage = BOSS.contact;
        this.unblockable = false;
        this.charges--;
        if (this.charges > 0) { this.mode = 'windup'; this.timer = 450; } else { this.mode = 'walk'; this.timer = 1200; }
      }
    } else if (this.mode === 'out') {
      this.setVelocity(0, 0);
      if (this.timer < 700) this.setAlpha(Math.floor(this.timer / 80) % 2 ? 0.7 : 1);   // aviso
      if (this.timer <= 0) this.relight(player);
    }
  }

  fan(angle, n) {
    const c = this.body.center;
    for (let i = 0; i < n; i++) {
      this.scene.enemyShot(c.x, c.y - 24, angle + (i - (n - 1) / 2) * 0.3, BOSS.fireSpeed, BOSS.fireball);
    }
    Sfx.play('fire');
  }

  extinguish() {
    this.aura = false;
    this.mode = 'out';
    this.timer = BOSS.outTime;
    this.damage = 0;
    this.unblockable = false;
    this.setVelocity(0, 0);
    this.fx.stop();
    this.frameOf(15);
    this.setTint(GREY);
    Sfx.play('steam');
    this.scene.puff(this.body.center.x, this.body.center.y - 30, 0xd8d8e8, 22);
  }

  relight(player) {
    this.aura = true;
    this.mode = 'walk';
    this.timer = 900;
    this.damage = BOSS.contact;
    this.setAlpha(1);
    this.clearTint();
    this.fx.start();
    this.anim('idle');
    Sfx.play('roar');
    const c = this.body.center;
    this.scene.ring(c.x, c.y, 0xff8a30, 260);
    const f = player.feet;
    if (Phaser.Math.Distance.Between(c.x, c.y, f.x, f.y) < 240) player.knock(c, 560, 220);
  }

  destroy(fromScene) {
    if (this.fx) { this.fx.destroy(); this.fx = null; }
    const scene = this.scene;
    if (scene && scene.boss === this) {
      scene.boss = null;
      if (!this.dead) scene.game.events.emit('boss:hide');   // se sale de la sala a mitad de combate
    }
    super.destroy(fromScene);
  }

  hurt(dmg, src, type) {
    if (this.dead || !this.awake) return 'absorb';
    if (this.aura) {
      if (type === 'wind') { this.extinguish(); return true; }
      if (type === 'sword') {
        Sfx.play('clang');
        this.scene.spark((this.body.center.x + src.x) / 2, (this.body.center.y + src.y) / 2 - 20, 0xffb060);
        this.scene.hint('boss_fire', 'Las llamas lo protegen. Hace falta un viento que las apague.');
        return 'block';
      }
      return 'absorb';
    }
    if (type !== 'sword') return 'absorb';
    this.hp -= dmg;
    this.setTintFill(0xffffff);
    this.scene.time.delayedCall(90, () => { if (this.active && !this.dead) { if (this.aura) this.clearTint(); else this.setTint(GREY); } });
    Sfx.play('bosshit');
    this.scene.game.events.emit('boss:hp', Math.max(0, this.hp), this.maxHp);
    if (this.hp <= 0) this.die();
    return true;
  }

  die() {
    this.dead = true;
    this.body.enable = false;
    this.fx.stop();
    this.setTint(GREY);
    this.setAlpha(1);
    this.scene.clearEnemyShots();
    const c = { x: this.body.center.x, y: this.body.center.y };
    this.scene.time.addEvent({
      delay: 160, repeat: 9,
      callback: () => { this.scene.boom(c.x + Phaser.Math.Between(-50, 50), c.y + Phaser.Math.Between(-70, 30)); Sfx.play('boom'); },
    });
    this.scene.cameras.main.shake(1600, 0.006);
    this.scene.tweens.add({
      targets: this, alpha: 0, delay: 1500, duration: 500,
      onComplete: () => {
        this.scene.game.events.emit('boss:hide');
        this.scene.onBossDead(c.x, c.y);
        this.scene.onEnemyDead(this);
        this.destroy();
      },
    });
  }
}
