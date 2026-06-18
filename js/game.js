const { Engine, Bodies, Body, Composite, Constraint, Events, Vector } = Matter;

const CONFIG = {
  gravity: 9.81,
  targetDistance: 1427,
  fuelConsumption: 0.04,
  speed: 150,
  startMoney: 5000,
  pxPerMeter: 60,
};

const SPRITE_BASE = './Assets/Sprites/';
const AUDIO_BASE = './Assets/Audio/';

const Store = {
  get(k, d) { try { const v = localStorage.getItem('hcr_' + k); return v !== null ? JSON.parse(v) : d; } catch(e) { return d; } },
  set(k, v) { try { localStorage.setItem('hcr_' + k, JSON.stringify(v)); } catch(e) {} },
  getInt(k, d) { return parseInt(this.get(k, d)); },
};

const SFX = {
  pool: {},
  _lastPlay: {},
  _ensure(n) {
    if (!this.pool[n]) {
      const a = new Audio(AUDIO_BASE + n + '.wav');
      a.preload = 'auto';
      this.pool[n] = a;
    }
    return this.pool[n];
  },
  play(n, vol = 1) {
    const now = Date.now();
    if (n === 'engine' && this._lastPlay[n] && now - this._lastPlay[n] < 800) return;
    this._lastPlay[n] = now;
    try {
      const a = this._ensure(n);
      const c = a.cloneNode();
      c.volume = vol;
      c.play().catch(() => {});
    } catch(e) {}
  },
  _music: null,
  music(name) {
    try {
      if (this._music) { this._music.pause(); this._music = null; }
      if (!name) return;
      const a = new Audio(AUDIO_BASE + name);
      a.loop = true;
      a.volume = 0.5;
      a.play().catch(() => {});
      this._music = a;
    } catch(e) {}
  },
};

const VEHICLE_STATS = [
  { name: 'Hill Climber', icon: 'car-icon-jeep.png', price: 0, density: 0.015, wheelDensity: 0.008, speed: 150, fuelUse: 0.04, grip: 0.9, desc: 'Balanced all-rounder' },
  { name: 'Motorcycle', icon: 'bike-motocross.png', price: 35000, density: 0.010, wheelDensity: 0.006, speed: 200, fuelUse: 0.025, grip: 0.7, desc: 'Fast & light, less stable' },
  { name: 'Tank', icon: 'car-tank.png', price: 60000, density: 0.030, wheelDensity: 0.015, speed: 100, fuelUse: 0.07, grip: 0.95, desc: 'Slow but unstoppable' },
  { name: 'Race Car', icon: 'car-icon-racecar.png', price: 80000, density: 0.012, wheelDensity: 0.007, speed: 250, fuelUse: 0.055, grip: 0.5, desc: 'Extreme speed, slides a lot' },
];

const STAGE_DATA = [
  { name: 'Countryside', icon: 'lowres-stage-icon-countryside.png', price: 0, key: 'Stage', bg: 0x87CEEF, ground: 0x4a7023, fill: 0x3a5f0b, friction: 0.9, target: 1000, reward: 5000 },
  { name: 'Mars', icon: 'stage-icon-alienplanet.png', price: 35000, key: 'Stage_Mars', bg: 0xDCB5B5, ground: 0xC1440E, fill: 0x8B4513, friction: 0.15, target: 1200, reward: 10000 },
  { name: 'Cave', icon: 'lowres-stage-icon-cave.png', price: 50000, key: 'Stage_Cave', bg: 0x1a1a2e, ground: 0x555555, fill: 0x333333, friction: 0.6, target: 800, reward: 15000 },
  { name: 'Moon', icon: 'stage-icon-moon.png', price: 70000, key: 'Stage_Moon', bg: 0x111122, ground: 0x888888, fill: 0x666666, friction: 0.3, target: 1500, reward: 20000 },
];

function genTerrain(stageIdx) {
  const pts = [];
  let px = 0, py = 0;
  pts.push({ x: 0, y: 0 });

  if (stageIdx === 1) {
    for (let i = 0; i < 80; i++) {
      px += 3 + Math.random() * 4;
      py += (Math.random() - 0.5) * 4;
      pts.push({ x: px, y: py * 0.35 });
    }
  } else if (stageIdx === 2) {
    for (let i = 0; i < 70; i++) {
      px += 2 + Math.random() * 3;
      py += (Math.random() - 0.5) * 3 - 0.3;
      pts.push({ x: px, y: Math.max(-8, py * 0.4) });
    }
  } else if (stageIdx === 3) {
    for (let i = 0; i < 90; i++) {
      px += 4 + Math.random() * 5;
      py += (Math.random() - 0.5) * 6;
      pts.push({ x: px, y: py * 0.5 });
    }
  } else {
    const segs = [
      [0,0],[3,-0.5],[4,-0.7],[5,0.3],
      [4,1.2],[4,0.3],[5,-0.5],[5,-1.3],
      [5,-2],[5,-1],[4,0.5],[4,1],
      [4,0],[5,-1],[5,-2],[5,-3],
      [4,-2],[4,0],[4,1],[4,0.5],
      [4,-0.5],[4,-1.5],[4,-0.5],[5,1],
      [5,2],[4,1],[4,-0.5],[4,-1.5],
      [4,-3],[4,-2],[4,-0.5],[4,1],
      [5,2],[4,1],[4,-0.5],[5,-1.5],
      [5,-2.5],[5,-3.5],[4,-2],[4,-0.5],
      [4,1],[5,2.5],[5,1.5],[4,0],
      [4,-1],[4,-2],[4,-3.5],[5,-5],
      [5,-4],[4,-2],[4,-0.5],[5,1],
      [5,2.5],[4,1.5],[4,0],[4,-1],
      [4,-2.5],[5,-4],[5,-5.5],[4,-4.5],
      [4,-3],[5,-1.5],[5,0],[4,1.5],
      [4,3],[5,4],[5,3],[4,1.5],
      [4,0],[5,-1],[5,0.5],[4,2],
      [4,1],[5,-0.5],[5,-0.5],[4,0],
      [4,0.5],[5,1],
    ];
    segs.forEach(([dx, dy]) => {
      px += dx; py += dy;
      pts.push({ x: px * 0.5, y: py * 0.3 });
    });
    for (let i = 0; i < 30; i++) {
      const last = pts[pts.length - 1];
      pts.push({ x: last.x + 4 + Math.random() * 3, y: last.y + (Math.random() - 0.5) * 1.5 });
    }
  }
  return pts;
}

