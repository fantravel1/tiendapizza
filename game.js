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
  toast: document.getElementById("toast"),
  soundBtn: document.getElementById("soundBtn"),
  dashBtn: document.getElementById("dashBtn"),
  startBtn: document.getElementById("startBtn"),
  continueBtn: document.getElementById("continueBtn"),
  cityDesc: document.getElementById("cityDesc"),
  cityOptions: [...document.querySelectorAll(".city-option")],
  startOverlay: document.getElementById("startOverlay")
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
  prepWorker: null,
  runnerWorker: null,
  cleanerWorker: null,
  keys: new Set(),
  dashAuto: false,
  moving: false,
  animTime: 0,
  autosaveTimer: 0,
  saveDirty: false,
  muted: false,
  moveTarget: null,
  pendingInteract: null,
  sprintBurstTimer: 0,
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
let selectedCampaign = "usa";
let last = 0;

function createPrepWorker() {
  return {
    x: 120,
    y: 330,
    state: "toDough",
    carry: null,
    targetOvenId: null
  };
}

function createRunnerWorker() {
  return {
    x: 660,
    y: 330,
    carry: null,
    targetOvenId: null
  };
}

function createCleanerWorker() {
  return {
    x: 560,
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

    if (zone.id === 1) {
      stations.push(createStation("z1-ads", "ads", 1, x0 + 186, 388, 124, 76, "#225f95", "ANUN", 1));
      stations.push(createStation("z1-upgrade", "upgrade", 1, x0 + 338, 388, 154, 76, "#1f7f40", "CRECE", 1));
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
        showToast("Ayudante contratado: cocina automatica en Tienda 1.");
      }
    },
    {
      name: "Repartidor de Mostrador",
      cost: 190,
      apply: () => {
        state.autoRunnerUnlocked = true;
        showToast("Repartidor contratado: horno a mostrador en Tienda 1.");
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
  const ratio = window.devicePixelRatio || 1;
  canvas.width = Math.floor(rect.width * ratio);
  canvas.height = Math.floor(rect.height * ratio);
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  WORLD.viewW = rect.width;
  WORLD.viewH = rect.height;
}

function updateDashLabel() {
  if (!ui.dashBtn) {
    return;
  }
  ui.dashBtn.textContent = `Sprint Auto: ${state.dashAuto ? "Encendido" : "Apagado"}`;
}

function updateSoundLabel() {
  ui.soundBtn.textContent = state.muted ? "Sonido Apagado" : "Sonido Activo";
}

function updateHud() {
  if (!state.moneyTween) {
    state.moneyDisplay = state.money;
  }
  ui.city.textContent = state.city;
  ui.money.textContent = `$${Math.floor(state.moneyDisplay)}`;
  ui.day.textContent = String(state.day);
  ui.rep.textContent = state.stars.toFixed(1);
  ui.queue.textContent = `${state.orders.length}/${state.maxOrders}`;
  ui.shops.textContent = String(state.businesses);
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
  state.secondOvenUnlocked = false;
  state.autoPrepUnlocked = false;
  state.autoRunnerUnlocked = false;
  state.autoCleanerUnlocked = false;
  state.prepWorker = createPrepWorker();
  state.runnerWorker = createRunnerWorker();
  state.cleanerWorker = createCleanerWorker();
  state.keys.clear();
  state.dashAuto = false;
  state.moving = false;
  state.animTime = 0;
  state.autosaveTimer = 0;
  state.saveDirty = false;
  state.moveTarget = null;
  state.pendingInteract = null;
  state.sprintBurstTimer = 0;
  state.lastTapMs = 0;
  state.lastTapX = 0;
  state.lastTapY = 0;
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
  updateDashLabel();
  updateHud();
}

function showToast(text, seconds = 1.7) {
  ui.toast.textContent = text;
  ui.toast.classList.add("show");
  state.messageTimer = seconds;
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

function spawnOrder(count = 1) {
  const unlockedZones = getUnlockedZones();
  if (!unlockedZones.length) {
    return;
  }

  for (let i = 0; i < count; i += 1) {
    if (state.orders.length >= state.maxOrders) {
      return;
    }

    const zone = randomChoice(unlockedZones);
    const patience = Math.max(8, 28 + Math.random() * 16 - state.day * 0.75 + state.patienceBoost - zone.id * 0.8);
    const baseValue = 18 + state.day * 2 + Math.floor(Math.random() * 8);
    const value = Math.floor(baseValue * (0.95 + state.businesses * 0.06) * state.payoutMultiplier * (1 + zone.id * 0.02));

    const order = {
      id: state.orderId,
      zoneId: zone.id,
      patience,
      maxPatience: patience,
      countdownStarted: false,
      value
    };

    state.orders.push(order);
    spawnCustomerForOrder(order);
    state.orderId += 1;
  }

  sound.play("order");
  markDirty();
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
    showToast("No hay suficiente dinero para anuncios.");
    sound.play("fail");
    buzz(10);
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

function buyUpgrade() {
  if (state.nextUpgrade >= state.upgrades.length) {
    showToast("Ya desbloqueaste todas las mejoras.");
    sound.play("fail");
    return;
  }

  const upgrade = state.upgrades[state.nextUpgrade];
  if (state.money < upgrade.cost) {
    showToast(`${upgrade.name} requiere $${upgrade.cost}.`);
    sound.play("fail");
    return;
  }

  const before = state.businesses;

  state.money -= upgrade.cost;
  upgrade.apply();
  state.nextUpgrade += 1;

  showToast(`Desbloqueado: ${upgrade.name}`);
  sound.play("upgrade");
  buzz(18);

  if (state.businesses > before) {
    spawnOrder(2);
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

  showToast("succes!");
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

function updatePrepWorker(dt) {
  if (!state.autoPrepUnlocked || !state.prepWorker) {
    return;
  }

  const worker = state.prepWorker;
  const dough = getStationByTypeForZone("dough", 1);
  const sauce = getStationByTypeForZone("sauce", 1);
  const cheese = getStationByTypeForZone("cheese", 1);
  if (!dough || !sauce || !cheese) {
    return;
  }

  const doughC = stationCenter(dough);
  const sauceC = stationCenter(sauce);
  const cheeseC = stationCenter(cheese);
  const speed = 88;

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
    const openOven = getAvailableZoneOven(1);
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
    if (!targetOven || targetOven.zoneId !== 1 || !isOvenUnlocked(targetOven) || targetOven.busy || targetOven.ready) {
      targetOven = getAvailableZoneOven(1);
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

function updateRunnerWorker(dt) {
  if (!state.autoRunnerUnlocked || !state.runnerWorker) {
    return;
  }

  const worker = state.runnerWorker;
  const counter = getCounterStationForZone(1);
  if (!counter) {
    return;
  }

  const counterC = stationCenter(counter);
  const speed = 96;

  if (!worker.carry) {
    let targetOven = worker.targetOvenId ? findOvenById(worker.targetOvenId) : null;
    if (!targetOven || targetOven.zoneId !== 1 || !isOvenUnlocked(targetOven) || !targetOven.ready) {
      targetOven = getZoneOvens(1).find((oven) => oven.ready) || null;
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
    if (serveOrderByWorker(1, counterC)) {
      worker.carry = null;
      sound.play("success");
    }
  }
}

function updateCleanerWorker(dt) {
  if (!state.autoCleanerUnlocked || !state.cleanerWorker) {
    return;
  }

  const worker = state.cleanerWorker;
  const mop = getStationByTypeForZone("mop", 1);
  if (!mop) {
    return;
  }
  const mopC = stationCenter(mop);
  const speed = 84;

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
  updatePrepWorker(dt);
  updateRunnerWorker(dt);
  updateCleanerWorker(dt);
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
    buyUpgrade();
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
  const pressure = state.adBoost * 0.18 + state.day * 0.16 + state.businesses * 0.12;
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

  if (state.sprintBurstTimer > 0 && player.stamina > 0) {
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

    ctx.fillStyle = zone.tint;
    ctx.fillRect(x + 56, 74 - WORLD.cameraY, 230, 36);
    ctx.fillRect(x + 326, 74 - WORLD.cameraY, 220, 36);
    ctx.fillRect(x + 580, 74 - WORLD.cameraY, 166, 36);

    ctx.fillStyle = "rgba(16, 10, 6, 0.66)";
    ctx.fillRect(x + 12, 12 - WORLD.cameraY, 200, 30);
    ctx.fillStyle = "#fff4dc";
    ctx.font = "bold 12px monospace";
    ctx.fillText(`ZONA ${zone.id}: ${zone.name}`, x + 20, 31 - WORLD.cameraY);

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

    ctx.fillStyle = station.color;
    ctx.fillRect(sx, sy, station.w, station.h);
    ctx.strokeStyle = "#2a160d";
    ctx.strokeRect(sx, sy, station.w, station.h);

    ctx.fillStyle = "#fff6de";
    ctx.font = "bold 11px monospace";
    ctx.fillText(station.label, sx + 8, sy + 15);
    ctx.fillText(`Z${station.zoneId}`, sx + station.w - 26, sy + 15);

    drawStationIcon(station, sx + station.w - 16, sy + 38);

    if (station.type === "upgrade" && state.nextUpgrade < state.upgrades.length) {
      const up = state.upgrades[state.nextUpgrade];
      ctx.fillStyle = "rgba(12, 8, 4, 0.58)";
      ctx.fillRect(sx + 4, sy + station.h - 18, station.w - 8, 14);
      ctx.fillStyle = "#fff0cf";
      ctx.font = "10px monospace";
      ctx.fillText(`$${up.cost} ${up.name}`, sx + 8, sy + station.h - 8);
    }
  }

  for (const oven of state.ovens) {
    if (!isOvenUnlocked(oven)) {
      continue;
    }

    const x = oven.x - OVEN_WIDTH / 2 - WORLD.cameraX;
    const y = oven.y - OVEN_HEIGHT / 2 - WORLD.cameraY;

    ctx.fillStyle = "#5f6c74";
    ctx.fillRect(x, y, OVEN_WIDTH, OVEN_HEIGHT);
    ctx.strokeStyle = "#1e252a";
    ctx.strokeRect(x, y, OVEN_WIDTH, OVEN_HEIGHT);

    ctx.fillStyle = "#fff5df";
    ctx.font = "bold 9px monospace";
    ctx.fillText("HORNO", x + 14, y + 12);
    ctx.font = "bold 10px monospace";
    ctx.fillText(`Z${oven.zoneId}`, x + 25, y + 24);

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

      ctx.fillStyle = "rgba(74, 43, 17, 0.55)";
      ctx.fillRect(p.x - 12, p.y - 3, 24, 6);
      ctx.fillStyle = "#d7ba88";
      ctx.fillRect(p.x - 8, p.y - 2, 16, 4);
    }
  }
}

function drawDroppedItems() {
  for (const item of state.droppedItems) {
    const p = worldToScreen(item.x, item.y);
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

function drawCustomers() {
  for (const customer of state.customers) {
    if (zoneById(customer.zoneId).minBusinesses > state.businesses) {
      continue;
    }

    const p = worldToScreen(customer.x, customer.y);
    const bob = customer.state === "eating" ? Math.sin(customer.bob) * 0.4 : Math.sin(customer.bob) * 1.4;

    ctx.fillStyle = customer.angry ? "#b84d43" : "#f0dbc1";
    ctx.beginPath();
    ctx.arc(p.x, p.y - 12 + bob, 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = customer.angry ? "#84413c" : "#5a7aa3";
    if (customer.state === "eating") {
      ctx.fillRect(p.x - 5, p.y - 4 + bob, 10, 10);
      ctx.fillStyle = "#f3db73";
      ctx.beginPath();
      ctx.arc(p.x + 8, p.y - 2 + bob, 3, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillRect(p.x - 5, p.y - 6 + bob, 10, 12);
    }

    ctx.fillStyle = "#2c1a10";
    ctx.fillRect(p.x - 4, p.y + 6 + bob, 3, 6);
    ctx.fillRect(p.x + 1, p.y + 6 + bob, 3, 6);
  }
}

function drawWorker(worker, color, label, carry = null) {
  if (!worker) {
    return;
  }

  const p = worldToScreen(worker.x, worker.y);

  ctx.fillStyle = "#f0dbc1";
  ctx.beginPath();
  ctx.arc(p.x, p.y - 12, 5.8, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = color;
  ctx.fillRect(p.x - 5, p.y - 6, 10, 12);
  ctx.fillStyle = "#2c1a10";
  ctx.fillRect(p.x - 4, p.y + 6, 3, 6);
  ctx.fillRect(p.x + 1, p.y + 6, 3, 6);

  if (carry) {
    if (carry === "dough") ctx.fillStyle = "#e8c188";
    else if (carry === "sauce") ctx.fillStyle = "#d24536";
    else if (carry === "cheese") ctx.fillStyle = "#f3db73";
    else ctx.fillStyle = "#c57b36";
    ctx.beginPath();
    ctx.arc(p.x + 9, p.y - 2, 4.2, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = "rgba(22, 12, 7, 0.75)";
  ctx.fillRect(p.x - 10, p.y - 21, 20, 8);
  ctx.fillStyle = "#ffe7bc";
  ctx.font = "bold 8px monospace";
  ctx.fillText(label, p.x - 8, p.y - 14);
}

function drawWorkers() {
  if (state.autoPrepUnlocked) {
    drawWorker(state.prepWorker, "#4a9f5b", "COC", state.prepWorker ? state.prepWorker.carry : null);
  }
  if (state.autoRunnerUnlocked) {
    drawWorker(state.runnerWorker, "#4f73b8", "RUN", state.runnerWorker ? state.runnerWorker.carry : null);
  }
  if (state.autoCleanerUnlocked) {
    drawWorker(state.cleanerWorker, "#ad7f3c", "LIM", null);
  }
}

function drawPlayer() {
  const x = player.x - WORLD.cameraX;
  const y = player.y - WORLD.cameraY;
  const bob = state.moving ? Math.sin(state.animTime * 14) * 1.4 : 0;

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

  if (player.carry) {
    if (player.carry.stage === "dough") ctx.fillStyle = "#e8c188";
    else if (player.carry.stage === "sauce") ctx.fillStyle = "#d24536";
    else if (player.carry.stage === "cheese") ctx.fillStyle = "#f3db73";
    else ctx.fillStyle = "#c57b36";

    const carryX = player.facing === "left" ? x - 14 : x + 14;
    ctx.beginPath();
    ctx.arc(carryX, y - 12 + bob, 5.5, 0, Math.PI * 2);
    ctx.fill();
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
      if (station.type === "upgrade" && state.nextUpgrade < state.upgrades.length) {
        const up = state.upgrades[state.nextUpgrade];
        text = `${up.name} ($${up.cost})`;
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

  ctx.fillStyle = "rgba(36, 20, 9, 0.88)";
  ctx.fillRect(WORLD.viewW / 2 - 90, WORLD.viewH - 28, 180, 20);
  ctx.fillStyle = "#fff0d8";
  ctx.font = "11px monospace";
  ctx.fillText(text, WORLD.viewW / 2 - 82, WORLD.viewH - 14);
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

function render() {
  ctx.clearRect(0, 0, WORLD.viewW, WORLD.viewH);
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
    version: 5,
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
    prepWorker: state.prepWorker,
    runnerWorker: state.runnerWorker,
    cleanerWorker: state.cleanerWorker,
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
    muted: state.muted,
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

function applySave(data) {
  if (!data || (data.version !== 3 && data.version !== 4 && data.version !== 5)) {
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
  state.nextUpgrade = clampInt(data.nextUpgrade, 0, state.upgrades.length, 0);
  state.passiveIncome = clampNum(data.passiveIncome, 0, 140, 0);
  state.secondOvenUnlocked = Boolean(data.secondOvenUnlocked);
  state.autoPrepUnlocked = Boolean(data.autoPrepUnlocked);
  state.autoRunnerUnlocked = Boolean(data.autoRunnerUnlocked);
  state.autoCleanerUnlocked = Boolean(data.autoCleanerUnlocked);
  state.muted = Boolean(data.muted);
  state.dashAuto = Boolean(data.dashAuto);
  state.sprintBurstTimer = 0;
  state.lastTapMs = 0;
  state.lastTapX = 0;
  state.lastTapY = 0;

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

  if (state.secondOvenUnlocked && !state.ovens.some((oven) => oven.id === "z1-second")) {
    state.ovens.push(createOven("z1-second", 1, 588, 226, 3.9, 1));
  }

  for (const oven of state.ovens) {
    if (oven.id === "z1-main") {
      oven.x = 512;
      oven.y = 226;
    } else if (oven.id === "z1-second") {
      oven.x = 588;
      oven.y = 226;
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

  if (data.prepWorker && typeof data.prepWorker === "object") {
    state.prepWorker = {
      x: clampNum(data.prepWorker.x, 24, getMaxReachX() - 24, 120),
      y: clampNum(data.prepWorker.y, 24, WORLD.height - 24, 330),
      state: typeof data.prepWorker.state === "string" ? data.prepWorker.state : "toDough",
      carry: ["dough", "sauce", "cheese", "baked", null].includes(data.prepWorker.carry) ? data.prepWorker.carry : null,
      targetOvenId: typeof data.prepWorker.targetOvenId === "string" ? data.prepWorker.targetOvenId : null
    };
  }

  if (data.runnerWorker && typeof data.runnerWorker === "object") {
    state.runnerWorker = {
      x: clampNum(data.runnerWorker.x, 24, getMaxReachX() - 24, 660),
      y: clampNum(data.runnerWorker.y, 24, WORLD.height - 24, 330),
      carry: ["baked", null].includes(data.runnerWorker.carry) ? data.runnerWorker.carry : null,
      targetOvenId: typeof data.runnerWorker.targetOvenId === "string" ? data.runnerWorker.targetOvenId : null
    };
  }

  if (data.cleanerWorker && typeof data.cleanerWorker === "object") {
    state.cleanerWorker = {
      x: clampNum(data.cleanerWorker.x, 24, getMaxReachX() - 24, 560),
      y: clampNum(data.cleanerWorker.y, 24, WORLD.height - 24, 468),
      state: typeof data.cleanerWorker.state === "string" ? data.cleanerWorker.state : "idle"
    };
  }

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

  syncCustomersWithOrders();
  updateSoundLabel();
  updateDashLabel();
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

function handleMapTap(event) {
  if (!state.running) {
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
  canvas.addEventListener("pointerdown", handleMapTap, { passive: false });
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

  if (ui.dashBtn) {
    ui.dashBtn.addEventListener("click", () => {
      state.dashAuto = !state.dashAuto;
      updateDashLabel();
      sound.play("ui");
      markDirty();
    });
  }
}

function startShift(fromSave = false) {
  state.running = true;
  ui.startOverlay.style.display = "none";

  if (!fromSave && state.orders.length === 0) {
    spawnOrder(1);
  }

  showToast(fromSave ? "Bienvenido de regreso. Turno reanudado." : "Turno iniciado. Toca para moverte. Doble toque para sprint.", 2.4);
  sound.play("success");
  markDirty();
}

function tick(ts) {
  const dt = Math.min(0.033, (ts - last) / 1000 || 0);
  last = ts;

  if (state.running) {
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

    if (state.comboTimer > 0) {
      state.comboTimer -= dt;
      if (state.comboTimer <= 0) {
        state.combo = 0;
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

    if (state.stars <= 1.0 && state.orders.length > 0) {
      state.rushLevel = Math.max(1, state.rushLevel - dt * 0.5);
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
  render();
  requestAnimationFrame(tick);
}

function bootstrap() {
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
  updateDashLabel();
  updateHud();

  window.addEventListener("resize", resizeCanvas);

  last = performance.now();
  requestAnimationFrame(tick);
}

bootstrap();
