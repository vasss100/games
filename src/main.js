import * as PIXI from 'pixi.js';
import { Game } from './Game.js';
import { GAME_WIDTH, GAME_HEIGHT } from './constants.js';

async function init() {
  const app = new PIXI.Application({
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    backgroundColor: 0x1a1a2e,
    antialias: true,
    resolution: window.devicePixelRatio || 1,
    autoDensity: true,
  });

  document.body.appendChild(app.view);

  try {
    await PIXI.Assets.load('assets/game_master_sheet.json');
  } catch (e) {
    console.warn('Spritesheet load failed, using fallback colors:', e);
  }

  const game = new Game(app);

  app.ticker.add((delta) => {
    game.update(delta);
  });

  window.addEventListener('resize', () => {
    const scaleX = window.innerWidth / GAME_WIDTH;
    const scaleY = window.innerHeight / GAME_HEIGHT;
    const scale = Math.min(scaleX, scaleY);
    app.view.style.width = `${GAME_WIDTH * scale}px`;
    app.view.style.height = `${GAME_HEIGHT * scale}px`;
  });

  window.dispatchEvent(new Event('resize'));
}

init();
