// El héroe: movimiento con Arcade Physics, espada, escudo y daño.
import { PLAYER } from '../config.js';
import { Save } from '../save.js';
import { Sfx } from '../sfx.js';

const VEC = { down: [0, 1], up: [0, -1], left: [-1, 0], right: [1, 0] };
export const dirVec = (d) => VEC[d];
export const animDir = (d) => (d === 'left' || d === 'right' ? 'side' : d);
export const FEET = 24;   // distancia del centro del sprite a los pies

export default class Player extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, 'hero', 0);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    // Caja de colisión pequeña a la altura de los pies
    this.body.setSize(36, 26).setOffset(30, 60);
    this.setCollideWorldBounds(true);

    this.dir = Save.data.dir || 'down';
    this.mode = 'move';          // move | attack | cast | hurt | item | dead
    this.guarding = false;
    this.invulnUntil = 0;
    this.egidaUntil = 0;
    this.knockUntil = 0;
    this.busyUntil = 0;
    this.swing = 0;              // id del golpe actual (evita golpes dobles)
    this.playAnim('idle');
  }

  /** Punto de los pies en coordenadas del mundo. */
  get feet() { return { x: this.x, y: this.y + FEET }; }

  playAnim(pose) {
    this.setFlipX(this.dir === 'left');
    this.anims.play(`hero-${pose}-${animDir(this.dir)}`, true);
  }

  /**
   * @param {number} time  reloj de la escena (ms)
   * @param {object} inp   { left, right, up, down, guard, attack, cast }
   */
  tick(time, inp) {
    this.setDepth(this.y + 38);
    this.setAlpha(time < this.invulnUntil && Math.floor(time / 70) % 2 ? 0.35 : 1);
    if (this.mode === 'dead' || this.mode === 'item') { this.setVelocity(0, 0); return; }
    if (time < this.knockUntil) return;                       // retroceso en curso
    if (this.mode === 'attack' || this.mode === 'cast') {
      this.setVelocity(0, 0);
      if (time < this.busyUntil) return;
    }
    this.mode = 'move';

    const vx = (inp.right ? 1 : 0) - (inp.left ? 1 : 0);
    const vy = (inp.down ? 1 : 0) - (inp.up ? 1 : 0);
    this.guarding = !!inp.guard;

    // Orientación en 4 direcciones (se conserva con el escudo alzado)
    if (!this.guarding && (vx || vy)) {
      const h = vx > 0 ? 'right' : 'left';
      const v = vy > 0 ? 'down' : 'up';
      if (vx && !vy) this.dir = h;
      else if (vy && !vx) this.dir = v;
      else if (this.dir !== h && this.dir !== v) this.dir = h;
    }

    if (inp.attack && !this.guarding) { this.attack(time); return; }
    if (inp.cast && !this.guarding && this.scene.magic.cast(time)) return;

    const speed = this.guarding ? PLAYER.guardSpeed : PLAYER.speed;
    const n = Math.hypot(vx, vy) || 1;                        // diagonal normalizada
    this.setVelocity((vx / n) * speed, (vy / n) * speed);
    if (this.guarding) this.playAnim('guard');
    else this.playAnim(vx || vy ? 'walk' : 'idle');
  }

  attack(time) {
    this.mode = 'attack';
    this.busyUntil = time + PLAYER.attackTime;
    this.swing++;
    this.setVelocity(0, 0);
    this.playAnim('attack');
    Sfx.play('sword');
    // La hitbox está activa durante los 3 primeros frames
    this.scene.time.delayedCall(40, () => this.scene.swordStrike());
    this.scene.time.delayedCall(110, () => this.scene.swordStrike());
  }

  castPose(time) {
    this.mode = 'cast';
    this.busyUntil = time + 200;
    this.setVelocity(0, 0);
    this.playAnim('cast');
  }

  /** ¿El punto src queda dentro del arco frontal (120 grados)? */
  facing(src) {
    const [dx, dy] = dirVec(this.dir);
    const f = this.feet;
    const ax = src.x - f.x, ay = src.y - f.y;
    const len = Math.hypot(ax, ay) || 1;
    return (ax * dx + ay * dy) / len > 0.5;
  }

  knock(src, speed, ms) {
    const f = this.feet;
    let ax = f.x - src.x, ay = f.y - src.y;
    const len = Math.hypot(ax, ay);
    if (len < 1) { const [dx, dy] = dirVec(this.dir); ax = -dx; ay = -dy; } else { ax /= len; ay /= len; }
    this.setVelocity(ax * speed, ay * speed);
    this.knockUntil = this.scene.time.now + ms;
  }

  /**
   * Aplica daño. Devuelve 'block' si el escudo lo paró, true si hirió, false si no hizo nada.
   */
  damage(amount, src, { blockable = true } = {}) {
    const now = this.scene.time.now;
    if (this.mode === 'dead' || this.mode === 'item') return false;
    if (now < this.invulnUntil || now < this.egidaUntil) return false;
    if (blockable && this.guarding && this.facing(src)) {
      Sfx.play('block');
      this.knock(src, 220, 110);
      this.invulnUntil = now + 250;
      this.scene.spark((this.feet.x + src.x) / 2, (this.feet.y + src.y) / 2 - 20, 0xffffff);
      return 'block';
    }
    const S = Save.data;
    S.hp = Math.max(0, S.hp - amount);
    this.invulnUntil = now + PLAYER.iframes;
    this.mode = 'hurt';
    this.guarding = false;
    this.anims.play(`hero-hurt-${animDir(this.dir)}`, true);
    this.knock(src, PLAYER.knockSpeed, PLAYER.knockTime);
    this.scene.cameras.main.shake(120, 0.006);
    Sfx.play('hurt');
    if (S.hp <= 0) this.die();
    return true;
  }

  die() {
    this.mode = 'dead';
    this.body.enable = false;
    this.setVelocity(0, 0);
    this.setAlpha(1);
    Sfx.play('die');
    // Giro de 4 reposos y fundido
    const dirs = ['down', 'left', 'up', 'right'];
    let i = 0;
    this.scene.time.addEvent({
      delay: 110, repeat: 9,
      callback: () => { this.dir = dirs[i++ % 4]; this.playAnim('idle'); this.anims.stop(); },
    });
    this.scene.tweens.add({ targets: this, alpha: 0, scaleY: 0.2, delay: 1150, duration: 450 });
    this.scene.time.delayedCall(1700, () => this.scene.onPlayerDeath());
  }

  /** Pose de "objeto conseguido" (brazos en alto). */
  itemPose() {
    this.mode = 'item';
    this.dir = 'down';
    this.setFlipX(false);
    this.setVelocity(0, 0);
    this.anims.stop();
    this.setFrame(48);
  }

  release() {
    if (this.mode === 'item') { this.mode = 'move'; this.playAnim('idle'); }
  }
}
