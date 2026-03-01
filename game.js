const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d", { alpha: true });
ctx.imageSmoothingEnabled = false;

const STORAGE_KEY = "pizzaRushSaveV4";

const CAMPAIGNS = {
  usa: {
    label: "EE. UU.: Brooklyn",
    city: "Brooklyn, EE. UU.",
    desc: "Campana equilibrada con crecimiento constante y presion de clientes.",
    startCash: 42,
    spawnBase: 7.2,
    patienceBoost: 0,
    payoutMultiplier: 1,
    speedBonus: 0,
    tileA: "#d7bc8e",
    tileB: "#d0b382",
    grass: "#2c7b3f"
  },
  canada: {
    label: "Canada: Toronto",
    city: "Toronto, Canada",
    desc: "Ritmo mas tranquilo, clientes pacientes y mejor dinero inicial.",
    startCash: 55,
    spawnBase: 7.8,
    patienceBoost: 8,
    payoutMultiplier: 0.95,
    speedBonus: 0,
    tileA: "#d3c8a4",
    tileB: "#c8bb93",
    grass: "#357751"
  },
  mexico: {
    label: "Mexico: Monterrey",
    city: "Monterrey, Mexico",
    desc: "Clientes mas rapidos, mejores pagos y caos temprano.",
    startCash: 36,
    spawnBase: 6.4,
    patienceBoost: -4,
    payoutMultiplier: 1.12,
    speedBonus: 12,
    tileA: "#d9b57c",
    tileB: "#d2aa6e",
    grass: "#2a8056"
  }
};

const WORLD = {
  width: 2360,
  height: 860,
  viewW: 360,
  viewH: 560,
  cameraX: 0,
  cameraY: 0
};

const ZONES = [
  { id: 1, name: "Mamma Mia", xMin: 0, xMax: 780, minBusinesses: 1, tint: "#cf7f46" },
  { id: 2, name: "Fila de Horno de Ladrillo", xMin: 780, xMax: 1560, minBusinesses: 2, tint: "#8f60bb" },
  { id: 3, name: "Rebanada Imperial", xMin: 1560, xMax: 2360, minBusinesses: 3, tint: "#2a8f7f" }
];

const ui = {
  city: document.getElementById("cityLabel"),
  money: document.getElementById("moneyLabel"),
  day: document.getElementById("dayLabel"),
  rep: document.getElementById("repLabel"),
  queue: document.getElementById("queueLabel"),
  shops: document.getElementById("shopsLabel"),
  objective: document.getElementById("objectiveLabel"),
  hudDetails: document.getElementById("hudDetails"),
  hudDetailsBtn: document.getElementById("hudDetailsBtn"),
  toast: document.getElementById("toast"),
  soundBtn: document.getElementById("soundBtn"),
  hapticBtn: document.getElementById("hapticBtn"),
  sprintBtn: document.getElementById("sprintBtn"),
  startBtn: document.getElementById("startBtn"),
  continueBtn: document.getElementById("continueBtn"),
  cityDesc: document.getElementById("cityDesc"),
  cityOptions: [...document.querySelectorAll(".city-option")],
  startOverlay: document.getElementById("startOverlay"),
  bootSplash: document.getElementById("bootSplash"),
  bootProgressFill: document.getElementById("bootProgressFill"),
  bootPercent: document.getElementById("bootPercent"),
  bootStartBtn: document.getElementById("bootStartBtn")
};

const state = {
  running: false,
  cityKey: "usa",
  city: CAMPAIGNS.usa.city,
  money: 0,
  moneyDisplay: 0,
  moneyTween: null,
  day: 1,
  stars: 5,
  businesses: 1,
  orders: [],
  customers: [],
  droppedItems: [],
  orderId: 1,
  customerId: 1,
  droppedItemId: 1,
  dayTimer: 0,
  spawnTimer: 0,
  adBoost: 0,
  adDeskCooldown: 0,
  rushLevel: 1,
  combo: 0,
  comboTimer: 0,
  messageTimer: 0,
  spillTimer: 12,
  spillActive: false,
  passiveTimer: 0,
  maxOrders: 2,
  orderSpawnBase: 7.5,
  patienceBoost: 0,
  payoutMultiplier: 1,
  stations: [],
  ovens: [],
  upgrades: [],
  nextUpgrade: 0,
  passiveIncome: 0,
  secondOvenUnlocked: false,
  autoPrepUnlocked: false,
  autoRunnerUnlocked: false,
  autoCleanerUnlocked: false,
  storeProgress: {},
  gameMode: "pizza",
  cityModeUnlocked: false,
  cityUnits: [],
  cityIncomeTimer: 0,
  cityBuildCount: 0,
  pendingStoreUnlock: null,
  unlockConfirmZone: null,
  unlockConfirmTimer: 0,
  spendConfirmToken: null,
  spendConfirmTimer: 0,
  prepWorkers: [],
  runnerWorkers: [],
  cleanerWorkers: [],
  keys: new Set(),
  dashAuto: false,
  moving: false,
  animTime: 0,
  autosaveTimer: 0,
  saveDirty: false,
  muted: false,
  hapticsEnabled: true,
  hudDetailsOpen: false,
  lowPerfMode: false,
  cityRenderTimer: 0,
  moveTarget: null,
  pendingInteract: null,
  sprintBurstTimer: 0,
  sprintHeld: false,
  lastTapMs: 0,
  lastTapX: 0,
  lastTapY: 0,
  tapPulse: 0,
  tapX: 0,
  tapY: 0
};

const player = {
  x: 150,
  y: 560,
  facing: "down",
  baseSpeed: 118,
  stamina: 1,
  carry: null
};

const interactRadius = 82;
const OVEN_WIDTH = 72;
const OVEN_HEIGHT = 54;
const OVEN_HIT_RADIUS = 42;
const DOUBLE_TAP_MS = 290;
const DOUBLE_TAP_DISTANCE = 56;
const TAP_DRAG_THRESHOLD = 14;
const LOW_END_CPU_CORES = 4;
const LOW_END_MEMORY_GB = 4;
const LOW_END_DPR_CAP = 1.35;
const CITY_LOW_FPS = 30;
const BOOT_FAKE_MIN_MS = 2200;
const BOOT_FAKE_MAX_MS = 3000;
const STORE_UPGRADE_STEPS = [
  { key: "turbo", name: "Turbo Horno", baseCost: 62 },
  { key: "prep", name: "Ayudante", baseCost: 88 },
  { key: "runner", name: "Repartidor", baseCost: 132 },
  { key: "cleaner", name: "Limpieza", baseCost: 168 },
  { key: "secondOven", name: "2do Horno", baseCost: 210 },
  { key: "ads", name: "Volantes", baseCost: 185 },
  { key: "tables", name: "Mas Mesas", baseCost: 255 },
  { key: "manager", name: "Gerente", baseCost: 340 }
];
const STORE_EXPANSION_THRESHOLDS = {
  2: 3,
  3: 8
};
const UPGRADE_MOMENTUM_BONUS_RATE = 0.12;
const CITY_GRID_COLS = 6;
const CITY_GRID_ROWS = 5;
const CITY_GRID_GAP = 6;
const SPRITE_SOURCES = {
  dough: "assets/pizza-dough.svg",
  sauce: "assets/pizza-sauce.svg",
  cheese: "assets/pizza-cheese.svg",
  baked: "assets/pizza-baked.svg",
  table: "assets/table.svg",
  tree: "assets/tree.svg",
  bush: "assets/bush.svg",
  iconDough: "assets/icon-dough.svg",
  iconSauce: "assets/icon-sauce.svg",
  iconCheese: "assets/icon-cheese.svg",
  iconCounter: "assets/icon-counter.svg",
  iconAds: "assets/icon-ads.svg",
  iconUpgrade: "assets/icon-upgrade.svg",
  oven: "assets/oven.svg",
  player: "assets/character-player.svg",
  workerCook: "assets/character-cook.svg",
  workerRunner: "assets/character-runner.svg",
  workerCleaner: "assets/character-cleaner.svg",
  customer: "assets/character-customer.svg",
  customerAngry: "assets/character-customer-angry.svg",
  stationWork: "assets/station-work.svg",
  stationCounter: "assets/station-counter.svg",
  stationUpgrade: "assets/station-upgrade.svg",
  stationAds: "assets/station-ads.svg",
  storefront: "assets/storefront.svg",
  cityLot: "assets/city-empty-lot.svg",
  cityRestaurant: "assets/city-restaurant.svg",
  cityRestaurantTower: "assets/city-restaurant-tower.svg"
};
const sprites = {};
let selectedCampaign = "usa";
let last = 0;
const hudTextCache = {
  city: "",
  money: "",
  day: "",
  rep: "",
  queue: "",
  shops: "",
  objective: "",
  detailsBtn: "",
  detailsOpen: null
};

function detectLowPerformanceMode() {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return false;
  }

  const cores = typeof navigator.hardwareConcurrency === "number" ? navigator.hardwareConcurrency : 6;
  const memory = typeof navigator.deviceMemory === "number" ? navigator.deviceMemory : 8;
  const coarsePointer = typeof window.matchMedia === "function" && window.matchMedia("(pointer: coarse)").matches;

  return coarsePointer && (cores <= LOW_END_CPU_CORES || memory <= LOW_END_MEMORY_GB);
}

function setBootProgress(percent) {
  const value = clampInt(percent, 0, 100, 0);
  if (ui.bootProgressFill) {
    ui.bootProgressFill.style.width = `${value}%`;
  }
  if (ui.bootPercent) {
    ui.bootPercent.textContent = `${value}%`;
  }
}

function setupBootSplash() {
  if (!ui.bootSplash || !ui.bootStartBtn) {
    return Promise.resolve();
  }

  ui.bootSplash.hidden = false;
  ui.bootSplash.classList.remove("hide");
  ui.bootStartBtn.hidden = true;
  ui.bootStartBtn.disabled = true;
  setBootProgress(0);

  return new Promise((resolve) => {
    const targetMs = BOOT_FAKE_MIN_MS + Math.random() * (BOOT_FAKE_MAX_MS - BOOT_FAKE_MIN_MS);
    const loadStart = performance.now();

    const revealStart = () => {
      ui.bootStartBtn.hidden = false;
      ui.bootStartBtn.disabled = false;
      const launch = (event) => {
        event.preventDefault();
        ui.bootSplash.classList.add("hide");
        window.setTimeout(() => {
          ui.bootSplash.hidden = true;
          resolve();
        }, 290);
      };
      ui.bootStartBtn.addEventListener("click", launch, { once: true });
    };

    const tickLoad = () => {
      const elapsed = performance.now() - loadStart;
      const t = clamp(elapsed / targetMs, 0, 1);
      const eased = 1 - Math.pow(1 - t, 2.4);
      setBootProgress(Math.round(4 + eased * 96));
      if (t < 1) {
        requestAnimationFrame(tickLoad);
        return;
      }
      setBootProgress(100);
      revealStart();
    };

    requestAnimationFrame(tickLoad);
  });
}

function loadSprites() {
  for (const [key, src] of Object.entries(SPRITE_SOURCES)) {
    const image = new Image();
    image.decoding = "async";
    image.src = src;
    sprites[key] = image;
  }
}

function spriteAvailable(key) {
  const image = sprites[key];
  return Boolean(image && image.complete && image.naturalWidth > 0);
}

function drawSprite(key, x, y, width, height) {
  if (!spriteAvailable(key)) {
    return false;
  }
  ctx.drawImage(sprites[key], x, y, width, height);
  return true;
}

function pizzaSpriteKey(stage) {
  if (stage === "dough") {
    return "dough";
  }
  if (stage === "sauce") {
    return "sauce";
  }
  if (stage === "cheese") {
    return "cheese";
  }
  return "baked";
}

function drawPizzaSprite(stage, centerX, centerY, size) {
  const key = pizzaSpriteKey(stage);
  return drawSprite(key, centerX - size / 2, centerY - size / 2, size, size);
}

function createPrepWorker(zoneId = 1) {
  const zone = zoneById(zoneId);
  return {
    zoneId: zone.id,
    x: zone.xMin + 120,
    y: 330,
    state: "toDough",
    carry: null,
    targetOvenId: null
  };
}

function createRunnerWorker(zoneId = 1) {
  const zone = zoneById(zoneId);
  return {
    zoneId: zone.id,
    x: zone.xMin + 660,
    y: 330,
    carry: null,
    targetOvenId: null
  };
}

function createCleanerWorker(zoneId = 1) {
  const zone = zoneById(zoneId);
  return {
    zoneId: zone.id,
    x: zone.xMin + 560,
    y: 468,
    state: "idle"
  };
}

const sound = {
  ctx: null,
  master: null,

  ensure() {
    if (this.ctx || state.muted) {
      return;
    }
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) {
      return;
    }
    this.ctx = new AudioCtx();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.08;
    this.master.connect(this.ctx.destination);
  },

  unlock() {
    this.ensure();
    if (!this.ctx) {
      return;
    }
    if (this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
  },

  tone(freq, duration = 0.08, type = "square", gain = 0.22, slide = 0) {
    if (state.muted) {
      return;
    }
    this.unlock();
    if (!this.ctx || !this.master) {
      return;
    }

    const osc = this.ctx.createOscillator();
    const amp = this.ctx.createGain();
    const now = this.ctx.currentTime;

    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (slide !== 0) {
      osc.frequency.linearRampToValueAtTime(Math.max(90, freq + slide), now + duration);
    }

    amp.gain.setValueAtTime(0.0001, now);
    amp.gain.exponentialRampToValueAtTime(gain, now + 0.01);
    amp.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(amp);
    amp.connect(this.master);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  },

  play(name) {
    if (state.muted) {
      return;
    }

    if (name === "action") {
      this.tone(380, 0.05, "square", 0.16, -20);
      return;
    }
    if (name === "success") {
      this.tone(450, 0.07, "triangle", 0.2, 80);
      setTimeout(() => this.tone(620, 0.08, "triangle", 0.2, 20), 45);
      return;
    }
    if (name === "fail") {
      this.tone(220, 0.1, "sawtooth", 0.15, -55);
      return;
    }
    if (name === "order") {
      this.tone(520, 0.06, "square", 0.18, 35);
      return;
    }
    if (name === "bake") {
      this.tone(320, 0.08, "triangle", 0.17, 100);
      return;
    }
    if (name === "upgrade") {
      this.tone(430, 0.08, "triangle", 0.18, 90);
      setTimeout(() => this.tone(610, 0.08, "triangle", 0.18, 90), 55);
      setTimeout(() => this.tone(780, 0.09, "triangle", 0.18, 90), 110);
      return;
    }
    if (name === "day") {
      this.tone(280, 0.08, "square", 0.16, 80);
      setTimeout(() => this.tone(420, 0.08, "square", 0.16, 80), 50);
      return;
    }
    this.tone(500, 0.05, "triangle", 0.14, 30);
  }
};

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function clampNum(value, min, max, fallback) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return fallback;
  }
  return clamp(value, min, max);
}

function clampInt(value, min, max, fallback) {
  return Math.round(clampNum(value, min, max, fallback));
}

function markDirty() {
  state.saveDirty = true;
}

function buzz(ms = 14) {
  if (!state.hapticsEnabled) {
    return;
  }
  if (navigator.vibrate) {
    navigator.vibrate(ms);
  }
}

function currentCampaign() {
  return CAMPAIGNS[state.cityKey] || CAMPAIGNS.usa;
}

function zoneById(zoneId) {
  return ZONES.find((zone) => zone.id === zoneId) || ZONES[0];
}

function getUnlockedZones() {
  return ZONES.filter((zone) => zone.minBusinesses <= state.businesses);
}

function getMaxReachX() {
  const unlocked = getUnlockedZones();
  const lastZone = unlocked[unlocked.length - 1] || ZONES[0];
  return lastZone.xMax;
}

function createStoreProgressEntry() {
  return {
    nextUpgrade: 0,
    autoPrep: false,
    autoRunner: false,
    autoCleaner: false,
    secondOven: false,
    prestigeLevel: 0,
    completions: 0
  };
}

function createDefaultStoreProgress() {
  const progress = {};
  for (const zone of ZONES) {
    progress[zone.id] = createStoreProgressEntry();
  }
  return progress;
}

function getStoreProgress(zoneId) {
  const normalized = clampInt(zoneId, 1, ZONES.length, 1);
  const key = String(normalized);
  if (!state.storeProgress || typeof state.storeProgress !== "object") {
    state.storeProgress = createDefaultStoreProgress();
  }
  if (!state.storeProgress[key] || typeof state.storeProgress[key] !== "object") {
    state.storeProgress[key] = createStoreProgressEntry();
  }
  return state.storeProgress[key];
}

function getZoneSecondOvenId(zoneId) {
  return `z${zoneId}-second`;
}

function ensureZoneSecondOven(zoneId, bakeTime = 3.9) {
  const zone = zoneById(zoneId);
  const id = getZoneSecondOvenId(zone.id);
  const existing = state.ovens.find((oven) => oven.id === id);
  const x = zone.xMin + 588;
  const y = 226;

  if (existing) {
    existing.zoneId = zone.id;
    existing.x = x;
    existing.y = y;
    existing.minBusinesses = zone.minBusinesses;
    existing.bakeTime = clampNum(existing.bakeTime, 2.2, 12, bakeTime);
    return existing;
  }

  const oven = createOven(id, zone.id, x, y, bakeTime, zone.minBusinesses);
  state.ovens.push(oven);
  return oven;
}

function totalStoreUpgradesPurchased() {
  let total = 0;
  for (const zone of ZONES) {
    total += clampInt(getStoreProgress(zone.id).nextUpgrade, 0, STORE_UPGRADE_STEPS.length, 0);
  }
  return total;
}

function totalStorePrestigeLevels() {
  let total = 0;
  for (const zone of ZONES) {
    total += clampInt(getStoreProgress(zone.id).prestigeLevel, 0, 99, 0);
  }
  return total;
}

function completedStoreCount() {
  let completed = 0;
  for (const zone of ZONES) {
    if (clampInt(getStoreProgress(zone.id).completions, 0, 999, 0) > 0) {
      completed += 1;
    }
  }
  return completed;
}

function zoneRevenueMultiplier(zoneId) {
  const progress = getStoreProgress(zoneId);
  const prestige = clampInt(progress.prestigeLevel, 0, 99, 0);
  const completions = clampInt(progress.completions, 0, 999, 0);
  return 1 + prestige * 0.11 + Math.max(0, completions - 1) * 0.03;
}

function getCityLayout() {
  const top = 62;
  const bottom = 58;
  const side = 10;
  const width = Math.max(220, WORLD.viewW - side * 2);
  const height = Math.max(220, WORLD.viewH - top - bottom);
  const cellW = Math.max(22, Math.floor((width - (CITY_GRID_COLS - 1) * CITY_GRID_GAP) / CITY_GRID_COLS));
  const cellH = Math.max(22, Math.floor((height - (CITY_GRID_ROWS - 1) * CITY_GRID_GAP) / CITY_GRID_ROWS));
  const gridW = cellW * CITY_GRID_COLS + (CITY_GRID_COLS - 1) * CITY_GRID_GAP;
  const gridH = cellH * CITY_GRID_ROWS + (CITY_GRID_ROWS - 1) * CITY_GRID_GAP;
  return {
    x: Math.floor((WORLD.viewW - gridW) / 2),
    y: top,
    cellW,
    cellH,
    gridW,
    gridH
  };
}

function totalCityLots() {
  return CITY_GRID_COLS * CITY_GRID_ROWS;
}

