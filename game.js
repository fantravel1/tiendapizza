const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d", { alpha: true });
ctx.imageSmoothingEnabled = false;

const STORAGE_KEY = "pizzaRushSaveV3";

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
    patienceBoost: 7,
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
    spawnBase: 6.5,
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
  height: 820,
  viewW: 360,
  viewH: 560,
  cameraX: 0,
  cameraY: 0
};

const ZONES = [
  { id: 1, name: "Mamma Mia", xMin: 0, xMax: 780, minBusinesses: 1, tint: "#cf7f46" },
  { id: 2, name: "Fila de Horno de Ladrillo", xMin: 780, xMax: 1560, minBusinesses: 2, tint: "#905fbd" },
  { id: 3, name: "Rebanada Imperial", xMin: 1560, xMax: 2360, minBusinesses: 3, tint: "#2b8f7e" }
];

const PIXEL_PALETTE = {
  ".": "",
  s: "#f3d7b8",
  h: "#efefef",
  r: "#c72c21",
  b: "#2b4d9f",
  n: "#1c2f67",
  e: "#20160f",
  p: "#e8c188",
  t: "#b7402f",
  y: "#f4db73",
  o: "#ce8740",
  g: "#48b35c",
  k: "#2a1710",
  w: "#f6ecd3",
  c: "#7247a8",
  m: "#91512b"
};

const SPRITES = {
  chefDown: [
    "....rrrr....",
    "...rhhhhr...",
    "...hsssssh..",
    "..hseeeesh..",
    "..hssssssh..",
    "...hhhhhh...",
    "...bbbbbb...",
    "..bbbbbbbb..",
    "..bbbnbbbb..",
    "..bbbnbbbb..",
    "...nn..nn...",
    "...nn..nn..."
  ],
  chefUp: [
    "....rrrr....",
    "...rhhhhr...",
    "...hsssssh..",
    "..hssssssh..",
    "..hssssssh..",
    "...hhhhhh...",
    "...bbbbbb...",
    "..bbbbbbbb..",
    "..bbbnbbbb..",
    "..bbbnbbbb..",
    "...nn..nn...",
    "...nn..nn..."
  ],
  chefSide: [
    "....rrrr....",
    "...rhhhhr...",
    "...hsssss...",
    "..hseess....",
    "..hsssss....",
    "...hhhhh....",
    "...bbbbb....",
    "..bbbbbbb...",
    "..bbbnbbb...",
    "..bbbnbbb...",
    "...nn.nn....",
    "...nn.nn...."
  ],
  customerHappy: [
    "...hhhh...",
    "..hssssh..",
    "..hseesh..",
    "...hhhh...",
    "...cccc...",
    "..cccccc..",
    "..cc..cc..",
    "...n..n..."
  ],
  customerAngry: [
    "...hhhh...",
    "..hssssh..",
    "..hseeeh..",
    "...hhhh...",
    "...mmmm...",
    "..mmmmmm..",
    "..mm..mm..",
    "...n..n..."
  ],
  pizzaDough: [
    "..pppp..",
    ".pppppp.",
    ".pppppp.",
    ".pppppp.",
    "..pppp.."
  ],
  pizzaSauce: [
    "..pppp..",
    ".pttttp.",
    ".tttttt.",
    ".pttttp.",
    "..pppp.."
  ],
  pizzaCheese: [
    "..pppp..",
    ".pyyyyp.",
    ".yyyyyy.",
    ".pyyyyp.",
    "..pppp.."
  ],
  pizzaBaked: [
    "..oooo..",
    ".otttto.",
    ".tyyyyt.",
    ".otttto.",
    "..oooo.."
  ],
  iconDough: ["..pppp..", ".pppppp.", ".pppppp.", "..pppp.."],
  iconSauce: ["..tttt..", ".tttttt.", ".tttttt.", "..tttt.."],
  iconCheese: ["..yyyy..", ".yyyyyy.", ".yyyyyy.", "..yyyy.."],
  iconCounter: ["..kkkk..", ".kwwwwk.", ".kwwwwk.", "..kkkk.."],
  iconAds: ["..gggg..", ".gwwwwg.", ".gggggg.", "..gggg.."],
  iconGrow: ["..gggg..", ".ggyggg.", ".gggggg.", "..gggg.."],
  iconMop: ["...nn...", "...nn...", "..nwwn..", "..nwwn.."]
};

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
  day: 1,
  stars: 5,
  businesses: 1,
  orders: [],
  customers: [],
  orderId: 1,
  customerId: 1,
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
  keys: new Set(),
  dashAuto: false,
  moving: false,
  animTime: 0,
  autosaveTimer: 0,
  saveDirty: false,
  muted: false,
  moveTarget: null,
  pendingInteract: null,
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

