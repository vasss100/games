import * as PIXI from 'pixi.js';
import { Grid } from './Grid.js';
import { Piece } from './Piece.js';
import { Effects } from './Effects.js';
import { HomePage } from './HomePage.js';
import { LevelSelect } from './LevelSelect.js';
import {
  GRID_SIZE, CELL_SIZE,
  COLORS, GAME_WIDTH, GAME_HEIGHT,
  getShapesForLevel, NUM_PIECES_PER_TURN, MAX_LEVEL,
  getTheme, getScoreForLevel, NUM_GAME_BLOCKS, UI_ASSETS,
} from './constants.js';

export class Game {
  constructor(app) {
    this.app = app;
    this.state = 'menu';
    this.score = 0;
    this.level = 1;
    this.highScore = parseInt(localStorage.getItem('blockblast_highscore') || '0', 10);
    this.highLevel = parseInt(localStorage.getItem('blockblast_highlevel') || '1', 10);
    this.pieces = [];
    this.activePieceIndex = -1;
    this.dragStart = { x: 0, y: 0 };
    this.isDragging = false;
    this.isGameOver = false;
    this.currentTheme = getTheme(1);
    this._comboAnimating = false;
    this._levelPendingSpawn = false;

    this.container = new PIXI.Container();
    app.stage.addChild(this.container);

    this.grid = new Grid(app, this.container);

    this.piecesContainer = new PIXI.Container();
    this.container.addChild(this.piecesContainer);

    this.effects = new Effects(this.container);
    this._createBackground();
    this._createUI();
    this._createGameOver();
    this._createLevelCompletePopup();

    this._levelSelect = new LevelSelect(app, this.container, {
      onSelectLevel: (lvl) => this._onLevelSelected(lvl),
      onBack: () => this._goToMenu(),
    });
    this._levelSelect.hide();

    this._homePage = new HomePage(app, this.container, {
      onPlay: () => this._onPlay(),
      onSettings: () => {},
    });
    this._homePage.updateHighScore(this.highScore);
    this._setupInteraction();
    this._applyTheme();
  }

  _onPlay() {
    this.state = 'levelSelect';
    this._homePage.hide();
    this._levelSelect.show();
  }

  _onLevelSelected(level) {
    this._levelSelect.hide();
    this.startGame(level);
  }

  _createBackground() {
    this.bgGraphics = new PIXI.Graphics();
    this.container.addChildAt(this.bgGraphics, 0);
  }