class HillClimbGame {
  constructor() {
    this.app = null;
    this.engine = null;
    this.world = null;
    this.menuContainer = null;
    this.gameContainer = null;
    this.uiContainer = null;
    this.vehicle = null;
    this.scene = 'menu';
    this.stageIndex = 0;
    this.vehicleIndex = 0;
    this.totalMoney = Store.getInt('Money', CONFIG.startMoney);
    this.moneyEarned = 0;
    this.fuel = 1;
    this.isDie = false;
    this.reachGoal = false;
    this.gasPressed = false;
    this.brakePressed = false;
    this.moveStop = false;
    this.distance = 0;
    this.startX = 0;
    this.keys = {};
    this.terrainBodies = [];
    this.coinData = [];
    this.fuelData = [];
    this.goalData = null;
    this.gameObjects = [];
    this.menuItems = [];
    this._menuTargetScroll = 0;
    this._menuScrollPos = 0;
    this._menuDragging = false;
    this._menuDragStart = 0;
    this._menuDragTotal = 0;
    this._menuVelocity = 0;
    this.menuScrollContent = null;
    this.menuCardW = 260;
    this.menuSpacing = 30;
    this.menuItemsPerRow = 0;
    this.menuMode = 'stage';
    this.selectedStageIdx = Store.getInt('Stage', 0);
    this.selectedVehicleIdx = Store.getInt('Vehicle', 0);
    this.stages = [];
    this.vehicles = [];
  }

  init() {
    this.app = new PIXI.Application({
      resizeTo: window,
      backgroundColor: 0x87CEEF,
      antialias: true,
      resolution: Math.min(window.devicePixelRatio || 1, 2),
      autoDensity: true,
    });
    document.body.appendChild(this.app.view);

    this.engine = Matter.Engine.create({
      gravity: { x: 0, y: CONFIG.gravity }
    });
    this.world = this.engine.world;

    this.menuContainer = new PIXI.Container();
    this.gameContainer = new PIXI.Container();
    this.uiContainer = new PIXI.Container();
    this.app.stage.addChild(this.menuContainer);
    this.app.stage.addChild(this.gameContainer);
    this.app.stage.addChild(this.uiContainer);

    this.gameContainer.visible = false;
    this.gameContainer.sortableChildren = true;

    this.createMenu();
    this.bindInput();

    Matter.Events.on(this.engine, 'collisionStart', (e) => this.handleCollisions(e));
    Matter.Engine.run(this.engine);
    this.app.ticker.add(() => this.update());

    const el = document.getElementById('loading');
    if (el) el.style.display = 'none';
  }

  bindInput() {
    window.addEventListener('keydown', e => {
      this.keys[e.key] = true;
      if (e.key === 'Escape' && this.scene === 'game') this.togglePause();
    });
    window.addEventListener('keyup', e => { this.keys[e.key] = false; });
    window.addEventListener('resize', () => this.onResize());
  }

  createMenu() {
    this.menuContainer.removeChildren();
    this.menuItems = [];
    const w = this.app.screen.width;
    const h = this.app.screen.height;

    const bg = new PIXI.Graphics();
    bg.rect(0, 0, w, h).fill(0x1a1a2e);
    this.menuContainer.addChild(bg);

    const title = new PIXI.Text({
      text: 'HILL CLIMB RACING',
      style: new PIXI.TextStyle({ fontFamily: 'Arial', fontSize: Math.min(36, w * 0.04), fill: '#ffffff', fontWeight: 'bold' })
    });
    title.anchor.set(0.5, 0);
    title.x = w / 2;
    title.y = 20;
    this.menuContainer.addChild(title);

    const coinIcon = new PIXI.Graphics();
    coinIcon.circle(0, 0, 12).fill(0xFFD700);
    coinIcon.x = w / 2 - 70;
    coinIcon.y = 65;
    this.menuContainer.addChild(coinIcon);

    this.menuMoneyText = new PIXI.Text({
      text: this.totalMoney.toString(),
      style: new PIXI.TextStyle({ fontFamily: 'Arial', fontSize: 22, fill: '#FFD700', fontWeight: 'bold' })
    });
    this.menuMoneyText.x = w / 2 - 50;
    this.menuMoneyText.y = 53;
    this.menuContainer.addChild(this.menuMoneyText);

    this.stages = STAGE_DATA.map((s, i) => ({
      ...s,
      owned: i === 0 || Store.getInt(s.key, 0) === 1,
    }));
    this.vehicles = VEHICLE_STATS.map((v, i) => ({
      ...v,
      owned: i === 0 || Store.getInt('V_' + i, 0) === 1,
    }));

    const btnY = h - 90;
    const btnW = Math.min(200, w * 0.3);
    const btnH = 44;
    const gap = 20;

    const stageBtn = this.makeBtn(w / 2 - btnW - gap / 2, btnY, btnW, btnH, 'STAGES', 0x2d6a4f, () => {
      this.menuMode = 'stage';
      this.buildMenuScroll(this.stages, this.selectedStageIdx);
    });
    const vehBtn = this.makeBtn(w / 2 + gap / 2, btnY, btnW, btnH, 'VEHICLES', 0x1b4332, () => {
      this.menuMode = 'vehicle';
      this.buildMenuScroll(this.vehicles, this.selectedVehicleIdx);
    });
    this.menuContainer.addChild(stageBtn);
    this.menuContainer.addChild(vehBtn);

    const startBtn = this.makeBtn(w / 2 - 100, btnY - 70, 200, 55, 'START', 0xe94560, () => this.startGame());
    this.menuContainer.addChild(startBtn);

    this.menuScrollContent = new PIXI.Container();
    this.menuContainer.addChild(this.menuScrollContent);

    const mask = new PIXI.Graphics();
    mask.rect(0, 85, w, h - 200).fill(0xffffff);
    this.menuContainer.addChild(mask);
    this.menuScrollContent.mask = mask;

    this.buildMenuScroll(this.stages, this.selectedStageIdx);

    this.setupScrollDrag();
    this.createPurchaseUI();
  }

