/**
 * ============================================================================
 * NEXIS TERMINAL V18 // COMPLETE REAL-TIME DRAGGABLE TIMELINE & SUITE ENGINE
 * ============================================================================
 */

// --- 1. REALISTIC CANVAS BACKGROUND PARTICLES ---
const canvas = document.getElementById('hero-canvas');
const ctx = canvas ? canvas.getContext('2d') : null;
let particlesArray = [];
let mouse = { x: null, y: null, radius: 140 };

function resizeCanvas() {
  if (!canvas || !canvas.parentElement) return;
  canvas.width = canvas.parentElement.clientWidth;
  canvas.height = canvas.parentElement.clientHeight;
}
window.addEventListener('resize', () => { resizeCanvas(); initParticles(); });
window.addEventListener('mousemove', (e) => {
  if (!canvas) return;
  const rect = canvas.getBoundingClientRect();
  mouse.x = e.clientX - rect.left;
  mouse.y = e.clientY - rect.top;
});
window.addEventListener('mouseout', () => {
  mouse.x = null;
  mouse.y = null;
});

class Particle {
  constructor(x, y, dx, dy, size) {
    this.x = x; this.y = y; this.dx = dx; this.dy = dy; this.size = size;
  }
  draw() {
    if (!ctx) return;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2, false);
    ctx.fillStyle = 'rgba(6, 182, 212, 0.75)';
    ctx.shadowBlur = 8;
    ctx.shadowColor = '#06b6d4';
    ctx.fill();
    ctx.shadowBlur = 0;
  }
  update() {
    if (this.x > canvas.width || this.x < 0) this.dx = -this.dx;
    if (this.y > canvas.height || this.y < 0) this.dy = -this.dy;

    if (mouse.x != null && mouse.y != null) {
      let dx = mouse.x - this.x;
      let dy = mouse.y - this.y;
      let distance = Math.sqrt(dx * dx + dy * dy);
      if (distance < mouse.radius) {
        let force = (mouse.radius - distance) / mouse.radius;
        let directionX = dx / distance;
        let directionY = dy / distance;
        this.x -= directionX * force * 3;
        this.y -= directionY * force * 3;
      }
    }

    this.x += this.dx;
    this.y += this.dy;
    this.draw();
  }
}

function initParticles() {
  particlesArray = [];
  if (!canvas) return;
  const numberOfParticles = Math.floor((canvas.width * canvas.height) / 9500);
  for (let i = 0; i < numberOfParticles; i++) {
    let size = Math.random() * 2 + 1.2;
    let x = Math.random() * (canvas.width - size * 2) + size;
    let y = Math.random() * (canvas.height - size * 2) + size;
    let dx = (Math.random() - 0.5) * 0.8;
    let dy = (Math.random() - 0.5) * 0.8;
    particlesArray.push(new Particle(x, y, dx, dy, size));
  }
}

function connectParticles() {
  for (let a = 0; a < particlesArray.length; a++) {
    for (let b = a; b < particlesArray.length; b++) {
      let dx = particlesArray[a].x - particlesArray[b].x;
      let dy = particlesArray[a].y - particlesArray[b].y;
      let distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < 130) {
        let opacity = 1 - distance / 130;
        ctx.strokeStyle = `rgba(6, 182, 212, ${opacity * 0.25})`;
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(particlesArray[a].x, particlesArray[a].y);
        ctx.lineTo(particlesArray[b].x, particlesArray[b].y);
        ctx.stroke();
      }
    }
  }
}

function animateParticles() {
  requestAnimationFrame(animateParticles);
  if (!canvas || !ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  particlesArray.forEach(p => p.update());
  connectParticles();
}

resizeCanvas();
initParticles();
animateParticles();

// --- 2. 24H MARKET TIMELINE & REAL-TIME DRAGGABLE CLOCK PIN ---
let currentSessionTimezone = "Asia/Colombo";
let is24HourMode = true;
let isDragging = false;
let customTimelineHour = null;

function updateMarketSessions() {
  const now = new Date();
  const targetDate = new Date(now.toLocaleString("en-US", { timeZone: currentSessionTimezone }));
  let hours = targetDate.getHours();
  let minutes = targetDate.getMinutes();

  if (customTimelineHour !== null) {
    hours = Math.floor(customTimelineHour);
    minutes = Math.floor((customTimelineHour % 1) * 60);
  }

  let displayHours = hours;
  let ampm = "";
  if (!is24HourMode) {
    ampm = hours >= 12 ? "pm" : "am";
    displayHours = hours % 12 || 12;
  }
  const timeFormatted = `${displayHours}:${String(minutes).padStart(2, '0')} ${ampm}`;
  const dayName = new Intl.DateTimeFormat('en-US', { timeZone: currentSessionTimezone, weekday: 'long' }).format(now);

  const pinTimeEl = document.getElementById('pin-time-text');
  const pinDayEl = document.getElementById('pin-day-text');
  if (pinTimeEl) pinTimeEl.innerText = timeFormatted;
  if (pinDayEl) pinDayEl.innerText = dayName;

  const hourDeg = (hours % 12 + minutes / 60) * 30;
  const minDeg = minutes * 6;
  const hourHand = document.getElementById('analog-hour-hand');
  const minHand = document.getElementById('analog-min-hand');
  if (hourHand) hourHand.style.transform = `rotate(${hourDeg}deg)`;
  if (minHand) minHand.style.transform = `rotate(${minDeg}deg)`;

  const decimalHour = hours + minutes / 60;

  const formatDeskTime = (tz) => new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: 'numeric', minute: '2-digit', hour12: true }).format(now);
  const sydEl = document.getElementById('desk-time-sydney');
  const tyoEl = document.getElementById('desk-time-tokyo');
  const ldnEl = document.getElementById('desk-time-london');
  const nyEl = document.getElementById('desk-time-ny');
  if (sydEl) sydEl.innerText = formatDeskTime('Australia/Sydney');
  if (tyoEl) tyoEl.innerText = formatDeskTime('Asia/Tokyo');
  if (ldnEl) ldnEl.innerText = formatDeskTime('Europe/London');
  if (nyEl) nyEl.innerText = formatDeskTime('America/New_York');

  updateVolumeWave(decimalHour);
}

function startDragTimeline(e) {
  isDragging = true;
  moveTimelinePin(e);
  window.addEventListener('mousemove', moveTimelinePin);
  window.addEventListener('mouseup', stopDragTimeline);
  window.addEventListener('touchmove', moveTimelinePin);
  window.addEventListener('touchend', stopDragTimeline);
}

function stopDragTimeline() {
  isDragging = false;
  window.removeEventListener('mousemove', moveTimelinePin);
  window.removeEventListener('mouseup', stopDragTimeline);
  window.removeEventListener('touchmove', moveTimelinePin);
  window.removeEventListener('touchend', stopDragTimeline);
}

function changeSessionTimezone(tz) {
  currentSessionTimezone = tz;
  customTimelineHour = null;
  updateMarketSessions();
}

function toggle24HourMode() {
  is24HourMode = !is24HourMode;
  document.getElementById('toggle-24h-btn').innerText = is24HourMode ? "ON" : "OFF";
  renderRulerHours();
  updateMarketSessions();
}