  _createUI() {
    try {
      this.backBtn = PIXI.Sprite.from(UI_ASSETS.back);
      this.backBtn.width = 34;
      this.backBtn.height = 34;
      this.backBtn.x = 12;
      this.backBtn.y = 10;
      this.backBtn.eventMode = 'static';
      this.backBtn.cursor = 'pointer';
      this.backBtn.on('pointerdown', () => this._goToMenu());
      this.container.addChild(this.backBtn);
    } catch {
      const fb = new PIXI.Graphics();
      fb.beginFill(0x34C759);
      fb.drawRoundedRect(10, 8, 40, 40, 20);
      fb.endFill();
      fb.eventMode = 'static';
      fb.cursor = 'pointer';
      fb.on('pointerdown', () => this._goToMenu());
      this.container.addChild(fb);
    }

    this.scoreText = new PIXI.Text('Score: 0', {
      fontFamily: 'Arial, sans-serif', fontSize: 18,
      fill: COLORS.uiText, fontWeight: 'bold',
      stroke: 0x000000, strokeThickness: 2,
    });
    this.scoreText.x = 56;
    this.scoreText.y = 12;
    this.container.addChild(this.scoreText);

    this.highScoreText = new PIXI.Text(`Best: ${this.highScore}`, {
      fontFamily: 'Arial, sans-serif', fontSize: 12,
      fill: COLORS.uiText,
    });
    this.highScoreText.alpha = 0.6;
    this.highScoreText.x = 56;
    this.highScoreText.y = 34;
    this.container.addChild(this.highScoreText);

    this.levelText = new PIXI.Text('LV.1', {
      fontFamily: 'Arial, sans-serif', fontSize: 18,
      fill: COLORS.uiAccent, fontWeight: 'bold',
      stroke: 0x000000, strokeThickness: 2,
    });
    this.levelText.x = GAME_WIDTH - 90;
    this.levelText.y = 12;
    this.container.addChild(this.levelText);

    this.progressBg = new PIXI.Graphics();
    this.progressBg.beginFill(0x000000, 0.4);
    this.progressBg.drawRoundedRect(GAME_WIDTH - 90, 34, 72, 10, 5);
    this.progressBg.endFill();
    this.container.addChild(this.progressBg);

    this.progressBar = new PIXI.Graphics();
    this.progressBar.x = GAME_WIDTH - 90;
    this.progressBar.y = 34;
    this.container.addChild(this.progressBar);

    this.progressText = new PIXI.Text('', {
      fontFamily: 'Arial, sans-serif', fontSize: 9,
      fill: 0xffffff,
    });
    this.progressText.x = GAME_WIDTH - 54;
    this.progressText.y = 35;
    this.progressText.anchor.set(0.5, 0);
    this.container.addChild(this.progressText);

    this.restartBtn = new PIXI.Text('↻', {
      fontFamily: 'Arial, sans-serif', fontSize: 26,
      fill: COLORS.uiAccent,
    });
    this.restartBtn.x = GAME_WIDTH - 36;
    this.restartBtn.y = 8;
    this.restartBtn.eventMode = 'static';
    this.restartBtn.cursor = 'pointer';
    this.restartBtn.on('pointerdown', () => {
      if (this.state === 'playing' && !this.isGameOver) this.startGame(this.level);
    });
    this.container.addChild(this.restartBtn);

    this.comboText = new PIXI.Text('', {
      fontFamily: 'Arial, sans-serif', fontSize: 36,
      fill: 0xFFD54F, fontWeight: 'bold',
      stroke: 0x000000, strokeThickness: 4,
    });
    this.comboText.anchor.set(0.5);
    this.comboText.x = GAME_WIDTH / 2;
    this.comboText.y = this.grid.gridContainer.y + GRID_SIZE * CELL_SIZE + 30;
    this.comboText.alpha = 0;
    this.container.addChild(this.comboText);
  }