const interactRadius = 80;
let selectedCampaign = "usa";
let last = 0;

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

  tone(freq, duration = 0.09, type = "square", gain = 0.35, slide = 0) {
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
      osc.frequency.linearRampToValueAtTime(Math.max(70, freq + slide), now + duration);
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
      this.tone(380, 0.05, "square", 0.18, -25);
      return;
    }

    if (name === "success") {
      this.tone(460, 0.07, "triangle", 0.2, 70);
      setTimeout(() => this.tone(620, 0.08, "triangle", 0.2, 20), 45);
      return;
    }

    if (name === "fail") {
      this.tone(220, 0.1, "sawtooth", 0.16, -60);
      return;
    }

    if (name === "order") {
      this.tone(540, 0.06, "square", 0.18, 40);
      return;
    }

    if (name === "bake") {
      this.tone(320, 0.08, "triangle", 0.18, 120);
      return;
    }

    if (name === "upgrade") {
      this.tone(420, 0.08, "triangle", 0.2, 100);
      setTimeout(() => this.tone(600, 0.08, "triangle", 0.2, 100), 55);
      setTimeout(() => this.tone(780, 0.09, "triangle", 0.2, 100), 110);
      return;
    }

    if (name === "day") {
      this.tone(280, 0.08, "square", 0.16, 80);
      setTimeout(() => this.tone(420, 0.08, "square", 0.16, 80), 50);
      return;
    }

    if (name === "ui") {
      this.tone(500, 0.05, "triangle", 0.15, 35);
    }
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

function createStation(id, type, zoneId, x, y, w, h, color, label, sprite, minBusinesses) {
  return { id, type, zoneId, x, y, w, h, color, label, sprite, minBusinesses };
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
  const result = [];

  for (const zone of ZONES) {
    const baseX = zone.xMin;
    const minBusinesses = zone.minBusinesses;

    result.push(createStation(`z${zone.id}-dough`, "dough", zone.id, baseX + 110, 208, 88, 66, "#f5d6a5", "MASA", "iconDough", minBusinesses));
    result.push(createStation(`z${zone.id}-sauce`, "sauce", zone.id, baseX + 245, 208, 88, 66, "#cb4734", "SALSA", "iconSauce", minBusinesses));
    result.push(createStation(`z${zone.id}-cheese`, "cheese", zone.id, baseX + 380, 208, 88, 66, "#f0ce5d", "QUESO", "iconCheese", minBusinesses));
    result.push(createStation(`z${zone.id}-counter`, "counter", zone.id, baseX + 610, 196, 136, 78, "#7f5532", "MOSTR", "iconCounter", minBusinesses));
    result.push(createStation(`z${zone.id}-mop`, "mop", zone.id, baseX + 520, 374, 114, 74, "#945c2d", "TRAPO", "iconMop", minBusinesses));

    if (zone.id === 1) {
      result.push(createStation("z1-ads", "ads", 1, baseX + 188, 374, 120, 74, "#205f95", "ANUN", "iconAds", 1));
      result.push(createStation("z1-upgrade", "upgrade", 1, baseX + 336, 374, 150, 74, "#1f7f40", "CRECE", "iconGrow", 1));
    }
  }

  return result;
}