// --- 3. LIVE ASSETS & HERO TICKER FLUCTUATIONS ---
function updateHeroLiveQuotes() {
  const goldEl = document.getElementById('hero-live-gold');
  const btcEl = document.getElementById('hero-live-btc');

  if (goldEl) {
    const goldBase = 2748.20 + (Math.random() * 0.8 - 0.4);
    goldEl.innerText = `$${goldBase.toFixed(2)}`;
  }
  if (btcEl) {
    const btcBase = 98450.00 + (Math.random() * 40 - 20);
    btcEl.innerText = `$${btcBase.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
  }
}

// --- 4. DROPDOWN MENU CONTROLLER ---
function toggleToolsDropdown(event) {
  event.stopPropagation();
  const menu = document.getElementById('tools-dropdown-menu');
  const icon = document.getElementById('tools-dropdown-icon');
  if (menu) {
    menu.classList.toggle('hidden');
    if (icon) icon.classList.toggle('rotate-180');
  }
}

function closeToolsDropdownOutside(event) {
  const wrapper = document.getElementById('tools-dropdown-wrapper');
  const menu = document.getElementById('tools-dropdown-menu');
  const icon = document.getElementById('tools-dropdown-icon');
  if (wrapper && !wrapper.contains(event.target)) {
    if (menu) menu.classList.add('hidden');
    if (icon) icon.classList.remove('rotate-180');
  }
}

function selectToolItem(toolPageId) {
  const menu = document.getElementById('tools-dropdown-menu');
  const icon = document.getElementById('tools-dropdown-icon');
  if (menu) menu.classList.add('hidden');
  if (icon) icon.classList.remove('rotate-180');
  switchPage(toolPageId);
}

// --- 5. DATA REPOSITORIES & RENDERERS ---
const ASSET_REGISTRY = {
  Indices: [
    { name: "S&P 500 Index", symbol: "FOREXCOM:SPX500", pips: "0.2", vol: "$54.2B", r3: "6010.50", r2: "5995.00", r1: "5988.20", pp: "5975.00", s1: "5960.00", s2: "5945.00" },
    { name: "Dow Jones 30", symbol: "FOREXCOM:DJI", pips: "1.5", vol: "$28.4B", r3: "44200.00", r2: "44000.00", r1: "43850.00", pp: "43600.00", s1: "43400.00", s2: "43200.00" },
    { name: "DAX 40 (Germany)", symbol: "INDEX:DAX", pips: "1.0", vol: "$19.8B", r3: "19600.00", r2: "19480.00", r1: "19390.00", pp: "19280.00", s1: "19150.00", s2: "19020.00" }
  ],
  Forex: [
    { name: "EUR / USD", symbol: "FX:EURUSD", pips: "0.1", vol: "$112.5B", r3: "1.0920", r2: "1.0880", r1: "1.0855", pp: "1.0820", s1: "1.0790", s2: "1.0760" },
    { name: "GBP / USD", symbol: "FX:GBPUSD", pips: "0.3", vol: "$84.2B", r3: "1.3050", r2: "1.3000", r1: "1.2965", pp: "1.2920", s1: "1.2880", s2: "1.2840" },
    { name: "USD / JPY", symbol: "FX:USDJPY", pips: "0.2", vol: "$96.0B", r3: "155.80", r2: "155.00", r1: "154.40", pp: "153.80", s1: "153.10", s2: "152.50" }
  ],
  Metals: [
    { name: "Gold Spot (XAU/USD)", symbol: "OANDA:XAUUSD", pips: "0.2", vol: "$72.0B", r3: "2780.00", r2: "2765.00", r1: "2755.00", pp: "2740.00", s1: "2725.00", s2: "2710.00" },
    { name: "Silver Spot (XAG/USD)", symbol: "TVC:SILVER", pips: "0.5", vol: "$18.4B", r3: "33.50", r2: "32.80", r1: "32.20", pp: "31.80", s1: "31.20", s2: "30.60" }
  ],
  Energy: [
    { name: "Crude Oil WTI", symbol: "TVC:USOIL", pips: "0.3", vol: "$42.5B", r3: "74.50", r2: "73.20", r1: "72.40", pp: "71.50", s1: "70.60", s2: "69.80" },
    { name: "Brent Crude", symbol: "TVC:UKOIL", pips: "0.4", vol: "$48.0B", r3: "78.20", r2: "77.00", r1: "76.10", pp: "75.20", s1: "74.30", s2: "73.50" }
  ],
  Crypto: [
    { name: "Bitcoin (BTC/USDT)", symbol: "BINANCE:BTCUSDT", pips: "1.0", vol: "$48.9B", r3: "102000.00", r2: "100000.00", r1: "99200.00", pp: "97800.00", s1: "96500.00", s2: "95000.00" },
    { name: "Ethereum (ETH/USDT)", symbol: "BINANCE:ETHUSDT", pips: "0.5", vol: "$22.1B", r3: "3650.00", r2: "3580.00", r1: "3520.00", pp: "3450.00", s1: "3380.00", s2: "3300.00" }
  ]
};

const PAL_ESSENTIALS = [
  { title: "24K Gold Sovereign (Pal.lk)", val: "LKR 210,500", chg: "+0.45%" },
  { title: "22K Gold Sovereign (Pal.lk)", val: "LKR 194,800", chg: "+0.40%" },
  { title: "Auto Diesel (CPC/LIOC)", val: "LKR 317.00/L", chg: "0.00%" },
  { title: "Petrol 92 Octane (CPC)", val: "LKR 311.00/L", chg: "0.00%" }
];

const CBSL_RATES = [
  { ccy: "USD / LKR", val: "298.50" },
  { ccy: "EUR / LKR", val: "323.80" },
  { ccy: "GBP / LKR", val: "386.40" },
  { ccy: "AUD / LKR", val: "196.20" },
  { ccy: "JPY / LKR", val: "1.98" },
  { ccy: "CAD / LKR", val: "216.50" }
];

const CSE_COMPANIES = [
  { sym: "JKH.N0000", name: "John Keells Holdings", price: "206.50", chg: "+1.75%", cap: "280.4B" },
  { sym: "COMB.N0000", name: "Commercial Bank of Ceylon", price: "124.00", chg: "+0.81%", cap: "165.2B" },
  { sym: "LOLC.N0000", name: "LOLC Holdings PLC", price: "440.00", chg: "-0.56%", cap: "210.0B" },
  { sym: "BIL.N0000", name: "Browns Investments", price: "6.30", chg: "+3.28%", cap: "89.5B" },
  { sym: "HNB.N0000", name: "Hatton National Bank", price: "220.00", chg: "+1.15%", cap: "122.8B" }
];

const CENTRAL_BANKS = [
  { name: "US Federal Reserve", rate: "4.50%", stance: "Neutral", bs: "$7.1 Trillion" },
  { name: "European Central Bank", rate: "3.25%", stance: "Easing", bs: "€6.5 Trillion" },
  { name: "Bank of England", rate: "4.75%", stance: "Gradual Cut", bs: "£890 Billion" },
  { name: "Bank of Japan", rate: "0.25%", stance: "Hawkish", bs: "¥750 Trillion" }
];

const GLOBAL_YIELDS = [
  { name: "US 10-Year Treasury", yield: "4.28%", chg: "+0.03%" },
  { name: "UK 10-Year Gilt", yield: "4.41%", chg: "-0.01%" },
  { name: "Germany 10-Year Bund", yield: "2.34%", chg: "+0.02%" },
  { name: "Japan 10-Year JGB", yield: "1.06%", chg: "+0.01%" }
];

const BILLIONAIRES = [
  { rank: 1, name: "Elon Musk", netWorth: "$248.5 B", asset: "Tesla, SpaceX, xAI", country: "United States" },
  { rank: 2, name: "Jeff Bezos", netWorth: "$212.0 B", asset: "Amazon, Blue Origin", country: "United States" },
  { rank: 3, name: "Bernard Arnault", netWorth: "$195.4 B", asset: "LVMH Group", country: "France" },
  { rank: 4, name: "Mark Zuckerberg", netWorth: "$182.3 B", asset: "Meta Platforms", country: "United States" },
  { rank: 5, name: "Larry Ellison", netWorth: "$176.8 B", asset: "Oracle Corporation", country: "United States" }
];

const NEWS_STORIES = [
  {
    tag: "MACRO DESK",
    time: "12m ago",
    title: "Global Liquidity Surges as Central Banks Coordinate Balance Sheet Stabilization",
    author: "NEXIS Intelligence Bureau",
    desc: "Major central banks have stabilized rate trajectories, spurring capital flows into tech and gold assets.",
    img: "https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?auto=format&fit=crop&w=1200&q=80",
    body: "Leading monetary authorities across the US, Europe, and Asia have continued to maintain systematic liquidity frameworks to ease market volatility. Analysts anticipate equities to retain strong structural support."
  },
  {
    tag: "SRI LANKA",
    time: "35m ago",
    title: "CBSL Foreign Reserves Consolidate Above $6.5B Mark on Strong Remittances",
    author: "Colombo Desk",
    desc: "Worker remittances and steady export figures maintain LKR exchange rate stability.",
    img: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=800&q=80",
    body: "The Central Bank of Sri Lanka has recorded continuous reserve accumulation. Official data confirms import coverage exceeds 4.2 months, providing a strong cushion against external currency fluctuations."
  }
];

let currentActiveAsset = ASSET_REGISTRY.Metals[0];

function renderSriLankaDesk() {
  const palBox = document.getElementById('pal-essentials-grid');
  if (palBox) {
    palBox.innerHTML = PAL_ESSENTIALS.map(p => `
      <div class="p-3 bg-[#0d1117] rounded-xl border border-[#30363d]">
        <div class="text-[10px] text-slate-400">${p.title}</div>
        <div class="text-base font-extrabold text-amber-300 mt-1">${p.val}</div>
        <div class="text-[9px] text-emerald-400 font-bold mt-0.5">${p.chg} TODAY</div>
      </div>
    `).join('');
  }

  const cbslBox = document.getElementById('cbsl-rates-grid');
  if (cbslBox) {
    cbslBox.innerHTML = CBSL_RATES.map(c => `
      <div class="p-2.5 bg-[#0d1117] rounded-xl border border-[#30363d] flex justify-between items-center">
        <span class="text-slate-400 font-bold">${c.ccy}</span>
        <b class="text-white">${c.val}</b>
      </div>
    `).join('');
  }

  const cseBox = document.getElementById('cse-companies-view');
  if (cseBox) {
    cseBox.innerHTML = CSE_COMPANIES.map(c => `
      <div class="p-4 bg-[#0d1117] rounded-2xl border border-[#30363d] flex justify-between items-center">
        <div>
          <span class="text-amber-400 font-bold">${c.sym}</span>
          <div class="text-xs text-white font-bold">${c.name}</div>
          <span class="text-[10px] text-slate-500">Mkt Cap: LKR ${c.cap}</span>
        </div>
        <div class="text-right">
          <div class="text-sm font-black text-white">LKR ${c.price}</div>
          <span class="text-xs font-bold ${c.chg.startsWith('+') ? 'text-emerald-400' : 'text-rose-400'}">${c.chg}</span>
        </div>
      </div>
    `).join('');
  }
}

function renderMacroDesk() {
  const cbGrid = document.getElementById('central-banks-grid');
  if (cbGrid) {
    cbGrid.innerHTML = CENTRAL_BANKS.map(b => `
      <div class="p-4 bg-[#0d1117] rounded-2xl border border-[#30363d] space-y-1">
        <span class="text-slate-400 block">${b.name}</span>
        <div class="text-xl font-bold text-cyan-400">${b.rate}</div>
        <div class="text-[10px] text-slate-400">Stance: <b class="text-white">${b.stance}</b></div>
      </div>
    `).join('');
  }

  const yieldsGrid = document.getElementById('global-yields-grid');
  if (yieldsGrid) {
    yieldsGrid.innerHTML = GLOBAL_YIELDS.map(y => `
      <div class="p-3 bg-[#0d1117] rounded-xl border border-[#30363d]">
        <span class="text-slate-400 block text-[10px]">${y.name}</span>
        <div class="text-base font-bold text-white mt-1">${y.yield}</div>
        <span class="text-[10px] font-bold ${y.chg.startsWith('+') ? 'text-emerald-400' : 'text-rose-400'}">${y.chg}</span>
      </div>
    `).join('');
  }
}

function renderBillionaires() {
  const tbody = document.getElementById('billionaires-table-body');
  if (!tbody) return;
  tbody.innerHTML = BILLIONAIRES.map(b => `
    <tr class="hover:bg-white/5 transition">
      <td class="p-3.5 font-bold text-cyan-400">#${b.rank}</td>
      <td class="p-3.5 font-bold text-white">${b.name}</td>
      <td class="p-3.5 font-black text-emerald-400">${b.netWorth}</td>
      <td class="p-3.5 text-slate-300">${b.asset}</td>
      <td class="p-3.5 text-slate-400">${b.country}</td>
    </tr>
  `).join('');
}

function renderNewsStories() {
  const subGrid = document.getElementById('live-subleads-grid');
  if (subGrid) {
    subGrid.innerHTML = NEWS_STORIES.slice(1).map((n, i) => `
      <div class="realistic-card rounded-2xl p-5 cursor-pointer group" onclick="openLiveArticleModal(${i + 1})">
        <span class="text-[10px] mono text-cyan-400 font-bold">${n.tag}</span>
        <h3 class="font-serif font-bold text-base text-white mt-2 group-hover:text-cyan-400 transition">${n.title}</h3>
        <p class="text-xs text-slate-400 mt-2 line-clamp-2">${n.desc}</p>
      </div>
    `).join('');
  }

  const trendList = document.getElementById('live-trending-list');
  if (trendList) {
    trendList.innerHTML = NEWS_STORIES.map((n, i) => `
      <div class="p-3 bg-[#0d1117] rounded-xl border border-[#30363d] cursor-pointer hover:border-cyan-400 transition" onclick="openLiveArticleModal(${i})">
        <span class="text-[9px] mono text-slate-500">${n.time}</span>
        <div class="font-bold text-white mt-0.5">${n.title}</div>
      </div>
    `).join('');
  }
}

function switchPage(pageId) {
  document.querySelectorAll('section[id^="page-"]').forEach(sec => sec.classList.add('hidden'));
  document.querySelectorAll('.nav-dock-capsule > button').forEach(btn => {
    btn.classList.remove('bg-cyan-500', 'text-black', 'shadow-md');
    btn.classList.add('text-slate-400');
  });

  const activeSec = document.getElementById(`page-${pageId}`);
  if (activeSec) activeSec.classList.remove('hidden');

  const activeBtn = document.getElementById(`nav-btn-${pageId}`);
  if (activeBtn) {
    activeBtn.classList.add('bg-cyan-500', 'text-black', 'shadow-md');
    activeBtn.classList.remove('text-slate-400');
  }

  const toolsBtn = document.getElementById('nav-btn-tools');
  if (['sessions', 'sentiment', 'calculator', 'pipcalc', 'correlation', 'regulators', 'billionaires'].includes(pageId)) {
    if (toolsBtn) toolsBtn.classList.add('bg-cyan-500/20', 'border-cyan-400');
  } else {
    if (toolsBtn) toolsBtn.classList.remove('bg-cyan-500/20', 'border-cyan-400');
  }
  window.scrollTo({ top: 0, behavior: 'smooth' });

  if (pageId === 'home') {
    setTimeout(resizeCanvas, 50);
  } else if (pageId === 'terminal') {
    renderTerminalChart(currentActiveAsset.symbol);
    renderTechnicalGauge(currentActiveAsset.symbol);
  } else if (pageId === 'heatmaps') {
    switchHeatmapCategory('sp500');
  } else if (pageId === 'sessions') {
    updateMarketSessions();
  }
}

function selectTerminalAsset(category, index) {
  currentActiveAsset = ASSET_REGISTRY[category][index];
  const nameEl = document.getElementById('active-terminal-name');
  const volEl = document.getElementById('terminal-vol');
  const spreadEl = document.getElementById('terminal-spread');
  if (nameEl) nameEl.innerText = currentActiveAsset.name;
  if (volEl) volEl.innerText = currentActiveAsset.vol;
  if (spreadEl) spreadEl.innerText = `${currentActiveAsset.pips} Pips`;

  renderTerminalChart(currentActiveAsset.symbol);
  renderTechnicalGauge(currentActiveAsset.symbol);
  renderPivotGrid(currentActiveAsset);
}

function renderPivotGrid(asset) {
  const grid = document.getElementById('pivot-levels-grid');
  if (!grid) return;
  grid.innerHTML = `
    <div class="p-2 rounded bg-white/5 border border-white/5 flex justify-between"><span class="text-rose-400">R3</span><b>${asset.r3}</b></div>
    <div class="p-2 rounded bg-white/5 border border-white/5 flex justify-between"><span class="text-rose-300">R2</span><b>${asset.r2}</b></div>
    <div class="p-2 rounded bg-white/5 border border-white/5 flex justify-between"><span class="text-cyan-400">R1</span><b>${asset.r1}</b></div>
    <div class="p-2 rounded bg-cyan-500/10 border border-cyan-500/30 flex justify-between"><span class="text-cyan-300 font-bold">Pivot</span><b class="text-white">${asset.pp}</b></div>
    <div class="p-2 rounded bg-emerald-500/10 border border-emerald-500/20 flex justify-between"><span class="text-emerald-400">S1</span><b>${asset.s1}</b></div>
    <div class="p-2 rounded bg-white/5 border border-white/5 flex justify-between"><span class="text-emerald-300">S2</span><b>${asset.s2}</b></div>
  `;
}

document.addEventListener('DOMContentLoaded', () => {
  loadTradingViewTicker();
  changeAssetCategory('Metals');
  renderSriLankaDesk();
  renderMacroDesk();
  renderBillionaires();
  renderNewsStories();
  runRiskCalculation();
  renderRulerHours();

  updateMarketSessions();
  setInterval(updateMarketSessions, 1000);

  updateHeroLiveQuotes();
  setInterval(updateHeroLiveQuotes, 2000);

  showToast("NEXIS Terminal Online");
});

// ============================================================================
// ADDITIONS & FIXES (previously missing functions)
// ============================================================================
// ============================================================================
// NEXIS ADDITIONS — PASTE AT THE VERY BOTTOM of script.js (after DOMContentLoaded block)
// Functions here also OVERRIDE older versions with the same name (later wins).
// ============================================================================

// ---- Toast ----
function showToast(msg) {
  const t = document.getElementById('toast'), m = document.getElementById('toast-msg');
  if (!t) return;
  if (m) m.innerText = msg;
  t.classList.remove('translate-x-96');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => t.classList.add('translate-x-96'), 2800);
}

// ---- TradingView embed helper ----
function tvEmbed(containerId, scriptName, config) {
  const box = document.getElementById(containerId);
  if (!box) return;
  box.innerHTML = '';
  const inner = document.createElement('div');
  inner.className = 'tradingview-widget-container__widget';
  inner.style.height = '100%';
  box.appendChild(inner);
  const s = document.createElement('script');
  s.src = `https://s3.tradingview.com/external-embedding/embed-widget-${scriptName}.js`;
  s.async = true;
  s.innerHTML = JSON.stringify(config);
  box.appendChild(s);
}

function loadTradingViewTicker() {
  tvEmbed('tv-ticker-tape-container', 'ticker-tape', {
    symbols: [
      { proName: 'OANDA:XAUUSD', title: 'Gold' }, { proName: 'FOREXCOM:SPXUSD', title: 'S&P 500' },
      { proName: 'BINANCE:BTCUSDT', title: 'Bitcoin' }, { proName: 'BINANCE:ETHUSDT', title: 'Ethereum' },
      { proName: 'FX:EURUSD', title: 'EUR/USD' }, { proName: 'FX:USDJPY', title: 'USD/JPY' },
      { proName: 'TVC:USOIL', title: 'WTI Oil' }
    ],
    colorTheme: 'dark', isTransparent: true, displayMode: 'adaptive', locale: 'en'
  });
}

function renderTerminalChart(symbol) {
  const box = document.getElementById('chart-container');
  if (!box || typeof TradingView === 'undefined') return;
  box.innerHTML = '<div id="tv-main-chart" style="height:100%"></div>';
  new TradingView.widget({
    container_id: 'tv-main-chart', autosize: true, symbol, interval: '60', timezone: 'Asia/Colombo',
    theme: 'dark', style: '1', locale: 'en', toolbar_bg: '#0d1117', enable_publishing: false,
    allow_symbol_change: true, hide_side_toolbar: false
  });
}

function renderTechnicalGauge(symbol) {
  tvEmbed('tv-technical-gauge-box', 'technical-analysis', {
    interval: '1h', width: '100%', height: '100%', isTransparent: true, symbol,
    showIntervalTabs: false, displayMode: 'single', locale: 'en', colorTheme: 'dark'
  });
}

// ---- Heatmaps ----
function switchHeatmapCategory(cat) {
  document.querySelectorAll('.hm-btn').forEach(b => {
    b.classList.remove('bg-cyan-500', 'text-black', 'font-bold');
    b.classList.add('bg-[#21262d]', 'text-slate-300');
  });
  const active = document.getElementById(`hm-btn-${cat}`);
  if (active) { active.classList.add('bg-cyan-500', 'text-black', 'font-bold'); active.classList.remove('bg-[#21262d]', 'text-slate-300'); }
  if (cat === 'crypto') {
    tvEmbed('heatmap-embed-box', 'crypto-coins-heatmap', {
      dataSource: 'Crypto', blockSize: 'market_cap_calc', blockColor: '24h_close_change|5', locale: 'en',
      colorTheme: 'dark', hasTopBar: false, isZoomEnabled: true, hasSymbolTooltip: true, width: '100%', height: '100%'
    });
  } else {
    tvEmbed('heatmap-embed-box', 'stock-heatmap', {
      exchanges: [], dataSource: 'SPX500', grouping: 'sector', blockSize: 'market_cap_basic',
      blockColor: 'change', locale: 'en', colorTheme: 'dark', hasTopBar: false, isZoomEnabled: true,
      hasSymbolTooltip: true, isMonoSize: false, width: '100%', height: '100%'
    });
  }
}

// ---- Gain & Loss / lot size calculator ----
function runRiskCalculation() {
  const bal = parseFloat(document.getElementById('calc-balance')?.value) || 0;
  const pct = parseFloat(document.getElementById('calc-risk-pct')?.value) || 0;
  const sl = parseFloat(document.getElementById('calc-sl-pips')?.value) || 0;
  const risk = bal * pct / 100;
  const lots = sl > 0 ? risk / (sl * 10) : 0; // $10 per pip per standard lot
  document.getElementById('res-risk-amount').innerText = `$${risk.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  document.getElementById('res-lot-size').innerText = `${lots.toFixed(2)} Lots`;
  document.getElementById('res-units-size').innerText = Math.round(lots * 100000).toLocaleString();
}

// ---- Fix: category buttons no longer depend on window.event ----
function changeAssetCategory(category) {
  document.querySelectorAll('.cat-btn').forEach(btn => {
    const on = btn.getAttribute('onclick').includes(`'${category}'`);
    btn.classList.toggle('bg-cyan-500', on);
    btn.classList.toggle('text-black', on);
    btn.classList.toggle('font-bold', on);
    btn.classList.toggle('text-slate-400', !on);
  });
  const assets = ASSET_REGISTRY[category] || [];
  const sub = document.getElementById('asset-sublist');
  if (sub) {
    sub.innerHTML = assets.map((a, i) => `
      <button onclick="selectTerminalAsset('${category}', ${i})" class="px-3 py-1.5 rounded-lg ${i === 0 ? 'bg-white/10 text-cyan-400 border border-cyan-500/40' : 'bg-[#161b22] text-slate-300'} hover:border-cyan-400 transition whitespace-nowrap">${a.name}</button>`).join('');
  }
  if (assets.length) selectTerminalAsset(category, 0);
}

// ---- News editions + article modal ----
const DEFAULT_NEWS_IMG = NEWS_STORIES[0].img;
const mkNews = (tag, title, desc) => ({ tag, time: 'Today', title, author: 'NEXIS Desk', desc, img: DEFAULT_NEWS_IMG, body: desc });
const NEWS_BY_EDITION = {
  global: NEWS_STORIES.slice(),
  lk: [
    mkNews('SRI LANKA', 'CSE Market Wrap: ASPI Session Summary', 'Placeholder story - connect a live feed or edit this text.'),
    mkNews('CBSL', 'Central Bank Policy and Reserve Update', 'Placeholder story - connect a live feed or edit this text.'),
    mkNews('LKR', 'Rupee Outlook: Remittances and Import Demand', 'Placeholder story - connect a live feed or edit this text.')
  ],
  us: [
    mkNews('WALL STREET', 'US Equities: Index Performance Overview', 'Placeholder story - connect a live feed or edit this text.'),
    mkNews('FED', 'Federal Reserve Rate Path and Market Pricing', 'Placeholder story - connect a live feed or edit this text.'),
    mkNews('EARNINGS', 'Earnings Season Highlights', 'Placeholder story - connect a live feed or edit this text.')
  ],
  asia: [
    mkNews('ASIA-PACIFIC', 'Asian Markets: Regional Session Summary', 'Placeholder story - connect a live feed or edit this text.'),
    mkNews('BOJ', 'Bank of Japan Policy Stance and Yen Moves', 'Placeholder story - connect a live feed or edit this text.'),
    mkNews('CHINA', 'China Data and Commodity Demand', 'Placeholder story - connect a live feed or edit this text.')
  ],
  eu: [
    mkNews('EUROPE', 'European Equities: DAX and FTSE Overview', 'Placeholder story - connect a live feed or edit this text.'),
    mkNews('ECB', 'ECB Policy Outlook and Euro Reaction', 'Placeholder story - connect a live feed or edit this text.'),
    mkNews('UK', 'Bank of England and Sterling Update', 'Placeholder story - connect a live feed or edit this text.')
  ]
};

function renderNewsHero() {
  const n = NEWS_STORIES[0]; if (!n) return;
  const set = (id, v) => { const e = document.getElementById(id); if (e) e.innerText = v; };
  set('live-hero-tag', n.tag); set('live-hero-time', n.time); set('live-hero-title', n.title); set('live-hero-desc', n.desc);
  const img = document.getElementById('live-hero-img'); if (img) img.src = n.img;
}

function changeEdition(ed) {
  NEWS_STORIES.splice(0, NEWS_STORIES.length, ...(NEWS_BY_EDITION[ed] || NEWS_BY_EDITION.global));
  renderNewsHero(); renderNewsStories();
  showToast('Edition switched');
}

function openLiveArticleModal(i) {
  const n = NEWS_STORIES[i]; if (!n) return;
  document.getElementById('modal-tag').innerText = `${n.tag} • ${n.time}`;
  document.getElementById('modal-img').src = n.img;
  document.getElementById('modal-title').innerText = n.title;
  document.getElementById('modal-body').innerHTML = `<p>${n.body || n.desc}</p><p class="text-xs text-slate-500">By ${n.author}</p>`;
  document.getElementById('article-modal').classList.remove('hidden');
}
function closeArticleModal() { document.getElementById('article-modal').classList.add('hidden'); }

// ---- Auth (front-end demo; connect Supabase later for real login) ----
function toggleAuthModal(show) { document.getElementById('auth-modal').classList.toggle('hidden', !show); }
function handleAuthSignIn(e) {
  e.preventDefault();
  const user = document.getElementById('signin-user').value.trim();
  toggleAuthModal(false);
  showToast(`Welcome, ${user}`);
}

// ---- Market hours: session bars, volume wave, aligned pin ----
const SESSIONS_UTC = { 'bar-sydney-1': [22, 7], 'bar-tokyo': [0, 9], 'bar-london': [8, 17], 'bar-ny': [13, 22] };

function getTzOffset() {
  const now = new Date();
  const tz = new Date(now.toLocaleString('en-US', { timeZone: currentSessionTimezone }));
  const utc = new Date(now.toLocaleString('en-US', { timeZone: 'UTC' }));
  return Math.round((tz - utc) / 9e5) / 4; // hours, supports :30 and :45
}
function getLocalHour() {
  if (customTimelineHour !== null) return customTimelineHour;
  const t = new Date(new Date().toLocaleString('en-US', { timeZone: currentSessionTimezone }));
  return t.getHours() + t.getMinutes() / 60;
}
function placeBar(id, s, e, off) {
  const el = document.getElementById(id); if (!el) return;
  const a = (((s + off) % 24) + 24) % 24, len = (e - s + 24) % 24, w1 = Math.min(len, 24 - a);
  let el2 = document.getElementById(id + '-2');
  if (!el2) { el2 = el.cloneNode(false); el2.id = id + '-2'; el.parentElement.appendChild(el2); }
  el.style.left = (a / 24 * 100) + '%'; el.style.width = (w1 / 24 * 100) + '%';
  if (len > w1) { el2.style.display = ''; el2.style.left = '0%'; el2.style.width = ((len - w1) / 24 * 100) + '%'; }
  else el2.style.display = 'none';
}
function drawVolumeWave(off, hr) {
  const c = document.getElementById('volume-wave-canvas'); if (!c || !c.clientWidth) return;
  c.width = c.clientWidth; c.height = c.clientHeight;
  const g = c.getContext('2d'), W = c.width, H = c.height;
  const d = (x, m) => { const k = Math.abs(x - m); return Math.min(k, 24 - k); };
  const vol = u => 0.2 + 0.8 * Math.exp(-(d(u, 15) ** 2) / 18) + 0.3 * Math.exp(-(d(u, 8.5) ** 2) / 8);
  g.beginPath(); g.moveTo(0, H);
  for (let x = 0; x <= W; x += 4) g.lineTo(x, H - Math.min(1, vol((((x / W * 24 - off) % 24) + 24) % 24)) * (H - 4));
  g.lineTo(W, H); g.closePath();
  g.fillStyle = 'rgba(6,182,212,0.25)'; g.fill();
  g.strokeStyle = '#06b6d4'; g.lineWidth = 1.5; g.stroke();
  g.strokeStyle = '#7c3aed'; g.lineWidth = 2; g.beginPath(); g.moveTo(hr / 24 * W, 0); g.lineTo(hr / 24 * W, H); g.stroke();
}
// Volume label now uses UTC hours, so it is correct for every timezone
function updateVolumeWave(hour) {
  const pill = document.getElementById('traffic-light-pill'), label = document.getElementById('volume-status-label');
  if (!pill || !label) return;
  const u = (((hour - getTzOffset()) % 24) + 24) % 24;
  const base = 'flex items-center gap-2 px-3 py-1.5 rounded-full font-bold text-xs ';
  if (u >= 13 && u < 17) { pill.className = base + 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-400'; label.innerText = 'High Volume'; }
  else if ((u >= 7 && u < 13) || (u >= 17 && u < 21)) { pill.className = base + 'bg-amber-500/20 border border-amber-500/40 text-amber-400'; label.innerText = 'Medium Volume'; }
  else { pill.className = base + 'bg-slate-800 border border-white/10 text-slate-400'; label.innerText = 'Low Volume'; }
}
function moveTimelinePin(e) {
  if (!isDragging) return;
  const c = document.getElementById('timeline-scroll-container'); if (!c) return;
  const r = c.getBoundingClientRect(), x = (e.touches ? e.touches[0].clientX : e.clientX) - r.left - 144;
  customTimelineHour = Math.max(0, Math.min(1, x / (r.width - 144))) * 24;
  updateMarketSessions();
}
function renderRulerHours() {
  const row = document.getElementById('ruler-hours-row'); if (!row) return;
  row.style.padding = '0 0 0 9rem';
  let h = '';
  for (let i = 0; i <= 24; i += 2) h += `<span>${is24HourMode ? i : (i % 12 || 12)}</span>`;
  row.innerHTML = h;
}
(function wrapSessions() {
  const base = updateMarketSessions;
  updateMarketSessions = function () {
    base();
    const off = getTzOffset(), hr = getLocalHour();
    Object.entries(SESSIONS_UTC).forEach(([id, [s, e]]) => placeBar(id, s, e, off));
    const pin = document.getElementById('draggable-time-pin');
    if (pin) { pin.style.transform = 'translateX(-50%)'; pin.style.left = `calc(9rem + (100% - 9rem) * ${hr / 24})`; }
    drawVolumeWave(off, hr);
  };
})();
document.addEventListener('DOMContentLoaded', () => {
  const tl = document.getElementById('timeline-scroll-container');
  if (tl) tl.addEventListener('dblclick', () => { customTimelineHour = null; updateMarketSessions(); showToast('Timeline reset to live time'); });
});

// ---- Risk-On / Risk-Off meter ----
function runSentiment() {
  const v = id => parseFloat(document.getElementById(id)?.value) || 0;
  let s = 50 + v('sen-spx') * 15 - (v('sen-vix') - 18) * 2.5 - v('sen-gold') * 5 - v('sen-dxy') * 10 + v('sen-btc') * 2;
  s = Math.max(0, Math.min(100, Math.round(s)));
  document.getElementById('sen-needle').style.left = s + '%';
  document.getElementById('sen-score').innerText = s;
  document.getElementById('sen-label').innerText = s >= 65 ? 'RISK-ON' : s <= 35 ? 'RISK-OFF' : 'NEUTRAL';
}

// ---- Pip value calculator ----
function runPipCalc() {
  const [contract, pip, usdQuote] = document.getElementById('pip-pair').value.split('|').map(Number);
  const lots = parseFloat(document.getElementById('pip-lots').value) || 0;
  const rate = parseFloat(document.getElementById('pip-rate').value) || 1;
  const val = contract * pip * lots / (usdQuote ? 1 : rate);
  document.getElementById('pip-result').innerText = `$${val.toFixed(2)}`;
}

// ---- Correlation matrix (illustrative values, edit as needed) ----
const CORR_PAIRS = ['EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF', 'AUDUSD', 'XAUUSD'];
const CORR_DATA = [
  [1.00, 0.85, -0.55, -0.92, 0.65, 0.40],
  [0.85, 1.00, -0.45, -0.80, 0.62, 0.35],
  [-0.55, -0.45, 1.00, 0.60, -0.40, -0.45],
  [-0.92, -0.80, 0.60, 1.00, -0.60, -0.38],
  [0.65, 0.62, -0.40, -0.60, 1.00, 0.50],
  [0.40, 0.35, -0.45, -0.38, 0.50, 1.00]
];
function renderCorrelation() {
  const t = document.getElementById('corr-matrix'); if (!t) return;
  const cell = v => {
    const a = Math.abs(v), rgb = v >= 0 ? '16,185,129' : '244,63,94';
    return `<td class="p-3 font-bold text-white" style="background:rgba(${rgb},${(a * 0.6).toFixed(2)})">${v.toFixed(2)}</td>`;
  };
  t.innerHTML = `<tr><th class="p-3"></th>${CORR_PAIRS.map(p => `<th class="p-3 text-slate-400">${p}</th>`).join('')}</tr>` +
    CORR_DATA.map((row, i) => `<tr><th class="p-3 text-slate-400 text-left">${CORR_PAIRS[i]}</th>${row.map(cell).join('')}</tr>`).join('');
}

// ---- Regulatory directory ----
const REGULATORS = [
  { n: 'Securities & Exchange Commission of Sri Lanka', c: 'Sri Lanka', u: 'https://www.sec.gov.lk' },
  { n: 'Central Bank of Sri Lanka (CBSL)', c: 'Sri Lanka', u: 'https://www.cbsl.gov.lk' },
  { n: 'Financial Conduct Authority (FCA)', c: 'United Kingdom', u: 'https://www.fca.org.uk' },
  { n: 'U.S. Securities & Exchange Commission', c: 'United States', u: 'https://www.sec.gov' },
  { n: 'Commodity Futures Trading Commission', c: 'United States', u: 'https://www.cftc.gov' },
  { n: 'Australian Securities & Investments Commission', c: 'Australia', u: 'https://asic.gov.au' },
  { n: 'Cyprus Securities & Exchange Commission', c: 'Cyprus', u: 'https://www.cysec.gov.cy' }
];
function renderRegulators() {
  const g = document.getElementById('reg-grid'); if (!g) return;
  g.innerHTML = REGULATORS.map(r => `
    <a href="${r.u}" target="_blank" rel="noopener" class="p-4 bg-[#0d1117] rounded-2xl border border-[#30363d] hover:border-cyan-400 transition block">
      <span class="text-amber-400 font-bold block">${r.c}</span>
      <span class="text-white font-bold">${r.n}</span>
      <span class="text-[10px] text-slate-500 block mt-1">${r.u.replace('https://', '')}</span>
    </a>`).join('');
}

document.addEventListener('DOMContentLoaded', () => {
  renderCorrelation(); renderRegulators(); runSentiment(); runPipCalc(); renderNewsHero();
});

// ============================================================================
// LIVE DATA PATCH — removes hardcoded fake numbers, uses real feeds
// ============================================================================
const BINANCE = 'https://api.binance.com/api/v3';
const nfmt = (n, d = 2) => Number(n).toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d });

// Correct TradingView symbols (some old ones were invalid / mismatched)
const SYMBOL_FIX = { 'S&P 500 Index': 'FOREXCOM:SPXUSD', 'DAX 40 (Germany)': 'FOREXCOM:GRXEUR', 'Silver Spot (XAG/USD)': 'OANDA:XAGUSD' };
Object.values(ASSET_REGISTRY).flat().forEach(a => { if (SYMBOL_FIX[a.name]) a.symbol = SYMBOL_FIX[a.name]; });

// Hero cards: real BTC + ETH from Binance
let _heroT = 0;
async function updateHeroLiveQuotes() {
  if (Date.now() - _heroT < 8000) return;
  _heroT = Date.now();
  for (const [sym, pid, cid] of [['ETHUSDT', 'hero-live-gold', 'hero-chg-gold'], ['BTCUSDT', 'hero-live-btc', 'hero-chg-btc']]) {
    try {
      const j = await (await fetch(`${BINANCE}/ticker/24hr?symbol=${sym}`)).json();
      const p = document.getElementById(pid), c = document.getElementById(cid), ch = parseFloat(j.priceChangePercent);
      if (p) p.innerText = `$${nfmt(j.lastPrice)}`;
      if (c) { c.innerText = `${ch >= 0 ? '+' : ''}${ch.toFixed(2)}%`; c.className = `text-[10px] font-black ${ch >= 0 ? 'text-emerald-400' : 'text-rose-400'}`; }
    } catch (e) { /* keep last value */ }
  }
}

// Terminal side stats: real volume, spread and classic pivots (previous daily candle) where Binance data exists
async function renderLiveStats(asset) {
  const set = (id, v) => { const e = document.getElementById(id); if (e) e.innerText = v; };
  set('terminal-vol', '—'); set('terminal-spread', '—');
  const grid = document.getElementById('pivot-levels-grid');
  const sym = asset.symbol.startsWith('BINANCE:') ? asset.symbol.split(':')[1] : null;
  if (!sym) { if (grid) grid.innerHTML = '<div class="col-span-2 text-slate-400 p-2">Live volume, spread and pivots are available for crypto pairs. Use the chart and Technical Meter for this instrument.</div>'; return; }
  if (grid) grid.innerHTML = '<div class="col-span-2 text-slate-400 p-2">Loading…</div>';
  try {
    const [t, b, k] = await Promise.all([
      fetch(`${BINANCE}/ticker/24hr?symbol=${sym}`).then(r => r.json()),
      fetch(`${BINANCE}/ticker/bookTicker?symbol=${sym}`).then(r => r.json()),
      fetch(`${BINANCE}/klines?symbol=${sym}&interval=1d&limit=2`).then(r => r.json())
    ]);
    if (currentActiveAsset !== asset) return;
    set('terminal-vol', `$${nfmt(t.quoteVolume / 1e9)}B`);
    set('terminal-spread', `${nfmt(b.askPrice - b.bidPrice, 2)} USDT`);
    const [, , H, L, C] = k[0].map(Number), P = (H + L + C) / 3, d = P > 1000 ? 2 : 4, f = v => nfmt(v, d);
    renderPivotGrid({ r3: f(H + 2 * (P - L)), r2: f(P + (H - L)), r1: f(2 * P - L), pp: f(P), s1: f(2 * P - H), s2: f(P - (H - L)) });
  } catch (e) { if (grid) grid.innerHTML = '<div class="col-span-2 text-rose-400 p-2">Data feed unavailable right now.</div>'; }
}
function selectTerminalAsset(category, index) {
  currentActiveAsset = ASSET_REGISTRY[category][index];
  const n = document.getElementById('active-terminal-name'); if (n) n.innerText = currentActiveAsset.name;
  renderTerminalChart(currentActiveAsset.symbol);
  renderTechnicalGauge(currentActiveAsset.symbol);
  renderLiveStats(currentActiveAsset);
}

// Sri Lanka: real FX from open.er-api.com (market rates, not official CBSL rates)
async function loadLkrRates() {
  const box = document.getElementById('cbsl-rates-grid'), bento = document.getElementById('bento-lkr');
  try {
    const r = (await (await fetch('https://open.er-api.com/v6/latest/USD')).json()).rates, lkr = r.LKR;
    const list = [['USD', 1], ['EUR', r.EUR], ['GBP', r.GBP], ['AUD', r.AUD], ['JPY', r.JPY], ['CAD', r.CAD]];
    if (box) box.innerHTML = list.map(([c, x]) => `
      <div class="p-2.5 bg-[#0d1117] rounded-xl border border-[#30363d] flex justify-between items-center">
        <span class="text-slate-400 font-bold">${c} / LKR</span><b class="text-white">${nfmt(lkr / x, c === 'JPY' ? 4 : 2)}</b></div>`).join('');
    if (bento) bento.innerText = nfmt(lkr);
  } catch (e) { if (box) box.innerHTML = '<div class="col-span-full text-rose-400">FX feed unavailable right now.</div>'; if (bento) bento.innerText = '—'; }
}

// Macro: policy rates (dated, from TD Economics/Bloomberg) + live bond yields via TradingView
const CB_RATES = [
  { name: 'US Federal Reserve', rate: '3.50–3.75%' }, { name: 'European Central Bank', rate: '2.40%' },
  { name: 'Bank of England', rate: '3.75%' }, { name: 'Bank of Japan', rate: '1.00%' }
];
function renderMacroDesk() {
  const cb = document.getElementById('central-banks-grid');
  if (cb) cb.innerHTML = CB_RATES.map(b => `
    <div class="p-4 bg-[#0d1117] rounded-2xl border border-[#30363d] space-y-1">
      <span class="text-slate-400 block">${b.name}</span><div class="text-xl font-bold text-cyan-400">${b.rate}</div>
      <div class="text-[10px] text-slate-500">As of 28 Aug 2026 (TD Economics / Bloomberg). Verify before relying on it.</div></div>`).join('');
  const y = document.getElementById('global-yields-grid');
  if (y) {
    const items = [['yld-us', 'TVC:US10Y'], ['yld-uk', 'TVC:GB10Y'], ['yld-de', 'TVC:DE10Y'], ['yld-jp', 'TVC:JP10Y']];
    y.innerHTML = items.map(([id]) => `<div id="${id}" style="min-height:130px"></div>`).join('');
    items.forEach(([id, symbol]) => tvEmbed(id, 'single-quote', { symbol, width: '100%', colorTheme: 'dark', isTransparent: true, locale: 'en' }));
  }
}

// Clearly label anything that is still sample data
function markSample(id, text) {
  const el = document.getElementById(id); if (!el) return;
  const t = el.closest('table') || el;
  t.insertAdjacentHTML('beforebegin', `<div class="text-[10px] mono text-amber-400 bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-1.5">⚠ ${text}</div>`);
}

document.addEventListener('DOMContentLoaded', () => {
  [['bento-xau', 'OANDA:XAUUSD'], ['bento-spx', 'FOREXCOM:SPXUSD'], ['bento-btc', 'BINANCE:BTCUSDT']]
    .forEach(([id, symbol]) => tvEmbed(id, 'single-quote', { symbol, width: '100%', colorTheme: 'dark', isTransparent: true, locale: 'en' }));
  const cb = document.getElementById('cbsl-rates-grid'); if (cb) cb.innerHTML = '<div class="col-span-full text-slate-400">Loading…</div>';
  loadLkrRates(); setInterval(loadLkrRates, 600000);
  renderMacroDesk();
  markSample('pal-essentials-grid', 'Sample data, not live: gold sovereign and fuel prices. Update manually from Pal.lk / CPC.');
  markSample('cse-companies-view', 'Sample data, not live: CSE prices. Needs a CSE data source.');
  markSample('billionaires-table-body', 'Sample data, not live: net worth figures are not current.');
  markSample('corr-matrix', 'Sample data, not live: approximate correlation values.');
  const ns = document.getElementById('news-sync-status'); if (ns) ns.innerText = 'SAMPLE CONTENT, NOT LIVE NEWS';
  const f = document.getElementById('cbsl-rates-grid'); if (f) f.insertAdjacentHTML('beforebegin', '<div class="text-[10px] mono text-slate-500">Live market FX rates (open.er-api.com). Not official CBSL buying/selling rates.</div>');
  updateHeroLiveQuotes();
});


// ============================================================================
// MOBILE NAV + FOREX/METALS PIVOTS VIA /api/quote (Vercel proxy)
// ============================================================================
const MOBILE_NAV_CLASSES = ['flex', 'flex-col', 'fixed', 'top-[72px]', 'left-3', 'right-3', 'z-50', 'items-stretch', 'max-h-[80vh]', 'overflow-y-auto'];
function toggleMobileMenu(e) {
  if (e) e.stopPropagation();
  const nav = document.getElementById('main-nav'); if (!nav) return;
  const open = nav.classList.contains('hidden');
  nav.classList.toggle('hidden', !open);
  MOBILE_NAV_CLASSES.forEach(c => nav.classList.toggle(c, open));
}
function closeMobileMenu() {
  const nav = document.getElementById('main-nav');
  if (nav && window.innerWidth < 1024 && !nav.classList.contains('hidden')) toggleMobileMenu();
}
(function wrapSwitchPage() {
  const base = switchPage;
  switchPage = function (id) { base(id); closeMobileMenu(); };
})();
window.addEventListener('resize', () => {
  const nav = document.getElementById('main-nav'); if (!nav) return;
  if (window.innerWidth >= 1024) { MOBILE_NAV_CLASSES.forEach(c => nav.classList.remove(c)); nav.classList.add('hidden'); }
});

const TD_SYMBOLS = { 'EUR / USD': 'EUR/USD', 'GBP / USD': 'GBP/USD', 'USD / JPY': 'USD/JPY', 'Gold Spot (XAU/USD)': 'XAU/USD', 'Silver Spot (XAG/USD)': 'XAG/USD' };
(function wrapLiveStats() {
  const base = renderLiveStats;
  renderLiveStats = async function (asset) {
    const td = TD_SYMBOLS[asset.name];
    if (!td) return base(asset);
    const set = (id, v) => { const e = document.getElementById(id); if (e) e.innerText = v; };
    set('terminal-vol', '—'); set('terminal-spread', '—');
    const grid = document.getElementById('pivot-levels-grid');
    if (grid) grid.innerHTML = '<div class="col-span-2 text-slate-400 p-2">Loading…</div>';
    try {
      const j = await (await fetch(`/api/quote?symbol=${encodeURIComponent(td)}`)).json();
      if (currentActiveAsset !== asset) return;
      const k = j.values && j.values[1]; if (!k) throw new Error('no data');
      const H = +k.high, L = +k.low, C = +k.close, P = (H + L + C) / 3;
      const d = C > 1000 ? 2 : C > 100 ? 3 : 5, f = v => nfmt(v, d);
      renderPivotGrid({ r3: f(H + 2 * (P - L)), r2: f(P + (H - L)), r1: f(2 * P - L), pp: f(P), s1: f(2 * P - H), s2: f(P - (H - L)) });
    } catch (e) {
      if (grid) grid.innerHTML = '<div class="col-span-2 text-slate-400 p-2">Pivots need the /api/quote proxy with a Twelve Data key (works after deploying to Vercel).</div>';
    }
  };
})();

// ============================================================================
// PHASE 2: LOGIN, WATCHLIST, ALERTS, JOURNAL, LIVE NEWS, CSE, GOLD, CORRELATION,
// SINHALA TOGGLE, LEGAL PAGES
// ============================================================================

// ---- CONFIG: paste your Supabase project values here (Project Settings > API) ----
const SUPABASE_URL = '';
const SUPABASE_ANON_KEY = '';
const sb = (SUPABASE_URL && SUPABASE_ANON_KEY && window.supabase) ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
let currentUser = null;
let userData = { watchlist: [], alerts: [], journal: [] };
const lsKey = () => 'nexis_user_data_' + (currentUser ? currentUser.id : 'guest');

// ---- Saved user data (Supabase if logged in, always mirrored to this device) ----
async function loadUserData() {
  userData = { watchlist: [], alerts: [], journal: [] };
  try { Object.assign(userData, JSON.parse(localStorage.getItem(lsKey()) || '{}')); } catch (e) { }
  if (sb && currentUser) {
    try {
      const { data } = await sb.from('user_data').select('data').eq('user_id', currentUser.id).maybeSingle();
      if (data && data.data) Object.assign(userData, data.data);
    } catch (e) { }
  }
  const s = document.getElementById('sync-status');
  if (s) s.innerText = currentUser ? 'Synced to your account' : 'Saved on this device';
  updateStar(); renderWatchlist(); renderAlerts(); renderJournal();
}
async function saveUserData() {
  try { localStorage.setItem(lsKey(), JSON.stringify(userData)); } catch (e) { }
  if (sb && currentUser) { try { await sb.from('user_data').upsert({ user_id: currentUser.id, data: userData, updated_at: new Date().toISOString() }); } catch (e) { } }
}

// ---- Auth ----
let authMode = 'signin';
function authMsg(t) { const m = document.getElementById('auth-msg'); if (m) m.innerText = t || ''; }
function toggleAuthMode() {
  authMode = authMode === 'signin' ? 'signup' : 'signin';
  const t = document.getElementById('auth-modal-title'), b = document.getElementById('auth-toggle'), sbtn = document.querySelector('#auth-signin-view button[type=submit]');
  if (t) t.innerText = authMode === 'signin' ? 'Terminal Desk Sign In' : 'Create Your Account';
  if (b) b.innerText = authMode === 'signin' ? 'No account? Create one' : 'Already have an account? Sign in';
  if (sbtn) sbtn.innerText = authMode === 'signin' ? 'SIGN IN DESK' : 'CREATE ACCOUNT';
  authMsg('');
}
async function handleAuthSignIn(e) {
  e.preventDefault();
  const email = document.getElementById('signin-user').value.trim(), password = document.getElementById('signin-pass').value;
  if (!sb) { authMsg('Login is not configured yet. Add SUPABASE_URL and SUPABASE_ANON_KEY at the top of the Phase 2 section in script.js. Your data is saved on this device for now.'); return; }
  authMsg('Please wait…');
  const { data, error } = authMode === 'signup' ? await sb.auth.signUp({ email, password }) : await sb.auth.signInWithPassword({ email, password });
  if (error) { authMsg(error.message); return; }
  if (authMode === 'signup' && !data.session) { authMsg('Check your email to confirm your account, then sign in.'); return; }
  authMsg(''); toggleAuthModal(false);
}
function handleAuthButton() { if (currentUser && sb) sb.auth.signOut(); else toggleAuthModal(true); }
function applyAuthState(user) {
  currentUser = user || null;
  const b = document.getElementById('auth-btn');
  if (b) b.innerText = currentUser ? 'Sign Out' : (LANG === 'si' ? 'පිවිසෙන්න' : 'Sign In');
  if (currentUser) showToast('Signed in as ' + currentUser.email);
  loadUserData();
}
if (sb) sb.auth.onAuthStateChange((_ev, session) => applyAuthState(session ? session.user : null));

// ---- Watchlist (TradingView live quotes) ----
function updateStar() {
  const b = document.getElementById('star-btn'); if (!b || !currentActiveAsset) return;
  const on = userData.watchlist.some(w => w.symbol === currentActiveAsset.symbol);
  b.innerText = on ? '★' : '☆'; b.classList.toggle('text-amber-300', on);
}
function toggleWatch() {
  const a = currentActiveAsset, i = userData.watchlist.findIndex(w => w.symbol === a.symbol);
  if (i >= 0) userData.watchlist.splice(i, 1); else userData.watchlist.push({ symbol: a.symbol, name: a.name });
  saveUserData(); updateStar(); showToast(i >= 0 ? 'Removed from watchlist' : 'Added to watchlist');
}
function removeWatch(i) { userData.watchlist.splice(i, 1); saveUserData(); renderWatchlist(); updateStar(); }
function renderWatchlist() {
  const g = document.getElementById('watch-grid'); if (!g) return;
  if (!userData.watchlist.length) { g.innerHTML = '<div class="text-xs mono text-slate-400 col-span-full">Your watchlist is empty.</div>'; return; }
  g.innerHTML = userData.watchlist.map((w, i) => `<div class="p-3 bg-[#0d1117] rounded-2xl border border-[#30363d]"><div class="flex justify-between text-xs mono mb-1"><b class="text-white">${esc(w.name)}</b><button onclick="removeWatch(${i})" class="text-rose-400">Remove</button></div><div id="wl-${i}" style="min-height:130px"></div></div>`).join('');
  userData.watchlist.forEach((w, i) => tvEmbed(`wl-${i}`, 'single-quote', { symbol: w.symbol, width: '100%', colorTheme: 'dark', isTransparent: true, locale: 'en' }));
}

// ---- Price alerts (Binance prices, browser notification) ----
function addAlert() {
  const price = parseFloat(document.getElementById('al-price').value);
  if (!(price > 0)) { showToast('Enter a valid price'); return; }
  userData.alerts.push({ id: Date.now(), sym: document.getElementById('al-sym').value, dir: document.getElementById('al-dir').value, price, done: false });
  saveUserData(); renderAlerts(); document.getElementById('al-price').value = '';
  if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission();
}
function removeAlert(id) { userData.alerts = userData.alerts.filter(a => a.id !== id); saveUserData(); renderAlerts(); }
function renderAlerts() {
  const l = document.getElementById('alert-list'); if (!l) return;
  l.innerHTML = userData.alerts.length ? userData.alerts.map(a => `<div class="flex justify-between items-center p-2.5 bg-[#0d1117] rounded-xl border border-[#30363d]"><span class="${a.done ? 'text-slate-500 line-through' : 'text-white'}">${esc(a.sym)} ${a.dir === 'above' ? '≥' : '≤'} ${nfmt(a.price, 2)} ${a.done ? '(triggered)' : ''}</span><button onclick="removeAlert(${a.id})" class="text-rose-400">Delete</button></div>`).join('') : '<div class="text-slate-400">No alerts yet.</div>';
}
async function checkAlerts() {
  const active = userData.alerts.filter(a => !a.done); if (!active.length) return;
  const prices = {};
  for (const s of [...new Set(active.map(a => a.sym))]) {
    try { prices[s] = parseFloat((await (await fetch(`${BINANCE}/ticker/price?symbol=${s}`)).json()).price); } catch (e) { }
  }
  let changed = false;
  active.forEach(a => {
    const p = prices[a.sym]; if (!p) return;
    if ((a.dir === 'above' && p >= a.price) || (a.dir === 'below' && p <= a.price)) {
      a.done = true; changed = true;
      const msg = `${a.sym} is ${a.dir === 'above' ? 'above' : 'below'} ${nfmt(a.price, 2)} (now ${nfmt(p, 2)})`;
      showToast(msg);
      if ('Notification' in window && Notification.permission === 'granted') new Notification('NEXIS price alert', { body: msg });
    }
  });
  if (changed) { saveUserData(); renderAlerts(); }
}
setInterval(checkAlerts, 20000);

// ---- Trade journal ----
function addTrade() {
  const v = id => document.getElementById(id).value;
  if (!v('j-pair').trim()) { showToast('Enter a pair'); return; }
  userData.journal.push({ id: Date.now(), date: v('j-date') || new Date().toISOString().slice(0, 10), pair: v('j-pair').trim().toUpperCase(), side: v('j-side'), lots: v('j-lots'), entry: v('j-entry'), exit: v('j-exit'), pl: parseFloat(v('j-pl')) || 0, note: v('j-note') });
  saveUserData(); renderJournal();
  ['j-pair', 'j-lots', 'j-entry', 'j-exit', 'j-pl', 'j-note'].forEach(id => document.getElementById(id).value = '');
}
function removeTrade(id) { userData.journal = userData.journal.filter(t => t.id !== id); saveUserData(); renderJournal(); }
function renderJournal() {
  const b = document.getElementById('journal-body'), s = document.getElementById('journal-stats'); if (!b) return;
  const j = userData.journal, total = j.reduce((x, t) => x + t.pl, 0), wins = j.filter(t => t.pl > 0).length;
  if (s) s.innerHTML = j.length ? `Trades: <b class="text-white">${j.length}</b> &nbsp; Win rate: <b class="text-white">${Math.round(wins / j.length * 100)}%</b> &nbsp; Net P/L: <b class="${total >= 0 ? 'text-emerald-400' : 'text-rose-400'}">$${nfmt(total, 2)}</b>` : 'No trades logged yet.';
  b.innerHTML = j.slice().reverse().map(t => `<tr><td class="p-2">${esc(t.date)}</td><td class="p-2 text-white">${esc(t.pair)}</td><td class="p-2">${esc(t.side)}</td><td class="p-2">${esc(t.lots)}</td><td class="p-2">${esc(t.entry)}</td><td class="p-2">${esc(t.exit)}</td><td class="p-2 ${t.pl >= 0 ? 'text-emerald-400' : 'text-rose-400'}">${nfmt(t.pl, 2)}</td><td class="p-2">${esc(t.note)}</td><td class="p-2"><button onclick="removeTrade(${t.id})" class="text-rose-400">✕</button></td></tr>`).join('');
}
function exportJournalCsv() {
  const q = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const rows = [['Date', 'Pair', 'Side', 'Lots', 'Entry', 'Exit', 'P/L', 'Notes'], ...userData.journal.map(t => [t.date, t.pair, t.side, t.lots, t.entry, t.exit, t.pl, t.note])];
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([rows.map(r => r.map(q).join(',')).join('\n')], { type: 'text/csv' }));
  a.download = 'nexis-journal.csv'; a.click(); URL.revokeObjectURL(a.href);
}

// ---- Live news via RSS (headline, short summary and link only) ----
const NEWS_FEEDS = {
  global: 'https://feeds.bbci.co.uk/news/business/rss.xml', lk: 'https://economynext.com/feed/',
  us: 'https://www.cnbc.com/id/100003114/device/rss/rss.html', asia: 'https://feeds.bbci.co.uk/news/world/asia/rss.xml',
  eu: 'https://feeds.bbci.co.uk/news/world/europe/rss.xml'
};
const stripHtml = s => { const d = document.createElement('div'); d.innerHTML = s || ''; return (d.textContent || '').trim(); };
function relTime(s) {
  const t = new Date(String(s).replace(' ', 'T') + 'Z'), m = Math.round((Date.now() - t) / 60000);
  if (isNaN(m)) return 'Recent'; return m < 60 ? `${Math.max(m, 1)}m ago` : m < 1440 ? `${Math.round(m / 60)}h ago` : `${Math.round(m / 1440)}d ago`;
}
async function loadNews(ed) {
  const st = document.getElementById('news-sync-status'); if (st) st.innerText = 'LOADING…';
  try {
    const j = await (await fetch('https://api.rss2json.com/v1/api.json?rss_url=' + encodeURIComponent(NEWS_FEEDS[ed] || NEWS_FEEDS.global))).json();
    if (j.status !== 'ok' || !j.items.length) throw new Error('bad feed');
    const list = j.items.slice(0, 7).map(i => {
      const d = stripHtml(i.description); const short = d.length > 170 ? d.slice(0, 167) + '…' : d;
      return { tag: (j.feed.title || 'NEWS').toUpperCase().slice(0, 24), time: relTime(i.pubDate), title: i.title, author: i.author || j.feed.title, desc: short, body: short, img: i.thumbnail || (i.enclosure && i.enclosure.link) || DEFAULT_NEWS_IMG, link: i.link };
    });
    NEWS_STORIES.splice(0, NEWS_STORIES.length, ...list);
    renderNewsHero(); renderNewsStories();
    if (st) st.innerText = 'LIVE RSS FEED';
  } catch (e) { if (st) st.innerText = 'FEED UNAVAILABLE, SHOWING SAMPLE'; }
}
function changeEdition(ed) { loadNews(ed); }
function renderNewsHero() {
  const n = NEWS_STORIES[0]; if (!n) return;
  const set = (id, v) => { const e = document.getElementById(id); if (e) e.textContent = v; };
  set('live-hero-tag', n.tag); set('live-hero-time', n.time); set('live-hero-title', n.title); set('live-hero-desc', n.desc);
  const img = document.getElementById('live-hero-img'); if (img) { img.onerror = () => { img.onerror = null; img.src = DEFAULT_NEWS_IMG; }; img.src = n.img; }
}
function renderNewsStories() {
  const sub = document.getElementById('live-subleads-grid');
  if (sub) sub.innerHTML = NEWS_STORIES.slice(1, 5).map((n, i) => `<div class="realistic-card rounded-2xl p-5 cursor-pointer group" onclick="openLiveArticleModal(${i + 1})"><span class="text-[10px] mono text-cyan-400 font-bold">${esc(n.tag)}</span><h3 class="font-serif font-bold text-base text-white mt-2 group-hover:text-cyan-400 transition">${esc(n.title)}</h3><p class="text-xs text-slate-400 mt-2">${esc(n.desc)}</p></div>`).join('');
  const tr = document.getElementById('live-trending-list');
  if (tr) tr.innerHTML = NEWS_STORIES.map((n, i) => `<div class="p-3 bg-[#0d1117] rounded-xl border border-[#30363d] cursor-pointer hover:border-cyan-400 transition" onclick="openLiveArticleModal(${i})"><span class="text-[9px] mono text-slate-500">${esc(n.time)}</span><div class="font-bold text-white mt-0.5">${esc(n.title)}</div></div>`).join('');
}
function openLiveArticleModal(i) {
  const n = NEWS_STORIES[i]; if (!n) return;
  document.getElementById('modal-tag').textContent = `${n.tag} • ${n.time}`;
  document.getElementById('modal-img').src = n.img;
  document.getElementById('modal-title').textContent = n.title;
  const b = document.getElementById('modal-body'); b.innerHTML = `<p>${esc(n.body || n.desc)}</p><p class="text-xs text-slate-500">${esc(n.author)}</p>` + (n.link ? `<a href="${esc(n.link)}" target="_blank" rel="noopener noreferrer" class="text-cyan-400 underline text-xs">Read the full story at the source →</a>` : '');
  document.getElementById('article-modal').classList.remove('hidden');
}

// ---- Sri Lanka: indicative gold value, CSE data ----
function setBadge(id, text) {
  const el = document.getElementById(id); if (!el) return;
  const p = (el.closest('table') || el).previousElementSibling;
  if (p && p.textContent.startsWith('⚠')) { if (text) { p.className = 'text-[10px] mono text-slate-400'; p.textContent = 'ℹ ' + text; } else p.remove(); }
}
async function loadSLGold() {
  const g = document.getElementById('pal-essentials-grid'); if (!g) return;
  try {
    const [paxg, fx] = await Promise.all([fetch(`${BINANCE}/ticker/price?symbol=PAXGUSDT`).then(r => r.json()), fetch('https://open.er-api.com/v6/latest/USD').then(r => r.json())]);
    const perG = parseFloat(paxg.price) / 31.1035 * fx.rates.LKR, SOV = 7.98805;
    const card = (t, v) => `<div class="p-3 bg-[#0d1117] rounded-xl border border-[#30363d]"><div class="text-[10px] text-slate-400">${t}</div><div class="text-base font-extrabold text-amber-300 mt-1">LKR ${nfmt(v, 0)}</div></div>`;
    g.innerHTML = card('24K Sovereign (indicative)', perG * SOV) + card('22K Sovereign (indicative)', perG * SOV * 22 / 24) + card('24K per gram', perG) + card('22K per gram', perG * 22 / 24);
    setBadge('pal-essentials-grid', 'Indicative value from international gold price (PAXG) and USD/LKR. Excludes local premium, duties and making charges, so shop prices (e.g. Pal.lk) will differ.');
  } catch (e) { g.innerHTML = '<div class="col-span-full text-slate-400">Gold feed unavailable right now.</div>'; }
}
const pick = (o, ks) => { for (const k of ks) if (o && o[k] !== undefined && o[k] !== null) return o[k]; return undefined; };
async function loadCse() {
  const box = document.getElementById('cse-companies-view'); if (!box) return;
  box.innerHTML = '<div class="text-xs mono text-slate-400 col-span-full">Loading…</div>';
  try {
    const raw = await (await fetch('/api/cse?type=gainers')).json();
    const arr = Array.isArray(raw) ? raw : (raw.data || raw.result || raw.reqTopGainers || []);
    if (!arr.length) throw new Error('empty');
    box.innerHTML = arr.slice(0, 9).map(r => {
      const sym = pick(r, ['symbol', 'securityId', 'code']), name = pick(r, ['name', 'companyName', 'securityName']) || '', price = pick(r, ['price', 'lastTradedPrice', 'last']), ch = pick(r, ['percentageChange', 'changePercentage', 'percentChange', 'change']);
      const up = parseFloat(ch) >= 0;
      return `<div class="p-4 bg-[#0d1117] rounded-2xl border border-[#30363d] flex justify-between items-center"><div><span class="text-amber-400 font-bold">${esc(sym)}</span><div class="text-xs text-white font-bold">${esc(name)}</div></div><div class="text-right"><div class="text-sm font-black text-white">LKR ${price !== undefined ? esc(price) : '—'}</div><span class="text-xs font-bold ${up ? 'text-emerald-400' : 'text-rose-400'}">${ch !== undefined ? esc(ch) + '%' : ''}</span></div></div>`;
    }).join('');
    setBadge('cse-companies-view', 'Top gainers from the Colombo Stock Exchange website (unofficial endpoint, may change).');
  } catch (e) {
    box.innerHTML = '<div class="text-xs mono text-slate-400 col-span-full">CSE data needs the /api/cse proxy, which works after deploying to Vercel.</div>';
    setBadge('cse-companies-view', 'Not connected. Deploy to Vercel with api/cse.js to load live CSE data.');
  }
}

// ---- Billionaires (Forbes, dated) ----
BILLIONAIRES.splice(0, BILLIONAIRES.length,
  { rank: 1, name: 'Elon Musk', netWorth: '$936 B', asset: 'Tesla, SpaceX', country: 'United States' },
  { rank: 2, name: 'Jeff Bezos', netWorth: '$370 B', asset: 'Amazon, Blue Origin', country: 'United States' },
  { rank: 3, name: 'Larry Page', netWorth: '$286 B', asset: 'Google (Alphabet)', country: 'United States' });
renderBillionaires();

// ---- Correlation matrix computed from real daily closes (needs /api/quote) ----
async function loadCorrelation() {
  const map = { EURUSD: 'EUR/USD', GBPUSD: 'GBP/USD', USDJPY: 'USD/JPY', USDCHF: 'USD/CHF', AUDUSD: 'AUD/USD', XAUUSD: 'XAU/USD' };
  try {
    const series = await Promise.all(CORR_PAIRS.map(p => fetch(`/api/quote?symbol=${encodeURIComponent(map[p])}&size=31`).then(r => r.json()).then(j => { if (!j.values) throw new Error('no data'); const o = {}; j.values.forEach(v => o[v.datetime] = +v.close); return o; })));
    const dates = Object.keys(series[0]).filter(d => series.every(s => s[d])).sort();
    if (dates.length < 12) throw new Error('too few');
    const rets = series.map(s => dates.slice(1).map((d, i) => Math.log(s[d] / s[dates[i]])));
    const corr = (a, b) => { const n = a.length, ma = a.reduce((x, y) => x + y) / n, mb = b.reduce((x, y) => x + y) / n; let c = 0, va = 0, vb = 0; for (let i = 0; i < n; i++) { c += (a[i] - ma) * (b[i] - mb); va += (a[i] - ma) ** 2; vb += (b[i] - mb) ** 2; } return c / Math.sqrt(va * vb); };
    CORR_DATA.splice(0, CORR_DATA.length, ...rets.map(a => rets.map(b => corr(a, b))));
    renderCorrelation();
    setBadge('corr-matrix', `Computed from daily closes over the last ${dates.length - 1} trading days (Twelve Data).`);
  } catch (e) { setBadge('corr-matrix', 'Showing approximate sample values. Live correlation needs the /api/quote proxy (Vercel + Twelve Data key).'); const b = document.getElementById('corr-matrix'); }
}

// ---- Sinhala toggle (navigation labels) ----
let LANG = localStorage.getItem('nexis_lang') || 'en';
const SI = { 'nav-btn-home': 'මුල් පිටුව', 'nav-btn-news': 'ප්‍රවෘත්ති', 'nav-btn-macro': 'ගෝලීය සාර්ව', 'nav-btn-terminal': 'ටර්මිනලය', 'nav-btn-heatmaps': 'හීට්මැප්', 'nav-btn-srilanka': 'ශ්‍රී ලංකා අංශය' };
function applyLang() {
  Object.entries(SI).forEach(([id, t]) => { const b = document.getElementById(id); if (!b) return; if (!b.dataset.en) b.dataset.en = b.innerText; b.innerText = LANG === 'si' ? t : b.dataset.en; });
  const lb = document.getElementById('lang-btn'); if (lb) lb.innerText = LANG === 'si' ? 'EN' : 'සිං';
  const ab = document.getElementById('auth-btn'); if (ab) ab.innerText = currentUser ? 'Sign Out' : (LANG === 'si' ? 'පිවිසෙන්න' : 'Sign In');
}
function toggleLang() { LANG = LANG === 'si' ? 'en' : 'si'; try { localStorage.setItem('nexis_lang', LANG); } catch (e) { } applyLang(); }

// ---- Legal pages ----
const LEGAL = {
  about: ['About NEXIS', ['NEXIS is an information dashboard that brings together market charts, macro data, calculators and Sri Lanka market tools in one place.', 'It is provided for information and education only. It does not provide investment, legal, tax or accounting advice.']],
  privacy: ['Privacy Policy', ['If you create an account we store your email address and the watchlist, alerts and journal entries you save. Guests\' data is stored only in their own browser.', 'Charts and quotes are loaded from third parties (for example TradingView, Binance, open.er-api.com and Twelve Data), which may process your IP address under their own policies.', 'You can delete your saved data at any time from your browser or by contacting us to delete your account.']],
  terms: ['Terms of Use', ['Market data may be delayed, incomplete or inaccurate. Do not rely on it as the sole basis for any financial decision.', 'Trading forex, cryptocurrencies and leveraged products carries a high risk of loss. Past performance does not guarantee future results.', 'We provide this site as is, without warranties, and are not liable for losses arising from its use.']],
  contact: ['Contact', ['Replace this text with your business email address and phone number before publishing.']]
};
function showLegal(k) {
  const [t, ps] = LEGAL[k]; document.getElementById('legal-title').textContent = t;
  document.getElementById('legal-body').innerHTML = ps.map(p => `<p>${esc(p)}</p>`).join('');
  switchPage('legal');
}

// ---- Hooks: page-specific rendering ----
(function wrapSwitchPage2() {
  const base = switchPage;
  switchPage = function (id) {
    base(id);
    if (id === 'watchlist') renderWatchlist();
    if (id === 'journal') renderJournal();
    if (id === 'srilanka') { loadSLGold(); }
  };
})();
(function wrapSelect() {
  const base = selectTerminalAsset;
  selectTerminalAsset = function (c, i) { base(c, i); updateStar(); };
})();

document.addEventListener('DOMContentLoaded', () => {
  setBadge('billionaires-table-body', 'Top 3 as of 1 Oct 2026, per Forbes monthly ranking. Live list: forbes.com/real-time-billionaires. Not auto-updated.');
  applyLang();
  loadNews('global');
  loadSLGold(); loadCse(); loadCorrelation();
  if (sb) sb.auth.getSession().then(({ data }) => applyAuthState(data.session ? data.session.user : null));
  else loadUserData();
});

// ============================================================================
// WORLD ECONOMY PAGE: World Bank indicators + TradingView news/calendar
// + optional Trading Economics data through /api/te (needs TE_API_KEY)
// ============================================================================
const WB_IND = [['NY.GDP.MKTP.KD.ZG', 'GDP growth', 'pct'], ['FP.CPI.TOTL.ZG', 'Inflation (CPI)', 'pct'], ['SL.UEM.TOTL.ZS', 'Unemployment', 'pct'], ['BN.CAB.XOKA.GD.ZS', 'Current account (% of GDP)', 'pct'], ['NY.GDP.MKTP.CD', 'GDP (current US$)', 'usd']];
function fmtEco(v, t) {
  if (t === 'usd') return v >= 1e12 ? `$${nfmt(v / 1e12, 2)}T` : `$${nfmt(v / 1e9, 1)}B`;
  return `${nfmt(v, 1)}%`;
}
async function loadEconomy(c) {
  const g = document.getElementById('eco-grid'); if (!g) return;
  g.innerHTML = '<div class="col-span-full text-slate-400">Loading…</div>';
  const cards = await Promise.all(WB_IND.map(async ([id, label, t]) => {
    try {
      const j = await (await fetch(`https://api.worldbank.org/v2/country/${c}/indicator/${id}?format=json&mrv=8`)).json();
      const rows = (j[1] || []).filter(r => r.value !== null);
      if (!rows.length) throw new Error('none');
      const [a, b] = rows, d = b ? a.value - b.value : null;
      const delta = d === null ? '' : `<div class="text-[10px] ${d >= 0 ? 'text-emerald-400' : 'text-rose-400'}">${d >= 0 ? '▲' : '▼'} ${t === 'usd' ? nfmt(Math.abs(d) / a.value * 100, 1) + '%' : nfmt(Math.abs(d), 1) + ' pts'} vs ${esc(b.date)}</div>`;
      return `<div class="p-3 bg-[#0d1117] rounded-xl border border-[#30363d]"><div class="text-[10px] text-slate-400">${esc(label)}</div><div class="text-xl font-extrabold text-white mt-1">${fmtEco(a.value, t)}</div><div class="text-[10px] text-slate-500">${esc(a.date)}</div>${delta}</div>`;
    } catch (e) { return `<div class="p-3 bg-[#0d1117] rounded-xl border border-[#30363d]"><div class="text-[10px] text-slate-400">${esc(label)}</div><div class="text-sm text-slate-500 mt-2">No data</div></div>`; }
  }));
  g.innerHTML = cards.join('');
}
async function loadTE() {
  try {
    const r = await fetch('/api/te?path=/markets/commodities'); if (!r.ok) return;
    const arr = await r.json(); if (!Array.isArray(arr) || !arr.length) return;
    document.getElementById('te-body').innerHTML = `<table class="w-full text-xs mono text-left"><thead><tr class="text-slate-400 uppercase text-[10px] bg-[#21262d]"><th class="p-2">Name</th><th class="p-2">Last</th><th class="p-2">Day %</th></tr></thead><tbody class="divide-y divide-[#30363d]">${arr.slice(0, 15).map(x => { const p = pick(x, ['DailyPercentualChange', 'DailyChange']); return `<tr><td class="p-2 text-white">${esc(pick(x, ['Name', 'Symbol']))}</td><td class="p-2">${esc(pick(x, ['Last', 'Close']))}</td><td class="p-2 ${parseFloat(p) >= 0 ? 'text-emerald-400' : 'text-rose-400'}">${p !== undefined ? esc(nfmt(p, 2)) + '%' : '—'}</td></tr>`; }).join('')}</tbody></table>`;
    document.getElementById('te-panel').classList.remove('hidden');
  } catch (e) { }
}
let _ecoInit = false;
(function wrapSwitchPage3() {
  const base = switchPage;
  switchPage = function (id) {
    base(id);
    if (id === 'economy') {
      loadEconomy(document.getElementById('eco-country').value);
      if (!_ecoInit) {
        _ecoInit = true;
        tvEmbed('eco-news', 'timeline', { feedMode: 'market', market: 'forex', isTransparent: true, displayMode: 'regular', width: '100%', height: '100%', colorTheme: 'dark', locale: 'en' });
        tvEmbed('eco-cal', 'events', { isTransparent: true, width: '100%', height: '100%', colorTheme: 'dark', locale: 'en', importanceFilter: '0,1', countryFilter: 'us,eu,gb,jp,cn,in,au,ca,de' });
        loadTE();
      }
    }
  };
})();