  _createGameOver() {
    this.gameOverContainer = new PIXI.Container();
    this.gameOverContainer.visible = false;
    this.container.addChild(this.gameOverContainer);

    const overlay = new PIXI.Graphics();
    overlay.beginFill(0x000000, 0.75);
    overlay.drawRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    overlay.endFill();
    overlay.eventMode = 'static';
    this.gameOverContainer.addChild(overlay);

    try {
      this.closeBtn = PIXI.Sprite.from(UI_ASSETS.close);
      this.closeBtn.width = 40;
      this.closeBtn.height = 40;
      this.closeBtn.x = GAME_WIDTH / 2 + 120;
      this.closeBtn.y = GAME_HEIGHT / 2 - 145;
      this.closeBtn.eventMode = 'static';
      this.closeBtn.cursor = 'pointer';
      this.closeBtn.on('pointerdown', () => this._goToMenu());
      this.gameOverContainer.addChild(this.closeBtn);
    } catch {
      const fb = new PIXI.Graphics();
      fb.beginFill(0xff4444);
      fb.drawRoundedRect(GAME_WIDTH / 2 + 100, GAME_HEIGHT / 2 - 165, 40, 40, 20);
      fb.endFill();
      fb.eventMode = 'static';
      fb.cursor = 'pointer';
      fb.on('pointerdown', () => this._goToMenu());
      this.gameOverContainer.addChild(fb);
    }

    const goTitle = new PIXI.Text('GAME OVER', {
      fontFamily: 'Arial, sans-serif', fontSize: 42,
      fill: 0xff4444, fontWeight: 'bold',
      stroke: 0x000000, strokeThickness: 4,
    });
    goTitle.anchor.set(0.5);
    goTitle.x = GAME_WIDTH / 2;
    goTitle.y = GAME_HEIGHT / 2 - 120;
    this.gameOverContainer.addChild(goTitle);

    this.finalScoreText = new PIXI.Text('Score: 0', {
      fontFamily: 'Arial, sans-serif', fontSize: 28,
      fill: 0xffffff,
    });
    this.finalScoreText.anchor.set(0.5);
    this.finalScoreText.x = GAME_WIDTH / 2;
    this.finalScoreText.y = GAME_HEIGHT / 2 - 60;
    this.gameOverContainer.addChild(this.finalScoreText);

    this.finalLevelText = new PIXI.Text('Level: 1', {
      fontFamily: 'Arial, sans-serif', fontSize: 22,
      fill: COLORS.uiAccent,
    });
    this.finalLevelText.anchor.set(0.5);
    this.finalLevelText.x = GAME_WIDTH / 2;
    this.finalLevelText.y = GAME_HEIGHT / 2 - 25;
    this.gameOverContainer.addChild(this.finalLevelText);

    this.bestScoreText = new PIXI.Text('', {
      fontFamily: 'Arial, sans-serif', fontSize: 16,
      fill: 0xFFD54F,
    });
    this.bestScoreText.anchor.set(0.5);
    this.bestScoreText.x = GAME_WIDTH / 2;
    this.bestScoreText.y = GAME_HEIGHT / 2 + 5;
    this.gameOverContainer.addChild(this.bestScoreText);

    const retryBtn = new PIXI.Graphics();
    retryBtn.beginFill(COLORS.uiAccent);
    retryBtn.drawRoundedRect(-85, -22, 170, 44, 10);
    retryBtn.endFill();
    retryBtn.x = GAME_WIDTH / 2;
    retryBtn.y = GAME_HEIGHT / 2 + 60;
    retryBtn.eventMode = 'static';
    retryBtn.cursor = 'pointer';
    this.gameOverContainer.addChild(retryBtn);

    const retryText = new PIXI.Text('PLAY AGAIN', {
      fontFamily: 'Arial, sans-serif', fontSize: 20,
      fill: 0xffffff, fontWeight: 'bold',
    });
    retryText.anchor.set(0.5);
    retryText.x = 0;
    retryText.y = 0;
    retryBtn.addChild(retryText);

    retryBtn.on('pointerdown', () => this.startGame(this.level));
    retryBtn.on('pointerover', () => { retryBtn.alpha = 0.85; });
    retryBtn.on('pointerout', () => { retryBtn.alpha = 1; });
  }

  _createLevelCompletePopup() {
    this._levelCompleteContainer = new PIXI.Container();
    this._levelCompleteContainer.visible = false;
    this.container.addChild(this._levelCompleteContainer);

    const overlay = new PIXI.Graphics();
    overlay.beginFill(0x000000, 0.75);
    overlay.drawRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    overlay.endFill();
    overlay.eventMode = 'static';
    this._levelCompleteContainer.addChild(overlay);

    try {
      const banner = PIXI.Sprite.from(UI_ASSETS.congratsBanner);
      const bannerW = Math.min(320, GAME_WIDTH - 40);
      const s = bannerW / banner.width;
      banner.width = bannerW;
      banner.height = banner.height * s;
      banner.anchor.set(0.5);
      banner.x = GAME_WIDTH / 2;
      banner.y = GAME_HEIGHT * 0.28;
      this._levelCompleteContainer.addChild(banner);
    } catch {}

    const lvlText = new PIXI.Text(`LEVEL ${this.level} COMPLETE!`, {
      fontFamily: 'Arial, sans-serif', fontSize: 30,
      fill: 0xFFD54F, fontWeight: 'bold',
      stroke: 0x000000, strokeThickness: 4,
    });
    lvlText.anchor.set(0.5);
    lvlText.x = GAME_WIDTH / 2;
    lvlText.y = GAME_HEIGHT * 0.42;
    this._levelCompleteContainer.addChild(lvlText);

    try {
      const exitSprite = PIXI.Sprite.from(UI_ASSETS.exit);
      const exitW = 180;
      const exitS = exitW / exitSprite.width;
      exitSprite.width = exitW;
      exitSprite.height = exitSprite.height * exitS;
      exitSprite.anchor.set(0.5);
      exitSprite.x = GAME_WIDTH / 2;
      exitSprite.y = GAME_HEIGHT * 0.56;
      exitSprite.eventMode = 'static';
      exitSprite.cursor = 'pointer';
      exitSprite.on('pointerdown', () => {
        this._hideLevelComplete();
        this._goToMenu();
      });
      this._levelCompleteContainer.addChild(exitSprite);

      const exitTxt = new PIXI.Text('EXIT', {
        fontFamily: 'Arial, sans-serif', fontSize: 20,
        fill: 0xFFFFFF, fontWeight: 'bold',
      });
      exitTxt.anchor.set(0.5);
      exitTxt.x = GAME_WIDTH / 2;
      exitTxt.y = GAME_HEIGHT * 0.56;
      this._levelCompleteContainer.addChild(exitTxt);
    } catch {}

    try {
      const closeSprite = PIXI.Sprite.from(UI_ASSETS.close);
      closeSprite.width = 40;
      closeSprite.height = 40;
      closeSprite.x = GAME_WIDTH / 2 + 130;
      closeSprite.y = GAME_HEIGHT * 0.30;
      closeSprite.eventMode = 'static';
      closeSprite.cursor = 'pointer';
      closeSprite.on('pointerdown', () => {
        this._hideLevelComplete();
        this.spawnPieces();
      });
      this._levelCompleteContainer.addChild(closeSprite);
    } catch {}
  }