function cityLotRect(lotId) {
  const layout = getCityLayout();
  const max = totalCityLots() - 1;
  const safeLot = clampInt(lotId, 0, max, 0);
  const col = safeLot % CITY_GRID_COLS;
  const row = Math.floor(safeLot / CITY_GRID_COLS);
  return {
    x: layout.x + col * (layout.cellW + CITY_GRID_GAP),
    y: layout.y + row * (layout.cellH + CITY_GRID_GAP),
    w: layout.cellW,
    h: layout.cellH
  };
}

function cityLotFromPoint(screenX, screenY) {
  const layout = getCityLayout();
  if (
    screenX < layout.x ||
    screenY < layout.y ||
    screenX > layout.x + layout.gridW ||
    screenY > layout.y + layout.gridH
  ) {
    return -1;
  }

  const stepX = layout.cellW + CITY_GRID_GAP;
  const stepY = layout.cellH + CITY_GRID_GAP;
  const relX = screenX - layout.x;
  const relY = screenY - layout.y;
  const col = Math.floor(relX / stepX);
  const row = Math.floor(relY / stepY);

  if (col < 0 || row < 0 || col >= CITY_GRID_COLS || row >= CITY_GRID_ROWS) {
    return -1;
  }

  if (relX % stepX > layout.cellW || relY % stepY > layout.cellH) {
    return -1;
  }

  return row * CITY_GRID_COLS + col;
}

function getCityUnitAtLot(lotId) {
  return state.cityUnits.find((unit) => unit.lotId === lotId) || null;
}

function getCityBuildCost() {
  const prestige = totalStorePrestigeLevels();
  return Math.round(72 + state.cityBuildCount * 24 + state.cityUnits.length * 10 + prestige * 18);
}

function getCityUpgradeCost(unit) {
  const level = clampInt(unit.level, 1, 20, 1);
  return Math.round(56 + level * 44 + level * level * 18);
}

function cityIncomeMultiplier() {
  return 1 + state.day * 0.015 + totalStorePrestigeLevels() * 0.08 + completedStoreCount() * 0.1;
}

function cityUnitIncome(unit) {
  const level = clampInt(unit.level, 1, 20, 1);
  return Math.round((5 + level * 4 + level * level * 1.4) * cityIncomeMultiplier());
}

function totalCityIncome() {
  return state.cityUnits.reduce((sum, unit) => sum + cityUnitIncome(unit), 0);
}

function enterCityMode(isFreshUnlock = false) {
  if (!state.cityModeUnlocked) {
    return false;
  }

  state.gameMode = "city";
  state.moveTarget = null;
  state.pendingInteract = null;
  state.moving = false;
  state.tapPulse = 0;
  WORLD.cameraX = 0;
  WORLD.cameraY = 0;

  if (isFreshUnlock) {
    state.orders = [];
    state.customers = [];
    state.droppedItems = [];
    player.carry = null;
    showToast("Nueva etapa: Ciudad desbloqueada. Toca lotes para construir.", 2.8);
  } else {
    showToast("Modo Ciudad activo. Toca un lote para construir.", 2.2);
  }
  markDirty();
  return true;
}

function maybeUnlockCityMode(autoEnter = true) {
  if (state.cityModeUnlocked) {
    return false;
  }

  if (completedStoreCount() < ZONES.length) {
    return false;
  }

  state.cityModeUnlocked = true;
  sound.play("upgrade");
  buzz(18);
  if (autoEnter) {
    enterCityMode(true);
  }
  markDirty();
  return true;
}

function nextStoreUnlockProgress() {
  const total = totalStoreUpgradesPurchased();
  if (state.businesses < 2) {
    return {
      zone: 2,
      remaining: Math.max(0, STORE_EXPANSION_THRESHOLDS[2] - total)
    };
  }
  if (state.businesses < 3) {
    return {
      zone: 3,
      remaining: Math.max(0, STORE_EXPANSION_THRESHOLDS[3] - total)
    };
  }
  return null;
}

function updateCityMode(dt) {
  WORLD.cameraX = 0;
  WORLD.cameraY = 0;
  state.moveTarget = null;
  state.pendingInteract = null;
  state.moving = false;

  state.cityIncomeTimer += dt;
  const cycle = Math.max(1.55, 3.2 - totalStorePrestigeLevels() * 0.08);
  if (state.cityIncomeTimer >= cycle) {
    state.cityIncomeTimer = 0;
    const income = totalCityIncome();
    if (income > 0) {
      state.money += income;
      const anchor = state.cityUnits.length ? cityLotRect(randomChoice(state.cityUnits).lotId) : null;
      if (anchor) {
        spawnMoneyFly(anchor.x + anchor.w / 2, anchor.y + anchor.h / 2, income);
      }
      startMoneyTween(state.money, 0.5, 0.05);
      markDirty();
    }
  }
}

function nextEligibleStoreUnlockZone() {
  const total = totalStoreUpgradesPurchased();
  if (state.businesses < 2 && total >= STORE_EXPANSION_THRESHOLDS[2]) {
    return 2;
  }
  if (state.businesses < 3 && total >= STORE_EXPANSION_THRESHOLDS[3]) {
    return 3;
  }
  return null;
}

function syncPendingStoreUnlockFromProgress() {
  const next = nextEligibleStoreUnlockZone();
  if (state.pendingStoreUnlock !== next) {
    state.pendingStoreUnlock = next;
    if (state.unlockConfirmZone !== next) {
      state.unlockConfirmZone = null;
      state.unlockConfirmTimer = 0;
    }
  }
  return next;
}

function openStorefront(zoneId, announce = true) {
  const target = clampInt(zoneId, 2, 3, state.businesses + 1);
  if (target <= state.businesses) {
    return false;
  }

  state.businesses = target;
  if (target === 2) {
    state.passiveIncome += 3;
    state.maxOrders += 2;
  } else if (target === 3) {
    state.passiveIncome += 4;
    state.maxOrders += 2;
    state.orderSpawnBase = Math.max(3.4, state.orderSpawnBase - 0.35);
  }

  if (announce) {
    showToast(`Sucursal abierta manualmente: Zona ${target} desbloqueada.`, 2.8);
  }

  spawnOrder(1);
  syncWorkersForUnlockedStorefronts();
  syncPendingStoreUnlockFromProgress();
  markDirty();
  return true;
}

function handlePendingStoreUnlockTap() {
  const target = syncPendingStoreUnlockFromProgress();
  if (!target) {
    return false;
  }

  if (state.unlockConfirmZone === target && state.unlockConfirmTimer > 0) {
    state.unlockConfirmZone = null;
    state.unlockConfirmTimer = 0;
    openStorefront(target, true);
    sound.play("upgrade");
    buzz(16);
    return true;
  }

  state.unlockConfirmZone = target;
  state.unlockConfirmTimer = 6;
  showToast(`Sucursal Z${target} lista. Toca CRECE otra vez para confirmar apertura.`, 2.8);
  sound.play("ui");
  return true;
}

function applyStoreCompletionBonus(zoneId) {
  const zone = zoneById(zoneId);
  const progress = getStoreProgress(zone.id);
  progress.completions = clampInt(progress.completions + 1, 0, 999, 999);

  const bonus = Math.round(92 + zone.id * 34 + progress.completions * 24);
  state.money += bonus;
  const station = getStationByTypeForZone("upgrade", zone.id);
  const payoutPoint = station ? stationCenter(station) : { x: player.x, y: player.y };
  spawnMoneyFly(payoutPoint.x, payoutPoint.y, bonus);
  startMoneyTween(state.money, 0.48, 0.1);
  state.maxOrders += 1;
  state.stars = clamp(state.stars + 0.06, 0.8, 5);
  spawnOrderForZone(zone.id, 1, false);
  return bonus;
}

function applyStorePrestige(zoneId) {
  const zone = zoneById(zoneId);
  const progress = getStoreProgress(zone.id);
  progress.prestigeLevel = clampInt(progress.prestigeLevel + 1, 0, 99, 99);
  progress.nextUpgrade = 0;
  progress.autoPrep = false;
  progress.autoRunner = false;
  progress.autoCleaner = false;
  progress.secondOven = false;

  state.ovens = state.ovens.filter((oven) => oven.id !== getZoneSecondOvenId(zone.id));
  for (const oven of getZoneOvens(zone.id)) {
    oven.bakeTime = Math.max(1.9, oven.bakeTime - 0.14);
  }

  state.passiveIncome += 1 + zone.id;
  state.payoutMultiplier += 0.015;
  state.stars = clamp(state.stars + 0.08, 0.8, 5);
}

function getStoreUpgradeOffer(zoneId) {
  const zone = zoneById(zoneId);
  const progress = getStoreProgress(zone.id);
  const idx = clampInt(progress.nextUpgrade, 0, STORE_UPGRADE_STEPS.length, 0);
  if (idx >= STORE_UPGRADE_STEPS.length) {
    const prestigeLevel = clampInt(progress.prestigeLevel, 0, 99, 0);
    const cost = Math.round((220 + zone.id * 90) * (1 + prestigeLevel * 0.58));
    return {
      name: `Prestigio ${prestigeLevel + 1}`,
      cost,
      isPrestige: true,
      apply: () => {
        applyStorePrestige(zone.id);
      }
    };
  }

  const step = STORE_UPGRADE_STEPS[idx];
  const zoneMultiplier = 1 + (zone.id - 1) * 0.16;
  const prestigeMultiplier = 1 + clampInt(progress.prestigeLevel, 0, 99, 0) * 0.3;
  const cost = Math.round(step.baseCost * zoneMultiplier * prestigeMultiplier);

  return {
    name: step.name,
    cost,
    isPrestige: false,
    apply: () => {
      if (step.key === "turbo") {
        for (const oven of getZoneOvens(zone.id)) {
          oven.bakeTime = Math.max(2.2, oven.bakeTime - 0.7);
        }
        return;
      }
      if (step.key === "prep") {
        progress.autoPrep = true;
        return;
      }
      if (step.key === "runner") {
        progress.autoRunner = true;
        return;
      }
      if (step.key === "cleaner") {
        progress.autoCleaner = true;
        return;
      }
      if (step.key === "secondOven") {
        progress.secondOven = true;
        ensureZoneSecondOven(zone.id, 3.9 - (zone.id - 1) * 0.1);
        return;
      }
      if (step.key === "ads") {
        state.maxOrders += 1;
        state.orderSpawnBase = Math.max(3.2, state.orderSpawnBase - 0.22);
        return;
      }
      if (step.key === "tables") {
        state.patienceBoost += 1;
        state.stars = clamp(state.stars + 0.12, 0.8, 5);
        return;
      }
      if (step.key === "manager") {
        state.passiveIncome += 1 + zone.id;
        state.payoutMultiplier += 0.03;
        state.stars = clamp(state.stars + 0.1, 0.8, 5);
      }
    }
  };
}

function syncLegacyWorkerFlagsFromStoreProgress() {
  const unlockedZones = getUnlockedZones();
  state.autoPrepUnlocked = unlockedZones.some((zone) => getStoreProgress(zone.id).autoPrep);
  state.autoRunnerUnlocked = unlockedZones.some((zone) => getStoreProgress(zone.id).autoRunner);
  state.autoCleanerUnlocked = unlockedZones.some((zone) => getStoreProgress(zone.id).autoCleaner);
  state.secondOvenUnlocked = Boolean(getStoreProgress(1).secondOven);
  state.nextUpgrade = clampInt(getStoreProgress(1).nextUpgrade, 0, STORE_UPGRADE_STEPS.length, 0);
}

function syncWorkersForUnlockedStorefronts() {
  const unlockedZones = getUnlockedZones();
  const unlockedIds = new Set(unlockedZones.map((zone) => zone.id));
  let changed = false;

  const syncType = (workers, shouldHaveWorker, createWorker) => {
    const source = Array.isArray(workers) ? workers : [];
    const byZone = new Map();
    for (const worker of source) {
      if (!worker || typeof worker !== "object") {
        changed = true;
        continue;
      }
      const zoneId = clampInt(worker.zoneId, 1, ZONES.length, 1);
      if (!unlockedIds.has(zoneId) || !shouldHaveWorker(zoneId) || byZone.has(zoneId)) {
        changed = true;
        continue;
      }
      byZone.set(zoneId, { ...worker, zoneId });
    }

    const next = [];
    for (const zone of unlockedZones) {
      if (!shouldHaveWorker(zone.id)) {
        continue;
      }
      const existing = byZone.get(zone.id);
      if (existing) {
        next.push(existing);
      } else {
        next.push(createWorker(zone.id));
        changed = true;
      }
    }
    return next;
  };

  state.prepWorkers = syncType(state.prepWorkers, (zoneId) => getStoreProgress(zoneId).autoPrep, createPrepWorker);
  state.runnerWorkers = syncType(state.runnerWorkers, (zoneId) => getStoreProgress(zoneId).autoRunner, createRunnerWorker);
  state.cleanerWorkers = syncType(state.cleanerWorkers, (zoneId) => getStoreProgress(zoneId).autoCleaner, createCleanerWorker);
  syncLegacyWorkerFlagsFromStoreProgress();

  return changed;
}

function createStation(id, type, zoneId, x, y, w, h, color, label, minBusinesses) {
  return { id, type, zoneId, x, y, w, h, color, label, minBusinesses };
}

function createOven(id, zoneId, x, y, bakeTime, minBusinesses = 1) {
  return {
    id,
    zoneId,
    x,
    y,
    busy: false,
    progress: 0,
    bakeTime,
    ready: false,
    minBusinesses
  };
}

function buildStations() {
  const stations = [];

  for (const zone of ZONES) {
    const x0 = zone.xMin;
    const minBusinesses = zone.minBusinesses;

    stations.push(createStation(`z${zone.id}-dough`, "dough", zone.id, x0 + 102, 220, 92, 70, "#f5d6a5", "MASA", minBusinesses));
    stations.push(createStation(`z${zone.id}-sauce`, "sauce", zone.id, x0 + 238, 220, 92, 70, "#cb4734", "SALSA", minBusinesses));
    stations.push(createStation(`z${zone.id}-cheese`, "cheese", zone.id, x0 + 374, 220, 92, 70, "#f0ce5d", "QUESO", minBusinesses));
    stations.push(createStation(`z${zone.id}-counter`, "counter", zone.id, x0 + 626, 206, 146, 84, "#7f5532", "MOSTR", minBusinesses));
    stations.push(createStation(`z${zone.id}-mop`, "mop", zone.id, x0 + 514, 388, 118, 76, "#8b562a", "TRAPO", minBusinesses));
    stations.push(createStation(`z${zone.id}-upgrade`, "upgrade", zone.id, x0 + 338, 388, 154, 76, "#1f7f40", "CRECE", minBusinesses));

    if (zone.id === 1) {
      stations.push(createStation("z1-ads", "ads", 1, x0 + 186, 388, 124, 76, "#225f95", "ANUN", 1));
    }
  }

  return stations;
}

function buildBaseOvens() {
  return [
    createOven("z1-main", 1, 512, 226, 4.8, 1),
    createOven("z2-main", 2, 1292, 226, 4.6, 2),
    createOven("z3-main", 3, 2072, 226, 4.3, 3)
  ];
}

function buildUpgrades() {
  return [
    {
      name: "Hornos Turbo",
      cost: 85,
      apply: () => {
        state.ovens.forEach((oven) => {
          oven.bakeTime = Math.max(2.6, oven.bakeTime - 1.1);
        });
      }
    },
    {
      name: "Ayudante de Cocina",
      cost: 110,
      apply: () => {
        state.autoPrepUnlocked = true;
        showToast("Ayudante contratado en cada sucursal desbloqueada.");
      }
    },
    {
      name: "Repartidor de Mostrador",
      cost: 190,
      apply: () => {
        state.autoRunnerUnlocked = true;
        showToast("Repartidor contratado en cada sucursal desbloqueada.");
      }
    },
    {
      name: "Personal de Limpieza",
      cost: 250,
      apply: () => {
        state.autoCleanerUnlocked = true;
        showToast("Personal de limpieza contratado.");
      }
    },
    {
      name: "Volantes Callejeros",
      cost: 120,
      apply: () => {
        state.orderSpawnBase = Math.max(4.1, state.orderSpawnBase - 0.8);
        state.maxOrders += 1;
      }
    },
    {
      name: "Scooter Pizzero",
      cost: 160,
      apply: () => {
        player.baseSpeed += 36;
      }
    },
    {
      name: "Segundo Horno",
      cost: 220,
      apply: () => {
        if (!state.secondOvenUnlocked) {
          state.secondOvenUnlocked = true;
          state.ovens.push(createOven("z1-second", 1, 588, 226, 3.9, 1));
        }
      }
    },
    {
      name: "Permiso Nueva Sucursal",
      cost: 290,
      apply: () => {
        const before = state.businesses;
        state.businesses = Math.max(state.businesses, 2);
        state.passiveIncome += 4;
        state.maxOrders += 2;
        if (state.businesses > before) {
          showToast("Segunda sucursal desbloqueada.", 2.3);
        }
      }
    },
    {
      name: "Gerente de Franquicia",
      cost: 390,
      apply: () => {
        const before = state.businesses;
        state.businesses = Math.max(state.businesses, 3);
        state.passiveIncome += 7;
        state.maxOrders += 2;
        state.orderSpawnBase = Math.max(3.5, state.orderSpawnBase - 0.5);
        if (state.businesses > before) {
          showToast("Tercera sucursal desbloqueada.", 2.3);
        }
      }
    },
    {
      name: "Letrero Neon Imperial",
      cost: 520,
      apply: () => {
        state.payoutMultiplier += 0.1;
        state.stars = clamp(state.stars + 0.24, 0.8, 5);
      }
    },
    {
      name: "Mas Mesas",
      cost: 640,
      apply: () => {
        state.maxOrders += 1;
        state.patienceBoost += 1;
        state.stars = clamp(state.stars + 0.15, 0.8, 5);
        showToast("Nuevas mesas: mejor servicio y reseñas.");
      }
    },
    {
      name: "Patio Exterior",
      cost: 780,
      apply: () => {
        state.patienceBoost += 3;
        state.payoutMultiplier += 0.05;
        state.stars = clamp(state.stars + 0.2, 0.8, 5);
        showToast("Patio nuevo: clientes mas felices.");
      }
    },
    {
      name: "Noches de Entretenimiento",
      cost: 920,
      apply: () => {
        state.passiveIncome += 3;
        state.payoutMultiplier += 0.06;
        state.stars = clamp(state.stars + 0.22, 0.8, 5);
        showToast("Show nocturno: suben reseñas y propinas.");
      }
    }
  ];
}

function isStationUnlocked(station) {
  return station.minBusinesses <= state.businesses;
}

function isOvenUnlocked(oven) {
  return oven.minBusinesses <= state.businesses;
}

function stationCenter(station) {
  return {
    x: station.x + station.w / 2,
    y: station.y + station.h / 2
  };
}

function ovenCenter(oven) {
  return { x: oven.x, y: oven.y };
}

function setCampaignChoice(cityKey) {
  selectedCampaign = CAMPAIGNS[cityKey] ? cityKey : "usa";
  const campaign = CAMPAIGNS[selectedCampaign];

  ui.cityOptions.forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.city === selectedCampaign);
  });

  ui.cityDesc.textContent = campaign.desc;
  ui.startBtn.textContent = `Nueva Partida (${campaign.label})`;
}

function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  const ratioCap = state.lowPerfMode ? LOW_END_DPR_CAP : 2;
  const ratio = Math.min(window.devicePixelRatio || 1, ratioCap);
  canvas.width = Math.floor(rect.width * ratio);
  canvas.height = Math.floor(rect.height * ratio);
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  WORLD.viewW = rect.width;
  WORLD.viewH = rect.height;
}

function updateSoundLabel() {
  ui.soundBtn.textContent = state.muted ? "Sonido Apagado" : "Sonido Activo";
}

function updateHapticLabel() {
  if (!ui.hapticBtn) {
    return;
  }
  ui.hapticBtn.textContent = state.hapticsEnabled ? "Vibracion Activa" : "Vibracion Apagada";
}