  buildMenuScroll(items, selectedIdx) {
    if (!this.menuScrollContent) return;
    this.menuScrollContent.removeChildren();
    this.menuItems = items;
    const w = this.app.screen.width;

    const cardW = 240;
    const cardH = 200;
    const spacing = 25;
    const startX = 30;

    items.forEach((item, idx) => {
      const card = new PIXI.Container();
      card.x = startX + idx * (cardW + spacing);
      card.y = 100;

      const isSelected = idx === selectedIdx;
      const bgColor = isSelected ? 0x0f3460 : (item.owned ? 0x16213e : 0x2a2a3e);

      const bg = new PIXI.Graphics();
      bg.roundRect(0, 0, cardW, cardH, 12).fill(bgColor);
      if (isSelected) {
        bg.roundRect(0, 0, cardW, cardH, 12).fill({ color: 0x4a90d9, alpha: 0.3 });
      }
      card.addChild(bg);

      try {
        const tex = PIXI.Texture.from(SPRITE_BASE + item.icon);
        const spr = new PIXI.Sprite(tex);
        spr.anchor.set(0.5, 0.5);
        spr.x = cardW / 2;
        spr.y = 65;
        const maxW = 100, maxH = 80;
        const s = Math.min(maxW / (spr.width || 1), maxH / (spr.height || 1), 1);
        spr.scale.set(s);
        card.addChild(spr);
      } catch(e) {
        const placeholder = new PIXI.Graphics();
        placeholder.roundRect(cardW / 2 - 40, 25, 80, 80, 8).fill(0x555555);
        card.addChild(placeholder);
      }

      const nameText = new PIXI.Text({
        text: item.name,
        style: new PIXI.TextStyle({ fontFamily: 'Arial', fontSize: 17, fill: '#ffffff', fontWeight: 'bold' })
      });
      nameText.anchor.set(0.5, 0);
      nameText.x = cardW / 2;
      nameText.y = 120;
      card.addChild(nameText);

      if (item.desc && item.owned) {
        const descText = new PIXI.Text({
          text: item.desc,
          style: new PIXI.TextStyle({ fontFamily: 'Arial', fontSize: 11, fill: '#aaaaaa' })
        });
        descText.anchor.set(0.5, 0);
        descText.x = cardW / 2;
        descText.y = 142;
        card.addChild(descText);
      }

      if (!item.owned) {
        if (item.price > 0) {
          const priceText = new PIXI.Text({
            text: item.price.toLocaleString() + ' coins',
            style: new PIXI.TextStyle({ fontFamily: 'Arial', fontSize: 14, fill: '#FFD700' })
          });
          priceText.anchor.set(0.5, 0);
          priceText.x = cardW / 2;
          priceText.y = 145;
          card.addChild(priceText);
        }
        const lockT = new PIXI.Text({
          text: 'LOCKED',
          style: new PIXI.TextStyle({ fontFamily: 'Arial', fontSize: 13, fill: '#ff6666', fontWeight: 'bold' })
        });
        lockT.anchor.set(0.5, 0);
        lockT.x = cardW / 2;
        lockT.y = 168;
        card.addChild(lockT);
      } else {
        const selT = new PIXI.Text({
          text: isSelected ? 'SELECTED' : 'TAP TO SELECT',
          style: new PIXI.TextStyle({ fontFamily: 'Arial', fontSize: 13, fill: isSelected ? '#4CAF50' : '#888888', fontWeight: 'bold' })
        });
        selT.anchor.set(0.5, 0);
        selT.x = cardW / 2;
        selT.y = 168;
        card.addChild(selT);
      }

      card.eventMode = 'static';
      card.cursor = 'pointer';
      card._itemIdx = idx;
      card.on('pointerdown', () => this.onMenuItemClick(idx));
      this.menuScrollContent.addChild(card);
    });

    const totalW = items.length * (cardW + spacing);
    this._menuMaxScroll = Math.max(0, totalW + startX - w + 30);
    this._menuScrollPos = Math.min(this._menuMaxScroll, Math.max(0, this._menuScrollPos));
  }

  setupScrollDrag() {
    const stage = this.app.stage;
    stage.eventMode = 'static';

    stage.on('pointerdown', (e) => {
      if (this.scene !== 'menu') return;
      this._menuDragging = true;
      this._menuDragStart = e.globalX;
      this._menuDragTotal = this._menuScrollPos;
      this._menuVelocity = 0;
    });

    stage.on('pointermove', (e) => {
      if (!this._menuDragging || this.scene !== 'menu') return;
      const dx = this._menuDragStart - e.globalX;
      this._menuScrollPos = Math.max(0, Math.min(this._menuMaxScroll, this._menuDragTotal + dx));
      this._menuVelocity = dx * 0.5;
    });

    stage.on('pointerup', () => { this._menuDragging = false; });
    stage.on('pointerupoutside', () => { this._menuDragging = false; });
  }

  onMenuItemClick(idx) {
    const items = this.menuItems;
    const item = items[idx];
    if (!item) return;
    const isStageMode = this.menuMode === 'stage';

    if (item.owned) {
      if (isStageMode) {
        this.selectedStageIdx = idx;
        Store.set('Stage', idx);
      } else {
        this.selectedVehicleIdx = idx;
        Store.set('Vehicle', idx);
      }
      this.buildMenuScroll(items, idx);
      SFX.play('click');
    } else if (item.price > 0 && this.totalMoney >= item.price) {
      this.showPurchaseDialog(item, isStageMode);
    } else {
      this.showNotif('NOT ENOUGH COINS!');
      SFX.play('beep');
    }
  }

  makeBtn(x, y, w, h, text, color, cb) {
    const c = new PIXI.Container();
    c.x = x; c.y = y;
    const bg = new PIXI.Graphics();
    bg.roundRect(0, 0, w, h, 10).fill(color);
    c.addChild(bg);
    const t = new PIXI.Text({
      text,
      style: new PIXI.TextStyle({ fontFamily: 'Arial', fontSize: 20, fill: '#ffffff', fontWeight: 'bold' })
    });
    t.anchor.set(0.5, 0.5);
    t.x = w / 2; t.y = h / 2;
    c.addChild(t);
    c.eventMode = 'static';
    c.cursor = 'pointer';
    c.on('pointerdown', cb);
    return c;
  }

  createPurchaseUI() {
    const existing = this.menuContainer.getChildByName('purchaseDialog');
    if (existing) existing.removeFromParent();
    const w = this.app.screen.width;
    const h = this.app.screen.height;
    const c = new PIXI.Container();
    c.name = 'purchaseDialog';
    c.visible = false;
    this.menuContainer.addChild(c);

    const ov = new PIXI.Graphics();
    ov.rect(0, 0, w, h).fill({ color: 0x000000, alpha: 0.6 });
    c.addChild(ov);

    const dW = Math.min(380, w * 0.8);
    const dH = 250;
    const d = new PIXI.Graphics();
    d.roundRect(0, 0, dW, dH, 16).fill(0x1a1a2e);
    d.x = w / 2 - dW / 2;
    d.y = h / 2 - dH / 2;
    c.addChild(d);

    const title = new PIXI.Text({
      text: 'PURCHASE',
      style: new PIXI.TextStyle({ fontFamily: 'Arial', fontSize: 26, fill: '#ffffff', fontWeight: 'bold' })
    });
    title.anchor.set(0.5, 0);
    title.x = w / 2;
    title.y = h / 2 - dH / 2 + 20;
    c.addChild(title);

    this._purchasePriceText = new PIXI.Text({
      text: '',
      style: new PIXI.TextStyle({ fontFamily: 'Arial', fontSize: 20, fill: '#FFD700' })
    });
    this._purchasePriceText.anchor.set(0.5, 0);
    this._purchasePriceText.x = w / 2;
    this._purchasePriceText.y = h / 2 - 40;
    c.addChild(this._purchasePriceText);

    const buyBtn = this.makeBtn(w / 2 - 80, h / 2 + 10, 160, 45, 'BUY', 0x4CAF50, () => this.confirmPurchase());
    const cancelBtn = this.makeBtn(w / 2 - 80, h / 2 + 65, 160, 45, 'CANCEL', 0x666666, () => { c.visible = false; });
    c.addChild(buyBtn);
    c.addChild(cancelBtn);
    this._purchaseDialog = c;
  }

  showPurchaseDialog(item, isStage) {
    if (!this._purchaseDialog) return;
    this._purchaseDialog.visible = true;
    this._purchaseTarget = { item, isStage };
    this._purchasePriceText.text = 'Buy for ' + item.price.toLocaleString() + ' coins?';
  }

