// Punto de entrada: configuración de Phaser 3.
import { GAME_W, GAME_H } from './config.js';
import BootScene from './scenes/BootScene.js';
import TitleScene from './scenes/TitleScene.js';
import WorldScene from './scenes/WorldScene.js';
import UIScene from './scenes/UIScene.js';

// ?canvas en la URL fuerza el renderizador Canvas 2D (útil en equipos sin WebGL)
const forceCanvas = new URLSearchParams(window.location.search).has('canvas');

const config = {
  type: forceCanvas ? Phaser.CANVAS : Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#0b0910',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: GAME_W,
    height: GAME_H,
  },
  render: {
    antialias: true,       // arte vectorial suave, no pixel art
    roundPixels: true,
  },
  physics: {
    default: 'arcade',
    arcade: { gravity: { x: 0, y: 0 }, debug: false },
  },
  scene: [BootScene, TitleScene, WorldScene, UIScene],
};

// Disponible en la consola para depurar (window.game.scene.getScene('World'))
window.game = new Phaser.Game(config);