function updateSprintLabel() {
  if (!ui.sprintBtn) {
    return;
  }
  ui.sprintBtn.textContent = state.sprintHeld ? "Sprint Activo" : "Mantener Sprint";
  ui.sprintBtn.setAttribute("aria-pressed", state.sprintHeld ? "true" : "false");
}

function setNodeText(node, key, text) {
  if (!node) {
    return;
  }
  if (hudTextCache[key] === text) {
    return;
  }
  node.textContent = text;
  hudTextCache[key] = text;
}

function setHudDetailsOpen(open) {
  const next = Boolean(open);
  state.hudDetailsOpen = next;

  if (ui.hudDetails && ui.hudDetails.hidden !== !next) {
    ui.hudDetails.hidden = !next;
  }

  if (ui.hudDetailsBtn) {
    const expanded = next ? "true" : "false";
    if (ui.hudDetailsBtn.getAttribute("aria-expanded") !== expanded) {
      ui.hudDetailsBtn.setAttribute("aria-expanded", expanded);
    }
    setNodeText(ui.hudDetailsBtn, "detailsBtn", next ? "Ocultar detalles" : "Ver detalles");
  }

  hudTextCache.detailsOpen = next;
}

function getMostUrgentOrder() {
  if (!state.orders.length) {
    return null;
  }

  let bestOrder = state.orders[0];
  let bestRatio =
    bestOrder.maxPatience > 0 ? clamp(bestOrder.patience / bestOrder.maxPatience, 0, 1) : 1;

  for (const order of state.orders) {
    const ratio = order.maxPatience > 0 ? clamp(order.patience / order.maxPatience, 0, 1) : 1;
    if (ratio < bestRatio) {
      bestRatio = ratio;
      bestOrder = order;
    }
  }

  return {
    order: bestOrder,
    ratio: bestRatio
  };
}

function getObjectiveText() {
  if (!state.running) {
    return "Objetivo: Inicia una partida para comenzar.";
  }

  if (state.gameMode === "city") {
    const buildCost = getCityBuildCost();
    if (state.cityUnits.length === 0) {
      if (state.money < buildCost) {
        return `Objetivo: Reune $${buildCost} para tu primer restaurante.`;
      }
      return `Objetivo: Construye tu primer restaurante ($${buildCost}).`;
    }

    if (state.cityUnits.length < totalCityLots() && state.money >= buildCost) {
      return `Objetivo: Construye otro restaurante ($${buildCost}).`;
    }

    let cheapestUpgrade = Infinity;
    let targetLevel = 2;
    for (const unit of state.cityUnits) {
      const cost = getCityUpgradeCost(unit);
      if (cost < cheapestUpgrade) {
        cheapestUpgrade = cost;
        targetLevel = clampInt(unit.level + 1, 2, 20, 2);
      }
    }

    if (Number.isFinite(cheapestUpgrade) && state.money >= cheapestUpgrade) {
      return `Objetivo: Mejora un restaurante a nivel ${targetLevel} ($${cheapestUpgrade}).`;
    }

    const income = totalCityIncome();
    if (income > 0) {
      return `Objetivo: Espera ingresos (+$${income}) y sigue expandiendo.`;
    }

    return "Objetivo: Junta capital para construir la siguiente unidad.";
  }

  if (state.pendingStoreUnlock) {
    const armed = state.unlockConfirmZone === state.pendingStoreUnlock && state.unlockConfirmTimer > 0;
    if (armed) {
      return `Objetivo: Confirma apertura de sucursal Z${state.pendingStoreUnlock} en CRECE.`;
    }
    return `Objetivo: Abre la sucursal Z${state.pendingStoreUnlock} en CRECE.`;
  }

  if (player.carry) {
    return `Objetivo: ${getNextStepHint().replace(/\.$/, "")}.`;
  }

  const urgent = getMostUrgentOrder();
  if (urgent) {
    if (urgent.ratio <= 0.35) {
      return `Objetivo: Urgente Z${urgent.order.zoneId}. Entrega ahora.`;
    }
    return `Objetivo: Atiende pedido de Zona ${urgent.order.zoneId}.`;
  }

  const unlock = nextStoreUnlockProgress();
  if (unlock && unlock.remaining > 0) {
    const plural = unlock.remaining === 1 ? "" : "s";
    return `Objetivo: Compra ${unlock.remaining} mejora${plural} para abrir Z${unlock.zone}.`;
  }

  const adCost = 25 + state.adBoost * 12;
  if (state.money >= adCost) {
    return `Objetivo: Invierte en ANUN por $${adCost} para atraer clientes.`;
  }

  return "Objetivo: Espera pedidos y optimiza tu flujo.";
}

function updateHud() {
  if (!state.moneyTween) {
    state.moneyDisplay = state.money;
  }

  setNodeText(ui.city, "city", state.city);
  setNodeText(ui.money, "money", `$${Math.floor(state.moneyDisplay)}`);
  setNodeText(ui.day, "day", String(state.day));
  setNodeText(ui.rep, "rep", state.stars.toFixed(1));

  if (state.gameMode === "city") {
    setNodeText(ui.queue, "queue", `${state.cityUnits.length}/${totalCityLots()}`);
  } else {
    setNodeText(ui.queue, "queue", `${state.orders.length}/${state.maxOrders}`);
  }
  setNodeText(ui.shops, "shops", String(state.businesses));
  setNodeText(ui.objective, "objective", getObjectiveText());

  if (hudTextCache.detailsOpen !== state.hudDetailsOpen) {
    setHudDetailsOpen(state.hudDetailsOpen);
  }
}

function resetProgress(cityKey = "usa") {
  const campaign = CAMPAIGNS[cityKey] || CAMPAIGNS.usa;

  state.running = false;
  state.cityKey = cityKey;
  state.city = campaign.city;
  state.money = campaign.startCash;
  state.moneyDisplay = state.money;
  state.moneyTween = null;
  state.day = 1;
  state.stars = 5;
  state.businesses = 1;
  state.orders = [];
  state.customers = [];
  state.droppedItems = [];
  state.orderId = 1;
  state.customerId = 1;
  state.droppedItemId = 1;
  state.dayTimer = 0;
  state.spawnTimer = 0;
  state.adBoost = 0;
  state.adDeskCooldown = 0;
  state.rushLevel = 1;
  state.combo = 0;
  state.comboTimer = 0;
  state.messageTimer = 0;
  state.spillTimer = 12;
  state.spillActive = false;
  state.passiveTimer = 0;
  state.maxOrders = 2;
  state.orderSpawnBase = campaign.spawnBase;
  state.patienceBoost = campaign.patienceBoost;
  state.payoutMultiplier = campaign.payoutMultiplier;
  state.stations = buildStations();
  state.ovens = buildBaseOvens();
  state.upgrades = buildUpgrades();
  state.nextUpgrade = 0;
  state.passiveIncome = 0;
  state.storeProgress = createDefaultStoreProgress();
  state.secondOvenUnlocked = false;
  state.autoPrepUnlocked = false;
  state.autoRunnerUnlocked = false;
  state.autoCleanerUnlocked = false;
  state.gameMode = "pizza";
  state.cityModeUnlocked = false;
  state.cityUnits = [];
  state.cityIncomeTimer = 0;
  state.cityBuildCount = 0;
  state.pendingStoreUnlock = null;
  state.unlockConfirmZone = null;
  state.unlockConfirmTimer = 0;
  state.spendConfirmToken = null;
  state.spendConfirmTimer = 0;
  state.prepWorkers = [];
  state.runnerWorkers = [];
  state.cleanerWorkers = [];
  state.keys.clear();
  state.dashAuto = false;
  state.moving = false;
  state.animTime = 0;
  state.autosaveTimer = 0;
  state.saveDirty = false;
  state.hudDetailsOpen = false;
  state.cityRenderTimer = 0;
  state.moveTarget = null;
  state.pendingInteract = null;
  state.sprintBurstTimer = 0;
  state.sprintHeld = false;
  state.lastTapMs = 0;
  state.lastTapX = 0;
  state.lastTapY = 0;
  state.spendConfirmToken = null;
  state.spendConfirmTimer = 0;
  state.tapPulse = 0;
  state.tapX = 0;
  state.tapY = 0;

  player.x = 150;
  player.y = 560;
  player.facing = "down";
  player.baseSpeed = 118 + campaign.speedBonus;
  player.stamina = 1;
  player.carry = null;

  ui.startOverlay.style.display = "grid";
  setCampaignChoice(cityKey);
  setHudDetailsOpen(false);
  syncLegacyWorkerFlagsFromStoreProgress();
  updateSprintLabel();
  updateHud();
}

function showToast(text, seconds = 1.7) {
  ui.toast.textContent = text;
  ui.toast.classList.add("show");
  state.messageTimer = seconds;
}

function clearSpendConfirm() {
  state.spendConfirmToken = null;
  state.spendConfirmTimer = 0;
}

function requireSpendConfirm(token, message, seconds = 3.1) {
  if (state.spendConfirmToken === token && state.spendConfirmTimer > 0) {
    clearSpendConfirm();
    return true;
  }

  state.spendConfirmToken = token;
  state.spendConfirmTimer = seconds;
  showToast(message, Math.min(seconds, 2.5));
  sound.play("ui");
  return false;
}

function startMoneyTween(target, duration = 0.58, delay = 0) {
  const from = typeof state.moneyDisplay === "number" ? state.moneyDisplay : state.money;
  state.moneyTween = {
    from,
    to: target,
    elapsed: 0,
    duration: Math.max(0.12, duration),
    delay: Math.max(0, delay)
  };
}

function updateMoneyTween(dt) {
  if (!state.moneyTween) {
    return;
  }

  state.moneyTween.elapsed += dt;
  if (state.moneyTween.elapsed < state.moneyTween.delay) {
    return;
  }

  const time = state.moneyTween.elapsed - state.moneyTween.delay;
  const t = clamp(time / state.moneyTween.duration, 0, 1);
  const eased = 1 - (1 - t) ** 3;
  state.moneyDisplay = state.moneyTween.from + (state.moneyTween.to - state.moneyTween.from) * eased;

  if (t >= 1) {
    state.moneyDisplay = state.moneyTween.to;
    state.moneyTween = null;
  }
}

function spawnMoneyFly(worldX, worldY, amount) {
  const canvasRect = canvas.getBoundingClientRect();
  const bankRect = ui.money.getBoundingClientRect();
  const p = worldToScreen(worldX, worldY);

  const startX = canvasRect.left + clamp(p.x, 0, canvasRect.width);
  const startY = canvasRect.top + clamp(p.y, 0, canvasRect.height);
  const endX = bankRect.left + bankRect.width / 2;
  const endY = bankRect.top + bankRect.height / 2;

  const chip = document.createElement("div");
  chip.className = "money-fly";
  chip.textContent = `+$${Math.floor(amount)}`;
  chip.style.left = `${startX}px`;
  chip.style.top = `${startY}px`;
  chip.style.setProperty("--dx", `${endX - startX}px`);
  chip.style.setProperty("--dy", `${endY - startY}px`);

  document.body.appendChild(chip);
  requestAnimationFrame(() => chip.classList.add("fly"));
  setTimeout(() => chip.remove(), 900);
}

function worldToScreen(x, y) {
  return {
    x: x - WORLD.cameraX,
    y: y - WORLD.cameraY
  };
}

function randomChoice(items) {
  if (!items.length) {
    return null;
  }
  return items[Math.floor(Math.random() * items.length)];
}

function weightedZoneChoice(zones) {
  if (!zones.length) {
    return null;
  }

  const weighted = zones.map((zone) => {
    const progress = getStoreProgress(zone.id);
    const level = clampInt(progress.nextUpgrade, 0, STORE_UPGRADE_STEPS.length, 0);
    const prestige = clampInt(progress.prestigeLevel, 0, 99, 0);
    const weight = 1 + level * 0.08 + prestige * 0.22;
    return { zone, weight: Math.max(0.1, weight) };
  });

  const total = weighted.reduce((sum, entry) => sum + entry.weight, 0);
  if (total <= 0) {
    return randomChoice(zones);
  }

  let pick = Math.random() * total;
  for (const entry of weighted) {
    pick -= entry.weight;
    if (pick <= 0) {
      return entry.zone;
    }
  }

  return weighted[weighted.length - 1].zone;
}

function pointDistance(ax, ay, bx, by) {
  return Math.hypot(ax - bx, ay - by);
}

function getCounterStationForZone(zoneId) {
  return state.stations.find((station) => station.type === "counter" && station.zoneId === zoneId);
}

function getStationByTypeForZone(type, zoneId) {
  return state.stations.find(
    (station) => station.type === type && station.zoneId === zoneId && isStationUnlocked(station)
  ) || null;
}

function getZoneOvens(zoneId) {
  return state.ovens.filter((oven) => oven.zoneId === zoneId && isOvenUnlocked(oven));
}

function getAvailableZoneOven(zoneId) {
  return getZoneOvens(zoneId).find((oven) => !oven.busy && !oven.ready) || null;
}

function moveActorToward(actor, targetX, targetY, speed, dt) {
  if (!actor) {
    return false;
  }

  const dx = targetX - actor.x;
  const dy = targetY - actor.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 2) {
    actor.x = targetX;
    actor.y = targetY;
    return true;
  }

  const step = Math.min(dist, speed * dt);
  actor.x += (dx / dist) * step;
  actor.y += (dy / dist) * step;
  return step >= dist - 0.001;
}

function getZoneSpawnPoint(zoneId) {
  const zone = zoneById(zoneId);
  return { x: zone.xMin + 48, y: 724 };
}

function getZoneExitPoint(zoneId) {
  const zone = zoneById(zoneId);
  return { x: zone.xMin + 22, y: 778 };
}

function getEatingSeatPoint(zoneId, seatIndex = 0) {
  const counter = getCounterStationForZone(zoneId);
  if (!counter) {
    const zone = zoneById(zoneId);
    return { x: zone.xMin + 660, y: 350 };
  }

  const col = seatIndex % 3;
  const row = Math.floor(seatIndex / 3) % 2;
  return {
    x: counter.x + 24 + col * 36,
    y: counter.y + counter.h + 56 + row * 28
  };
}

function findStationById(id) {
  return state.stations.find((station) => station.id === id) || null;
}

function findOvenById(id) {
  return state.ovens.find((oven) => oven.id === id) || null;
}

function findDroppedById(id) {
  return state.droppedItems.find((item) => item.id === id) || null;
}

function nearestDroppedItem(maxDistance = interactRadius) {
  let best = null;
  let bestDistance = maxDistance;
  for (const item of state.droppedItems) {
    const dist = pointDistance(player.x, player.y, item.x, item.y);
    if (dist <= bestDistance) {
      bestDistance = dist;
      best = item;
    }
  }
  return best;
}

function dropCarryItem() {
  if (!player.carry) {
    showToast("No traes nada para soltar.");
    sound.play("fail");
    return false;
  }

  const dropOffset = player.facing === "left" ? -16 : player.facing === "right" ? 16 : 0;
  const dropX = clamp(player.x + dropOffset, 24, getMaxReachX() - 24);
  const dropY = clamp(player.y + 10, 24, WORLD.height - 24);

  state.droppedItems.push({
    id: state.droppedItemId,
    x: dropX,
    y: dropY,
    stage: player.carry.stage
  });
  state.droppedItemId += 1;
  player.carry = null;

  showToast("Objeto soltado.");
  sound.play("action");
  markDirty();
  return true;
}

function pickDroppedItem(item) {
  if (!item) {
    return false;
  }
  if (player.carry) {
    showToast("Tienes las manos ocupadas.");
    sound.play("fail");
    return false;
  }

  player.carry = { stage: item.stage };
  state.droppedItems = state.droppedItems.filter((entry) => entry.id !== item.id);
  showToast("Objeto recogido.");
  sound.play("success");
  markDirty();
  return true;
}

function useSelfDropOrPickup(quietIfNone = false) {
  if (player.carry) {
    return dropCarryItem();
  }

  const near = nearestDroppedItem();
  if (near) {
    return pickDroppedItem(near);
  }

  if (!quietIfNone) {
    showToast("No hay objeto cercano para recoger.");
    sound.play("fail");
  }
  return false;
}

function isTapOnPlayer(point) {
  return pointDistance(point.x, point.y, player.x, player.y) <= 24;
}

function nearestInteractable() {
  let best = null;
  let bestDistance = Infinity;

  for (const station of state.stations) {
    if (!isStationUnlocked(station)) {
      continue;
    }
    const c = stationCenter(station);
    const dist = pointDistance(player.x, player.y, c.x, c.y);
    if (dist < bestDistance) {
      bestDistance = dist;
      best = { kind: "station", id: station.id };
    }
  }

  for (const oven of state.ovens) {
    if (!isOvenUnlocked(oven)) {
      continue;
    }
    const c = ovenCenter(oven);
    const dist = pointDistance(player.x, player.y, c.x, c.y);
    if (dist < bestDistance) {
      bestDistance = dist;
      best = { kind: "oven", id: oven.id };
    }
  }

  if (!player.carry) {
    for (const item of state.droppedItems) {
      const dist = pointDistance(player.x, player.y, item.x, item.y);
      if (dist < bestDistance) {
        bestDistance = dist;
        best = { kind: "dropped", id: item.id };
      }
    }
  }

  if (!best || bestDistance > interactRadius) {
    return null;
  }
  return best;
}

function getInteractableCenter(token) {
  if (!token) {
    return null;
  }

  if (token.kind === "station") {
    const station = findStationById(token.id);
    if (!station || !isStationUnlocked(station)) {
      return null;
    }
    return stationCenter(station);
  }

  if (token.kind === "oven") {
    const oven = findOvenById(token.id);
    if (!oven || !isOvenUnlocked(oven)) {
      return null;
    }
    return ovenCenter(oven);
  }

  if (token.kind === "dropped") {
    const item = findDroppedById(token.id);
    if (!item) {
      return null;
    }
    return { x: item.x, y: item.y };
  }

  return null;
}

function distanceToInteractable(token) {
  const center = getInteractableCenter(token);
  if (!center) {
    return Infinity;
  }
  return pointDistance(player.x, player.y, center.x, center.y);
}

function findInteractableAt(x, y) {
  for (let i = state.droppedItems.length - 1; i >= 0; i -= 1) {
    const item = state.droppedItems[i];
    if (pointDistance(x, y, item.x, item.y) <= 16) {
      return { kind: "dropped", id: item.id };
    }
  }

  for (let i = state.stations.length - 1; i >= 0; i -= 1) {
    const station = state.stations[i];
    if (!isStationUnlocked(station)) {
      continue;
    }

    const inside = x >= station.x && x <= station.x + station.w && y >= station.y && y <= station.y + station.h;
    if (inside) {
      return { kind: "station", id: station.id };
    }
  }

  for (const oven of state.ovens) {
    if (!isOvenUnlocked(oven)) {
      continue;
    }

    if (pointDistance(x, y, oven.x, oven.y) <= OVEN_HIT_RADIUS) {
      return { kind: "oven", id: oven.id };
    }
  }

  return null;
}

function canInteract(token) {
  return distanceToInteractable(token) <= interactRadius;
}

function getNextStepHint() {
  if (!player.carry) {
    return "Primero toca la estacion de masa.";
  }
  if (player.carry.stage === "dough") {
    return "Ahora toca la estacion de salsa.";
  }
  if (player.carry.stage === "sauce") {
    return "Ahora toca la estacion de queso.";
  }
  if (player.carry.stage === "cheese") {
    return "Ahora toca un horno.";
  }
  if (player.carry.stage === "baked") {
    return "Ahora toca el mostrador de la zona correcta.";
  }
  return "Toca una estacion para continuar.";
}