  confirmPurchase() {
    if (!this._purchaseTarget) return;
    const { item, isStage } = this._purchaseTarget;
    if (this.totalMoney >= item.price) {
      this.totalMoney -= item.price;
      Store.set('Money', this.totalMoney);
      if (isStage) {
        Store.set(item.key, 1);
      } else {
        Store.set('V_' + this.vehicles.indexOf(item), 1);
      }
      item.owned = true;
      this.menuMoneyText.text = this.totalMoney.toString();
      this._purchaseDialog.visible = false;
      SFX.play('purchase');
      this.buildMenuScroll(isStage ? this.stages : this.vehicles, isStage ? this.selectedStageIdx : this.selectedVehicleIdx);
    }
  }

  showNotif(msg) {
    if (this._notifText) this._notifText.removeFromParent();
    const t = new PIXI.Text({
      text: msg,
      style: new PIXI.TextStyle({ fontFamily: 'Arial', fontSize: 28, fill: '#FF4C4C', fontWeight: 'bold' })
    });
    t.anchor.set(0.5, 0.5);
    t.x = this.app.screen.width / 2;
    t.y = this.app.screen.height / 2;
    this.menuContainer.addChild(t);
    this._notifText = t;
    setTimeout(() => { if (t.parent) t.removeFromParent(); }, 1500);
  }

  startGame() {
    this.scene = 'game';
    this.stageIndex = this.selectedStageIdx;
    this.vehicleIndex = this.selectedVehicleIdx;
    this.menuContainer.visible = false;
    this.gameContainer.visible = true;
    this.gameContainer.removeChildren();
    this.uiContainer.removeChildren();

    this.isDie = false;
    this.reachGoal = false;
    this.fuel = 1;
    this.moneyEarned = 0;
    this.moveStop = false;
    this.gasPressed = false;
    this.brakePressed = false;
    this.distance = 0;
    this.terrainBodies = [];
    this.coinData = [];
    this.fuelData = [];
    this.gameObjects = [];

    Matter.Composite.clear(this.world, false);
    this.engine.gravity.y = CONFIG.gravity;

    this.buildLevel();
    this.createGameUI();

    SFX.music('game ost.mp3');
  }

  buildLevel() {
    const stage = this.stages[this.stageIndex] || this.stages[0];
    const terrainPoints = genTerrain(this.stageIndex);

    this.app.renderer.backgroundColor = stage.bg;

    const maxX = terrainPoints[terrainPoints.length - 1].x;
    const maxY = Math.min(...terrainPoints.map(p => p.y)) - 5;

    const sky = new PIXI.Graphics();
    sky.rect(-200, -200, maxX * CONFIG.pxPerMeter + 400, 400).fill(stage.bg);
    this.gameContainer.addChild(sky);

    for (let i = 0; i < terrainPoints.length - 1; i++) {
      const p1 = terrainPoints[i];
      const p2 = terrainPoints[i + 1];
      const cx = (p1.x + p2.x) / 2;
      const cy = (p1.y + p2.y) / 2;
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const len = Math.sqrt(dx * dx + dy * dy);
      const angle = Math.atan2(dy, dx);
      const thick = 4;

      const body = Matter.Bodies.rectangle(cx, cy - thick / 2 + 0.3, len + 0.5, thick, {
        isStatic: true,
        angle: angle,
        friction: stage.friction,
        restitution: this.stageIndex === 1 ? 0.05 : (this.stageIndex === 3 ? 0.1 : 0),
        label: 'terrain',
      });
      Matter.Composite.add(this.world, body);
      this.terrainBodies.push(body);

      const gfx = new PIXI.Graphics();
      gfx.poly([
        -len / 2 * CONFIG.pxPerMeter, 0,
        len / 2 * CONFIG.pxPerMeter, 0,
        len / 2 * CONFIG.pxPerMeter, thick * CONFIG.pxPerMeter * 0.4,
        -len / 2 * CONFIG.pxPerMeter, thick * CONFIG.pxPerMeter * 0.4,
      ]).fill(stage.ground);
      gfx.x = cx * CONFIG.pxPerMeter;
      gfx.y = (cy - thick / 2 + 0.3) * CONFIG.pxPerMeter;
      gfx.rotation = angle;
      this.gameContainer.addChild(gfx);
    }

    const fillGfx = new PIXI.Graphics();
    const verts = [];
    terrainPoints.forEach(p => { verts.push(p.x * CONFIG.pxPerMeter, p.y * CONFIG.pxPerMeter); });
    const last = terrainPoints[terrainPoints.length - 1];
    verts.push(last.x * CONFIG.pxPerMeter, (last.y + 30) * CONFIG.pxPerMeter);
    verts.push(terrainPoints[0].x * CONFIG.pxPerMeter, (terrainPoints[0].y + 30) * CONFIG.pxPerMeter);
    fillGfx.poly(verts).fill(stage.fill);
    fillGfx.alpha = 0.6;
    this.gameContainer.addChildAt(fillGfx, 0);

    this.spawnPickups(terrainPoints);
    this.createGoal(terrainPoints);
    this.createVehicle(terrainPoints);
  }

  spawnPickups(points) {
    for (let i = 3; i < points.length - 1; i += 4) {
      const p = points[i];
      const px = p.x + (Math.random() - 0.5) * 2;
      const py = p.y - 1.5 - Math.random() * 2.5;

      if (Math.random() < 0.35) {
        const body = Matter.Bodies.circle(px, py, 0.25, {
          isStatic: true, isSensor: true, label: 'coin',
        });
        Matter.Composite.add(this.world, body);
        const gfx = new PIXI.Graphics();
        gfx.circle(0, 0, 10).fill(0xFFD700);
        gfx.x = px * CONFIG.pxPerMeter;
        gfx.y = py * CONFIG.pxPerMeter;
        this.gameContainer.addChild(gfx);
        this.coinData.push({ body, gfx, value: 100 });
      }
    }

    for (let i = 6; i < points.length - 1; i += 8) {
      const p = points[i];
      const px = p.x + (Math.random() - 0.5) * 1.5;
      const py = p.y - 1.5;

      const body = Matter.Bodies.rectangle(px, py, 0.5, 0.6, {
        isStatic: true, isSensor: true, label: 'fuel',
      });
      Matter.Composite.add(this.world, body);
      const gfx = new PIXI.Graphics();
      gfx.rect(-8, -10, 16, 20).fill(0x00CC00);
      gfx.rect(-6, -12, 12, 4).fill(0x008800);
      gfx.x = px * CONFIG.pxPerMeter;
      gfx.y = py * CONFIG.pxPerMeter;
      this.gameContainer.addChild(gfx);
      this.fuelData.push({ body, gfx });
    }
  }