  _showLevelComplete() {
    this._levelPendingSpawn = true;
    this._levelCompleteContainer.visible = true;
  }

  _hideLevelComplete() {
    this._levelPendingSpawn = false;
    this._levelCompleteContainer.visible = false;
  }

  _setupInteraction() {
    this.container.eventMode = 'static';
    this.container.hitArea = new PIXI.Rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT);
    this.container.on('pointerdown', (e) => this._onPointerDown(e));
    this.container.on('pointermove', (e) => this._onPointerMove(e));
    this.container.on('pointerup', (e) => this._onPointerUp(e));
    this.container.on('pointerupoutside', (e) => this._onPointerUp(e));
  }

  _fadeOut(container, duration, onComplete) {
    if (!container || container.alpha === 0) {
      if (onComplete) onComplete();
      return;
    }
    const startAlpha = container.alpha;
    let elapsed = 0;
    const tick = () => {
      elapsed++;
      const t = Math.min(1, elapsed / duration);
      container.alpha = startAlpha * (1 - t);
      if (t >= 1) {
        container.alpha = 0;
        if (onComplete) onComplete();
        return;
      }
      this.app.ticker.addOnce(tick);
    };
    this.app.ticker.addOnce(tick);
  }

  _fadeIn(container, duration, onComplete) {
    if (!container) {
      if (onComplete) onComplete();
      return;
    }
    container.visible = true;
    container.alpha = 0;
    let elapsed = 0;
    const tick = () => {
      elapsed++;
      const t = Math.min(1, elapsed / duration);
      container.alpha = t;
      if (t >= 1) {
        container.alpha = 1;
        if (onComplete) onComplete();
        return;
      }
      this.app.ticker.addOnce(tick);
    };
    this.app.ticker.addOnce(tick);
  }

  _applyTheme() {
    const theme = this.currentTheme;
    this.bgGraphics.clear();
    this.bgGraphics.beginFill(theme.background);
    this.bgGraphics.drawRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    this.bgGraphics.endFill();

    const gradHeight = 200;
    for (let i = 0; i < gradHeight; i++) {
      const a = ((gradHeight - i) / gradHeight) * 0.08;
      this.bgGraphics.beginFill(theme.accent, a);
      this.bgGraphics.drawRect(0, i, GAME_WIDTH, 1);
      this.bgGraphics.endFill();
    }

    this.levelText.style.fill = theme.accent;
    this.restartBtn.style.fill = theme.accent;
  }

  _updateProgressBar() {
    const needed = getScoreForLevel(this.level);
    const prevNeeded = this.level > 1 ? getScoreForLevel(this.level - 1) : 0;
    const progress = Math.min(1, (this.score - prevNeeded) / (needed - prevNeeded));
    this.progressBar.clear();
    this.progressBar.beginFill(this.currentTheme.accent, 0.8);
    this.progressBar.drawRoundedRect(0, 0, 72 * progress, 10, 5);
    this.progressBar.endFill();
    const remaining = Math.max(0, needed - this.score);
    this.progressText.text = `${remaining}`;
  }

  _goToMenu() {
    this.state = 'menu';
    this.isGameOver = false;
    this.isDragging = false;
    this._levelPendingSpawn = false;
    this.activePieceIndex = -1;
    this.gameOverContainer.visible = false;
    this._levelCompleteContainer.visible = false;
    this._levelSelect.hide();

    this.pieces = [];
    this.piecesContainer.removeChildren();

    this._fadeIn(this._homePage.container, 20, () => {
      this._homePage.visible = true;
    });
    this._homePage.updateHighScore(this.highScore);
    this._homePage.setLevel(this.level);
  }

  _onPointerDown(e) {
    if (this.state !== 'playing' || this.isGameOver) return;
    if (this.isDragging || this._levelPendingSpawn) return;

    const pos = e.global;
    for (let i = this.pieces.length - 1; i >= 0; i--) {
      const piece = this.pieces[i];
      if (!piece || piece.placed) continue;
      if (piece.hitTest(pos.x, pos.y)) {
        this.activePieceIndex = i;
        this.isDragging = true;
        piece.dragging = true;
        this.dragStart.x = pos.x - piece.container.x;
        this.dragStart.y = pos.y - piece.container.y;
        this.piecesContainer.removeChild(piece.container);
        this.piecesContainer.addChild(piece.container);
        if (piece.ghostContainer.parent) this.piecesContainer.removeChild(piece.ghostContainer);
        this.piecesContainer.addChild(piece.ghostContainer);
        break;
      }
    }
  }

  _onPointerMove(e) {
    if (!this.isDragging || this.activePieceIndex < 0) return;
    const piece = this.pieces[this.activePieceIndex];
    const pos = e.global;
    piece.container.x = pos.x - this.dragStart.x;
    piece.container.y = pos.y - this.dragStart.y;

    const cx = piece.container.x + piece.visualWidth / 2;
    const cy = piece.container.y + piece.visualHeight / 2;
    const gridPos = this.grid.pixelToGrid(cx, cy);

    if (gridPos) {
      const canPlace = this.grid.canPlace(piece.shapeMatrix, gridPos.row, gridPos.col);
      piece.updateGhost(gridPos.row, gridPos.col, canPlace);
    } else {
      piece.hideGhost();
    }
  }

  _onPointerUp() {
    if (!this.isDragging || this.activePieceIndex < 0) return;

    const piece = this.pieces[this.activePieceIndex];
    piece.dragging = false;
    this.isDragging = false;
    piece.hideGhost();
    piece.ghostContainer.removeChildren();

    const bestPos = piece.findBestGridPosition();

    if (bestPos && this.grid.canPlace(piece.shapeMatrix, bestPos.row, bestPos.col)) {
      this.grid.placePiece(piece.shapeMatrix, bestPos.row, bestPos.col, piece.colorIndex);

      const gx = this.grid.gridContainer.x + bestPos.col * CELL_SIZE;
      const gy = this.grid.gridContainer.y + bestPos.row * CELL_SIZE;
      const centerX = gx + (piece.cols * CELL_SIZE) / 2;
      const centerY = gy + (piece.rows * CELL_SIZE) / 2;

      this.effects.emitParticles(centerX, centerY, 0xffffff, 10, 3, 3, 25);
      this._animatePiecePlace(piece, gx, gy);
      this.grid.updateCells();

      const cellsPlaced = piece.shapeMatrix.flat().filter(Boolean).length;
      this.score += cellsPlaced;
      this._homePage.addCoins(cellsPlaced);

      this.effects.showFloatingText(centerX, centerY - 10, `+${cellsPlaced}`, 0xffffff, 20);

      const { rows, cols } = this.grid.getCompletedLines();
      if (rows.length > 0 || cols.length > 0) {
        const cleared = rows.length + cols.length;
        let lineScore = 0;
        for (let i = 1; i <= cleared; i++) lineScore += i * 10;
        this.score += lineScore;

        const coinBonus = cleared * 5;
        this._homePage.addCoins(coinBonus);

        const boardCX = this.grid.gridContainer.x + (GRID_SIZE * CELL_SIZE) / 2;
        const boardCY = this.grid.gridContainer.y + (GRID_SIZE * CELL_SIZE) / 2;

        if (cleared >= 3) {
          this.effects.emitBurst(boardCX, boardCY, 0xFFD54F, 3);
          this.effects.screenShake(10, 500);
          this._showCombo(`${cleared}x COMBO!`, 0xFFD54F);
        } else if (cleared >= 2) {
          this.effects.emitBurst(boardCX, boardCY, 0xffffff, 2);
          this.effects.screenShake(6, 300);
          this._showCombo('NICE!', 0x4FC3F7);
        } else {
          this.effects.screenShake(3, 150);
        }

        this.effects.emitLineClear(
          rows, cols, 0xffffff, CELL_SIZE,
          this.grid.gridContainer.x, this.grid.gridContainer.y, GRID_SIZE
        );
        this.effects.showFloatingText(boardCX, boardCY, `+${lineScore}`, 0xFFD54F, 28);

        this._animateLineClear(rows, cols);
        this.grid.clearLines(rows, cols);
        this.grid.updateCells();
      }

      piece.placed = true;
      this.piecesContainer.removeChild(piece.container);
      if (piece.ghostContainer.parent) this.piecesContainer.removeChild(piece.ghostContainer);

      const placedCount = this.pieces.filter(p => p.placed).length;
      if (placedCount === this.pieces.length) {
        const leveledUp = this._checkLevelUp();
        if (!leveledUp) {
          this.spawnPieces();
        }
      } else {
        const unplaced = this.pieces.filter(p => !p.placed);
        if (unplaced.length > 0 && !this.grid.hasAnyValidPlacement(unplaced)) {
          this.endGame();
          this._updateScore();
          this.activePieceIndex = -1;
          return;
        }
      }

      this._updateScore();
    } else {
      this._returnPieceToSlot(piece);
    }

    this.activePieceIndex = -1;
  }

  _animateLineClear(rows, cols) {
    const ox = this.grid.gridContainer.x;
    const oy = this.grid.gridContainer.y;
    const flashCells = [];
    for (const r of rows) {
      for (let c = 0; c < GRID_SIZE; c++) flashCells.push({ row: r, col: c });
    }
    for (const c of cols) {
      for (let r = 0; r < GRID_SIZE; r++) {
        if (!rows.includes(r)) flashCells.push({ row: r, col: c });
      }
    }

    const flashGraphics = flashCells.map(({ row, col }) => {
      const g = new PIXI.Graphics();
      g.beginFill(0xffffff);
      g.drawRoundedRect(ox + col * CELL_SIZE + 1, oy + row * CELL_SIZE + 1, CELL_SIZE - 2, CELL_SIZE - 2, 4);
      g.endFill();
      g.alpha = 0;
      this.container.addChild(g);
      return g;
    });

    let frame = 0;
    const animate = () => {
      if (this.isGameOver || this.state !== 'playing') {
        for (const g of flashGraphics) { if (g.parent) this.container.removeChild(g); }
        return;
      }
      frame++;
      for (const g of flashGraphics) {
        g.alpha = Math.sin(frame * 0.3) * 0.5 + 0.3;
      }
      if (frame > 15) {
        for (const g of flashGraphics) { if (g.parent) this.container.removeChild(g); }
        return;
      }
      this.app.ticker.addOnce(animate);
    };
    this.app.ticker.addOnce(animate);
  }

  _showCombo(text, color) {
    if (this._comboAnimating) return;
    this._comboAnimating = true;
    this.comboText.text = text;
    this.comboText.style.fill = color;
    this.comboText.alpha = 1;
    this.comboText.scale.set(0.5);

    let frame = 0;
    const animate = () => {
      frame++;
      this.comboText.scale.set(Math.min(1.2, 0.5 + frame * 0.07));
      if (frame > 50) {
        this.comboText.alpha -= 0.03;
        if (this.comboText.alpha <= 0) { this._comboAnimating = false; return; }
      }
      this.app.ticker.addOnce(animate);
    };
    this.app.ticker.addOnce(animate);
  }

  _animatePiecePlace(piece, targetX, targetY) {
    piece.setPosition(targetX, targetY);
    const g = new PIXI.Graphics();
    for (let r = 0; r < piece.rows; r++) {
      for (let c = 0; c < piece.cols; c++) {
        if (!piece.shapeMatrix[r][c]) continue;
        g.beginFill(0xffffff, 0.5);
        g.drawRoundedRect(targetX + c * CELL_SIZE + 2, targetY + r * CELL_SIZE + 2, CELL_SIZE - 4, CELL_SIZE - 4, 6);
        g.endFill();
      }
    }
    g.alpha = 0;
    this.container.addChild(g);
    let frame = 0;
    const animate = () => {
      if (this.isGameOver || this.state !== 'playing') { if (g.parent) this.container.removeChild(g); return; }
      frame++;
      g.alpha = frame / 8;
      if (frame >= 8) { this.container.removeChild(g); return; }
      this.app.ticker.addOnce(animate);
    };
    this.app.ticker.addOnce(animate);
  }

  _checkLevelUp() {
    let leveledUp = false;
    const needed = getScoreForLevel(this.level);
    while (this.score >= needed && this.level < MAX_LEVEL) {
      this.level++;
      this.currentTheme = getTheme(this.level);
      this._applyTheme();
      this.grid.updateCells();
      leveledUp = true;
      if (this.score < getScoreForLevel(this.level)) break;
    }
    if (leveledUp) {
      this._onLevelUp();
    }
    this._updateScore();
    return leveledUp;
  }

  _onLevelUp() {
    this.effects.levelUpCelebration();
    this._homePage.addCoins(20);

    const lvlText = new PIXI.Text(`LEVEL ${this.level}!`, {
      fontFamily: 'Arial, sans-serif', fontSize: 52,
      fill: this.currentTheme.accent, fontWeight: 'bold',
      stroke: 0x000000, strokeThickness: 6,
    });
    lvlText.anchor.set(0.5);
    lvlText.x = GAME_WIDTH / 2;
    lvlText.y = GAME_HEIGHT / 2;
    lvlText.alpha = 0;
    this.container.addChild(lvlText);

    const themeName = new PIXI.Text(this.currentTheme.title, {
      fontFamily: 'Arial, sans-serif', fontSize: 16,
      fill: this.currentTheme.accent, letterSpacing: 6,
    });
    themeName.anchor.set(0.5);
    themeName.x = GAME_WIDTH / 2;
    themeName.y = GAME_HEIGHT / 2 + 45;
    themeName.alpha = 0;
    this.container.addChild(themeName);

    let frame = 0;
    const animate = () => {
      frame++;
      lvlText.alpha = Math.min(1, frame / 15);
      lvlText.scale.set(1 + (1 - lvlText.alpha) * 0.4);
      lvlText.y = GAME_HEIGHT / 2 - (1 - lvlText.alpha) * 20;
      themeName.alpha = Math.max(0, Math.min(1, (frame - 20) / 15));
      if (frame > 80) {
        lvlText.alpha -= 0.03;
        themeName.alpha -= 0.03;
        if (lvlText.alpha <= 0) {
          this.container.removeChild(lvlText);
          this.container.removeChild(themeName);
          return;
        }
      }
      this.app.ticker.addOnce(animate);
    };
    this.app.ticker.addOnce(animate);

    this._showLevelComplete();

    if (this.level > this.highLevel) {
      this.highLevel = this.level;
      localStorage.setItem('blockblast_highlevel', String(this.highLevel));
    }
  }

  _returnPieceToSlot(piece) {
    if (this.isGameOver) return;
    const positions = this._getSlotPositions();
    const slotIndex = this.pieces.indexOf(piece);
    if (positions[slotIndex]) {
      piece.setPosition(positions[slotIndex].x, positions[slotIndex].y);
    }
  }

  _getSlotPositions() {
    const slotY = this.grid.gridContainer.y + GRID_SIZE * CELL_SIZE + 40;

    const totalW = this.pieces.reduce((w, p) => w + p.visualWidth, 0);
    const availW = GAME_WIDTH - 40;
    const scale = totalW > availW ? availW / totalW : 1;

    for (const piece of this.pieces) {
      piece.container.scale.set(scale);
    }

    const widths = this.pieces.map(p => p.visualWidth * scale);
    const total = widths.reduce((a, b) => a + b, 0);
    const gap = Math.min(15, (availW - total) / (this.pieces.length + 1));
    const positions = [];
    let curX = (GAME_WIDTH - total - gap * (this.pieces.length - 1)) / 2;
    for (let i = 0; i < this.pieces.length; i++) {
      positions.push({ x: curX, y: slotY });
      curX += widths[i] + gap;
    }
    return positions;
  }

  spawnPieces() {
    this.pieces = [];
    this.piecesContainer.removeChildren();

    const shapes = getShapesForLevel(this.level);
    const shuffled = [...shapes].sort(() => Math.random() - 0.5);

    for (let i = 0; i < NUM_PIECES_PER_TURN; i++) {
      const shapeDef = shuffled[i % shuffled.length];
      const colorIndex = Math.floor(Math.random() * NUM_GAME_BLOCKS);
      const piece = new Piece(shapeDef.shape, colorIndex, this.grid);
      this.pieces.push(piece);
    }

    const positions = this._getSlotPositions();
    for (let i = 0; i < this.pieces.length; i++) {
      this.pieces[i].setPosition(positions[i].x, positions[i].y);
      this.piecesContainer.addChild(this.pieces[i].container);
    }

    if (!this.grid.hasAnyValidPlacement(this.pieces)) {
      this.endGame();
    }
  }

  startGame(selectedLevel) {
    this.state = 'playing';
    this.isGameOver = false;
    this.score = 0;
    this.level = selectedLevel || 1;
    if (this.level < 1) this.level = 1;
    this.level = Math.min(this.level, MAX_LEVEL);
    this.isDragging = false;
    this._levelPendingSpawn = false;
    this.activePieceIndex = -1;
    this.gameOverContainer.visible = false;
    this._levelCompleteContainer.visible = false;
    this.effects.clear();

    this.currentTheme = getTheme(this.level);
    this._applyTheme();

    this.grid.cells = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(null));
    this.grid.updateCells();
    this._updateScore();

    this.pieces = [];
    this.piecesContainer.removeChildren();
    this.spawnPieces();
  }

  endGame() {
    this.isGameOver = true;
    this.state = 'gameover';

    if (this.score > this.highScore) {
      this.highScore = this.score;
      localStorage.setItem('blockblast_highscore', String(this.highScore));
    }
    if (this.level > this.highLevel) {
      this.highLevel = this.level;
      localStorage.setItem('blockblast_highlevel', String(this.highLevel));
    }

    this.finalScoreText.text = `Score: ${this.score}`;
    this.finalLevelText.text = `Reached Level: ${this.level}`;
    this.bestScoreText.text = `Best: ${this.highScore}`;
    this.gameOverContainer.visible = true;

    this.effects.screenShake(8, 400);
    this.effects.emitBurst(GAME_WIDTH / 2, GAME_HEIGHT / 2, 0xff4444, 2);
  }

  _updateScore() {
    this.scoreText.text = `Score: ${this.score}`;
    this.highScoreText.text = `Best: ${this.highScore}  LV.${this.level}`;
    this.levelText.text = `LV.${this.level}`;
    this._updateProgressBar();
  }

  update(delta) {
    this.effects.update(delta);
    this._homePage.update(delta);
    this._levelSelect.update(delta);
  }

  restart() {
    this.startGame(this.level);
  }
}
