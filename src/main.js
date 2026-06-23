import * as PIXI from 'pixi.js';
import { Game } from './Game.js';
import { GAME_WIDTH, GAME_HEIGHT } from './constants.js';

const FONT = 'Outfit, Arial, sans-serif';

function buildLoadingScreen(app, loadingContainer) {
  const bg = new PIXI.Graphics();
  bg.beginFill(0x1E1040);
  bg.drawRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
  bg.endFill();
  loadingContainer.addChild(bg);

  const logoText = new PIXI.Text('BLOCK BLAST', {
    fontFamily: FONT, fontSize: 42, fill: 0xFFCC00, fontWeight: '900',
    stroke: 0x000000, strokeThickness: 4,
  });
  logoText.anchor.set(0.5);
  logoText.x = GAME_WIDTH / 2;
  logoText.y = GAME_HEIGHT * 0.34;
  loadingContainer.addChild(logoText);

  const loadTxt = new PIXI.Text('LOADING', {
    fontFamily: FONT, fontSize: 16, fill: 0xBBBBBB, letterSpacing: 4,
  });
  loadTxt.anchor.set(0.5);
  loadTxt.x = GAME_WIDTH / 2;
  loadTxt.y = GAME_HEIGHT * 0.45;
  loadingContainer.addChild(loadTxt);

  const barBg = new PIXI.Graphics();
  barBg.beginFill(0x000000, 0.45);
  barBg.drawRoundedRect(0, 0, 280, 18, 9);
  barBg.endFill();
  barBg.x = (GAME_WIDTH - 280) / 2;
  barBg.y = GAME_HEIGHT * 0.50;
  loadingContainer.addChild(barBg);

  const barFill = new PIXI.Graphics();
  barFill.x = barBg.x;
  barFill.y = barBg.y;
  loadingContainer.addChild(barFill);

  const pctText = new PIXI.Text('0%', {
    fontFamily: FONT, fontSize: 13, fill: 0xFFFFFF, fontWeight: 'bold',
  });
  pctText.anchor.set(0.5);
  pctText.x = GAME_WIDTH / 2;
  pctText.y = GAME_HEIGHT * 0.50 + 9;
  loadingContainer.addChild(pctText);

  return { barFill, pctText };
}

function fadeOutAndDestroy(app, container, duration, onDone) {
  let frame = 0;
  const tick = () => {
    frame++;
    container.alpha = Math.max(0, 1 - frame / duration);
    if (frame >= duration) {
      if (container.parent) container.parent.removeChild(container);
      container.destroy({ children: true });
      if (onDone) onDone();
      return;
    }
    app.ticker.addOnce(tick);
  };
  app.ticker.addOnce(tick);
}

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

  const loadingContainer = new PIXI.Container();
  app.stage.addChild(loadingContainer);
  const { barFill, pctText } = buildLoadingScreen(app, loadingContainer);

  try {
    await PIXI.Assets.load('assets/game_master_sheet.json', (progress) => {
      const pct = Math.round(progress * 100);
      pctText.text = `${pct}%`;
      barFill.clear();
      barFill.beginFill(0x4FC3F7);
      barFill.drawRoundedRect(0, 0, 280 * progress, 18, 9);
      barFill.endFill();
    });
  } catch (e) {
    console.warn('Spritesheet load failed, using fallback colors:', e);
    pctText.text = 'READY';
  }

  const game = new Game(app);

  app.stage.addChild(loadingContainer);

  fadeOutAndDestroy(app, loadingContainer, 20, () => {
    game._homePage.container.visible = true;
    setTimeout(() => {
      let ff = 0;
      const fadeIn = () => {
        ff++;
        game._homePage.container.alpha = Math.min(1, ff / 15);
        if (ff >= 15) { game._homePage.container.alpha = 1; return; }
        app.ticker.addOnce(fadeIn);
      };
      app.ticker.addOnce(fadeIn);
    }, 50);
  });

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
