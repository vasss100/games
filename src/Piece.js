import * as PIXI from 'pixi.js';
import { CELL_SIZE } from './constants.js';

export class Piece {
  constructor(shapeMatrix, colorIndex, grid) {
    this.shapeMatrix = shapeMatrix;
    this.colorIndex = colorIndex;
    this.grid = grid;
    this.placed = false;
    this.dragging = false;

    this.rows = shapeMatrix.length;
    this.cols = shapeMatrix[0].length;

    this.container = new PIXI.Container();
    this.ghostContainer = new PIXI.Container();
    this.ghostContainer.alpha = 0.35;
    this.ghostContainer.visible = false;

    this._createGraphics();
    this._createGhost();
  }

  _createGraphics() {
    const spriteName = `asset_${(this.colorIndex % 17) + 1}`;

    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        if (!this.shapeMatrix[r][c]) continue;

        const cx = c * CELL_SIZE + CELL_SIZE / 2;
        const cy = r * CELL_SIZE + CELL_SIZE / 2;

        try {
          const sprite = PIXI.Sprite.from(spriteName);
          sprite.anchor.set(0.5);
          sprite.x = cx;
          sprite.y = cy;
          sprite.width = CELL_SIZE - 4;
          sprite.height = CELL_SIZE - 4;
          this.container.addChild(sprite);
        } catch {
          const g = new PIXI.Graphics();
          g.beginFill(0x4FC3F7, 1);
          g.drawRoundedRect(
            c * CELL_SIZE + 2, r * CELL_SIZE + 2,
            CELL_SIZE - 4, CELL_SIZE - 4, 6
          );
          g.endFill();
          this.container.addChild(g);
        }
      }
    }
  }

  _createGhost() {
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        if (!this.shapeMatrix[r][c]) continue;
        const g = new PIXI.Graphics();
        const inset = 2;
        g.lineStyle(2, 0xffffff, 0.6);
        g.drawRoundedRect(
          c * CELL_SIZE + inset, r * CELL_SIZE + inset,
          CELL_SIZE - inset * 2, CELL_SIZE - inset * 2, 6
        );
        this.ghostContainer.addChild(g);
      }
    }
  }

  setPosition(x, y) {
    this.container.x = x;
    this.container.y = y;
  }

  get visualWidth() { return this.cols * CELL_SIZE; }
  get visualHeight() { return this.rows * CELL_SIZE; }

  getCenter() {
    return {
      x: this.container.x + this.visualWidth / 2,
      y: this.container.y + this.visualHeight / 2,
    };
  }

  updateGhost(gridRow, gridCol, canPlace) {
    this.ghostContainer.removeChildren();
    if (gridRow === null || gridCol === null) {
      this.ghostContainer.visible = false;
      return;
    }

    const ox = this.grid.gridContainer.x;
    const oy = this.grid.gridContainer.y;
    const color = canPlace ? 0x00ff00 : 0xff4444;

    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        if (!this.shapeMatrix[r][c]) continue;
        const g = new PIXI.Graphics();
        const cx = ox + (gridCol + c) * CELL_SIZE;
        const cy = oy + (gridRow + r) * CELL_SIZE;
        g.lineStyle(2, color, 0.7);
        g.beginFill(color, 0.15);
        g.drawRoundedRect(cx + 2, cy + 2, CELL_SIZE - 4, CELL_SIZE - 4, 6);
        g.endFill();
        this.ghostContainer.addChild(g);
      }
    }
    this.ghostContainer.visible = true;
  }

  hideGhost() {
    this.ghostContainer.visible = false;
  }

  hitTest(px, py) {
    return px >= this.container.x && px <= this.container.x + this.visualWidth &&
           py >= this.container.y && py <= this.container.y + this.visualHeight;
  }

  findBestGridPosition() {
    const cx = this.container.x + this.visualWidth / 2;
    const cy = this.container.y + this.visualHeight / 2;
    let bestPos = null;
    let bestDist = Infinity;

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        if (!this.grid.canPlace(this.shapeMatrix, r, c)) continue;
        const gcx = this.grid.gridContainer.x + c * CELL_SIZE + this.visualWidth / 2;
        const gcy = this.grid.gridContainer.y + r * CELL_SIZE + this.visualHeight / 2;
        const dist = Math.sqrt((gcx - cx) ** 2 + (gcy - cy) ** 2);
        if (dist < bestDist) {
          bestDist = dist;
          bestPos = { row: r, col: c };
        }
      }
    }
    return bestPos;
  }
}