function buildBaseOvens() {
  return [
    createOven("z1-main", 1, 510, 207, 4.8, 1),
    createOven("z2-main", 2, 1290, 207, 4.6, 2),
    createOven("z3-main", 3, 2070, 207, 4.4, 3)
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
          state.ovens.push(createOven("z1-second", 1, 690, 192, 3.9, 1));
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
          showToast("Segunda sucursal desbloqueada: Fila de Horno de Ladrillo.", 2.3);
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
        state.orderSpawnBase = Math.max(3.6, state.orderSpawnBase - 0.5);
        if (state.businesses > before) {
          showToast("Tercera sucursal desbloqueada: Rebanada Imperial.", 2.3);
        }
      }
    },
    {
      name: "Letrero Neon Imperial",
      cost: 520,
      apply: () => {
        state.payoutMultiplier += 0.1;
        state.stars = clamp(state.stars + 0.25, 0.8, 5);
      }
    }
  ];
}

function resetProgress(cityKey = "usa") {
  const campaign = CAMPAIGNS[cityKey] || CAMPAIGNS.usa;

  state.running = false;
  state.cityKey = cityKey;
  state.city = campaign.city;
  state.money = campaign.startCash;
  state.day = 1;
  state.stars = 5;
  state.businesses = 1;
  state.orders = [];
  state.customers = [];
  state.orderId = 1;
  state.customerId = 1;
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
  state.keys.clear();
  state.dashAuto = false;
  state.moving = false;
  state.animTime = 0;
  state.autosaveTimer = 0;
  state.saveDirty = false;
  state.moveTarget = null;
  state.pendingInteract = null;
  state.tapPulse = 0;
  state.tapX = 0;
  state.tapY = 0;

  player.x = 150;
  player.y = 560;
  player.facing = "down";
  player.baseSpeed = 118 + campaign.speedBonus;
  player.stamina = 1;
  player.carry = null;

  setCampaignChoice(cityKey);
  updateDashLabel();
  updateHud();
}

function showToast(text, seconds = 1.7) {
  ui.toast.textContent = text;
  ui.toast.classList.add("show");
  state.messageTimer = seconds;
}

function buzz(ms = 16) {
  if (navigator.vibrate) {
    navigator.vibrate(ms);
  }
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
  ui.dashBtn.textContent = `Sprint Auto: ${state.dashAuto ? "Encendido" : "Apagado"}`;
}

function updateSoundLabel() {
  ui.soundBtn.textContent = state.muted ? "Sonido Apagado" : "Sonido Activo";
}

function updateHud() {
  ui.city.textContent = state.city;
  ui.money.textContent = `$${Math.floor(state.money)}`;
  ui.day.textContent = String(state.day);
  ui.rep.textContent = state.stars.toFixed(1);
  ui.queue.textContent = `${state.orders.length}/${state.maxOrders}`;
  ui.shops.textContent = String(state.businesses);
}

function drawPixelSprite(spriteRows, x, y, scale = 2, flipX = false) {
  if (!spriteRows) {
    return;
  }

  const width = spriteRows[0].length;

  for (let row = 0; row < spriteRows.length; row += 1) {
    const rowData = spriteRows[row];
    for (let col = 0; col < width; col += 1) {
      const sourceCol = flipX ? width - 1 - col : col;
      const key = rowData[sourceCol];
      if (key === ".") {
        continue;
      }

      const color = PIXEL_PALETTE[key];
      if (!color) {
        continue;
      }

      ctx.fillStyle = color;
      ctx.fillRect(Math.round(x + col * scale), Math.round(y + row * scale), scale, scale);
    }
  }
}

function worldToScreen(x, y) {
  return {
    x: x - WORLD.cameraX,
    y: y - WORLD.cameraY
  };
}

function zonePedidos(zoneId) {
  return state.orders.filter((order) => order.zoneId === zoneId);
}

function randomChoice(items) {
  if (!items.length) {
    return null;
  }
  return items[Math.floor(Math.random() * items.length)];
}

function getCounterStationForZone(zoneId) {
  return state.stations.find((station) => station.type === "counter" && station.zoneId === zoneId);
}

function getZoneSpawnPoint(zoneId) {
  const zone = zoneById(zoneId);
  return { x: zone.xMin + 42, y: 688 };
}