  createGoal(points) {
    const stage = this.stages[this.stageIndex] || this.stages[0];
    const targetDist = stage.target;
    const last = points[points.length - 1];
    const gx = Math.min(last.x, targetDist);
    const gy = last.y - 4;

    const body = Matter.Bodies.rectangle(gx, gy, 0.3, 8, {
      isStatic: true, isSensor: true, label: 'goal',
    });
    Matter.Composite.add(this.world, body);

    const gfx = new PIXI.Graphics();
    gfx.rect(-3, -120, 6, 120).fill(0x8B4513);
    gfx.rect(-3, -120, 50, 30).fill({ color: 0xFFD700, alpha: 0.9 });
    gfx.x = gx * CONFIG.pxPerMeter;
    gfx.y = gy * CONFIG.pxPerMeter + 120;
    this.gameContainer.addChild(gfx);

    this.goalData = { body, gfx, targetX: gx };

    const line = new PIXI.Graphics();
    line.lineStyle(2, 0xFFD700, 0.5);
    const pts = [];
    for (let y = -110; y <= 0; y += 10) {
      pts.push(Math.sin(y * 0.2) * 5, y);
    }
    for (let i = 0; i < pts.length - 2; i += 2) {
      line.moveTo(pts[i], pts[i+1]);
      line.lineTo(pts[i+2], pts[i+3]);
    }
    line.x = gfx.x + 25;
    line.y = gy * CONFIG.pxPerMeter + 120;
    this.gameContainer.addChild(line);
  }

  getTerrainYAtX(points, x) {
    for (let i = 0; i < points.length - 1; i++) {
      if (x >= points[i].x && x <= points[i + 1].x) {
        const t = (x - points[i].x) / (points[i + 1].x - points[i].x);
        return points[i].y + t * (points[i + 1].y - points[i].y);
      }
    }
    return points[points.length - 1].y;
  }

  createVehicle(points) {
    const startX = 4;
    const terrainY = this.getTerrainYAtX(points, startX);
    const startY = terrainY - 1.0;

    const vStats = VEHICLE_STATS[this.vehicleIndex] || VEHICLE_STATS[0];
    const carColors = [0xFF4444, 0x4488FF, 0x44BB44, 0xFF8800];
    const bodyColor = carColors[this.vehicleIndex % carColors.length];

    const carBody = Matter.Bodies.rectangle(startX, startY, 2, 0.5, {
      density: vStats.density,
      friction: 0.5,
      restitution: 0.05,
      label: 'vehicle',
    });
    Matter.Composite.add(this.world, carBody);

    const wr = 0.35;
    const wheel1 = Matter.Bodies.circle(startX - 0.7, startY + 0.5, wr, {
      density: vStats.wheelDensity,
      friction: vStats.grip,
      restitution: 0.2,
      label: 'wheel',
    });
    const wheel2 = Matter.Bodies.circle(startX + 0.7, startY + 0.5, wr, {
      density: vStats.wheelDensity,
      friction: vStats.grip,
      restitution: 0.2,
      label: 'wheel',
    });
    Matter.Composite.add(this.world, wheel1);
    Matter.Composite.add(this.world, wheel2);

    const susp1 = Matter.Constraint.create({
      bodyA: carBody, pointA: { x: -0.7, y: 0.4 },
      bodyB: wheel1, pointB: { x: 0, y: 0 },
      stiffness: 0.15, damping: 0.08, length: 0.3,
    });
    const susp2 = Matter.Constraint.create({
      bodyA: carBody, pointA: { x: 0.7, y: 0.4 },
      bodyB: wheel2, pointB: { x: 0, y: 0 },
      stiffness: 0.15, damping: 0.08, length: 0.3,
    });
    Matter.Composite.add(this.world, susp1);
    Matter.Composite.add(this.world, susp2);

    const head = Matter.Bodies.circle(startX, startY - 0.7, 0.18, {
      isSensor: true, label: 'head',
    });
    Matter.Composite.add(this.world, head);
    const headSpring = Matter.Constraint.create({
      bodyA: carBody, pointA: { x: 0, y: -0.5 },
      bodyB: head, stiffness: 0.4, length: 0.15,
    });
    Matter.Composite.add(this.world, headSpring);

    this.vehicle = { body: carBody, wheel1, wheel2, head, susp1, susp2, headSpring, stats: vStats };
    this.startX = carBody.position.x;

    this.carGfx = new PIXI.Graphics();
    this.carGfx.zIndex = 10;
    this.gameContainer.addChild(this.carGfx);

    this.wheelGfx = [];
    [wheel1, wheel2].forEach((w, i) => {
      const g = new PIXI.Graphics();
      g.zIndex = 11;
      this.gameContainer.addChild(g);
      this.wheelGfx.push(g);
    });

    this.headGfx = new PIXI.Graphics();
    this.headGfx.zIndex = 12;
    this.gameContainer.addChild(this.headGfx);

    const driverBody = new PIXI.Graphics();
    driverBody.roundRect(-6, -14, 12, 14, 3).fill(0x3366CC);
    driverBody.zIndex = 10;
    driverBody._attached = true;
    this.gameContainer.addChild(driverBody);
    this.driverGfx = driverBody;

    this.renderCar(carBody, wheel1, wheel2, head, bodyColor);
  }

  renderCar(body, w1, w2, head, color) {
    const s = CONFIG.pxPerMeter;
    const b = body;

    this.carGfx.clear();
    this.carGfx.roundRect(-30, -10, 60, 20, 4).fill(color);
    this.carGfx.roundRect(-34, -6, 68, 12, 3).fill({ color: color, alpha: 0.4 });
    this.carGfx.x = b.position.x * s;
    this.carGfx.y = b.position.y * s;
    this.carGfx.rotation = b.angle;

    [w1, w2].forEach((w, i) => {
      const g = this.wheelGfx[i];
      g.clear();
      g.circle(0, 0, 10).fill(0x222222);
      g.circle(0, 0, 5).fill(0x555555);
      g.lineStyle(1.5, 0x888888);
      g.moveTo(0, -10); g.lineTo(0, 10);
      g.moveTo(-10, 0); g.lineTo(10, 0);
      g.x = w.position.x * s;
      g.y = w.position.y * s;
      g.rotation = w.angle;
    });

    this.headGfx.clear();
    this.headGfx.circle(0, 0, 7).fill(0xFFDBB4);
    this.headGfx.x = head.position.x * s;
    this.headGfx.y = head.position.y * s;

    const driverY = b.position.y * s - 14;
    this.driverGfx.x = b.position.x * s;
    this.driverGfx.y = driverY;
    this.driverGfx.rotation = b.angle;
  }

  handleCollisions(event) {
    if (this.isDie) return;
    event.pairs.forEach(pair => {
      const labels = [pair.bodyA.label, pair.bodyB.label];

      if (labels.includes('head') && labels.includes('terrain')) {
        this.onHeadHit();
      }

      if ((labels.includes('vehicle') || labels.includes('wheel')) && labels.includes('coin')) {
        const coinBody = pair.bodyA.label === 'coin' ? pair.bodyA : pair.bodyB;
        this.onCollectCoin(coinBody);
      }

      if ((labels.includes('vehicle') || labels.includes('wheel')) && labels.includes('fuel')) {
        const fuelBody = pair.bodyA.label === 'fuel' ? pair.bodyA : pair.bodyB;
        this.onCollectFuel(fuelBody);
      }

      if ((labels.includes('vehicle') || labels.includes('wheel')) && labels.includes('goal')) {
        this.onReachGoal();
      }
    });
  }