function spawnCustomerForOrder(order) {
  const spawn = getZoneSpawnPoint(order.zoneId);
  state.customers.push({
    id: state.customerId,
    orderId: order.id,
    zoneId: order.zoneId,
    x: spawn.x,
    y: spawn.y,
    targetX: spawn.x,
    targetY: spawn.y,
    speed: 52 + Math.random() * 18,
    state: "entering",
    angry: false,
    eatTimer: 0,
    bob: Math.random() * Math.PI * 2
  });
  state.customerId += 1;
}

function createOrderForZone(zone) {
  const patience = Math.max(8, 28 + Math.random() * 16 - state.day * 0.75 + state.patienceBoost - zone.id * 0.8);
  const baseValue = 18 + state.day * 2 + Math.floor(Math.random() * 8);
  const value = Math.floor(
    baseValue * (0.95 + state.businesses * 0.06) * state.payoutMultiplier * (1 + zone.id * 0.02) * zoneRevenueMultiplier(zone.id)
  );

  return {
    id: state.orderId,
    zoneId: zone.id,
    patience,
    maxPatience: patience,
    countdownStarted: false,
    value
  };
}

function spawnOrderForZone(zoneId, count = 1, playTone = true) {
  const zone = zoneById(zoneId);
  if (zone.minBusinesses > state.businesses) {
    return 0;
  }

  let spawned = 0;
  for (let i = 0; i < count; i += 1) {
    if (state.orders.length >= state.maxOrders) {
      break;
    }
    const order = createOrderForZone(zone);
    state.orders.push(order);
    spawnCustomerForOrder(order);
    state.orderId += 1;
    spawned += 1;
  }

  if (spawned > 0) {
    if (playTone) {
      sound.play("order");
    }
    markDirty();
  }

  return spawned;
}

function spawnOrder(count = 1) {
  const unlockedZones = getUnlockedZones();
  if (!unlockedZones.length) {
    return 0;
  }

  let spawned = 0;
  for (let i = 0; i < count; i += 1) {
    if (state.orders.length >= state.maxOrders) {
      break;
    }

    const zone = weightedZoneChoice(unlockedZones);
    if (!zone) {
      continue;
    }

    const order = createOrderForZone(zone);
    state.orders.push(order);
    spawnCustomerForOrder(order);
    state.orderId += 1;
    spawned += 1;
  }

  if (spawned > 0) {
    sound.play("order");
    markDirty();
  }
  return spawned;
}

function sendCustomerHome(orderId, angry = false) {
  const customer = state.customers.find((entry) => entry.orderId === orderId && entry.state !== "leaving");
  if (!customer) {
    return;
  }

  const exit = getZoneExitPoint(customer.zoneId);
  customer.state = "leaving";
  customer.angry = angry;
  customer.eatTimer = 0;
  customer.targetX = exit.x;
  customer.targetY = exit.y;
}

function sendCustomerToEat(orderId) {
  const customer = state.customers.find((entry) => entry.orderId === orderId && entry.state !== "leaving");
  if (!customer) {
    return;
  }

  const seatIndex = state.customers.filter(
    (entry) => entry.zoneId === customer.zoneId && entry.state === "eating"
  ).length;
  const seat = getEatingSeatPoint(customer.zoneId, seatIndex);

  customer.state = "eating";
  customer.angry = false;
  customer.eatTimer = 6 + Math.random() * 6;
  customer.targetX = seat.x;
  customer.targetY = seat.y;
}

function runAdCampaign() {
  const adCost = 25 + state.adBoost * 12;
  if (state.money < adCost) {
    clearSpendConfirm();
    showToast("No hay suficiente dinero para anuncios.");
    sound.play("fail");
    buzz(10);
    return false;
  }

  const adToken = `ads|${state.adBoost}|${adCost}`;
  if (!requireSpendConfirm(adToken, `Confirmar anuncios por $${adCost}. Toca ANUN otra vez.`)) {
    return false;
  }

  state.money -= adCost;
  state.adBoost += 1;
  state.maxOrders += 1;
  spawnOrder(2);
  showToast("Los anuncios atraen mas clientes.");
  sound.play("success");
  buzz(12);
  markDirty();
  return true;
}

function buyUpgrade(zoneId = 1) {
  const zone = zoneById(zoneId);
  if (zone.minBusinesses > state.businesses) {
    showToast(`La Zona ${zone.id} aun no esta disponible.`);
    sound.play("fail");
    return;
  }

  const pendingUnlock = syncPendingStoreUnlockFromProgress();
  if (pendingUnlock) {
    clearSpendConfirm();
    handlePendingStoreUnlockTap();
    return;
  }

  const upgrade = getStoreUpgradeOffer(zone.id);
  if (!upgrade) {
    showToast(`Zona ${zone.id} ya esta al maximo.`);
    sound.play("fail");
    return;
  }

  if (state.money < upgrade.cost) {
    clearSpendConfirm();
    showToast(`Zona ${zone.id}: ${upgrade.name} requiere $${upgrade.cost}.`);
    sound.play("fail");
    return;
  }

  const progress = getStoreProgress(zone.id);
  const beforeLevel = clampInt(progress.nextUpgrade, 0, STORE_UPGRADE_STEPS.length, 0);
  const upgradeToken = `store-upgrade|${zone.id}|${beforeLevel}|${upgrade.isPrestige ? 1 : 0}|${upgrade.cost}`;
  if (
    !requireSpendConfirm(
      upgradeToken,
      `Confirmar ${upgrade.name} Z${zone.id} por $${upgrade.cost}. Toca CRECE otra vez.`
    )
  ) {
    return;
  }

  state.money -= upgrade.cost;
  upgrade.apply();
  if (!upgrade.isPrestige) {
    progress.nextUpgrade = clampInt(progress.nextUpgrade + 1, 0, STORE_UPGRADE_STEPS.length, STORE_UPGRADE_STEPS.length);
  }

  let completionBonus = 0;
  if (!upgrade.isPrestige && beforeLevel < STORE_UPGRADE_STEPS.length && progress.nextUpgrade >= STORE_UPGRADE_STEPS.length) {
    completionBonus = applyStoreCompletionBonus(zone.id);
  }

  const momentumRate = upgrade.isPrestige ? UPGRADE_MOMENTUM_BONUS_RATE * 1.7 : UPGRADE_MOMENTUM_BONUS_RATE;
  const momentumBonus = Math.max(5, Math.round(upgrade.cost * momentumRate));
  state.money += momentumBonus;
  const station = getStationByTypeForZone("upgrade", zone.id);
  const payoutPoint = station ? stationCenter(station) : { x: player.x, y: player.y };
  spawnMoneyFly(payoutPoint.x, payoutPoint.y, momentumBonus);
  startMoneyTween(state.money, 0.44, 0.08);
  state.stars = clamp(state.stars + (upgrade.isPrestige ? 0.06 : 0.02), 0.8, 5);

  const localRushOrders = spawnOrderForZone(zone.id, upgrade.isPrestige ? 2 : 1, false);
  const unlockBefore = state.pendingStoreUnlock;
  const unlockNow = syncPendingStoreUnlockFromProgress();
  syncWorkersForUnlockedStorefronts();

  const unlockText = unlockNow ? ` | Nueva sucursal lista: Z${unlockNow}` : "";
  const unlockNoticeTime = unlockNow && unlockNow !== unlockBefore ? 2.9 : 2.2;

  showToast(
    `Z${zone.id}: ${upgrade.name}${upgrade.isPrestige ? " completado" : ""} (+$${momentumBonus}${
      completionBonus > 0 ? ` + bono $${completionBonus}` : ""
    }${localRushOrders > 0 ? " y mas clientes" : ""})${unlockText}.`,
    unlockNoticeTime
  );
  sound.play("upgrade");
  buzz(18);

  if (maybeUnlockCityMode(true)) {
    return;
  }

  markDirty();
}

function serveOrderAtCounter(zoneId) {
  const orderIndex = state.orders.findIndex((order) => order.zoneId === zoneId);

  if (orderIndex < 0) {
    showToast(`No hay clientes esperando en Zona ${zoneId}.`);
    sound.play("fail");
    return;
  }

  if (!player.carry || player.carry.stage !== "baked") {
    showToast("Lleva una pizza horneada para entregar.");
    sound.play("fail");
    return;
  }

  const order = state.orders.splice(orderIndex, 1)[0];
  const tipRate = clamp(order.patience / order.maxPatience, 0, 1);
  const tip = Math.floor(tipRate * 8);

  state.combo = state.comboTimer > 0 ? Math.min(9, state.combo + 1) : 1;
  state.comboTimer = 8;

  const comboMultiplier = 1 + state.combo * 0.08;
  const payout = Math.floor((order.value + tip) * comboMultiplier);

  const counter = getCounterStationForZone(zoneId);
  const payoutPoint = counter ? stationCenter(counter) : { x: player.x, y: player.y };

  state.money += payout;
  spawnMoneyFly(payoutPoint.x, payoutPoint.y, payout);
  startMoneyTween(state.money, 0.56, 0.2);
  state.stars = clamp(state.stars + 0.05, 0.8, 5);
  player.carry = null;
  sendCustomerToEat(order.id);

  showToast("Pedido entregado. Excelente!");
  sound.play("success");
  buzz(14);
  markDirty();
}

function serveOrderByWorker(zoneId, payoutPoint) {
  const orderIndex = state.orders.findIndex((order) => order.zoneId === zoneId);
  if (orderIndex < 0) {
    return false;
  }

  const order = state.orders.splice(orderIndex, 1)[0];
  const tipRate = clamp(order.patience / order.maxPatience, 0, 1);
  const tip = Math.floor(tipRate * 6);
  const payout = Math.floor((order.value + tip) * 0.9);

  state.money += payout;
  spawnMoneyFly(payoutPoint.x, payoutPoint.y, payout);
  startMoneyTween(state.money, 0.48, 0.1);
  state.stars = clamp(state.stars + 0.03, 0.8, 5);
  sendCustomerToEat(order.id);
  markDirty();
  return true;
}

function updatePrepWorker(worker, dt) {
  if (!worker) {
    return;
  }

  const zoneId = clampInt(worker.zoneId, 1, ZONES.length, 1);
  const dough = getStationByTypeForZone("dough", zoneId);
  const sauce = getStationByTypeForZone("sauce", zoneId);
  const cheese = getStationByTypeForZone("cheese", zoneId);
  if (!dough || !sauce || !cheese) {
    return;
  }

  const doughC = stationCenter(dough);
  const sauceC = stationCenter(sauce);
  const cheeseC = stationCenter(cheese);
  const speed = 88 * (1 + clampInt(getStoreProgress(zoneId).prestigeLevel, 0, 99, 0) * 0.03);

  if (worker.state === "toDough") {
    if (moveActorToward(worker, doughC.x, doughC.y, speed, dt)) {
      worker.carry = "dough";
      worker.state = "toSauce";
    }
    return;
  }

  if (worker.state === "toSauce") {
    if (moveActorToward(worker, sauceC.x, sauceC.y, speed, dt)) {
      worker.carry = "sauce";
      worker.state = "toCheese";
    }
    return;
  }

  if (worker.state === "toCheese") {
    if (moveActorToward(worker, cheeseC.x, cheeseC.y, speed, dt)) {
      worker.carry = "cheese";
      worker.state = "toOven";
    }
    return;
  }

  if (worker.state === "waitOven") {
    if (worker.carry !== "cheese") {
      worker.state = "toDough";
      return;
    }
    const openOven = getAvailableZoneOven(zoneId);
    if (openOven) {
      worker.targetOvenId = openOven.id;
      worker.state = "toOven";
    }
    return;
  }

  if (worker.state === "toOven") {
    if (worker.carry !== "cheese") {
      worker.state = "toDough";
      worker.targetOvenId = null;
      return;
    }

    let targetOven = worker.targetOvenId ? findOvenById(worker.targetOvenId) : null;
    if (!targetOven || targetOven.zoneId !== zoneId || !isOvenUnlocked(targetOven) || targetOven.busy || targetOven.ready) {
      targetOven = getAvailableZoneOven(zoneId);
      worker.targetOvenId = targetOven ? targetOven.id : null;
    }

    if (!targetOven) {
      worker.state = "waitOven";
      return;
    }

    const ovenC = ovenCenter(targetOven);
    if (moveActorToward(worker, ovenC.x, ovenC.y, speed, dt)) {
      if (!targetOven.busy && !targetOven.ready) {
        targetOven.busy = true;
        targetOven.progress = 0;
        worker.carry = null;
        worker.targetOvenId = null;
        worker.state = "toDough";
        sound.play("action");
        markDirty();
      } else {
        worker.state = "waitOven";
      }
    }
    return;
  }

  worker.state = "toDough";
}

function updateRunnerWorker(worker, dt) {
  if (!worker) {
    return;
  }

  const zoneId = clampInt(worker.zoneId, 1, ZONES.length, 1);
  const counter = getCounterStationForZone(zoneId);
  if (!counter) {
    return;
  }

  const counterC = stationCenter(counter);
  const speed = 96 * (1 + clampInt(getStoreProgress(zoneId).prestigeLevel, 0, 99, 0) * 0.03);

  if (!worker.carry) {
    let targetOven = worker.targetOvenId ? findOvenById(worker.targetOvenId) : null;
    if (!targetOven || targetOven.zoneId !== zoneId || !isOvenUnlocked(targetOven) || !targetOven.ready) {
      targetOven = getZoneOvens(zoneId).find((oven) => oven.ready) || null;
      worker.targetOvenId = targetOven ? targetOven.id : null;
    }

    if (!targetOven) {
      moveActorToward(worker, counterC.x + 24, counterC.y + 42, speed * 0.75, dt);
      return;
    }

    const ovenC = ovenCenter(targetOven);
    if (moveActorToward(worker, ovenC.x, ovenC.y, speed, dt)) {
      if (targetOven.ready) {
        targetOven.ready = false;
        worker.carry = "baked";
        worker.targetOvenId = null;
        markDirty();
      }
    }
    return;
  }

  if (moveActorToward(worker, counterC.x, counterC.y, speed, dt)) {
    if (serveOrderByWorker(zoneId, counterC)) {
      worker.carry = null;
      sound.play("success");
    }
  }
}

function updateCleanerWorker(worker, dt) {
  if (!worker) {
    return;
  }

  const zoneId = clampInt(worker.zoneId, 1, ZONES.length, 1);
  const mop = getStationByTypeForZone("mop", zoneId);
  if (!mop) {
    return;
  }
  const mopC = stationCenter(mop);
  const speed = 84 * (1 + clampInt(getStoreProgress(zoneId).prestigeLevel, 0, 99, 0) * 0.03);

  if (state.spillActive) {
    worker.state = "cleaning";
    if (moveActorToward(worker, mopC.x, mopC.y, speed, dt)) {
      state.spillActive = false;
      state.stars = clamp(state.stars + 0.02, 0.8, 5);
      worker.state = "idle";
      showToast("Limpieza resolvio el derrame.");
      sound.play("action");
      markDirty();
    }
    return;
  }

  worker.state = "idle";
  moveActorToward(worker, mopC.x + 18, mopC.y + 22, speed * 0.6, dt);
}

function updateWorkers(dt) {
  syncWorkersForUnlockedStorefronts();

  for (const worker of state.prepWorkers) {
    updatePrepWorker(worker, dt);
  }

  for (const worker of state.runnerWorkers) {
    updateRunnerWorker(worker, dt);
  }

  for (const worker of state.cleanerWorkers) {
    updateCleanerWorker(worker, dt);
  }
}

function interactWithStation(station) {
  if (!station || !isStationUnlocked(station)) {
    showToast(getNextStepHint());
    sound.play("fail");
    return;
  }

  if (station.type === "dough") {
    if (player.carry) {
      showToast("Tienes las manos ocupadas. Termina esta pizza primero.");
      sound.play("fail");
      return;
    }

    player.carry = { stage: "dough" };
    showToast("Masa lista.");
    sound.play("action");
    markDirty();
    return;
  }

  if (station.type === "sauce") {
    if (!player.carry || player.carry.stage !== "dough") {
      showToast("Primero necesitas masa base.");
      sound.play("fail");
      return;
    }

    player.carry.stage = "sauce";
    showToast("Salsa lista.");
    sound.play("action");
    markDirty();
    return;
  }

  if (station.type === "cheese") {
    if (!player.carry || player.carry.stage !== "sauce") {
      showToast("Agrega salsa antes del queso.");
      sound.play("fail");
      return;
    }

    player.carry.stage = "cheese";
    showToast("Queso agregado. Toca un horno.");
    sound.play("action");
    markDirty();
    return;
  }

  if (station.type === "counter") {
    serveOrderAtCounter(station.zoneId);
    return;
  }

  if (station.type === "ads") {
    if (state.adDeskCooldown > 0) {
      showToast(`Mesa de anuncios en enfriamiento (${Math.ceil(state.adDeskCooldown)}s).`);
      sound.play("fail");
      return;
    }

    if (runAdCampaign()) {
      state.adDeskCooldown = 18;
    }
    return;
  }

  if (station.type === "upgrade") {
    buyUpgrade(station.zoneId);
    return;
  }

  if (station.type === "mop") {
    if (!state.spillActive) {
      showToast("El piso esta limpio.");
      sound.play("action");
      return;
    }

    state.spillActive = false;
    showToast("Derrame limpiado. Velocidad restaurada.");
    sound.play("success");
    markDirty();
  }
}

function interactWithOven(oven) {
  if (!oven || !isOvenUnlocked(oven)) {
    showToast("Necesitas un horno desbloqueado.");
    sound.play("fail");
    return;
  }

  if (oven.ready && !player.carry) {
    player.carry = { stage: "baked" };
    oven.ready = false;
    showToast("Pizza caliente recogida.");
    sound.play("success");
    markDirty();
    return;
  }

  if (player.carry && player.carry.stage === "cheese") {
    if (oven.busy || oven.ready) {
      showToast("Este horno esta ocupado.");
      sound.play("fail");
      return;
    }

    oven.busy = true;
    oven.progress = 0;
    player.carry = null;
    showToast("Pizza horneandose...");
    sound.play("action");
    markDirty();
    return;
  }

  if (!player.carry) {
    if (oven.busy) {
      showToast("Sigue horneandose.");
      sound.play("action");
      return;
    }

    showToast("Necesitas una pizza cruda para hornear.");
    sound.play("fail");
    return;
  }

  showToast("El horno solo acepta pizza con queso.");
  sound.play("fail");
}

function interactToken(token) {
  if (!token) {
    return;
  }

  if (token.kind === "station") {
    interactWithStation(findStationById(token.id));
    return;
  }

  if (token.kind === "oven") {
    interactWithOven(findOvenById(token.id));
    return;
  }

  if (token.kind === "dropped") {
    const item = findDroppedById(token.id);
    if (!item) {
      return;
    }
    pickDroppedItem(item);
  }
}

function syncCustomersWithOrders() {
  const orderIds = new Set(state.orders.map((order) => order.id));

  for (let i = state.customers.length - 1; i >= 0; i -= 1) {
    const customer = state.customers[i];
    if (!orderIds.has(customer.orderId) && customer.state !== "leaving" && customer.state !== "eating") {
      customer.state = "leaving";
      const exit = getZoneExitPoint(customer.zoneId);
      customer.targetX = exit.x;
      customer.targetY = exit.y;
    }
  }

  for (const order of state.orders) {
    const hasCustomer = state.customers.some((customer) => customer.orderId === order.id && customer.state !== "leaving");
    if (!hasCustomer) {
      spawnCustomerForOrder(order);
    }
  }
}

