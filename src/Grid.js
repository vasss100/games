import * as PIXI from 'pixi.js';
import { GRID_SIZE, CELL_SIZE, COLORS, getGameBlockAsset } from './constants.js';

export class Grid {
  constructor(app, parentContainer) {
    this.cells = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(null));
    this.app = app;

    this.gridContainer = new PIXI.Container();
    parentContainer.addChild(this.gridContainer);

    const gridPixelSize = GRID_SIZE * CELL_SIZE;
    this.gridContainer.x = (app.screen.width - gridPixelSize) / 2;
    this.gridContainer.y = (app.screen.height - gridPixelSize) / 3;

    this.cellGraphics = [];
    for (let r = 0; r < GRID_SIZE; r++) {
      this.cellGraphics[r] = [];
      for (let c = 0; c < GRID_SIZE; c++) {
        const cell = new PIXI.Container();
        this.gridContainer.addChild(cell);
        this.cellGraphics[r][c] = cell;
      }
    }

    this._drawEmptyLayout();
  }

  get x() { return this.gridContainer.x; }
  get y() { return this.gridContainer.y; }

  _drawEmptyLayout() {
    const border = new PIXI.Graphics();
    border.lineStyle(2, COLORS.gridLine, 0.5);
    border.drawRoundedRect(-2, -2, GRID_SIZE * CELL_SIZE + 4, GRID_SIZE * CELL_SIZE + 4, 8);
    this.gridContainer.addChildAt(border, 0);

    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        const cell = this.cellGraphics[r][c];
        const x = c * CELL_SIZE;
        const y = r * CELL_SIZE;
        const bg = new PIXI.Graphics();
        bg.lineStyle(1, COLORS.cellEmptyBorder, 0.25);
        bg.beginFill(COLORS.cellEmpty, 0.6);
        bg.drawRoundedRect(x + 1, y + 1, CELL_SIZE - 2, CELL_SIZE - 2, 4);
        bg.endFill();
        cell.addChild(bg);
      }
    }
  }

  canPlace(shape, row, col) {
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (!shape[r][c]) continue;
        const gr = row + r;
        const gc = col + c;
        if (gr < 0 || gr >= GRID_SIZE || gc < 0 || gc >= GRID_SIZE) return false;
        if (this.cells[gr][gc] !== null) return false;
      }
    }
    return true;
  }

  placePiece(shape, row, col, colorIndex) {
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (!shape[r][c]) continue;
        this.cells[row + r][col + c] = colorIndex;
      }
    }
  }

  getCompletedLines() {
    const rows = [];
    const cols = [];
    for (let r = 0; r < GRID_SIZE; r++) {
      if (this.cells[r].every(c => c !== null)) rows.push(r);
    }
    for (let c = 0; c < GRID_SIZE; c++) {
      if (this.cells.every(row => row[c] !== null)) cols.push(c);
    }
    return { rows, cols };
  }

  clearLines(rows, cols) {
    for (const r of rows) {
      for (let c = 0; c < GRID_SIZE; c++) this.cells[r][c] = null;
    }
    for (const c of cols) {
      for (let r = 0; r < GRID_SIZE; r++) this.cells[r][c] = null;
    }
  }

  pixelToGrid(pixelX, pixelY) {
    const col = Math.floor((pixelX - this.gridContainer.x) / CELL_SIZE);
    const row = Math.floor((pixelY - this.gridContainer.y) / CELL_SIZE);
    if (row < 0 || row >= GRID_SIZE || col < 0 || col >= GRID_SIZE) return null;
    return { row, col };
  }

  hasAnyValidPlacement(pieces) {
    for (const piece of pieces) {
      for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
          if (this.canPlace(piece.shapeMatrix, r, c)) return true;
        }
      }
    }
    return false;
  }

  updateCells() {
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        const cell = this.cellGraphics[r][c];
        const val = this.cells[r][c];
        cell.removeChildren();

        const x = c * CELL_SIZE;
        const y = r * CELL_SIZE;

        if (val !== null) {
          const spriteName = getGameBlockAsset(val);
          const sprite = PIXI.Sprite.from(spriteName);
          sprite.width = CELL_SIZE - 4;
          sprite.height = CELL_SIZE - 4;
          sprite.x = x + 2;
          sprite.y = y + 2;
          cell.addChild(sprite);
        } else {
          const bg = new PIXI.Graphics();
          bg.lineStyle(1, COLORS.cellEmptyBorder, 0.25);
          bg.beginFill(COLORS.cellEmpty, 0.6);
          bg.drawRoundedRect(x + 1, y + 1, CELL_SIZE - 2, CELL_SIZE - 2, 4);
          bg.endFill();
          cell.addChild(bg);
        }
      }
    }
  }
}