  onCollectCoin(body) {
    const data = this.coinData.find(d => d.body === body);
    if (!data || data.collected) return;
    data.collected = true;
    this.totalMoney += data.value;
    this.moneyEarned += data.value;
    Store.set('Money', this.totalMoney);
    if (data.gfx.parent) data.gfx.removeFromParent();
    Matter.Composite.remove(this.world, body);
    SFX.play('coin');
    if (this.uiMoneyText) this.uiMoneyText.text = this.totalMoney.toString();
  }

  onCollectFuel(body) {
    const data = this.fuelData.find(d => d.body === body);
    if (!data || data.collected) return;
    data.collected = true;
    this.fuel = 1;
    if (data.gfx.parent) data.gfx.removeFromParent();
    Matter.Composite.remove(this.world, body);
    SFX.play('refuel');
  }

  onHeadHit() {
    if (this.isDie) return;
    SFX.play('crack');
    this.startGameOver();
  }

  onReachGoal() {
    if (this.reachGoal) return;
    this.reachGoal = true;
    this.startGameOver();
  }

  createGameUI() {
    const w = this.app.screen.width;
    const h = this.app.screen.height;

    const ui = new PIXI.Container();
    this.uiContainer.addChild(ui);
    this._gameUI = ui;

    const fuelBg = new PIXI.Graphics();
    fuelBg.roundRect(0, 0, 180, 18, 9).fill({ color: 0x000000, alpha: 0.5 });
    fuelBg.x = 12; fuelBg.y = 12;
    ui.addChild(fuelBg);

    this.fuelGfx = new PIXI.Graphics();
    this.fuelGfx.roundRect(0, 0, 176, 14, 7).fill(0x00FF00);
    this.fuelGfx.x = 14; this.fuelGfx.y = 14;
    ui.addChild(this.fuelGfx);

    const fuelLabel = new PIXI.Text({
      text: 'FUEL',
      style: new PIXI.TextStyle({ fontFamily: 'Arial', fontSize: 9, fill: '#ffffff', fontWeight: 'bold' })
    });
    fuelLabel.x = 14; fuelLabel.y = 33;
    ui.addChild(fuelLabel);

    this.fuelWarn = new PIXI.Text({
      text: 'LOW FUEL!',
      style: new PIXI.TextStyle({ fontFamily: 'Arial', fontSize: 14, fill: '#ff4444', fontWeight: 'bold' })
    });
    this.fuelWarn.x = 14; this.fuelWarn.y = 46;
    this.fuelWarn.visible = false;
    ui.addChild(this.fuelWarn);

    const coinG = new PIXI.Graphics();
    coinG.circle(0, 0, 9).fill(0xFFD700);
    coinG.x = 14; coinG.y = 72;
    ui.addChild(coinG);

    this.uiMoneyText = new PIXI.Text({
      text: this.totalMoney.toString(),
      style: new PIXI.TextStyle({ fontFamily: 'Arial', fontSize: 16, fill: '#FFD700', fontWeight: 'bold' })
    });
    this.uiMoneyText.x = 30; this.uiMoneyText.y = 63;
    ui.addChild(this.uiMoneyText);

    const stage = this.stages[this.stageIndex] || this.stages[0];
    this.uiDistText = new PIXI.Text({
      text: '0m / ' + stage.target + 'm',
      style: new PIXI.TextStyle({ fontFamily: 'Arial', fontSize: 16, fill: '#ffffff', fontWeight: 'bold', stroke: '#000', strokeThickness: 3 })
    });
    this.uiDistText.anchor.set(0.5, 0);
    this.uiDistText.x = w / 2;
    this.uiDistText.y = 10;
    ui.addChild(this.uiDistText);

    const btnSize = Math.min(55, w * 0.07);
    const btnY = h - btnSize - 20;
    const gasX = w - btnSize - 15;
    const brakeX = w - btnSize * 3 - 30;

    const gasBtn = new PIXI.Graphics();
    gasBtn.circle(0, 0, btnSize).fill({ color: 0x00AA00, alpha: 0.65 });
    gasBtn.x = gasX; gasBtn.y = btnY;
    gasBtn.eventMode = 'static';
    gasBtn.cursor = 'pointer';
    gasBtn.on('pointerdown', (e) => { e.stopPropagation(); this.gasPressed = true; });
    gasBtn.on('pointerup', () => { this.gasPressed = false; });
    gasBtn.on('pointerupoutside', () => { this.gasPressed = false; });
    ui.addChild(gasBtn);

    const gasT = new PIXI.Text({
      text: 'GAS',
      style: new PIXI.TextStyle({ fontFamily: 'Arial', fontSize: 13, fill: '#ffffff', fontWeight: 'bold' })
    });
    gasT.anchor.set(0.5, 0.5);
    gasT.x = gasX; gasT.y = btnY;
    ui.addChild(gasT);

    const brakeBtn = new PIXI.Graphics();
    brakeBtn.circle(0, 0, btnSize).fill({ color: 0xCC0000, alpha: 0.65 });
    brakeBtn.x = brakeX; brakeBtn.y = btnY;
    brakeBtn.eventMode = 'static';
    brakeBtn.cursor = 'pointer';
    brakeBtn.on('pointerdown', (e) => { e.stopPropagation(); this.brakePressed = true; });
    brakeBtn.on('pointerup', () => { this.brakePressed = false; });
    brakeBtn.on('pointerupoutside', () => { this.brakePressed = false; });
    ui.addChild(brakeBtn);

    const brakeT = new PIXI.Text({
      text: 'BRAKE',
      style: new PIXI.TextStyle({ fontFamily: 'Arial', fontSize: 11, fill: '#ffffff', fontWeight: 'bold' })
    });
    brakeT.anchor.set(0.5, 0.5);
    brakeT.x = brakeX; brakeT.y = btnY;
    ui.addChild(brakeT);

    const pauseBg = new PIXI.Graphics();
    pauseBg.roundRect(0, 0, 36, 36, 6).fill({ color: 0x000000, alpha: 0.5 });
    pauseBg.x = w - 46; pauseBg.y = 10;
    pauseBg.eventMode = 'static';
    pauseBg.cursor = 'pointer';
    pauseBg.on('pointerdown', () => this.togglePause());
    ui.addChild(pauseBg);

    const pauseT = new PIXI.Text({
      text: '| |',
      style: new PIXI.TextStyle({ fontFamily: 'Arial', fontSize: 16, fill: '#ffffff', fontWeight: 'bold' })
    });
    pauseT.anchor.set(0.5, 0.5);
    pauseT.x = w - 28; pauseT.y = 28;
    ui.addChild(pauseT);

    this.createOverlayUI();
  }