function getZoneExitPoint(zoneId) {
  const zone = zoneById(zoneId);
  return { x: zone.xMin + 20, y: 736 };
}

function pointDistance(ax, ay, bx, by) {
  return Math.hypot(ax - bx, ay - by);
}

function nearestInteractable() {
  let best = null;
  let bestDistance = Infinity;

  for (const station of state.stations) {
    if (!isStationUnlocked(station)) {
      continue;
    }

    const center = stationCenter(station);
    const dist = pointDistance(player.x, player.y, center.x, center.y);
    if (dist < bestDistance) {
      bestDistance = dist;
      best = { kind: "station", id: station.id };
    }
  }

  for (const oven of state.ovens) {
    if (!isOvenUnlocked(oven)) {
      continue;
    }

    const center = ovenCenter(oven);
    const dist = pointDistance(player.x, player.y, center.x, center.y);
    if (dist < bestDistance) {
      bestDistance = dist;
      best = { kind: "oven", id: oven.id };
    }
  }

  if (!best || bestDistance > interactRadius) {
    return null;
  }

  return best;
}

function findStationById(id) {
  return state.stations.find((station) => station.id === id) || null;
}

function findOvenById(id) {
  return state.ovens.find((oven) => oven.id === id) || null;
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

    if (pointDistance(x, y, oven.x, oven.y) <= 34) {
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
  customer.targetX = exit.x;
  customer.targetY = exit.y;
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
  showToast("Los anuncios estan funcionando. Llegan mas clientes.");
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

  const businessesBefore = state.businesses;

  state.money -= upgrade.cost;
  upgrade.apply();
  state.nextUpgrade += 1;
  showToast(`Desbloqueado: ${upgrade.name}`);
  sound.play("upgrade");
  buzz(20);

  if (state.businesses > businessesBefore) {
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

  state.money += payout;
  state.stars = clamp(state.stars + 0.05, 0.8, 5);
  player.carry = null;
  sendCustomerHome(order.id, false);

  showToast(`Pedido entregado en Zona ${zoneId}! +$${payout} (${state.combo}x combo)`);
  sound.play("success");
  buzz(14);
  markDirty();
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

    const started = runAdCampaign();
    if (started) {
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
  }
}

function syncCustomersWithPedidos() {
  const orderIds = new Set(state.orders.map((order) => order.id));

  for (let i = state.customers.length - 1; i >= 0; i -= 1) {
    const customer = state.customers[i];
    if (!orderIds.has(customer.orderId) && customer.state !== "leaving") {
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
    const waitingPedidos = state.orders.filter((order) => order.zoneId === zone.id);
    const counter = getCounterStationForZone(zone.id);
    if (!counter) {
      continue;
    }

    waitingPedidos.forEach((order, index) => {
      const customer = state.customers.find((entry) => entry.orderId === order.id && entry.state !== "leaving");
      if (!customer) {
        return;
      }

      customer.targetX = counter.x + 16 + (index % 5) * 22;
      customer.targetY = counter.y + counter.h + 22 + Math.floor(index / 5) * 18;
    });
  }
}

function updateCustomers(dt) {
  syncCustomersWithPedidos();
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
    }

    if (customer.state === "leaving") {
      const exit = getZoneExitPoint(customer.zoneId);
      if (pointDistance(customer.x, customer.y, exit.x, exit.y) < 7) {
        state.customers.splice(i, 1);
      }
    }
  }
}

function updatePedidos(dt) {
  const decay = 1 + state.rushLevel * 0.12;

  for (let i = state.orders.length - 1; i >= 0; i -= 1) {
    const order = state.orders[i];
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

function updateDiaProgress(dt) {
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
    showToast("La demanda sube. Sigue tocando estaciones rapido.", 2.4);
  } else if (state.day === 6) {
    showToast("Turno de caos: hay derrames mas seguido.", 2.6);
  } else {
    showToast(`Dia ${state.day}: la ciudad suena mas fuerte.`);
  }

  sound.play("day");
  buzz(10);
  markDirty();
}

function updateSpills(dt) {
  state.spillTimer -= dt;
  const hazardRate = state.day >= 6 ? 8 : 16;
  if (state.spillTimer <= 0) {
    state.spillTimer = hazardRate + Math.random() * 7;
    state.spillActive = true;
    showToast("Derrame de salsa! Toca la estacion de TRAPO para limpiar.", 2.1);
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

  if (state.dashAuto && player.stamina > 0) {
    speed *= 1.52;
    player.stamina = clamp(player.stamina - dt * 0.55, 0, 1);
  } else {
    player.stamina = clamp(player.stamina + dt * 0.24, 0, 1);
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
    player.stamina = clamp(player.stamina + dt * 0.24, 0, 1);
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
  ctx.fillRect(-WORLD.cameraX, -WORLD.cameraY, WORLD.width, 120);
  ctx.fillRect(-WORLD.cameraX, 560 - WORLD.cameraY, WORLD.width, 260);
}

function drawZoneDecor() {
  for (const zone of ZONES) {
    const x = zone.xMin - WORLD.cameraX;
    const w = zone.xMax - zone.xMin;

    ctx.fillStyle = "rgba(45, 27, 14, 0.25)";
    ctx.fillRect(x + 2, 142 - WORLD.cameraY, w - 4, 8);

    ctx.fillStyle = zone.tint;
    ctx.fillRect(x + 60, 66 - WORLD.cameraY, 220, 36);
    ctx.fillRect(x + 320, 66 - WORLD.cameraY, 210, 36);
    ctx.fillRect(x + 570, 66 - WORLD.cameraY, 170, 36);

    ctx.fillStyle = "rgba(17, 10, 6, 0.65)";
    ctx.fillRect(x + 12, 10 - WORLD.cameraY, 180, 28);
    ctx.fillStyle = "#fff4dc";
    ctx.font = "bold 12px monospace";
    ctx.fillText(`ZONA ${zone.id}: ${zone.name}`, x + 20, 28 - WORLD.cameraY);

    if (zone.minBusinesses > state.businesses) {
      ctx.fillStyle = "rgba(15, 10, 6, 0.56)";
      ctx.fillRect(x, -WORLD.cameraY, w, WORLD.height);
      ctx.fillStyle = "#ffe5a9";
      ctx.font = "bold 16px monospace";
      ctx.fillText(`BLOQUEADA: ${zone.minBusinesses} SUCURSALES`, x + 180, 340 - WORLD.cameraY);
    }

    if (zone.id > 1) {
      ctx.fillStyle = "rgba(35, 17, 8, 0.42)";
      ctx.fillRect(x, -WORLD.cameraY, 2, WORLD.height);
    }
  }
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
    ctx.fillText(station.label, sx + 7, sy + 15);
    ctx.fillText(`Z${station.zoneId}`, sx + station.w - 26, sy + 15);

    drawPixelSprite(SPRITES[station.sprite], sx + station.w - 28, sy + 11, 2);

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

    const x = oven.x - 30 - WORLD.cameraX;
    const y = oven.y - 22 - WORLD.cameraY;

    ctx.fillStyle = "#5f6c74";
    ctx.fillRect(x, y, 60, 46);
    ctx.strokeStyle = "#1e252a";
    ctx.strokeRect(x, y, 60, 46);

    ctx.fillStyle = "#fff5df";
    ctx.font = "bold 10px monospace";
    ctx.fillText(`Z${oven.zoneId}`, x + 20, y - 4);

    if (oven.busy) {
      const pct = oven.progress / oven.bakeTime;
      ctx.fillStyle = "#ec8332";
      ctx.fillRect(x + 7, y + 30, 46 * pct, 8);
    }

    if (oven.ready) {
      drawPixelSprite(SPRITES.pizzaBaked, x + 20, y + 10, 1);
    }
  }
}

function drawCustomers() {
  for (const customer of state.customers) {
    if (zoneById(customer.zoneId).minBusinesses > state.businesses) {
      continue;
    }

    const screen = worldToScreen(customer.x, customer.y);
    const bob = Math.sin(customer.bob) * 1.4;
    const sprite = customer.angry ? SPRITES.customerAngry : SPRITES.customerHappy;
    drawPixelSprite(sprite, screen.x - 9, screen.y - 16 + bob, 2);
  }
}

function drawPlayer() {
  const x = player.x - WORLD.cameraX;
  const y = player.y - WORLD.cameraY;
  const bob = state.moving ? Math.sin(state.animTime * 14) * 1.5 : 0;

  let sprite = SPRITES.chefDown;
  let flipX = false;
  if (player.facing === "up") {
    sprite = SPRITES.chefUp;
  } else if (player.facing === "left") {
    sprite = SPRITES.chefSide;
    flipX = true;
  } else if (player.facing === "right") {
    sprite = SPRITES.chefSide;
  }

  drawPixelSprite(sprite, x - 12, y - 31 + bob, 2, flipX);

  if (player.carry) {
    let carrySprite = SPRITES.pizzaDough;
    if (player.carry.stage === "sauce") carrySprite = SPRITES.pizzaSauce;
    if (player.carry.stage === "cheese") carrySprite = SPRITES.pizzaCheese;
    if (player.carry.stage === "baked") carrySprite = SPRITES.pizzaBaked;

    const carryX = player.facing === "left" ? x - 22 : x + 10;
    drawPixelSprite(carrySprite, carryX, y - 9 + bob, 2, player.facing === "left");
  }
}

function drawPedidosPanel() {
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
  drawCustomers();
  drawPlayer();
  drawPedidosPanel();
  drawStamina();
  drawMoveTarget();
  drawNearbyHint();
  drawChaosTint();
}

function saveSnapshot() {
  return {
    version: 3,
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
      bob: customer.bob
    })),
    orderId: state.orderId,
    customerId: state.customerId,
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
  if (!data || data.version !== 3) {
    return false;
  }

  const campaignKey = CAMPAIGNS[data.cityKey] ? data.cityKey : "usa";
  resetProgress(campaignKey);

  state.money = clampNum(data.money, 0, 999999, state.money);
  state.day = clampInt(data.day, 1, 999, 1);
  state.stars = clampNum(data.stars, 0.8, 5, 5);
  state.businesses = clampInt(data.businesses, 1, 12, 1);
  state.orderId = clampInt(data.orderId, 1, 2000000, 1);
  state.customerId = clampInt(data.customerId, 1, 2000000, 1);
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
  state.muted = Boolean(data.muted);
  state.dashAuto = Boolean(data.dashAuto);
  const unlockedZones = getUnlockedZones();
  const maxUnlockedZone = unlockedZones.length ? unlockedZones[unlockedZones.length - 1].id : 1;

  if (Array.isArray(data.orders)) {
    state.orders = data.orders.slice(0, 26).map((order, index) => ({
      id: clampInt(order.id, 1, 9999999, state.orderId + index),
      zoneId: clampInt(order.zoneId, 1, maxUnlockedZone, 1),
      patience: clampNum(order.patience, 0.1, 240, 20),
      maxPatience: clampNum(order.maxPatience, 4, 280, 22),
      value: clampInt(order.value, 8, 700, 20)
    }));
  }

  if (Array.isArray(data.ovens) && data.ovens.length) {
    state.ovens = data.ovens.slice(0, 8).map((oven, index) => ({
      id: typeof oven.id === "string" ? oven.id : `oven-${index + 1}`,
      zoneId: clampInt(oven.zoneId, 1, 3, 1),
      x: clampNum(oven.x, 40, WORLD.width - 40, 510),
      y: clampNum(oven.y, 40, WORLD.height - 40, 207),
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
    state.ovens.push(createOven("z1-second", 1, 690, 192, 3.9, 1));
  }

  if (Array.isArray(data.customers)) {
    state.customers = data.customers.slice(0, 40).map((customer, index) => ({
      id: clampInt(customer.id, 1, 9999999, state.customerId + index),
      orderId: clampInt(customer.orderId, 1, 9999999, 1),
      zoneId: clampInt(customer.zoneId, 1, maxUnlockedZone, 1),
      x: clampNum(customer.x, 20, WORLD.width - 20, 42),
      y: clampNum(customer.y, 20, WORLD.height - 20, 688),
      targetX: clampNum(customer.targetX, 20, WORLD.width - 20, 42),
      targetY: clampNum(customer.targetY, 20, WORLD.height - 20, 688),
      speed: clampNum(customer.speed, 30, 120, 56),
      state: ["entering", "waiting", "leaving"].includes(customer.state) ? customer.state : "entering",
      angry: Boolean(customer.angry),
      bob: clampNum(customer.bob, -9999, 9999, Math.random() * Math.PI * 2)
    }));
  }

  if (data.player && typeof data.player === "object") {
    player.x = clampNum(data.player.x, 24, getMaxReachX() - 24, 150);
    player.y = clampNum(data.player.y, 24, WORLD.height - 24, 560);
    player.facing = ["up", "down", "left", "right"].includes(data.player.facing) ? data.player.facing : "down";
    player.baseSpeed = clampNum(data.player.baseSpeed, 90, 300, 118 + currentCampaign().speedBonus);
    player.stamina = clampNum(data.player.stamina, 0, 1, 1);
    player.carry = data.player.carry && typeof data.player.carry === "object" ? data.player.carry : null;
  }

  syncCustomersWithPedidos();
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
  ui.startBtn.addEventListener("click", () => {
    resetProgress(selectedCampaign);
    startShift(false);
  });

  ui.continueBtn.addEventListener("click", () => {
    const save = loadGame();
    if (!save || !applySave(save)) {
      showToast("No se encontro una partida valida. Inicia una nueva partida.");
      ui.continueBtn.hidden = true;
      return;
    }

    startShift(true);
  });

  ui.soundBtn.addEventListener("click", () => {
    state.muted = !state.muted;
    updateSoundLabel();
    if (!state.muted) {
      sound.unlock();
      sound.play("ui");
    }
    markDirty();
  });

  ui.dashBtn.addEventListener("click", () => {
    state.dashAuto = !state.dashAuto;
    updateDashLabel();
    sound.play("ui");
    markDirty();
  });
}

function startShift(fromSave = false) {
  state.running = true;
  ui.startOverlay.style.display = "none";

  if (!fromSave && state.orders.length === 0) {
    spawnOrder(2);
  }

  showToast(fromSave ? "Bienvenido de regreso. Turno reanudado." : "Turno iniciado. Toca el mapa para moverte.", 2.3);
  sound.play("success");
  markDirty();
}

function tick(ts) {
  const dt = Math.min(0.033, (ts - last) / 1000 || 0);
  last = ts;

  if (state.running) {
    updateMovement(dt);
    updatePedidos(dt);
    updateCustomers(dt);
    updateOvens(dt);
    updateDiaProgress(dt);
    updateSpills(dt);

    state.spawnTimer += dt;
    const spawnRate = Math.max(2.3, state.orderSpawnBase - state.adBoost * 0.2 - state.day * 0.18 - state.businesses * 0.14);
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

    if (state.saveDirty) {
      state.autosaveTimer += dt;
      if (state.autosaveTimer >= 4) {
        saveGame();
      }
    }
  }

  if (state.messageTimer > 0) {
    state.messageTimer -= dt;
    if (state.messageTimer <= 0) {
      ui.toast.classList.remove("show");
    }
  }

  if (state.tapPulse > 0) {
    state.tapPulse = Math.max(0, state.tapPulse - dt * 2.8);
  }

  updateHud();
  render();
  requestAnimationFrame(tick);
}

function init() {
  resetProgress(selectedCampaign);
  updateSoundLabel();
  updateDashLabel();
  setupCanvasControls();
  setupKeyboard();
  setupCampaignButtons();
  setupMainButtons();
  resizeCanvas();

  const save = loadGame();
  if (save && save.version === 3) {
    ui.continueBtn.hidden = false;
    if (CAMPAIGNS[save.cityKey]) {
      setCampaignChoice(save.cityKey);
    }
  } else {
    ui.continueBtn.hidden = true;
  }

  window.addEventListener("resize", resizeCanvas);
  window.addEventListener("blur", () => {
    state.keys.clear();
  });

  requestAnimationFrame(tick);
}

init();