function updateCustomerTargets() {
  for (const zone of getUnlockedZones()) {
    const waitingOrders = state.orders.filter((order) => order.zoneId === zone.id);
    const counter = getCounterStationForZone(zone.id);
    if (!counter) {
      continue;
    }

    waitingOrders.forEach((order, index) => {
      const customer = state.customers.find(
        (entry) =>
          entry.orderId === order.id &&
          (entry.state === "entering" || entry.state === "waiting")
      );
      if (!customer) {
        return;
      }

      customer.targetX = counter.x + 16 + (index % 5) * 22;
      customer.targetY = counter.y + counter.h + 22 + Math.floor(index / 5) * 18;
    });
  }
}

function updateCustomers(dt) {
  syncCustomersWithOrders();
  updateCustomerTargets();

  for (let i = state.customers.length - 1; i >= 0; i -= 1) {
    const customer = state.customers[i];
    customer.bob += dt * 6;

    const dx = customer.targetX - customer.x;
    const dy = customer.targetY - customer.y;
    const dist = Math.hypot(dx, dy);

    if (dist > 2) {
      const speed = customer.state === "leaving" ? customer.speed * 1.15 : customer.speed;
      const step = Math.min(dist, speed * dt);
      customer.x += (dx / dist) * step;
      customer.y += (dy / dist) * step;
    } else if (customer.state === "entering") {
      customer.state = "waiting";
      const linkedOrder = state.orders.find((order) => order.id === customer.orderId);
      if (linkedOrder) {
        linkedOrder.countdownStarted = true;
      }
    } else if (customer.state === "eating") {
      customer.eatTimer -= dt;
      if (customer.eatTimer <= 0) {
        customer.state = "leaving";
        const exit = getZoneExitPoint(customer.zoneId);
        customer.targetX = exit.x;
        customer.targetY = exit.y;
      }
    }

    if (customer.state === "leaving") {
      const exit = getZoneExitPoint(customer.zoneId);
      if (pointDistance(customer.x, customer.y, exit.x, exit.y) < 8) {
        state.customers.splice(i, 1);
      }
    }
  }
}

function updateOrders(dt) {
  const earlyGrace = state.day <= 2 ? 0.72 : state.day <= 4 ? 0.86 : 1;
  const decay = (1 + state.rushLevel * 0.12) * earlyGrace;

  for (let i = state.orders.length - 1; i >= 0; i -= 1) {
    const order = state.orders[i];
    if (!order.countdownStarted) {
      continue;
    }
    order.patience -= dt * decay;

    if (order.patience <= 0) {
      state.orders.splice(i, 1);
      state.stars = clamp(state.stars - 0.24, 0.8, 5);
      state.combo = 0;
      sendCustomerHome(order.id, true);
      showToast(`Cliente de Zona ${order.zoneId} se fue enojado.`);
      sound.play("fail");
      buzz(8);
      markDirty();
    }
  }
}

function currentSpawnRate() {
  const ramp = clamp((state.day - 1) / 7, 0, 1);
  const earlyBuffer = (1 - ramp) * 2.8;
  const upgradePressure = totalStoreUpgradesPurchased() * 0.035;
  const prestigePressure = totalStorePrestigeLevels() * 0.055;
  const pressure = state.adBoost * 0.18 + state.day * 0.16 + state.businesses * 0.12 + upgradePressure + prestigePressure;
  return Math.max(2.8, state.orderSpawnBase + earlyBuffer - pressure);
}

function updateOvens(dt) {
  for (const oven of state.ovens) {
    if (!isOvenUnlocked(oven) || !oven.busy) {
      continue;
    }

    oven.progress += dt;
    if (oven.progress >= oven.bakeTime) {
      oven.progress = oven.bakeTime;
      oven.busy = false;
      oven.ready = true;
      showToast(`Pizza lista en Zona ${oven.zoneId}.`);
      sound.play("bake");
      buzz(8);
      markDirty();
    }
  }
}

function updateDayProgress(dt) {
  state.dayTimer += dt;
  if (state.dayTimer < 44) {
    return;
  }

  state.day += 1;
  state.dayTimer = 0;
  state.rushLevel += 0.2 + state.businesses * 0.03;

  if (state.day % 2 === 0) {
    state.maxOrders += 1;
  }

  if (state.day === 4) {
    showToast("La demanda sube. Mantente en movimiento.", 2.3);
  } else if (state.day === 6) {
    showToast("Turno de caos: hay derrames mas seguido.", 2.4);
  } else {
    showToast(`Dia ${state.day}: la ciudad suena mas fuerte.`);
  }

  sound.play("day");
  buzz(10);
  markDirty();
}

function updateSpills(dt) {
  if (state.day < 3) {
    return;
  }

  state.spillTimer -= dt;
  const hazardRate = state.day >= 6 ? 8 : 14;
  if (state.spillTimer <= 0) {
    state.spillTimer = hazardRate + Math.random() * 7;
    state.spillActive = true;
    showToast("Derrame de salsa! Toca TRAPO para limpiar.", 2.1);
    sound.play("fail");
    markDirty();
  }
}

function updateMoveTargetFromKeyboard() {
  let xDir = 0;
  let yDir = 0;

  if (state.keys.has("ArrowUp") || state.keys.has("w")) yDir -= 1;
  if (state.keys.has("ArrowDown") || state.keys.has("s")) yDir += 1;
  if (state.keys.has("ArrowLeft") || state.keys.has("a")) xDir -= 1;
  if (state.keys.has("ArrowRight") || state.keys.has("d")) xDir += 1;

  if (xDir === 0 && yDir === 0) {
    return null;
  }

  const magnitude = Math.hypot(xDir, yDir) || 1;
  return { x: xDir / magnitude, y: yDir / magnitude };
}

function movePlayerToward(dx, dy, dt) {
  const dist = Math.hypot(dx, dy);
  if (dist < 0.001) {
    return false;
  }

  let speed = player.baseSpeed;

  if (state.spillActive) {
    speed *= 0.83;
  }

  const sprintActive = (state.sprintBurstTimer > 0 || state.sprintHeld) && player.stamina > 0;
  if (sprintActive) {
    speed *= 1.55;
    player.stamina = clamp(player.stamina - dt * 0.6, 0, 1);
  } else {
    player.stamina = clamp(player.stamina + dt * 0.25, 0, 1);
  }

  const step = Math.min(dist, speed * dt);
  const dirX = dx / dist;
  const dirY = dy / dist;

  player.x += dirX * step;
  player.y += dirY * step;

  if (Math.abs(dirX) > Math.abs(dirY)) {
    player.facing = dirX > 0 ? "right" : "left";
  } else {
    player.facing = dirY > 0 ? "down" : "up";
  }

  return step > 0;
}

function updateMovement(dt) {
  let moving = false;
  const keyboardDir = updateMoveTargetFromKeyboard();

  if (state.sprintBurstTimer > 0) {
    state.sprintBurstTimer = Math.max(0, state.sprintBurstTimer - dt);
  }

  if (keyboardDir) {
    state.moveTarget = null;
    state.pendingInteract = null;
    moving = movePlayerToward(keyboardDir.x, keyboardDir.y, dt);
  } else if (state.moveTarget) {
    const dx = state.moveTarget.x - player.x;
    const dy = state.moveTarget.y - player.y;
    const dist = Math.hypot(dx, dy);

    if (dist < 5) {
      state.moveTarget = null;
      if (state.pendingInteract && canInteract(state.pendingInteract)) {
        interactToken(state.pendingInteract);
      }
      state.pendingInteract = null;
    } else {
      moving = movePlayerToward(dx, dy, dt);
      if (state.pendingInteract && canInteract(state.pendingInteract)) {
        state.moveTarget = null;
        interactToken(state.pendingInteract);
        state.pendingInteract = null;
      }
    }
  } else {
    player.stamina = clamp(player.stamina + dt * 0.25, 0, 1);
  }

  state.moving = moving;
  if (moving) {
    state.animTime += dt;
  }

  const maxX = getMaxReachX() - 24;
  player.x = clamp(player.x, 24, maxX);
  player.y = clamp(player.y, 24, WORLD.height - 24);

  WORLD.cameraX = clamp(player.x - WORLD.viewW / 2, 0, WORLD.width - WORLD.viewW);
  WORLD.cameraY = clamp(player.y - WORLD.viewH / 2, 0, WORLD.height - WORLD.viewH);
}

function drawStreetTiles() {
  const tile = 46;
  const campaign = currentCampaign();
  const startX = Math.floor(WORLD.cameraX / tile) * tile;
  const startY = Math.floor(WORLD.cameraY / tile) * tile;

  for (let y = startY; y < WORLD.cameraY + WORLD.viewH + tile; y += tile) {
    for (let x = startX; x < WORLD.cameraX + WORLD.viewW + tile; x += tile) {
      const even = ((x / tile + y / tile) & 1) === 0;
      ctx.fillStyle = even ? campaign.tileA : campaign.tileB;
      ctx.fillRect(Math.floor(x - WORLD.cameraX), Math.floor(y - WORLD.cameraY), tile + 1, tile + 1);
    }
  }

  ctx.fillStyle = campaign.grass;
  ctx.fillRect(-WORLD.cameraX, -WORLD.cameraY, WORLD.width, 122);
  ctx.fillRect(-WORLD.cameraX, 585 - WORLD.cameraY, WORLD.width, 300);
}

function drawZoneDecor() {
  for (const zone of ZONES) {
    const x = zone.xMin - WORLD.cameraX;
    const w = zone.xMax - zone.xMin;

    ctx.fillStyle = "rgba(45, 27, 14, 0.26)";
    ctx.fillRect(x + 2, 154 - WORLD.cameraY, w - 4, 8);

    drawSprite("storefront", x + 12, 146 - WORLD.cameraY, w - 24, 286);

    ctx.fillStyle = zone.tint;
    ctx.fillRect(x + 56, 74 - WORLD.cameraY, 230, 36);
    ctx.fillRect(x + 326, 74 - WORLD.cameraY, 220, 36);
    ctx.fillRect(x + 580, 74 - WORLD.cameraY, 166, 36);

    ctx.fillStyle = "rgba(16, 10, 6, 0.66)";
    ctx.fillRect(x + 12, 12 - WORLD.cameraY, 200, 30);
    ctx.fillStyle = "#fff4dc";
    ctx.font = "bold 12px monospace";
    ctx.fillText(`ZONA ${zone.id}: ${zone.name}`, x + 20, 31 - WORLD.cameraY);

    const progress = getStoreProgress(zone.id);
    if (progress.prestigeLevel > 0 || progress.completions > 0) {
      ctx.fillStyle = "#ffe9bc";
      ctx.font = "bold 9px monospace";
      ctx.fillText(`P${progress.prestigeLevel} C${progress.completions}`, x + 218, 31 - WORLD.cameraY);
    }

    // Scenic layer with trees and bushes so each district feels less abstract.
    const topY = 120 - WORLD.cameraY;
    drawSprite("tree", x + 18, topY - 54, 42, 54);
    drawSprite("bush", x + 144, topY - 30, 54, 30);
    drawSprite("tree", x + w - 64, topY - 56, 44, 56);
    drawSprite("bush", x + w - 192, topY - 32, 58, 32);

    const bottomY = 604 - WORLD.cameraY;
    drawSprite("bush", x + 72, bottomY, 62, 34);
    drawSprite("tree", x + 198, bottomY - 22, 38, 50);
    drawSprite("bush", x + w - 220, bottomY, 62, 34);
    drawSprite("tree", x + w - 94, bottomY - 24, 40, 52);

    if (zone.minBusinesses > state.businesses) {
      ctx.fillStyle = "rgba(15, 10, 6, 0.56)";
      ctx.fillRect(x, -WORLD.cameraY, w, WORLD.height);
      ctx.fillStyle = "#ffe5a9";
      ctx.font = "bold 16px monospace";
      ctx.fillText(`BLOQUEADA: ${zone.minBusinesses} SUCURSALES`, x + 180, 350 - WORLD.cameraY);
    }

    if (zone.id > 1) {
      ctx.fillStyle = "rgba(35, 17, 8, 0.42)";
      ctx.fillRect(x, -WORLD.cameraY, 2, WORLD.height);
    }
  }
}

function drawStationIcon(station, x, y) {
  let icon = "";
  if (station.type === "dough") icon = "iconDough";
  else if (station.type === "sauce") icon = "iconSauce";
  else if (station.type === "cheese") icon = "iconCheese";
  else if (station.type === "counter") icon = "iconCounter";
  else if (station.type === "ads") icon = "iconAds";
  else if (station.type === "upgrade") icon = "iconUpgrade";

  if (icon && drawSprite(icon, x - 9, y - 9, 18, 18)) {
    return;
  }

  if (station.type === "dough") ctx.fillStyle = "#e8c188";
  else if (station.type === "sauce") ctx.fillStyle = "#d24536";
  else if (station.type === "cheese") ctx.fillStyle = "#f3dc75";
  else if (station.type === "counter") ctx.fillStyle = "#efefe9";
  else if (station.type === "ads") ctx.fillStyle = "#66b8ea";
  else if (station.type === "upgrade") ctx.fillStyle = "#7cd58f";
  else ctx.fillStyle = "#f3f3f3";

  ctx.beginPath();
  ctx.arc(x, y, 7, 0, Math.PI * 2);
  ctx.fill();
}