  createOverlayUI() {
    const w = this.app.screen.width;
    const h = this.app.screen.height;

    this._pauseUI = new PIXI.Container();
    this._pauseUI.visible = false;
    this.uiContainer.addChild(this._pauseUI);

    const pOv = new PIXI.Graphics();
    pOv.rect(0, 0, w, h).fill({ color: 0x000000, alpha: 0.6 });
    pOv.eventMode = 'static';
    this._pauseUI.addChild(pOv);

    const pW = Math.min(300, w * 0.7);
    const pH = 320;
    const pBg = new PIXI.Graphics();
    pBg.roundRect(0, 0, pW, pH, 16).fill(0x1a1a2e);
    pBg.x = w / 2 - pW / 2; pBg.y = h / 2 - pH / 2;
    this._pauseUI.addChild(pBg);

    const pTitle = new PIXI.Text({
      text: 'PAUSED',
      style: new PIXI.TextStyle({ fontFamily: 'Arial', fontSize: 32, fill: '#ffffff', fontWeight: 'bold' })
    });
    pTitle.anchor.set(0.5, 0);
    pTitle.x = w / 2; pTitle.y = h / 2 - pH / 2 + 25;
    this._pauseUI.addChild(pTitle);

    const btnW = 160;
    const resumeBtn = this.makeBtn(w / 2 - btnW / 2, h / 2 - 60, btnW, 45, 'RESUME', 0x4CAF50, () => this.togglePause());
    const restartBtn = this.makeBtn(w / 2 - btnW / 2, h / 2, btnW, 45, 'RESTART', 0xff9800, () => this.restartGame());
    const menuBtn = this.makeBtn(w / 2 - btnW / 2, h / 2 + 60, btnW, 45, 'MAIN MENU', 0xf44336, () => this.goToMenu());
    this._pauseUI.addChild(resumeBtn, restartBtn, menuBtn);

    this._gameOverUI = new PIXI.Container();
    this._gameOverUI.visible = false;
    this.uiContainer.addChild(this._gameOverUI);

    const gOv = new PIXI.Graphics();
    gOv.rect(0, 0, w, h).fill({ color: 0x000000, alpha: 0.8 });
    gOv.eventMode = 'static';
    gOv.on('pointerdown', () => {
      if (this.isDie && this._gameOverUI.visible) this.handleGameOverClick();
    });
    this._gameOverUI.addChild(gOv);

    const gW = Math.min(360, w * 0.85);
    const gH = 420;
    const gBg = new PIXI.Graphics();
    gBg.roundRect(0, 0, gW, gH, 16).fill(0x1a1a2e);
    gBg.x = w / 2 - gW / 2; gBg.y = h / 2 - gH / 2;
    this._gameOverUI.addChild(gBg);

    this._goTitle = new PIXI.Text({
      text: 'GAME OVER',
      style: new PIXI.TextStyle({ fontFamily: 'Arial', fontSize: 38, fill: '#FF4C4C', fontWeight: 'bold' })
    });
    this._goTitle.anchor.set(0.5, 0);
    this._goTitle.x = w / 2; this._goTitle.y = h / 2 - gH / 2 + 20;
    this._gameOverUI.addChild(this._goTitle);

    this._goCoins = new PIXI.Text({
      text: '+0 COINS',
      style: new PIXI.TextStyle({ fontFamily: 'Arial', fontSize: 22, fill: '#FFD700', fontWeight: 'bold' })
    });
    this._goCoins.anchor.set(0.5, 0);
    this._goCoins.x = w / 2; this._goCoins.y = h / 2 - gH / 2 + 75;
    this._gameOverUI.addChild(this._goCoins);

    this._goDist = new PIXI.Text({
      text: 'Distance: 0m',
      style: new PIXI.TextStyle({ fontFamily: 'Arial', fontSize: 18, fill: '#ffffff' })
    });
    this._goDist.anchor.set(0.5, 0);
    this._goDist.x = w / 2; this._goDist.y = h / 2 - gH / 2 + 110;
    this._gameOverUI.addChild(this._goDist);

    this._goBonus = new PIXI.Text({
      text: '',
      style: new PIXI.TextStyle({ fontFamily: 'Arial', fontSize: 16, fill: '#4CAF50' })
    });
    this._goBonus.anchor.set(0.5, 0);
    this._goBonus.x = w / 2; this._goBonus.y = h / 2 - gH / 2 + 140;
    this._gameOverUI.addChild(this._goBonus);

    this._nextStageBtn = this.makeBtn(w / 2 - btnW / 2, h / 2 - 30, btnW, 45, 'NEXT STAGE', 0x2196F3, () => this.goToNextStage());
    this._nextStageBtn.visible = false;
    this._gameOverUI.addChild(this._nextStageBtn);

    const restartBtn2 = this.makeBtn(w / 2 - btnW / 2, h / 2 + 30, btnW, 45, 'RESTART', 0x4CAF50, () => this.restartGame());
    const menuBtn2 = this.makeBtn(w / 2 - btnW / 2, h / 2 + 90, btnW, 45, 'MAIN MENU', 0xf44336, () => this.goToMenu());
    this._gameOverUI.addChild(restartBtn2, menuBtn2);
  }

  togglePause() {
    if (!this._pauseUI) return;
    this._pauseUI.visible = !this._pauseUI.visible;
    this.engine.timing.timeScale = this._pauseUI.visible ? 0 : 1;
  }

  update() {
    if (this.scene === 'menu') {
      if (this.menuScrollContent && !this._menuDragging) {
        const diff = this._menuScrollPos - this.menuScrollContent.x;
        if (Math.abs(diff) > 0.5) {
          this.menuScrollContent.x += diff * 0.1;
        } else {
          this.menuScrollContent.x = this._menuScrollPos;
        }
      }
      return;
    }

    if (this.scene !== 'game' || !this.vehicle) return;

    let movement = 0;
    if (this.gasPressed || this.keys['ArrowRight'] || this.keys['d']) {
      movement = 1;
      SFX.play('engine', 0.08);
    } else if (this.brakePressed || this.keys['ArrowLeft'] || this.keys['a']) {
      movement = -1;
      SFX.play('engine', 0.08);
    }

    if (this.fuel > 0 && !this.moveStop) {
      const wheelSpeed = movement * (this.vehicle.stats ? this.vehicle.stats.speed : CONFIG.speed) * 0.04;
      Matter.Body.setAngularVelocity(this.vehicle.wheel1, wheelSpeed);
      Matter.Body.setAngularVelocity(this.vehicle.wheel2, wheelSpeed);
    } else {
      Matter.Body.setAngularVelocity(this.vehicle.wheel1, 0);
      Matter.Body.setAngularVelocity(this.vehicle.wheel2, 0);
    }

    if (movement !== 0 && this.fuel > 0 && !this.isDie) {
      const fuelUse = this.vehicle.stats ? this.vehicle.stats.fuelUse : CONFIG.fuelConsumption;
      this.fuel -= fuelUse * Math.abs(movement) * 0.016;
      if (this.fuel < 0) this.fuel = 0;
    }

    this.updateFuelUI();
    this.updateDistance();
    this.renderVehicle();
    this.updateCamera();

    if (this.fuel <= 0 && !this.isDie) this.startGameOver();

    if (this.moveStop && this.isDie) {
      Matter.Body.setVelocity(this.vehicle.body, { x: 0, y: 0 });
      Matter.Body.setVelocity(this.vehicle.wheel1, { x: 0, y: 0 });
      Matter.Body.setVelocity(this.vehicle.wheel2, { x: 0, y: 0 });
    }
  }

