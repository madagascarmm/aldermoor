// Sistema de magia: barra de maná, selección de hechizo y proyectiles.
import { PLAYER, SPELLS, SPELL_ORDER } from '../config.js';
import { Save } from '../save.js';
import { Sfx } from '../sfx.js';
import { dirVec } from '../entities/Player.js';

export default class Magic {
  constructor(scene) {
    this.scene = scene;
    this.shots = scene.physics.add.group();
    this.nextCast = 0;
    this.lastCast = -99999;
    this.bubble = null;

    const trail = (tint) => scene.add.particles(0, 0, 'dot', {
      lifespan: 320, scale: { start: 0.55, end: 0 }, alpha: { start: 0.8, end: 0 },
      speed: { min: 0, max: 30 }, tint, blendMode: 'ADD', emitting: false,
    }).setDepth(9000);
    this.trails = { fire: trail([0xff8a30, 0xffc050]), wind: trail([0x9ff0e8, 0xffffff]) };

    // Los proyectiles chocan con muros (no con agua ni fosos) y con el escenario sólido
    const P = scene.physics;
    P.add.collider(this.shots, scene.ground, (s) => this.pop(s), (s, tile) => !!(tile.properties && tile.properties.wall));
    P.add.collider(this.shots, scene.solid, (s) => this.pop(s));
    P.add.overlap(this.shots, scene.enemies, (s, e) => {
      if (!s.active || e.dead) return;
      const res = e.hurt(s.damage, { x: s.x, y: s.y }, s.kind);
      if (res !== false) this.pop(s);
    });
    // Interruptores, antorchas, zarzas, niebla, bloques...
    P.add.overlap(this.shots, scene.obstacles, (s, zone) => {
      if (!s.active) return;
      scene.objects.shotHit(s, zone.owner);
      this.pop(s);
    });
  }

  known() { return SPELL_ORDER.filter((s) => Save.data.spells.includes(s)); }

  learn(id) {
    const S = Save.data;
    if (!S.spells.includes(id)) S.spells.push(id);
    S.spell = id;
  }

  select(id) {
    const S = Save.data;
    if (!id || !S.spells.includes(id) || S.spell === id) return;
    S.spell = id;
    Sfx.play('select');
  }

  next() {
    const k = this.known();
    if (k.length < 2) return;
    this.select(k[(k.indexOf(Save.data.spell) + 1) % k.length]);
  }

  /** Intenta lanzar el hechizo activo. Devuelve true si se lanzó. */
  cast(time) {
    const S = Save.data;
    const id = S.spell;
    if (!id || time < this.nextCast) return false;
    const sp = SPELLS[id];
    if (S.mana < sp.cost) {
      this.nextCast = time + 300;
      Sfx.play('nomana');
      this.scene.game.events.emit('hud:nomana');
      return false;
    }
    S.mana -= sp.cost;
    this.nextCast = time + PLAYER.castCooldown;
    this.lastCast = time;
    this.scene.player.castPose(time);
    if (sp.shot) this.shoot(id, sp);
    else if (id === 'revelacion') this.reveal(sp);
    else this.egida(time, sp);
    return true;
  }

  shoot(id, sp) {
    const p = this.scene.player;
    const [dx, dy] = dirVec(p.dir);
    const f = p.feet;
    const s = this.shots.create(f.x + dx * 34, f.y - 22 + dy * 30, sp.shot);
    s.play(sp.shot + '-fly');
    s.setRotation(Math.atan2(dy, dx));
    s.body.setCircle(12, s.width / 2 - 12, s.height / 2 - 12);
    s.setVelocity(dx * sp.speed, dy * sp.speed);
    s.kind = id === 'brasa' ? 'fire' : 'wind';
    s.damage = sp.damage;
    s.life = sp.life;
    s.dx = dx; s.dy = dy;
    s.tintColor = sp.color;
    Sfx.play(s.kind);
  }

  pop(s) {
    if (!s.active) return;
    this.scene.boom(s.x, s.y, s.tintColor, 0.8);
    s.destroy();
  }

  reveal(sp) {
    const scene = this.scene;
    const f = scene.player.feet;
    Sfx.play('reveal');
    scene.ring(f.x, f.y - 10, sp.color, 1000, 750);
    scene.cameras.main.flash(250, 150, 100, 220);
    scene.time.delayedCall(380, () => {
      const n = scene.objects.revealRoom(scene.rooms.key);
      if (!n) scene.toast('No hay nada oculto aquí.');
    });
  }

  egida(time, sp) {
    const p = this.scene.player;
    p.egidaUntil = time + sp.duration;
    Sfx.play('egida');
    if (this.bubble) this.bubble.destroy();
    this.bubble = this.scene.add.image(p.x, p.y, 'glow').setTint(sp.color).setBlendMode('ADD').setScale(0.6).setAlpha(0.9);
    this.scene.tweens.add({ targets: this.bubble, scale: 0.7, duration: 400, yoyo: true, repeat: -1 });
  }

  update(time, delta) {
    const S = Save.data;
    // Regeneración pasiva de maná
    if (time - this.lastCast > PLAYER.manaDelay && S.mana < S.maxMana) {
      S.mana = Math.min(S.maxMana, S.mana + (PLAYER.manaRegen * delta) / 1000);
    }
    this.shots.getChildren().slice().forEach((s) => {
      s.life -= delta;
      s.setDepth(s.y + 70);
      this.trails[s.kind].emitParticleAt(s.x, s.y, 1);
      if (s.life <= 0) this.pop(s);
    });
    if (this.bubble) {
      const p = this.scene.player;
      const left = p.egidaUntil - time;
      this.bubble.setPosition(p.x, p.y + 6).setDepth(p.depth + 2);
      this.bubble.setVisible(left > 900 || Math.floor(time / 90) % 2 === 0);
      if (left <= 0) { this.bubble.destroy(); this.bubble = null; }
    }
  }
}
