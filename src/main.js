import * as PIXI from 'pixi.js';
import { Game } from './Game.js';
import { GAME_WIDTH, GAME_HEIGHT } from './constants.js';

const app = new PIXI.Application({
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: 0x1a1a2e,
  antialias: true,
  resolution: window.devicePixelRatio || 1,
  autoDensity: true,
});

document.body.appendChild(app.view);

let game;

app.ticker.add((delta) => {
  if (!game) return;
  game.update(delta);
});

game = new Game(app, null);

window.addEventListener('resize', () => {
  const scaleX = window.innerWidth / GAME_WIDTH;
  const scaleY = window.innerHeight / GAME_HEIGHT;
  const scale = Math.min(scaleX, scaleY);
  app.view.style.width = `${GAME_WIDTH * scale}px`;
  app.view.style.height = `${GAME_HEIGHT * scale}px`;
});

window.dispatchEvent(new Event('resize'));