  updateFuelUI() {
    if (!this.fuelGfx) return;
    const pct = Math.max(0, Math.min(1, this.fuel));
    this.fuelGfx.clear();
    let color = 0x00FF00;
    if (pct <= 0.3) color = 0xFF0000;
    else if (pct <= 0.6) color = 0xFFAA00;
    this.fuelGfx.roundRect(0, 0, 176 * pct, 14, 7).fill(color);

    if (pct <= 0.3 && pct > 0) {
      this.fuelWarn.visible = true;
      this.fuelWarn.alpha = 0.5 + 0.5 * Math.sin(Date.now() / 200);
    } else {
      this.fuelWarn.visible = false;
    }
  }

  updateDistance() {
    if (!this.vehicle) return;
    const dx = this.vehicle.body.position.x - this.startX;
    this.distance = Math.max(0, dx);
    if (this.uiDistText) {
      const stage = this.stages[this.stageIndex] || this.stages[0];
      this.uiDistText.text = Math.floor(this.distance) + 'm / ' + stage.target + 'm';
    }
  }

  renderVehicle() {
    if (!this.vehicle || !this.carGfx) return;
    const { body, wheel1, wheel2, head } = this.vehicle;
    const s = CONFIG.pxPerMeter;
    const color = [0xFF4444, 0x4488FF, 0x44BB44, 0xFF8800][this.vehicleIndex % 4];

    this.carGfx.clear();
    this.carGfx.roundRect(-30, -10, 60, 20, 4).fill(color);
    this.carGfx.roundRect(-34, -6, 68, 12, 3).fill({ color, alpha: 0.4 });
    this.carGfx.x = body.position.x * s;
    this.carGfx.y = body.position.y * s;
    this.carGfx.rotation = body.angle;

    const wheels = [wheel1, wheel2];
    wheels.forEach((w, i) => {
      const g = this.wheelGfx[i];
      if (!g) return;
      g.clear();
      g.circle(0, 0, 10).fill(0x222222);
      g.circle(0, 0, 5).fill(0x555555);
      g.lineStyle(1.5, 0x888888);
      g.moveTo(0, -10); g.lineTo(0, 10);
      g.moveTo(-10, 0); g.lineTo(10, 0);
      g.x = w.position.x * s;
      g.y = w.position.y * s;
      g.rotation = w.angle;
    });

    this.headGfx.clear();
    this.headGfx.circle(0, 0, 7).fill(0xFFDBB4);
    this.headGfx.x = head.position.x * s;
    this.headGfx.y = head.position.y * s;

    if (this.driverGfx) {
      this.driverGfx.x = body.position.x * s;
      this.driverGfx.y = body.position.y * s - 14;
      this.driverGfx.rotation = body.angle;
    }
  }

  updateCamera() {
    if (!this.vehicle || !this.gameContainer) return;
    const s = CONFIG.pxPerMeter;
    const targetX = this.vehicle.body.position.x * s;
    const targetY = this.vehicle.body.position.y * s;
    const sw = this.app.screen.width;
    const sh = this.app.screen.height;

    const camX = sw / 2 - targetX;
    const camY = sh / 2 - targetY + 30;

    this.gameContainer.x = Math.min(0, camX);
    this.gameContainer.y = Math.min(50, camY);
  }

  startGameOver() {
    if (this.isDie) return;
    this.isDie = true;
    SFX.music(null);

    const delay = this.reachGoal ? 0 : 1500;

    setTimeout(() => {
      this.moveStop = true;

      const stage = this.stages[this.stageIndex] || this.stages[0];

      if (this.reachGoal) {
        const bonus = stage.reward || 5000;
        this.totalMoney += bonus;
        this.moneyEarned += bonus;
        Store.set('Money', this.totalMoney);

        const nextIdx = this.stageIndex + 1;
        if (nextIdx < this.stages.length) {
          Store.set(this.stages[nextIdx].key, 1);
          this.stages[nextIdx].owned = true;
        }

        this._goTitle.text = 'STAGE COMPLETE!';
        this._goTitle.style.fill = '#4CAF50';
        this._goCoins.text = '+' + this.moneyEarned + ' COINS';
        this._goDist.text = 'Distance: ' + Math.floor(this.distance) + 'm';
        this._goBonus.text = 'Stage Bonus: +' + bonus + ' coins!';

        if (nextIdx < this.stages.length) {
          this._nextStageBtn.visible = true;
          this._nextStageBtn.label = 'NEXT STAGE';
        } else {
          this._nextStageBtn.visible = true;
          this._nextStageBtn.label = 'ALL STAGES CLEARED!';
          this._nextStageBtn.visible = false;
        }

        SFX.play('purchase');
      } else {
        this._goTitle.text = 'GAME OVER';
        this._goTitle.style.fill = '#FF4C4C';
        this._goCoins.text = '+' + this.moneyEarned + ' COINS';
        this._goDist.text = 'Distance: ' + Math.floor(this.distance) + 'm';
        this._goBonus.text = '';
        this._nextStageBtn.visible = false;
      }

      this._gameOverUI.visible = true;
      SFX.play('camera-shutter');
    }, delay);
  }

  handleGameOverClick() {
    if (this.reachGoal && this.stageIndex + 1 < this.stages.length) {
      this.goToNextStage();
    } else {
      this.restartGame();
    }
  }

  goToNextStage() {
    this.engine.timing.timeScale = 1;
    Store.set('Money', this.totalMoney);
    this._gameOverUI.visible = false;
    this.gameContainer.removeChildren();
    this.uiContainer.removeChildren();

    this.selectedStageIdx = this.stageIndex + 1;
    Store.set('Stage', this.selectedStageIdx);

    this.startGame();
  }

  restartGame() {
    this.engine.timing.timeScale = 1;
    Store.set('Money', this.totalMoney);
    this._gameOverUI.visible = false;
    if (this._pauseUI) this._pauseUI.visible = false;
    this.gameContainer.removeChildren();
    this.uiContainer.removeChildren();
    this.startGame();
  }

  goToMenu() {
    this.engine.timing.timeScale = 1;
    Store.set('Money', this.totalMoney);
    SFX.music(null);
    this.scene = 'menu';
    this._gameOverUI.visible = false;
    if (this._pauseUI) this._pauseUI.visible = false;
    this.gameContainer.visible = false;
    this.gameContainer.removeChildren();
    this.uiContainer.removeChildren();
    this.menuContainer.visible = true;
    this.createMenu();
    SFX.music('main menu.mp3');
  }

  onResize() {
    if (this.scene === 'game') this.updateCamera();
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.game = new HillClimbGame();
  window.game.init();
});
