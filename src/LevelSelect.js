import * as PIXI from 'pixi.js';
import { GAME_WIDTH, GAME_HEIGHT, MAX_LEVEL, UI_ASSETS, COLORS } from './constants.js';

const FONT = 'Outfit, Arial, sans-serif';
const COLS = 5;
const ROWS = 5;
const PER_PAGE = COLS * ROWS;
const TOTAL_PAGES = Math.ceil(MAX_LEVEL / PER_PAGE);

export class LevelSelect {
  constructor(app, parentContainer, callbacks) {
    this.app = app;
    this.parentContainer = parentContainer;
    this.container = new PIXI.Container();
    this.parentContainer.addChild(this.container);
    this.callbacks = callbacks;
    this.visible = false;
    this._currentPage = 0;
    this._nodes = [];
    this._build();
    this.container.visible = false;
  }

  _build() {
    const bg = new PIXI.Graphics();
    bg.beginFill(0x0D0820);
    bg.drawRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    bg.endFill();
    this.container.addChild(bg);

    try {
      const mapBg = PIXI.Sprite.from(UI_ASSETS.levelSelect);
      const s = Math.min(GAME_WIDTH / mapBg.width, 1.2);
      mapBg.width = mapBg.width * s;
      mapBg.height = mapBg.height * s;
      mapBg.anchor.set(0.5);
      mapBg.x = GAME_WIDTH / 2;
      mapBg.y = 60;
      mapBg.alpha = 0.15;
      this.container.addChild(mapBg);
    } catch {}

    const title = new PIXI.Text('SELECT LEVEL', {
      fontFamily: FONT, fontSize: 26, fill: 0xFFCC00, fontWeight: '900',
      stroke: 0x000000, strokeThickness: 3,
    });
    title.anchor.set(0.5);
    title.x = GAME_WIDTH / 2;
    title.y = 24;
    this.container.addChild(title);

    this._gridContainer = new PIXI.Container();
    this._gridContainer.x = (GAME_WIDTH - COLS * 100) / 2;
    this._gridContainer.y = 80;
    this.container.addChild(this._gridContainer);

    this._pageLabel = new PIXI.Text('', {
      fontFamily: FONT, fontSize: 12, fill: 0x888888,
    });
    this._pageLabel.anchor.set(0.5);
    this._pageLabel.x = GAME_WIDTH / 2;
    this._pageLabel.y = GAME_HEIGHT - 90;
    this.container.addChild(this._pageLabel);

    try {
      const prevBtn = PIXI.Sprite.from(UI_ASSETS.back);
      prevBtn.width = 36;
      prevBtn.height = 36;
      prevBtn.x = GAME_WIDTH / 2 - 100;
      prevBtn.y = GAME_HEIGHT - 100;
      prevBtn.eventMode = 'static';
      prevBtn.cursor = 'pointer';
      prevBtn.anchor.set(0.5);
      prevBtn.scale.x = -1;
      prevBtn.on('pointerdown', () => this._prevPage());
      this.container.addChild(prevBtn);
    } catch {}

    try {
      const nextBtn = PIXI.Sprite.from(UI_ASSETS.back);
      nextBtn.width = 36;
      nextBtn.height = 36;
      nextBtn.x = GAME_WIDTH / 2 + 100;
      nextBtn.y = GAME_HEIGHT - 100;
      nextBtn.eventMode = 'static';
      nextBtn.cursor = 'pointer';
      nextBtn.anchor.set(0.5);
      nextBtn.on('pointerdown', () => this._nextPage());
      this.container.addChild(nextBtn);
    } catch {}

    try {
      const backSpr = PIXI.Sprite.from(UI_ASSETS.back);
      backSpr.width = 36;
      backSpr.height = 36;
      backSpr.x = 22;
      backSpr.y = 16;
      backSpr.eventMode = 'static';
      backSpr.cursor = 'pointer';
      backSpr.on('pointerdown', () => {
        if (this.callbacks.onBack) this.callbacks.onBack();
      });
      this.container.addChild(backSpr);
    } catch {}

    this._renderPage();
  }

  _renderPage() {
    this._gridContainer.removeChildren();
    this._nodes = [];

    const start = this._currentPage * PER_PAGE + 1;
    const end = Math.min(start + PER_PAGE - 1, MAX_LEVEL);

    this._pageLabel.text = `Page ${this._currentPage + 1} / ${TOTAL_PAGES}`;

    const nodeW = 90;
    const nodeH = 80;
    const gapX = 10;
    const gapY = 10;

    for (let i = 0; i < PER_PAGE; i++) {
      const levelNum = start + i;
      if (levelNum > MAX_LEVEL) break;

      const col = i % COLS;
      const row = Math.floor(i / COLS);

      const nx = col * (nodeW + gapX);
      const ny = row * (nodeH + gapY);

      const node = new PIXI.Container();

      const box = new PIXI.Graphics();
      box.beginFill(0x1A0C30, 0.8);
      box.lineStyle(1.5, 0x3A2060, 0.6);
      box.drawRoundedRect(0, 0, nodeW, nodeH, 10);
      box.endFill();
      node.addChild(box);

      const numText = new PIXI.Text(`${levelNum}`, {
        fontFamily: FONT, fontSize: 20, fill: 0xFFFFFF, fontWeight: 'bold',
      });
      numText.anchor.set(0.5);
      numText.x = nodeW / 2;
      numText.y = nodeH / 2;
      node.addChild(numText);

      const isUnlocked = levelNum === 1 || levelNum <= parseInt(localStorage.getItem('blockblast_highlevel') || '1', 10);
      if (!isUnlocked) {
        box.alpha = 0.4;
        numText.alpha = 0.4;
      } else {
        box.eventMode = 'static';
        box.cursor = 'pointer';
        box.on('pointerdown', () => {
          if (this.callbacks.onSelectLevel) this.callbacks.onSelectLevel(levelNum);
        });
        box.on('pointerover', () => { box.alpha = 0.75; });
        box.on('pointerout', () => { box.alpha = 1; });
      }

      node.x = nx;
      node.y = ny;
      this._gridContainer.addChild(node);
      this._nodes.push(node);
    }
  }

  _prevPage() {
    if (this._currentPage > 0) {
      this._currentPage--;
      this._renderPage();
    }
  }

  _nextPage() {
    if (this._currentPage < TOTAL_PAGES - 1) {
      this._currentPage++;
      this._renderPage();
    }
  }

  show() {
    this.container.visible = true;
    this.visible = true;
    this._currentPage = 0;
    this._renderPage();
  }

  hide() {
    this.container.visible = false;
    this.visible = false;
  }

  update(delta) {}

  destroy() {}
}