function drawStations() {
  for (const station of state.stations) {
    if (!isStationUnlocked(station)) {
      continue;
    }

    const sx = station.x - WORLD.cameraX;
    const sy = station.y - WORLD.cameraY;

    let stationSprite = "stationWork";
    if (station.type === "counter") {
      stationSprite = "stationCounter";
    } else if (station.type === "upgrade") {
      stationSprite = "stationUpgrade";
    } else if (station.type === "ads") {
      stationSprite = "stationAds";
    }

    if (!drawSprite(stationSprite, sx, sy, station.w, station.h)) {
      ctx.fillStyle = station.color;
      ctx.fillRect(sx, sy, station.w, station.h);
      ctx.strokeStyle = "#2a160d";
      ctx.strokeRect(sx, sy, station.w, station.h);
    } else if (station.type === "dough" || station.type === "sauce" || station.type === "cheese") {
      ctx.save();
      ctx.globalAlpha = 0.24;
      ctx.fillStyle = station.color;
      ctx.fillRect(sx + 4, sy + 4, station.w - 8, station.h - 8);
      ctx.restore();
    }

    if (station.type === "upgrade" && state.pendingStoreUnlock) {
      const armed = state.unlockConfirmZone === state.pendingStoreUnlock && state.unlockConfirmTimer > 0;
      const pulse = 0.5 + Math.sin(performance.now() / 170) * 0.5;
      ctx.save();
      ctx.strokeStyle = armed
        ? `rgba(255, 222, 135, ${0.58 + pulse * 0.34})`
        : `rgba(118, 238, 158, ${0.48 + pulse * 0.34})`;
      ctx.lineWidth = 2;
      ctx.strokeRect(sx - 2, sy - 2, station.w + 4, station.h + 4);

      const badgeW = 66;
      const badgeH = 14;
      const bx = sx + station.w - badgeW - 4;
      const by = sy - 11;
      ctx.fillStyle = armed ? "#ffe49f" : "#a4f0b8";
      ctx.fillRect(bx, by, badgeW, badgeH);
      ctx.strokeStyle = "#2a160d";
      ctx.lineWidth = 1;
      ctx.strokeRect(bx, by, badgeW, badgeH);
      ctx.fillStyle = "#2a160d";
      ctx.font = "bold 8px monospace";
      ctx.fillText(
        armed ? `CONFIRMAR Z${state.pendingStoreUnlock}` : `LISTA Z${state.pendingStoreUnlock}`,
        bx + 4,
        by + 9
      );
      ctx.restore();
    }

    ctx.fillStyle = "#fff6de";
    ctx.font = "bold 11px monospace";
    ctx.fillText(station.label, sx + 8, sy + 15);
    ctx.fillText(`Z${station.zoneId}`, sx + station.w - 26, sy + 15);

    drawStationIcon(station, sx + station.w - 16, sy + 38);

    if (station.type === "upgrade") {
      ctx.fillStyle = "rgba(12, 8, 4, 0.58)";
      ctx.fillRect(sx + 4, sy + station.h - 18, station.w - 8, 14);
      ctx.fillStyle = "#fff0cf";
      ctx.font = "10px monospace";
      if (state.pendingStoreUnlock) {
        const armed = state.unlockConfirmZone === state.pendingStoreUnlock && state.unlockConfirmTimer > 0;
        ctx.fillText(
          armed
            ? `CONFIRMAR APERTURA Z${state.pendingStoreUnlock}`
            : `LISTA Z${state.pendingStoreUnlock}: TOCA CRECE`,
          sx + 8,
          sy + station.h - 8
        );
      } else {
        const up = getStoreUpgradeOffer(station.zoneId);
        const progress = getStoreProgress(station.zoneId);
        const total = STORE_UPGRADE_STEPS.length;
        if (up) {
          ctx.fillText(
            `$${up.cost} ${up.name} L${progress.nextUpgrade}/${total} P${progress.prestigeLevel}`,
            sx + 8,
            sy + station.h - 8
          );
        } else {
          ctx.fillText(`MAX L${total}/${total}`, sx + 8, sy + station.h - 8);
        }
      }
    }
  }

  for (const oven of state.ovens) {
    if (!isOvenUnlocked(oven)) {
      continue;
    }

    const x = oven.x - OVEN_WIDTH / 2 - WORLD.cameraX;
    const y = oven.y - OVEN_HEIGHT / 2 - WORLD.cameraY;

    if (!drawSprite("oven", x, y, OVEN_WIDTH, OVEN_HEIGHT)) {
      ctx.fillStyle = "#5f6c74";
      ctx.fillRect(x, y, OVEN_WIDTH, OVEN_HEIGHT);
      ctx.strokeStyle = "#1e252a";
      ctx.strokeRect(x, y, OVEN_WIDTH, OVEN_HEIGHT);

      ctx.fillStyle = "#fff5df";
      ctx.font = "bold 9px monospace";
      ctx.fillText("HORNO", x + 14, y + 12);
      ctx.font = "bold 10px monospace";
      ctx.fillText(`Z${oven.zoneId}`, x + 25, y + 24);
    } else {
      ctx.fillStyle = "#f4f0e6";
      ctx.font = "bold 9px monospace";
      ctx.fillText(`Z${oven.zoneId}`, x + 26, y + 12);
    }

    if (oven.busy) {
      const pct = oven.progress / oven.bakeTime;
      ctx.fillStyle = "#ec8332";
      ctx.fillRect(x + 8, y + 35, (OVEN_WIDTH - 16) * pct, 9);
    }

    if (oven.ready) {
      ctx.fillStyle = "#f4db74";
      ctx.beginPath();
      ctx.arc(x + OVEN_WIDTH / 2, y + 40, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#5a2f09";
      ctx.stroke();
    }
  }
}

function drawDiningAreas() {
  for (const zone of getUnlockedZones()) {
    const counter = getCounterStationForZone(zone.id);
    if (!counter) {
      continue;
    }

    for (let i = 0; i < 6; i += 1) {
      const seat = getEatingSeatPoint(zone.id, i);
      const p = worldToScreen(seat.x, seat.y);
      if (!drawSprite("table", p.x - 16, p.y - 10, 32, 20)) {
        ctx.fillStyle = "rgba(74, 43, 17, 0.55)";
        ctx.fillRect(p.x - 12, p.y - 3, 24, 6);
        ctx.fillStyle = "#d7ba88";
        ctx.fillRect(p.x - 8, p.y - 2, 16, 4);
      }
    }
  }
}

function drawDroppedItems() {
  for (const item of state.droppedItems) {
    const p = worldToScreen(item.x, item.y);
    if (!drawPizzaSprite(item.stage, p.x, p.y, 14)) {
      if (item.stage === "dough") ctx.fillStyle = "#e8c188";
      else if (item.stage === "sauce") ctx.fillStyle = "#d24536";
      else if (item.stage === "cheese") ctx.fillStyle = "#f3db73";
      else ctx.fillStyle = "#c57b36";

      ctx.beginPath();
      ctx.arc(p.x, p.y, 5.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#4a2b0b";
      ctx.stroke();
    }
  }
}

function drawCustomers() {
  for (const customer of state.customers) {
    if (zoneById(customer.zoneId).minBusinesses > state.businesses) {
      continue;
    }

    const p = worldToScreen(customer.x, customer.y);
    const bob = customer.state === "eating" ? Math.sin(customer.bob) * 0.4 : Math.sin(customer.bob) * 1.4;
    const spriteKey = customer.angry ? "customerAngry" : "customer";
    if (!drawSprite(spriteKey, p.x - 11, p.y - 26 + bob, 22, 32)) {
      ctx.fillStyle = customer.angry ? "#b84d43" : "#f0dbc1";
      ctx.beginPath();
      ctx.arc(p.x, p.y - 12 + bob, 6, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = customer.angry ? "#84413c" : "#5a7aa3";
      ctx.fillRect(p.x - 5, p.y - 6 + bob, 10, 12);

      ctx.fillStyle = "#2c1a10";
      ctx.fillRect(p.x - 4, p.y + 6 + bob, 3, 6);
      ctx.fillRect(p.x + 1, p.y + 6 + bob, 3, 6);
    }

    if (customer.state === "eating") {
      drawPizzaSprite("baked", p.x + 10, p.y - 2 + bob, 8);
    }
  }
}

function drawWorker(worker, spriteKey, color, label, carry = null) {
  if (!worker) {
    return;
  }

  const p = worldToScreen(worker.x, worker.y);

  if (!drawSprite(spriteKey, p.x - 11, p.y - 26, 22, 32)) {
    ctx.fillStyle = "#f0dbc1";
    ctx.beginPath();
    ctx.arc(p.x, p.y - 12, 5.8, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = color;
    ctx.fillRect(p.x - 5, p.y - 6, 10, 12);
    ctx.fillStyle = "#2c1a10";
    ctx.fillRect(p.x - 4, p.y + 6, 3, 6);
    ctx.fillRect(p.x + 1, p.y + 6, 3, 6);
  }

  if (carry) {
    if (!drawPizzaSprite(carry, p.x + 9, p.y - 2, 9)) {
      if (carry === "dough") ctx.fillStyle = "#e8c188";
      else if (carry === "sauce") ctx.fillStyle = "#d24536";
      else if (carry === "cheese") ctx.fillStyle = "#f3db73";
      else ctx.fillStyle = "#c57b36";
      ctx.beginPath();
      ctx.arc(p.x + 9, p.y - 2, 4.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.fillStyle = "rgba(22, 12, 7, 0.75)";
  ctx.fillRect(p.x - 10, p.y - 21, 20, 8);
  ctx.fillStyle = "#ffe7bc";
  ctx.font = "bold 8px monospace";
  ctx.fillText(label, p.x - 8, p.y - 14);
}

function drawWorkers() {
  for (const worker of state.prepWorkers) {
    drawWorker(worker, "workerCook", "#4a9f5b", "COC", worker ? worker.carry : null);
  }
  for (const worker of state.runnerWorkers) {
    drawWorker(worker, "workerRunner", "#4f73b8", "RUN", worker ? worker.carry : null);
  }
  for (const worker of state.cleanerWorkers) {
    drawWorker(worker, "workerCleaner", "#ad7f3c", "LIM", null);
  }
}

function drawPlayer() {
  const x = player.x - WORLD.cameraX;
  const y = player.y - WORLD.cameraY;
  const bob = state.moving ? Math.sin(state.animTime * 14) * 1.4 : 0;
  if (!drawSprite("player", x - 14, y - 38 + bob, 28, 42)) {
    ctx.fillStyle = "#f3d7b8";
    ctx.beginPath();
    ctx.arc(x, y - 20 + bob, 7, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#d92f21";
    ctx.fillRect(x - 8, y - 30 + bob, 16, 4);

    ctx.fillStyle = "#2f4f9f";
    ctx.fillRect(x - 7, y - 13 + bob, 14, 16);

    ctx.fillStyle = "#1e2d62";
    ctx.fillRect(x - 6, y + 2 + bob, 5, 10);
    ctx.fillRect(x + 1, y + 2 + bob, 5, 10);
  }

  if (player.carry) {
    const carryX = player.facing === "left" ? x - 14 : x + 14;
    if (!drawPizzaSprite(player.carry.stage, carryX, y - 12 + bob, 12)) {
      if (player.carry.stage === "dough") ctx.fillStyle = "#e8c188";
      else if (player.carry.stage === "sauce") ctx.fillStyle = "#d24536";
      else if (player.carry.stage === "cheese") ctx.fillStyle = "#f3db73";
      else ctx.fillStyle = "#c57b36";

      ctx.beginPath();
      ctx.arc(carryX, y - 12 + bob, 5.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawOrdersPanel() {
  const panelX = 8;
  const panelY = 8;
  const panelW = 146;
  const rowH = 20;
  const rows = Math.min(5, state.orders.length);

  ctx.fillStyle = "rgba(33, 20, 13, 0.86)";
  ctx.fillRect(panelX, panelY, panelW, 24 + rowH * Math.max(1, rows));
  ctx.fillStyle = "#ffefd3";
  ctx.font = "bold 11px monospace";
  ctx.fillText("PEDIDOS", panelX + 8, panelY + 14);

  for (let i = 0; i < rows; i += 1) {
    const order = state.orders[i];
    const ratio = clamp(order.patience / order.maxPatience, 0, 1);
    const y = panelY + 24 + i * rowH;

    ctx.fillStyle = "#f2d3aa";
    ctx.fillText(`#${order.id} Z${order.zoneId}`, panelX + 7, y + 12);
    ctx.fillStyle = ratio > 0.45 ? "#4cc05d" : ratio > 0.2 ? "#d4a737" : "#d1493a";
    ctx.fillRect(panelX + 67, y + 4, 70 * ratio, 10);
    ctx.strokeStyle = "#efd0aa";
    ctx.strokeRect(panelX + 67, y + 4, 70, 10);
  }
}

function drawStamina() {
  const x = WORLD.viewW - 118;
  const y = 8;

  ctx.fillStyle = "rgba(28, 18, 10, 0.84)";
  ctx.fillRect(x, y, 110, 20);
  ctx.fillStyle = "#9ee0f8";
  ctx.fillRect(x + 4, y + 5, 102 * player.stamina, 10);
  ctx.strokeStyle = "#f5e7cf";
  ctx.strokeRect(x + 4, y + 5, 102, 10);
}

function drawMoveTarget() {
  if (state.tapPulse > 0) {
    const p = worldToScreen(state.tapX, state.tapY);
    ctx.strokeStyle = `rgba(255, 248, 226, ${state.tapPulse})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 10 + (1 - state.tapPulse) * 20, 0, Math.PI * 2);
    ctx.stroke();
  }

  if (!state.moveTarget) {
    return;
  }

  const p = worldToScreen(state.moveTarget.x, state.moveTarget.y);
  ctx.fillStyle = "rgba(255, 252, 236, 0.8)";
  ctx.beginPath();
  ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "rgba(255, 248, 218, 0.45)";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(player.x - WORLD.cameraX, player.y - WORLD.cameraY);
  ctx.lineTo(p.x, p.y);
  ctx.stroke();
}

function drawNearbyHint() {
  const nearest = nearestInteractable();
  if (!nearest) {
    return;
  }

  let text = "Toca para actuar";

  if (nearest.kind === "station") {
    const station = findStationById(nearest.id);
    if (station) {
      text = `Toca: ${station.label} (Z${station.zoneId})`;
      if (station.type === "upgrade") {
        if (state.pendingStoreUnlock) {
          const armed = state.unlockConfirmZone === state.pendingStoreUnlock && state.unlockConfirmTimer > 0;
          text = armed
            ? `Confirmar apertura Z${state.pendingStoreUnlock} (toca CRECE)`
            : `Nueva sucursal lista Z${state.pendingStoreUnlock} (toca CRECE)`;
        } else {
          const up = getStoreUpgradeOffer(station.zoneId);
          const progress = getStoreProgress(station.zoneId);
          const total = STORE_UPGRADE_STEPS.length;
          const unlock = nextStoreUnlockProgress();
          text = up
            ? `Z${station.zoneId}: ${up.name} ($${up.cost}) ${progress.nextUpgrade}/${total} P${progress.prestigeLevel}`
            : `Zona ${station.zoneId} al maximo ${total}/${total}`;
          if (unlock && unlock.remaining > 0) {
            text += ` | Z${unlock.zone} en ${unlock.remaining}`;
          }
        }
      }
    }
  } else if (nearest.kind === "oven") {
    const oven = findOvenById(nearest.id);
    if (oven) {
      text = `Toca: HORNO (Z${oven.zoneId})`;
    }
  } else if (nearest.kind === "dropped") {
    text = "Toca: OBJETO EN PISO";
  }

  ctx.font = "11px monospace";
  const maxWidth = Math.max(160, WORLD.viewW - 20);
  let clipped = text;
  while (ctx.measureText(clipped).width > maxWidth - 16 && clipped.length > 16) {
    clipped = `${clipped.slice(0, -4)}...`;
  }

  const panelW = Math.min(maxWidth, Math.max(150, Math.ceil(ctx.measureText(clipped).width + 16)));
  const panelX = Math.round((WORLD.viewW - panelW) / 2);
  const panelY = WORLD.viewH - 28;

  ctx.fillStyle = "rgba(36, 20, 9, 0.88)";
  ctx.fillRect(panelX, panelY, panelW, 20);
  ctx.fillStyle = "#fff0d8";
  ctx.fillText(clipped, panelX + 8, panelY + 14);
}

function drawChaosTint() {
  if (state.spillActive) {
    ctx.fillStyle = "rgba(195, 44, 27, 0.14)";
    ctx.fillRect(0, 0, WORLD.viewW, WORLD.viewH);
  }

  if (!state.running) {
    ctx.fillStyle = "rgba(26, 17, 10, 0.42)";
    ctx.fillRect(0, 0, WORLD.viewW, WORLD.viewH);
  }
}

function cityNoise(seed) {
  const raw = Math.sin(seed * 12.9898) * 43758.5453;
  return raw - Math.floor(raw);
}

function drawCityMode() {
  const timeOffset = typeof window !== "undefined" && typeof window.__cityTimeOffset === "number"
    ? window.__cityTimeOffset
    : 0;
  const time = performance.now() / 1000 + timeOffset;
  const daylight = (Math.sin(time * 0.08) + 1) / 2;
  const nightAmount = clamp((0.62 - daylight) * 1.55, 0, 0.8);
  const lowPerf = state.lowPerfMode;

  const sky = ctx.createLinearGradient(0, 0, 0, WORLD.viewH);
  sky.addColorStop(0, "#6ba0cb");
  sky.addColorStop(0.56, "#3f6d95");
  sky.addColorStop(1, "#1f3243");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, WORLD.viewW, WORLD.viewH);

  // Distant skyline and stars.
  const skylineCount = lowPerf ? 9 : 14;
  for (let i = 0; i < skylineCount; i += 1) {
    const w = 20 + (i % 5) * 8;
    const h = 38 + (i % 4) * 16 + (i % 3) * 10;
    const x = 6 + i * ((WORLD.viewW - 12) / skylineCount);
    const y = 54 - h + (i % 4) * 4;
    ctx.fillStyle = i % 2 === 0 ? "rgba(20, 44, 66, 0.55)" : "rgba(16, 34, 52, 0.62)";
    ctx.fillRect(x, y, w, h);
    if (nightAmount > 0.25 && !lowPerf) {
      ctx.fillStyle = `rgba(255, 228, 155, ${nightAmount * 0.65})`;
      for (let wy = y + 8; wy < y + h - 4; wy += 9) {
        for (let wx = x + 5; wx < x + w - 3; wx += 8) {
          if (cityNoise(i * 1000 + wx * 17 + wy * 31) > 0.72) {
            ctx.fillRect(wx, wy, 2, 3);
          }
        }
      }
    }
  }
  if (nightAmount > 0.35) {
    const starCount = lowPerf ? 12 : 26;
    for (let i = 0; i < starCount; i += 1) {
      const sx = (i * 71) % WORLD.viewW;
      const sy = 10 + ((i * 53) % 88);
      ctx.fillStyle = `rgba(236, 246, 255, ${0.15 + nightAmount * 0.5})`;
      ctx.fillRect(sx, sy, 2, 2);
    }
  }

  const layout = getCityLayout();
  const roadPad = 10;
  const stepX = layout.cellW + CITY_GRID_GAP;
  const stepY = layout.cellH + CITY_GRID_GAP;
  const blockX = layout.x - roadPad;
  const blockY = layout.y - roadPad;
  const blockW = layout.gridW + roadPad * 2;
  const blockH = layout.gridH + roadPad * 2;

  ctx.fillStyle = "#3f474f";
  ctx.fillRect(blockX, blockY, blockW, blockH);
  ctx.fillStyle = "#545d64";
  for (let col = 1; col < CITY_GRID_COLS; col += 1) {
    const laneX = layout.x + col * stepX - CITY_GRID_GAP;
    ctx.fillRect(laneX, blockY, CITY_GRID_GAP, blockH);
  }
  for (let row = 1; row < CITY_GRID_ROWS; row += 1) {
    const laneY = layout.y + row * stepY - CITY_GRID_GAP;
    ctx.fillRect(blockX, laneY, blockW, CITY_GRID_GAP);
  }

  // Road markings.
  ctx.fillStyle = "rgba(229, 236, 243, 0.78)";
  const roadMarkStep = lowPerf ? 28 : 18;
  for (let x = blockX + 14; x < blockX + blockW - 8; x += roadMarkStep) {
    ctx.fillRect(x, blockY + 5, 10, 1.5);
    ctx.fillRect(x, blockY + blockH - 7, 10, 1.5);
  }
  for (let y = blockY + 14; y < blockY + blockH - 8; y += roadMarkStep) {
    ctx.fillRect(blockX + 5, y, 1.5, 10);
    ctx.fillRect(blockX + blockW - 7, y, 1.5, 10);
  }

  const districtDefs = [
    { name: "CENTRO", tint: "rgba(245, 158, 11, 0.09)", accent: "#f59e0b" },
    { name: "RIBERA", tint: "rgba(56, 189, 248, 0.09)", accent: "#38bdf8" },
    { name: "NORTE", tint: "rgba(34, 197, 94, 0.09)", accent: "#22c55e" }
  ];

  for (let district = 0; district < districtDefs.length; district += 1) {
    const labelX = layout.x + district * stepX * 2 + 4;
    const labelW = stepX * 2 - 10;
    const info = districtDefs[district];
    ctx.fillStyle = "rgba(8, 16, 24, 0.68)";
    ctx.fillRect(labelX, blockY - 15, labelW, 12);
    ctx.fillStyle = info.accent;
    ctx.font = "bold 8px monospace";
    ctx.fillText(info.name, labelX + 4, blockY - 6);
  }

  for (let lotId = 0; lotId < totalCityLots(); lotId += 1) {
    const lot = cityLotRect(lotId);
    const unit = getCityUnitAtLot(lotId);
    const col = lotId % CITY_GRID_COLS;
    const district = districtDefs[Math.floor(col / 2)] || districtDefs[0];

    ctx.fillStyle = "#c7d0d8";
    ctx.fillRect(lot.x - 1, lot.y - 1, lot.w + 2, lot.h + 2);

    if (!unit) {
      if (!drawSprite("cityLot", lot.x, lot.y, lot.w, lot.h)) {
        ctx.fillStyle = "#93b285";
        ctx.fillRect(lot.x, lot.y, lot.w, lot.h);
      }
      ctx.fillStyle = district.tint;
      ctx.fillRect(lot.x, lot.y, lot.w, lot.h);
      ctx.fillStyle = "rgba(255, 255, 255, 0.72)";
      ctx.font = "bold 13px monospace";
      ctx.fillText("+", lot.x + lot.w / 2 - 4, lot.y + lot.h / 2 + 4);
      continue;
    }

    const level = clampInt(unit.level, 1, 20, 1);
    const sprite = level >= 8 ? "cityRestaurantTower" : "cityRestaurant";
    if (!drawSprite(sprite, lot.x, lot.y, lot.w, lot.h)) {
      ctx.fillStyle = "#f0c68d";
      ctx.fillRect(lot.x + 3, lot.y + 3, lot.w - 6, lot.h - 6);
    }
    if (level >= 14 && !lowPerf) {
      drawSprite("cityRestaurantTower", lot.x + lot.w * 0.2, lot.y + lot.h * 0.02, lot.w * 0.62, lot.h * 0.72);
    }

    ctx.fillStyle = district.accent;
    ctx.fillRect(lot.x + 2, lot.y + 2, lot.w - 4, 3);

    if (nightAmount > 0.18 && !lowPerf) {
      ctx.fillStyle = `rgba(255, 219, 122, ${0.16 + nightAmount * 0.62})`;
      for (let wy = lot.y + 16; wy < lot.y + lot.h - 18; wy += 12) {
        for (let wx = lot.x + 10; wx < lot.x + lot.w - 10; wx += 10) {
          if (cityNoise(lotId * 311 + wx * 7 + wy * 13) > 0.56) {
            ctx.fillRect(wx, wy, 4, 5);
          }
        }
      }
    }

    const unitIncome = cityUnitIncome(unit);
    ctx.fillStyle = "rgba(7, 15, 23, 0.82)";
    ctx.fillRect(lot.x + 2, lot.y + 2, lot.w - 4, 12);
    ctx.fillStyle = "#f6e7c9";
    ctx.font = "bold 8px monospace";
    ctx.fillText(`L${level} +$${unitIncome}`, lot.x + 4, lot.y + 10);

    if (level >= 3 && !lowPerf) {
      const bob = Math.sin(time * 1.6 + lotId) * 0.9;
      const px = lot.x + 4 + ((time * 8 + lotId * 9) % Math.max(8, lot.w - 12));
      const py = lot.y + lot.h + 2 + bob;
      ctx.fillStyle = "#1a2330";
      ctx.fillRect(px, py, 3, 6);
      ctx.fillStyle = "#f0dbc1";
      ctx.fillRect(px, py - 3, 3, 3);
    }
  }

  const drawCar = (x, y, horizontal, color) => {
    ctx.fillStyle = "rgba(15, 21, 29, 0.44)";
    if (horizontal) {
      ctx.fillRect(x + 1, y + 7, 14, 2);
    } else {
      ctx.fillRect(x + 7, y + 1, 2, 14);
    }
    ctx.fillStyle = color;
    if (horizontal) {
      ctx.fillRect(x, y, 14, 7);
      ctx.fillStyle = "#dbeafe";
      ctx.fillRect(x + 3, y + 1, 4, 2);
      ctx.fillRect(x + 8, y + 1, 3, 2);
    } else {
      ctx.fillRect(x, y, 7, 14);
      ctx.fillStyle = "#dbeafe";
      ctx.fillRect(x + 1, y + 3, 2, 4);
      ctx.fillRect(x + 1, y + 8, 2, 3);
    }
  };

  const loopW = blockW + 26;
  const loopH = blockH + 26;
  const topY = blockY + 1;
  const bottomY = blockY + blockH - 9;
  const leftX = blockX + 1;
  const rightX = blockX + blockW - 9;
  const topStartX = blockX - 13;
  const leftStartY = blockY - 13;

  const traffic = lowPerf
    ? [
        { axis: "x", y: topY, speed: 34, offset: 0, color: "#ef4444", dir: 1 },
        { axis: "x", y: bottomY, speed: 36, offset: 7, color: "#38bdf8", dir: -1 },
        { axis: "y", x: leftX, speed: 30, offset: 11, color: "#fb7185", dir: 1 },
        { axis: "y", x: rightX, speed: 32, offset: 17, color: "#14b8a6", dir: -1 }
      ]
    : [
        { axis: "x", y: topY, speed: 40, offset: 0, color: "#ef4444", dir: 1 },
        { axis: "x", y: topY + 4, speed: 33, offset: 19, color: "#f59e0b", dir: 1 },
        { axis: "x", y: bottomY, speed: 44, offset: 7, color: "#38bdf8", dir: -1 },
        { axis: "x", y: bottomY - 4, speed: 36, offset: 33, color: "#22c55e", dir: -1 },
        { axis: "y", x: leftX, speed: 35, offset: 11, color: "#fb7185", dir: 1 },
        { axis: "y", x: leftX + 4, speed: 30, offset: 42, color: "#a78bfa", dir: 1 },
        { axis: "y", x: rightX, speed: 38, offset: 17, color: "#14b8a6", dir: -1 }
      ];
  for (const lane of traffic) {
    if (lane.axis === "x") {
      const n = (time * lane.speed + lane.offset) % loopW;
      const x = lane.dir > 0 ? topStartX + n : topStartX + (loopW - n);
      drawCar(x, lane.y, true, lane.color);
    } else {
      const n = (time * lane.speed + lane.offset) % loopH;
      const y = lane.dir > 0 ? leftStartY + n : leftStartY + (loopH - n);
      drawCar(lane.x, y, false, lane.color);
    }
  }

  // Pedestrians moving around perimeter sidewalks.
  if (!lowPerf) {
    const walkerLoopW = blockW + 18;
    const walkerLoopH = blockH + 18;
    const walkers = [
      { axis: "x", y: blockY - 6, speed: 12, offset: 0, dir: 1, tone: "#f2dcc1" },
      { axis: "x", y: blockY + blockH + 2, speed: 11, offset: 23, dir: -1, tone: "#f0d6b7" },
      { axis: "y", x: blockX - 6, speed: 10, offset: 17, dir: 1, tone: "#edd2b3" },
      { axis: "y", x: blockX + blockW + 2, speed: 13, offset: 31, dir: -1, tone: "#efd8bc" }
    ];
    for (const walker of walkers) {
      let wx = walker.x;
      let wy = walker.y;
      if (walker.axis === "x") {
        const n = (time * walker.speed + walker.offset) % walkerLoopW;
        wx = walker.dir > 0 ? blockX - 9 + n : blockX - 9 + (walkerLoopW - n);
        wy = walker.y;
      } else {
        const n = (time * walker.speed + walker.offset) % walkerLoopH;
        wx = walker.x;
        wy = walker.dir > 0 ? blockY - 9 + n : blockY - 9 + (walkerLoopH - n);
      }
      ctx.fillStyle = "#20293a";
      ctx.fillRect(wx + 1, wy + 2, 3, 5);
      ctx.fillStyle = walker.tone;
      ctx.fillRect(wx + 1, wy, 3, 3);
    }
  }

  // Street lights and light cones.
  if (nightAmount > 0.2) {
    for (let i = 0; i <= CITY_GRID_COLS; i += 1) {
      const lx = layout.x + i * stepX - CITY_GRID_GAP;
      const lyTop = blockY - 2;
      const lyBottom = blockY + blockH - 2;
      ctx.fillStyle = "#2b2f37";
      ctx.fillRect(lx, lyTop, 1.5, 9);
      ctx.fillRect(lx, lyBottom - 8, 1.5, 9);
      ctx.fillStyle = `rgba(255, 223, 153, ${nightAmount * 0.72})`;
      ctx.fillRect(lx - 1, lyTop + 8, 4, 2);
      ctx.fillRect(lx - 1, lyBottom - 10, 4, 2);
      if (!lowPerf) {
        ctx.fillStyle = `rgba(255, 223, 153, ${nightAmount * 0.2})`;
        ctx.beginPath();
        ctx.arc(lx + 1, lyTop + 10, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(lx + 1, lyBottom - 8, 8, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  ctx.fillStyle = "rgba(10, 16, 25, 0.86)";
  ctx.fillRect(8, 8, WORLD.viewW - 16, 48);
  ctx.fillStyle = "#f2e6cc";
  ctx.font = "bold 12px monospace";
  const phaseLabel = nightAmount > 0.42 ? "NOCHE" : nightAmount > 0.2 ? "ATARDECER" : "DIA";
  ctx.fillText(`MODO CIUDAD | FRANQUICIAS | ${phaseLabel}`, 14, 24);
  ctx.font = "10px monospace";
  ctx.fillText(`Restaurantes ${state.cityUnits.length}/${totalCityLots()}  Construir $${getCityBuildCost()}`, 14, 40);

  const income = totalCityIncome();
  ctx.fillStyle = "rgba(10, 16, 25, 0.88)";
  ctx.fillRect(8, WORLD.viewH - 44, WORLD.viewW - 16, 34);
  ctx.fillStyle = "#d8efcd";
  ctx.font = "9px monospace";
  ctx.fillText("Lote vacio: construir | Restaurante: mejorar", 14, WORLD.viewH - 31);
  ctx.fillText(`Ingreso por ciclo: $${income}`, 14, WORLD.viewH - 18);

  if (nightAmount > 0) {
    ctx.fillStyle = `rgba(7, 13, 24, ${nightAmount * 0.58})`;
    ctx.fillRect(0, 0, WORLD.viewW, WORLD.viewH);
  }
}

function render() {
  ctx.clearRect(0, 0, WORLD.viewW, WORLD.viewH);

  if (state.gameMode === "city") {
    drawCityMode();
    return;
  }

  drawStreetTiles();
  drawZoneDecor();
  drawStations();
  drawDiningAreas();
  drawDroppedItems();
  drawCustomers();
  drawWorkers();
  drawPlayer();
  drawOrdersPanel();
  drawStamina();
  drawMoveTarget();
  drawNearbyHint();
  drawChaosTint();
}

function saveSnapshot() {
  return {
    version: 9,
    ts: Date.now(),
    cityKey: state.cityKey,
    money: state.money,
    day: state.day,
    stars: state.stars,
    businesses: state.businesses,
    orders: state.orders.map((order) => ({
      id: order.id,
      zoneId: order.zoneId,
      patience: order.patience,
      maxPatience: order.maxPatience,
      countdownStarted: Boolean(order.countdownStarted),
      value: order.value
    })),
    customers: state.customers.map((customer) => ({
      id: customer.id,
      orderId: customer.orderId,
      zoneId: customer.zoneId,
      x: customer.x,
      y: customer.y,
      targetX: customer.targetX,
      targetY: customer.targetY,
      speed: customer.speed,
      state: customer.state,
      angry: customer.angry,
      eatTimer: customer.eatTimer,
      bob: customer.bob
    })),
    droppedItems: state.droppedItems.map((item) => ({
      id: item.id,
      x: item.x,
      y: item.y,
      stage: item.stage
    })),
    orderId: state.orderId,
    customerId: state.customerId,
    droppedItemId: state.droppedItemId,
    dayTimer: state.dayTimer,
    spawnTimer: state.spawnTimer,
    adBoost: state.adBoost,
    adDeskCooldown: state.adDeskCooldown,
    rushLevel: state.rushLevel,
    combo: state.combo,
    comboTimer: state.comboTimer,
    spillTimer: state.spillTimer,
    spillActive: state.spillActive,
    passiveTimer: state.passiveTimer,
    maxOrders: state.maxOrders,
    orderSpawnBase: state.orderSpawnBase,
    patienceBoost: state.patienceBoost,
    payoutMultiplier: state.payoutMultiplier,
    nextUpgrade: state.nextUpgrade,
    passiveIncome: state.passiveIncome,
    secondOvenUnlocked: state.secondOvenUnlocked,
    autoPrepUnlocked: state.autoPrepUnlocked,
    autoRunnerUnlocked: state.autoRunnerUnlocked,
    autoCleanerUnlocked: state.autoCleanerUnlocked,
    storeProgress: ZONES.reduce((acc, zone) => {
      const progress = getStoreProgress(zone.id);
      acc[zone.id] = {
        nextUpgrade: clampInt(progress.nextUpgrade, 0, STORE_UPGRADE_STEPS.length, 0),
        autoPrep: Boolean(progress.autoPrep),
        autoRunner: Boolean(progress.autoRunner),
        autoCleaner: Boolean(progress.autoCleaner),
        secondOven: Boolean(progress.secondOven),
        prestigeLevel: clampInt(progress.prestigeLevel, 0, 99, 0),
        completions: clampInt(progress.completions, 0, 999, 0)
      };
      return acc;
    }, {}),
    prepWorkers: state.prepWorkers.map((worker) => ({ ...worker })),
    runnerWorkers: state.runnerWorkers.map((worker) => ({ ...worker })),
    cleanerWorkers: state.cleanerWorkers.map((worker) => ({ ...worker })),
    prepWorker: state.prepWorkers[0] || null,
    runnerWorker: state.runnerWorkers[0] || null,
    cleanerWorker: state.cleanerWorkers[0] || null,
    ovens: state.ovens.map((oven) => ({
      id: oven.id,
      zoneId: oven.zoneId,
      x: oven.x,
      y: oven.y,
      busy: oven.busy,
      progress: oven.progress,
      bakeTime: oven.bakeTime,
      ready: oven.ready,
      minBusinesses: oven.minBusinesses
    })),
    player: {
      x: player.x,
      y: player.y,
      facing: player.facing,
      baseSpeed: player.baseSpeed,
      stamina: player.stamina,
      carry: player.carry
    },
    gameMode: state.gameMode,
    cityModeUnlocked: state.cityModeUnlocked,
    cityUnits: state.cityUnits.map((unit) => ({
      lotId: unit.lotId,
      level: unit.level
    })),
    cityIncomeTimer: state.cityIncomeTimer,
    cityBuildCount: state.cityBuildCount,
    pendingStoreUnlock: state.pendingStoreUnlock,
    unlockConfirmZone: state.unlockConfirmZone,
    unlockConfirmTimer: state.unlockConfirmTimer,
    muted: state.muted,
    hapticsEnabled: state.hapticsEnabled,
    hudDetailsOpen: state.hudDetailsOpen,
    dashAuto: state.dashAuto
  };
}

function saveGame() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(saveSnapshot()));
    state.saveDirty = false;
    state.autosaveTimer = 0;
    ui.continueBtn.hidden = false;
  } catch (_error) {
    // ignore save failures in privacy mode
  }
}

function loadGame() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") {
      return null;
    }
    return parsed;
  } catch (_error) {
    return null;
  }
}

function sanitizePrepWorkerData(raw, maxUnlockedZone) {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const zoneId = clampInt(raw.zoneId, 1, maxUnlockedZone, 1);
  const zone = zoneById(zoneId);
  return {
    zoneId,
    x: clampNum(raw.x, zone.xMin + 24, zone.xMax - 24, zone.xMin + 120),
    y: clampNum(raw.y, 24, WORLD.height - 24, 330),
    state: ["toDough", "toSauce", "toCheese", "toOven", "waitOven"].includes(raw.state) ? raw.state : "toDough",
    carry: ["dough", "sauce", "cheese", "baked", null].includes(raw.carry) ? raw.carry : null,
    targetOvenId: typeof raw.targetOvenId === "string" ? raw.targetOvenId : null
  };
}

function sanitizeRunnerWorkerData(raw, maxUnlockedZone) {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const zoneId = clampInt(raw.zoneId, 1, maxUnlockedZone, 1);
  const zone = zoneById(zoneId);
  return {
    zoneId,
    x: clampNum(raw.x, zone.xMin + 24, zone.xMax - 24, zone.xMin + 660),
    y: clampNum(raw.y, 24, WORLD.height - 24, 330),
    carry: ["baked", null].includes(raw.carry) ? raw.carry : null,
    targetOvenId: typeof raw.targetOvenId === "string" ? raw.targetOvenId : null
  };
}

function sanitizeCleanerWorkerData(raw, maxUnlockedZone) {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const zoneId = clampInt(raw.zoneId, 1, maxUnlockedZone, 1);
  const zone = zoneById(zoneId);
  return {
    zoneId,
    x: clampNum(raw.x, zone.xMin + 24, zone.xMax - 24, zone.xMin + 560),
    y: clampNum(raw.y, 24, WORLD.height - 24, 468),
    state: ["idle", "cleaning"].includes(raw.state) ? raw.state : "idle"
  };
}

function readWorkersFromSave(rawList, legacyWorker, sanitizeWorker) {
  const workers = [];
  const seenZones = new Set();

  if (Array.isArray(rawList)) {
    for (const rawWorker of rawList) {
      const worker = sanitizeWorker(rawWorker);
      if (!worker || seenZones.has(worker.zoneId)) {
        continue;
      }
      seenZones.add(worker.zoneId);
      workers.push(worker);
    }
  }

  if (!workers.length) {
    const fallback = sanitizeWorker({ ...(legacyWorker || {}), zoneId: 1 });
    if (fallback) {
      workers.push(fallback);
    }
  }

  return workers;
}

function sanitizeStoreProgressData(raw, fallback = null) {
  const base = fallback && typeof fallback === "object" ? fallback : createStoreProgressEntry();
  if (!raw || typeof raw !== "object") {
    return {
      nextUpgrade: clampInt(base.nextUpgrade, 0, STORE_UPGRADE_STEPS.length, 0),
      autoPrep: Boolean(base.autoPrep),
      autoRunner: Boolean(base.autoRunner),
      autoCleaner: Boolean(base.autoCleaner),
      secondOven: Boolean(base.secondOven),
      prestigeLevel: clampInt(base.prestigeLevel, 0, 99, 0),
      completions: clampInt(base.completions, 0, 999, 0)
    };
  }

  return {
    nextUpgrade: clampInt(raw.nextUpgrade, 0, STORE_UPGRADE_STEPS.length, base.nextUpgrade),
    autoPrep: typeof raw.autoPrep === "boolean" ? raw.autoPrep : Boolean(base.autoPrep),
    autoRunner: typeof raw.autoRunner === "boolean" ? raw.autoRunner : Boolean(base.autoRunner),
    autoCleaner: typeof raw.autoCleaner === "boolean" ? raw.autoCleaner : Boolean(base.autoCleaner),
    secondOven: typeof raw.secondOven === "boolean" ? raw.secondOven : Boolean(base.secondOven),
    prestigeLevel: clampInt(raw.prestigeLevel, 0, 99, clampInt(base.prestigeLevel, 0, 99, 0)),
    completions: clampInt(raw.completions, 0, 999, clampInt(base.completions, 0, 999, 0))
  };
}

function readCityUnitsFromSave(rawUnits) {
  const units = [];
  const usedLots = new Set();
  const maxLot = totalCityLots() - 1;

  if (!Array.isArray(rawUnits)) {
    return units;
  }

  for (const raw of rawUnits) {
    if (!raw || typeof raw !== "object") {
      continue;
    }
    const lotId = clampInt(raw.lotId, 0, maxLot, -1);
    if (lotId < 0 || usedLots.has(lotId)) {
      continue;
    }
    const level = clampInt(raw.level, 1, 20, 1);
    usedLots.add(lotId);
    units.push({ lotId, level });
    if (units.length >= totalCityLots()) {
      break;
    }
  }

  return units;
}

function applySave(data) {
  if (
    !data ||
    (data.version !== 3 &&
      data.version !== 4 &&
      data.version !== 5 &&
      data.version !== 6 &&
      data.version !== 7 &&
      data.version !== 8 &&
      data.version !== 9)
  ) {
    return false;
  }

  const campaignKey = CAMPAIGNS[data.cityKey] ? data.cityKey : "usa";
  resetProgress(campaignKey);

  state.money = clampNum(data.money, 0, 999999, state.money);
  state.moneyDisplay = state.money;
  state.moneyTween = null;
  state.day = clampInt(data.day, 1, 999, 1);
  state.stars = clampNum(data.stars, 0.8, 5, 5);
  state.businesses = clampInt(data.businesses, 1, 12, 1);
  state.orderId = clampInt(data.orderId, 1, 2000000, 1);
  state.customerId = clampInt(data.customerId, 1, 2000000, 1);
  state.droppedItemId = clampInt(data.droppedItemId, 1, 2000000, 1);
  state.dayTimer = clampNum(data.dayTimer, 0, 999, 0);
  state.spawnTimer = clampNum(data.spawnTimer, 0, 999, 0);
  state.adBoost = clampInt(data.adBoost, 0, 40, 0);
  state.adDeskCooldown = clampNum(data.adDeskCooldown, 0, 60, 0);
  state.rushLevel = clampNum(data.rushLevel, 1, 40, 1);
  state.combo = clampInt(data.combo, 0, 12, 0);
  state.comboTimer = clampNum(data.comboTimer, 0, 30, 0);
  state.spillTimer = clampNum(data.spillTimer, 2, 30, 12);
  state.spillActive = Boolean(data.spillActive);
  state.passiveTimer = clampNum(data.passiveTimer, 0, 999, 0);
  state.maxOrders = clampInt(data.maxOrders, 2, 26, 2);
  state.orderSpawnBase = clampNum(data.orderSpawnBase, 3.2, 12, currentCampaign().spawnBase);
  state.patienceBoost = clampNum(data.patienceBoost, -12, 16, currentCampaign().patienceBoost);
  state.payoutMultiplier = clampNum(data.payoutMultiplier, 0.7, 2.2, currentCampaign().payoutMultiplier);
  const legacyNextUpgrade = clampInt(data.nextUpgrade, 0, STORE_UPGRADE_STEPS.length, 0);
  const legacyAutoPrep = Boolean(data.autoPrepUnlocked);
  const legacyAutoRunner = Boolean(data.autoRunnerUnlocked);
  const legacyAutoCleaner = Boolean(data.autoCleanerUnlocked);
  const legacySecondOven = Boolean(data.secondOvenUnlocked);
  state.nextUpgrade = legacyNextUpgrade;
  state.passiveIncome = clampNum(data.passiveIncome, 0, 140, 0);
  state.secondOvenUnlocked = legacySecondOven;
  state.autoPrepUnlocked = legacyAutoPrep;
  state.autoRunnerUnlocked = legacyAutoRunner;
  state.autoCleanerUnlocked = legacyAutoCleaner;
  state.muted = Boolean(data.muted);
  state.hapticsEnabled = typeof data.hapticsEnabled === "boolean" ? data.hapticsEnabled : true;
  state.hudDetailsOpen = typeof data.hudDetailsOpen === "boolean" ? data.hudDetailsOpen : false;
  state.dashAuto = Boolean(data.dashAuto);
  state.sprintBurstTimer = 0;
  state.sprintHeld = false;
  state.cityRenderTimer = 0;
  state.lastTapMs = 0;
  state.lastTapX = 0;
  state.lastTapY = 0;

  state.storeProgress = createDefaultStoreProgress();
  if (data.storeProgress && typeof data.storeProgress === "object") {
    for (const zone of ZONES) {
      const key = String(zone.id);
      state.storeProgress[key] = sanitizeStoreProgressData(data.storeProgress[key], state.storeProgress[key]);
    }
  } else {
    const z1 = sanitizeStoreProgressData(
      {
        nextUpgrade: clampInt(legacyNextUpgrade, 0, STORE_UPGRADE_STEPS.length, 0),
        autoPrep: legacyAutoPrep,
        autoRunner: legacyAutoRunner,
        autoCleaner: legacyAutoCleaner,
        secondOven: legacySecondOven
      },
      state.storeProgress[1]
    );
    const baseline = Number(z1.autoPrep) + Number(z1.autoRunner) + Number(z1.autoCleaner) + Number(z1.secondOven);
    z1.nextUpgrade = Math.max(z1.nextUpgrade, baseline);
    state.storeProgress[1] = z1;
  }

  for (const zone of ZONES) {
    const progress = getStoreProgress(zone.id);
    if (progress.nextUpgrade >= STORE_UPGRADE_STEPS.length) {
      progress.completions = Math.max(1, clampInt(progress.completions, 0, 999, 0));
    }
  }

  state.cityUnits = readCityUnitsFromSave(data.cityUnits);
  state.cityIncomeTimer = clampNum(data.cityIncomeTimer, 0, 30, 0);
  state.cityBuildCount = clampInt(data.cityBuildCount, 0, 9999, state.cityUnits.length);
  const completedAllStores = completedStoreCount() >= ZONES.length;
  state.cityModeUnlocked = Boolean(data.cityModeUnlocked) || completedAllStores || state.cityUnits.length > 0;
  const savedMode = data.gameMode === "city" ? "city" : "pizza";
  state.gameMode = state.cityModeUnlocked
    ? (data.gameMode ? savedMode : "city")
    : "pizza";

  const pendingUnlock = syncPendingStoreUnlockFromProgress();
  if (pendingUnlock && clampInt(data.unlockConfirmZone, 1, ZONES.length, 0) === pendingUnlock) {
    state.unlockConfirmZone = pendingUnlock;
    state.unlockConfirmTimer = clampNum(data.unlockConfirmTimer, 0, 8, 0);
  } else {
    state.unlockConfirmZone = null;
    state.unlockConfirmTimer = 0;
  }
  const unlockedZones = getUnlockedZones();
  const maxUnlockedZone = unlockedZones.length ? unlockedZones[unlockedZones.length - 1].id : 1;

  if (Array.isArray(data.orders)) {
    state.orders = data.orders.slice(0, 26).map((order, index) => ({
      id: clampInt(order.id, 1, 9999999, state.orderId + index),
      zoneId: clampInt(order.zoneId, 1, maxUnlockedZone, 1),
      patience: clampNum(order.patience, 0.1, 240, 20),
      maxPatience: clampNum(order.maxPatience, 4, 280, 22),
      countdownStarted: Boolean(order.countdownStarted),
      value: clampInt(order.value, 8, 700, 20)
    }));
  }

  if (Array.isArray(data.ovens) && data.ovens.length) {
    state.ovens = data.ovens.slice(0, 10).map((oven, index) => ({
      id: typeof oven.id === "string" ? oven.id : `oven-${index + 1}`,
      zoneId: clampInt(oven.zoneId, 1, 3, 1),
      x: clampNum(oven.x, 40, WORLD.width - 40, 510),
      y: clampNum(oven.y, 40, WORLD.height - 40, 226),
      busy: Boolean(oven.busy),
      progress: clampNum(oven.progress, 0, 40, 0),
      bakeTime: clampNum(oven.bakeTime, 2.2, 12, 4.8),
      ready: Boolean(oven.ready),
      minBusinesses: clampInt(oven.minBusinesses, 1, 3, 1)
    }));
  }

  if (!state.ovens.length) {
    state.ovens = buildBaseOvens();
  }

  for (const zone of ZONES) {
    if (getStoreProgress(zone.id).secondOven) {
      ensureZoneSecondOven(zone.id, 3.9 - (zone.id - 1) * 0.1);
    }
  }

  for (const oven of state.ovens) {
    const zone = zoneById(oven.zoneId);
    if (oven.id === `z${zone.id}-main`) {
      oven.x = zone.xMin + 512;
      oven.y = 226;
      oven.minBusinesses = zone.minBusinesses;
    } else if (oven.id === getZoneSecondOvenId(zone.id)) {
      oven.x = zone.xMin + 588;
      oven.y = 226;
      oven.minBusinesses = zone.minBusinesses;
    }
  }

  for (const zone of ZONES) {
    if (state.ovens.some((oven) => oven.id === getZoneSecondOvenId(zone.id))) {
      getStoreProgress(zone.id).secondOven = true;
    }
  }

  if (Array.isArray(data.customers)) {
    state.customers = data.customers.slice(0, 40).map((customer, index) => ({
      id: clampInt(customer.id, 1, 9999999, state.customerId + index),
      orderId: clampInt(customer.orderId, 1, 9999999, 1),
      zoneId: clampInt(customer.zoneId, 1, maxUnlockedZone, 1),
      x: clampNum(customer.x, 20, WORLD.width - 20, 42),
      y: clampNum(customer.y, 20, WORLD.height - 20, 724),
      targetX: clampNum(customer.targetX, 20, WORLD.width - 20, 42),
      targetY: clampNum(customer.targetY, 20, WORLD.height - 20, 724),
      speed: clampNum(customer.speed, 30, 120, 56),
      state: ["entering", "waiting", "eating", "leaving"].includes(customer.state) ? customer.state : "entering",
      angry: Boolean(customer.angry),
      eatTimer: clampNum(customer.eatTimer, 0, 25, 0),
      bob: clampNum(customer.bob, -9999, 9999, Math.random() * Math.PI * 2)
    }));
  }

  if (Array.isArray(data.droppedItems)) {
    state.droppedItems = data.droppedItems.slice(0, 24).map((item, index) => ({
      id: clampInt(item.id, 1, 9999999, state.droppedItemId + index),
      x: clampNum(item.x, 24, getMaxReachX() - 24, player.x),
      y: clampNum(item.y, 24, WORLD.height - 24, player.y),
      stage: ["dough", "sauce", "cheese", "baked"].includes(item.stage) ? item.stage : "dough"
    }));
  }

  state.prepWorkers = readWorkersFromSave(
    data.prepWorkers,
    data.prepWorker && typeof data.prepWorker === "object" ? data.prepWorker : null,
    (worker) => sanitizePrepWorkerData(worker, maxUnlockedZone)
  );
  state.runnerWorkers = readWorkersFromSave(
    data.runnerWorkers,
    data.runnerWorker && typeof data.runnerWorker === "object" ? data.runnerWorker : null,
    (worker) => sanitizeRunnerWorkerData(worker, maxUnlockedZone)
  );
  state.cleanerWorkers = readWorkersFromSave(
    data.cleanerWorkers,
    data.cleanerWorker && typeof data.cleanerWorker === "object" ? data.cleanerWorker : null,
    (worker) => sanitizeCleanerWorkerData(worker, maxUnlockedZone)
  );
  syncWorkersForUnlockedStorefronts();

  for (const customer of state.customers) {
    if (customer.state === "waiting" || customer.state === "eating") {
      const linkedOrder = state.orders.find((order) => order.id === customer.orderId);
      if (linkedOrder) {
        linkedOrder.countdownStarted = true;
      }
    }
  }

  if (data.player && typeof data.player === "object") {
    player.x = clampNum(data.player.x, 24, getMaxReachX() - 24, 150);
    player.y = clampNum(data.player.y, 24, WORLD.height - 24, 560);
    player.facing = ["up", "down", "left", "right"].includes(data.player.facing) ? data.player.facing : "down";
    player.baseSpeed = clampNum(data.player.baseSpeed, 90, 300, 118 + currentCampaign().speedBonus);
    player.stamina = clampNum(data.player.stamina, 0, 1, 1);
    player.carry = data.player.carry && typeof data.player.carry === "object" ? data.player.carry : null;
  }

  if (state.gameMode === "city") {
    WORLD.cameraX = 0;
    WORLD.cameraY = 0;
    state.moveTarget = null;
    state.pendingInteract = null;
    state.moving = false;
    player.carry = null;
  }

  syncCustomersWithOrders();
  updateSoundLabel();
  updateHapticLabel();
  updateSprintLabel();
  setHudDetailsOpen(state.hudDetailsOpen);
  setCampaignChoice(campaignKey);
  updateHud();

  return true;
}

function worldPointFromEvent(event) {
  const rect = canvas.getBoundingClientRect();
  const localX = clamp(event.clientX - rect.left, 0, rect.width);
  const localY = clamp(event.clientY - rect.top, 0, rect.height);
  return {
    x: WORLD.cameraX + localX,
    y: WORLD.cameraY + localY
  };
}

function screenPointFromEvent(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: clamp(event.clientX - rect.left, 0, rect.width),
    y: clamp(event.clientY - rect.top, 0, rect.height)
  };
}

function isDoubleTapAt(point) {
  const now = performance.now();
  const withinTime = now - state.lastTapMs <= DOUBLE_TAP_MS;
  const withinDistance = pointDistance(point.x, point.y, state.lastTapX, state.lastTapY) <= DOUBLE_TAP_DISTANCE;
  const result = withinTime && withinDistance;

  state.lastTapMs = now;
  state.lastTapX = point.x;
  state.lastTapY = point.y;

  return result;
}

function handleCityTap(event) {
  if (!state.running || state.gameMode !== "city") {
    return;
  }

  event.preventDefault();
  sound.unlock();

  const point = screenPointFromEvent(event);
  const lotId = cityLotFromPoint(point.x, point.y);
  if (lotId < 0) {
    showToast("Toca un lote para construir.");
    sound.play("fail");
    return;
  }

  const unit = getCityUnitAtLot(lotId);
  if (!unit) {
    const cost = getCityBuildCost();
    if (state.money < cost) {
      clearSpendConfirm();
      showToast(`Necesitas $${cost} para construir una unidad.`);
      sound.play("fail");
      return;
    }

    const buildToken = `city-build|${lotId}|${state.cityBuildCount}|${cost}`;
    if (
      !requireSpendConfirm(
        buildToken,
        `Confirmar nuevo restaurante por $${cost}. Toca el lote otra vez.`
      )
    ) {
      return;
    }

    state.money -= cost;
    state.cityBuildCount += 1;
    state.cityUnits.push({ lotId, level: 1 });
    state.stars = clamp(state.stars + 0.01, 0.8, 5);
    startMoneyTween(state.money, 0.34, 0.02);
    showToast(`Unidad nueva creada por $${cost}.`);
    sound.play("action");
    buzz(10);
    markDirty();
    return;
  }

  const upgradeCost = getCityUpgradeCost(unit);
  if (state.money < upgradeCost) {
    clearSpendConfirm();
    showToast(`Mejora requiere $${upgradeCost}.`);
    sound.play("fail");
    return;
  }

  const upgradeToken = `city-upgrade|${lotId}|${unit.level}|${upgradeCost}`;
  if (
    !requireSpendConfirm(
      upgradeToken,
      `Confirmar mejora a nivel ${unit.level + 1} por $${upgradeCost}. Toca otra vez.`
    )
  ) {
    return;
  }

  state.money -= upgradeCost;
  unit.level = clampInt(unit.level + 1, 1, 20, 20);
  if (unit.level % 4 === 0) {
    state.stars = clamp(state.stars + 0.03, 0.8, 5);
  }
  startMoneyTween(state.money, 0.36, 0.03);
  showToast(`Unidad mejorada a nivel ${unit.level}.`);
  sound.play("upgrade");
  buzz(8);
  markDirty();
}

function handleMapTap(event) {
  if (!state.running) {
    return;
  }

  if (state.gameMode === "city") {
    handleCityTap(event);
    return;
  }

  event.preventDefault();
  sound.unlock();

  const point = worldPointFromEvent(event);
  point.x = clamp(point.x, 24, getMaxReachX() - 24);
  point.y = clamp(point.y, 24, WORLD.height - 24);

  state.tapX = point.x;
  state.tapY = point.y;
  state.tapPulse = 1;

  if (isTapOnPlayer(point)) {
    useSelfDropOrPickup(false);
    return;
  }

  if (isDoubleTapAt(point)) {
    state.sprintBurstTimer = 1.5;
    sound.play("action");
  }

  const token = findInteractableAt(point.x, point.y);

  if (token) {
    if (canInteract(token)) {
      interactToken(token);
      return;
    }

    const center = getInteractableCenter(token);
    if (!center) {
      return;
    }

    state.moveTarget = {
      x: clamp(center.x, 24, getMaxReachX() - 24),
      y: clamp(center.y, 24, WORLD.height - 24)
    };
    state.pendingInteract = token;
    sound.play("ui");
    return;
  }

  state.moveTarget = { x: point.x, y: point.y };
  state.pendingInteract = null;
  sound.play("ui");
}

function setupCanvasControls() {
  let activePointerId = null;
  let downX = 0;
  let downY = 0;

  canvas.addEventListener(
    "pointerdown",
    (event) => {
      activePointerId = event.pointerId;
      downX = event.clientX;
      downY = event.clientY;
    },
    { passive: true }
  );

  canvas.addEventListener(
    "pointerup",
    (event) => {
      if (activePointerId !== event.pointerId) {
        return;
      }
      activePointerId = null;
      const delta = Math.hypot(event.clientX - downX, event.clientY - downY);
      if (delta > TAP_DRAG_THRESHOLD) {
        return;
      }
      handleMapTap(event);
    },
    { passive: false }
  );

  canvas.addEventListener(
    "pointercancel",
    (event) => {
      if (activePointerId === event.pointerId) {
        activePointerId = null;
      }
    },
    { passive: true }
  );
}

function setupKeyboard() {
  window.addEventListener("keydown", (event) => {
    const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
    state.keys.add(key);

    if (key === " ") {
      event.preventDefault();
      if (event.repeat) {
        return;
      }
      if (useSelfDropOrPickup(true)) {
        return;
      }
      const nearest = nearestInteractable();
      if (nearest) {
        interactToken(nearest);
      }
    }
  });

  window.addEventListener("keyup", (event) => {
    const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
    state.keys.delete(key);
  });
}

function setupCampaignButtons() {
  ui.cityOptions.forEach((btn) => {
    btn.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      setCampaignChoice(btn.dataset.city);
      sound.play("ui");
    });
  });
}

function setupMainButtons() {
  let lastTapMs = 0;
  const bindTap = (button, handler) => {
    const run = (event) => {
      const now = performance.now();
      if (event.type === "click" && now - lastTapMs < 260) {
        return;
      }
      if (event.type === "pointerup") {
        lastTapMs = now;
      }
      event.preventDefault();
      handler();
    };

    button.addEventListener("pointerup", run);
    button.addEventListener("click", run);
  };

  bindTap(ui.startBtn, () => {
    resetProgress(selectedCampaign);
    startShift(false);
  });

  bindTap(ui.continueBtn, () => {
    const save = loadGame();
    if (!save || !applySave(save)) {
      showToast("No se encontro una partida valida. Inicia una nueva partida.");
      ui.continueBtn.hidden = true;
      return;
    }

    startShift(true);
  });

  bindTap(ui.soundBtn, () => {
    state.muted = !state.muted;
    updateSoundLabel();
    if (!state.muted) {
      sound.unlock();
      sound.play("ui");
    }
    markDirty();
  });

  bindTap(ui.hapticBtn, () => {
    state.hapticsEnabled = !state.hapticsEnabled;
    updateHapticLabel();
    sound.play("ui");
    markDirty();
  });

  if (ui.hudDetailsBtn) {
    bindTap(ui.hudDetailsBtn, () => {
      setHudDetailsOpen(!state.hudDetailsOpen);
      sound.play("ui");
      markDirty();
    });
  }

  if (ui.sprintBtn) {
    const stopSprint = () => {
      if (!state.sprintHeld) {
        return;
      }
      state.sprintHeld = false;
      updateSprintLabel();
    };

    ui.sprintBtn.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      if (!state.running || state.gameMode === "city") {
        return;
      }
      state.sprintHeld = true;
      updateSprintLabel();
      sound.play("ui");
    });

    ui.sprintBtn.addEventListener("pointerup", stopSprint);
    ui.sprintBtn.addEventListener("pointercancel", stopSprint);
    ui.sprintBtn.addEventListener("pointerleave", stopSprint);
  }
}

function startShift(fromSave = false) {
  state.running = true;
  ui.startOverlay.style.display = "none";

  if (!fromSave && state.gameMode !== "city" && state.orders.length === 0) {
    spawnOrder(1);
  }

  if (state.gameMode === "city") {
    showToast(
      fromSave
        ? "Modo Ciudad reanudado. Toca lotes para construir y escalar."
        : "Nueva etapa: Modo Ciudad. Toca lotes para construir unidades.",
      2.8
    );
  } else {
    showToast(
      fromSave ? "Bienvenido de regreso. Turno reanudado." : "Turno iniciado. Toca para moverte. Doble toque para sprint.",
      2.4
    );
  }
  sound.play("success");
  markDirty();
}

function tick(ts) {
  if (typeof document !== "undefined" && document.hidden) {
    last = ts;
    requestAnimationFrame(tick);
    return;
  }

  const dt = Math.min(0.033, (ts - last) / 1000 || 0);
  last = ts;

  if (state.running) {
    if (state.gameMode === "city") {
      updateCityMode(dt);
    } else {
      updateMovement(dt);
      updateOrders(dt);
      updateCustomers(dt);
      updateOvens(dt);
      updateWorkers(dt);
      updateDayProgress(dt);
      updateSpills(dt);

      state.spawnTimer += dt;
      const spawnRate = currentSpawnRate();
      if (state.spawnTimer >= spawnRate) {
        state.spawnTimer = 0;
        spawnOrder(1);
      }

      if (state.adDeskCooldown > 0) {
        state.adDeskCooldown -= dt;
      }

      if (state.stars <= 1.0 && state.orders.length > 0) {
        state.rushLevel = Math.max(1, state.rushLevel - dt * 0.5);
      }
    }

    if (state.comboTimer > 0) {
      state.comboTimer -= dt;
      if (state.comboTimer <= 0) {
        state.combo = 0;
      }
    }

    if (state.unlockConfirmTimer > 0) {
      state.unlockConfirmTimer = Math.max(0, state.unlockConfirmTimer - dt);
      if (state.unlockConfirmTimer <= 0) {
        state.unlockConfirmTimer = 0;
        state.unlockConfirmZone = null;
      }
    }

    if (state.spendConfirmTimer > 0) {
      state.spendConfirmTimer = Math.max(0, state.spendConfirmTimer - dt);
      if (state.spendConfirmTimer <= 0) {
        clearSpendConfirm();
      }
    }

    if (state.passiveIncome > 0) {
      state.passiveTimer += dt;
      if (state.passiveTimer >= 4) {
        state.passiveTimer = 0;
        state.money += state.passiveIncome;
        markDirty();
      }
    }
  }

  if (state.tapPulse > 0) {
    state.tapPulse = Math.max(0, state.tapPulse - dt * 2.4);
  }

  if (state.messageTimer > 0) {
    state.messageTimer -= dt;
    if (state.messageTimer <= 0) {
      ui.toast.classList.remove("show");
    }
  }

  updateMoneyTween(dt);

  if (state.saveDirty) {
    state.autosaveTimer += dt;
    if (state.autosaveTimer >= 2.2) {
      saveGame();
    }
  }

  updateHud();

  let shouldRender = true;
  if (state.running && state.gameMode === "city" && state.lowPerfMode) {
    state.cityRenderTimer += dt;
    if (state.cityRenderTimer < 1 / CITY_LOW_FPS) {
      shouldRender = false;
    } else {
      state.cityRenderTimer = 0;
    }
  } else {
    state.cityRenderTimer = 0;
  }

  if (shouldRender) {
    render();
  }
  requestAnimationFrame(tick);
}

async function bootstrap() {
  state.lowPerfMode = detectLowPerformanceMode();
  loadSprites();
  resizeCanvas();
  setCampaignChoice("usa");
  resetProgress("usa");

  setupCanvasControls();
  setupKeyboard();
  setupCampaignButtons();
  setupMainButtons();

  const save = loadGame();
  ui.continueBtn.hidden = !save;

  updateSoundLabel();
  updateHapticLabel();
  updateSprintLabel();
  updateHud();

  window.addEventListener("resize", resizeCanvas);

  await setupBootSplash();

  last = performance.now();
  requestAnimationFrame(tick);
}

bootstrap();
