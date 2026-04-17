// ===================== SECURITY HELPERS =====================
// Escape HTML special chars before inserting into innerHTML
function esc(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
// Only allow http/https URLs — blocks javascript: and data: URIs
function safeUrl(url) {
  if (typeof url !== "string") return "#";
  return /^https?:\/\//i.test(url.trim()) ? url : "#";
}


// ===================== TABS =====================
(function initTabs() {
  const VALID_TABS = ['prayer', 'discover', 'quran', 'hadith', 'tools'];

  function switchTab(name) {
    if (!VALID_TABS.includes(name)) name = 'prayer';

    // Panels
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    const panel = document.getElementById('tab-' + name);
    if (panel) {
      panel.classList.add('active');
      // Re-trigger animation on cards inside the newly active panel
      panel.querySelectorAll('.card').forEach(c => {
        c.style.animation = 'none';
        // Force reflow
        void c.offsetWidth;
        c.style.animation = '';
      });
    }

    // Buttons — both desktop and mobile navs
    document.querySelectorAll('.tab-btn').forEach(b => {
      const isActive = b.dataset.tab === name;
      b.classList.toggle('active', isActive);
      b.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });

    localStorage.setItem('um_active_tab', name);
  }

  // Bind click on all tab buttons (desktop + mobile mirror)
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  // Restore last active tab (default: prayer)
  const saved = localStorage.getItem('um_active_tab') || 'prayer';
  switchTab(saved);
})();


// ===================== QUOTES =====================
const QUOTES = [
  "Indeed, with hardship comes ease. (Qur'an 94:6)",
  "So remember Me; I will remember you. (Qur'an 2:152)",
  "Allah does not burden a soul beyond that it can bear. (Qur'an 2:286)",
  "The best among you are those who have the best manners. (Hadith)",
  "Whoever relies upon Allah — then He is sufficient for him. (Qur'an 65:3)",
  "Speak good or remain silent. (Hadith — Bukhari & Muslim)",
  "The strong person is not the one who can wrestle others; it is the one who controls himself when angry. (Hadith)",
  "Allah is beautiful and loves beauty. (Hadith — Muslim)",
  "Make things easy, do not make them difficult. (Hadith)",
  "Verily, with every difficulty there is relief. (Qur'an 94:5)"
];

function setQuote() {
  const el = document.getElementById("quote");
  if (!el) return;
  el.style.opacity = "0";
  setTimeout(() => {
    el.textContent = QUOTES[Math.floor(Math.random() * QUOTES.length)];
    el.style.opacity = "0.9";
  }, 300);
}
setQuote();
setInterval(setQuote, 5 * 60 * 1000);


// ===================== SETTINGS =====================
function getSettings() {
  return {
    method:       parseInt(localStorage.getItem("um_method")         || "2", 10),
    school:       parseInt(localStorage.getItem("um_school")         || "0", 10),
    limit:        parseInt(localStorage.getItem("um_limit")          || "5", 10),
    halalLimit:   parseInt(localStorage.getItem("um_halal_limit")    || "5", 10),
    groceryLimit: parseInt(localStorage.getItem("um_grocery_limit")  || "5", 10),
    adhan:        localStorage.getItem("um_adhan") === "1"
  };
}

function saveSettings() {
  const m  = document.getElementById("settingMethod").value;
  const s  = document.getElementById("settingSchool").value;
  const l  = document.getElementById("settingLimit").value;
  const hl = document.getElementById("settingHalalLimit").value;
  const gl = document.getElementById("settingGroceryLimit").value;
  const ad = document.getElementById("settingAdhan").value;
  localStorage.setItem("um_method", m);
  localStorage.setItem("um_school", s);
  localStorage.setItem("um_limit", l);
  localStorage.setItem("um_halal_limit", hl);
  localStorage.setItem("um_grocery_limit", gl);
  localStorage.setItem("um_adhan", ad);
}

function applySettingsToUI() {
  const s = getSettings();
  document.getElementById("settingMethod").value        = s.method;
  document.getElementById("settingSchool").value        = s.school;
  document.getElementById("settingLimit").value         = s.limit;
  document.getElementById("settingHalalLimit").value    = s.halalLimit;
  document.getElementById("settingGroceryLimit").value  = s.groceryLimit;
  document.getElementById("settingAdhan").value         = s.adhan ? "1" : "0";
}

function openSettings() {
  applySettingsToUI();
  document.getElementById("settingsPanel").classList.remove("hidden");
  document.getElementById("settingsOverlay").classList.remove("hidden");
}

function closeSettings() {
  document.getElementById("settingsPanel").classList.add("hidden");
  document.getElementById("settingsOverlay").classList.add("hidden");
}

document.getElementById("openSettings").addEventListener("click", openSettings);
document.getElementById("closeSettings").addEventListener("click", closeSettings);
document.getElementById("settingsOverlay").addEventListener("click", closeSettings);

document.getElementById("applySettings").addEventListener("click", () => {
  saveSettings();
  closeSettings();
  cachedLoc = null;
  const halalWasShown   = !document.getElementById("halalList").classList.contains("hidden");
  const groceryWasShown = !document.getElementById("groceryList").classList.contains("hidden");
  startEverything();
  if (halalWasShown)   loadHalalRestaurants();
  if (groceryWasShown) loadHalalGrocery();
});


// ===================== LOCATION =====================
let cachedLoc = null;

function getLocation() {
  if (cachedLoc) return Promise.resolve(cachedLoc);
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) { reject(new Error("Geolocation not supported")); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        cachedLoc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        resolve(cachedLoc);
      },
      () => reject(new Error("Location permission denied or timed out")),
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 60000 }
    );
  });
}


// ===================== HIJRI DATE =====================
async function setHijriDate() {
  const el = document.getElementById("hijriDate");
  if (!el) return;
  try {
    const loc = await getLocation();
    const res = await fetch(`/api/prayer_times?lat=${loc.lat}&lng=${loc.lng}&method=${getSettings().method}&school=${getSettings().school}`);
    const data = await res.json();
    const h = data.hijri;
    const cleanMonth = h.month.en.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    el.textContent = `${h.weekday?.en || ""}, ${h.day} ${cleanMonth} ${h.year} AH`;
  } catch {
    el.textContent = "Hijri date unavailable";
  }
}


// ===================== ADHAN AUDIO =====================
const adhanPlayed = new Set();
let adhanDateKey = new Date().toDateString();
let audioUnlocked = false;

// iOS/mobile browsers block audio without a prior user gesture.
// Silently unlock the audio element on the first tap anywhere.
function tryUnlockAudio() {
  if (audioUnlocked) return;
  const audio = document.getElementById("adhanAudio");
  if (!audio) return;
  audio.play().then(() => { audio.pause(); audio.currentTime = 0; audioUnlocked = true; }).catch(() => {});
}
document.addEventListener("touchstart", tryUnlockAudio, { once: true });
document.addEventListener("click",      tryUnlockAudio, { once: true });

function playAdhan(prayerName) {
  const audio  = document.getElementById("adhanAudio");
  const banner = document.getElementById("adhanBanner");
  const label  = banner.querySelector("span");
  audio.src = prayerName === "Fajr"
    ? "https://cdn.islamic.network/adhan/audio/en.alafasy/adhan-fajr.mp3"
    : "https://cdn.islamic.network/adhan/audio/en.alafasy/adhan.mp3";
  label.textContent = "🔔 Adhan playing…";
  banner.onclick = null;
  banner.classList.remove("hidden");
  audio.play().catch(() => {
    // Autoplay blocked (iOS) — prompt user to tap the banner
    label.textContent = `🔔 ${prayerName} — Tap to hear Adhan`;
    banner.style.cursor = "pointer";
    banner.onclick = () => {
      audio.play().catch(() => {});
      label.textContent = "🔔 Adhan playing…";
      banner.onclick = null;
      banner.style.cursor = "";
    };
  });
  audio.onended = () => banner.classList.add("hidden");
}

document.getElementById("btnStopAdhan")?.addEventListener("click", (e) => {
  e.stopPropagation();
  const audio = document.getElementById("adhanAudio");
  audio.pause();
  audio.currentTime = 0;
  document.getElementById("adhanBanner").classList.add("hidden");
});


// ===================== PRAYER TIMES =====================
let prayerTimings = null;
let countdownInterval = null;

function parseTime(str) {
  // str like "05:32" or "05:32 (EST)"
  const match = str.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return null;
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), parseInt(match[1]), parseInt(match[2]), 0, 0);
}

function to12h(str) {
  const match = str.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return str;
  let h = parseInt(match[1], 10);
  const m = match[2];
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${m} ${ampm}`;
}

function findNextPrayer(timings) {
  const order = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"];
  const now = new Date();
  for (const name of order) {
    const t = parseTime(timings[name]);
    if (t && t > now) return { name, time: t };
  }
  // wrap to Fajr next day
  const fajr = parseTime(timings["Fajr"]);
  if (fajr) {
    fajr.setDate(fajr.getDate() + 1);
    return { name: "Fajr", time: fajr };
  }
  return null;
}

function formatCountdown(ms) {
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h}h ${String(m).padStart(2,"0")}m`;
  return `${m}m ${String(s).padStart(2,"0")}s`;
}

function updateCountdown() {
  const cd = document.getElementById("prayerCountdown");
  if (!prayerTimings) return;
  const next = findNextPrayer(prayerTimings);
  if (!next) { cd.classList.add("hidden"); return; }
  const ms = next.time - new Date();
  if (ms < 0) { cd.classList.add("hidden"); return; }
  cd.classList.remove("hidden");
  cd.innerHTML = `<span>⏱ Next prayer — <b>${next.name}</b> at ${to12h(prayerTimings[next.name])}</span><span class="countdown-time">${formatCountdown(ms)}</span>`;

  // Adhan: play once within a 3-minute window after prayer time
  if (getSettings().adhan) {
    const today = new Date().toDateString();
    if (today !== adhanDateKey) { adhanPlayed.clear(); adhanDateKey = today; }
    const now = new Date();
    for (const name of ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"]) {
      const t = parseTime(prayerTimings[name]);
      if (!t) continue;
      const diff = now - t;
      const key  = `${today}-${name}`;
      if (diff >= 0 && diff < 10 * 60 * 1000 && !adhanPlayed.has(key)) {
        adhanPlayed.add(key);
        playAdhan(name);
        break;
      }
    }
  }
}

// When app returns to foreground (tab switch, screen wake), check immediately
// — avoids missing Adhan due to background timer throttling
document.addEventListener("visibilitychange", () => {
  if (!document.hidden && prayerTimings) updateCountdown();
});

const ARABIC_PRAYER_NAMES = {
  Fajr: "الفجر", Sunrise: "الشروق", Dhuhr: "الظهر",
  Asr: "العصر", Maghrib: "المغرب", Isha: "العشاء"
};

function renderPrayerCards(timings) {
  const grid = document.getElementById("prayerGpsCards");
  const order = ["Fajr", "Sunrise", "Dhuhr", "Asr", "Maghrib", "Isha"];
  const next = findNextPrayer(timings);
  const now = new Date();

  grid.innerHTML = "";
  order.forEach((name) => {
    const t = timings[name];
    if (!t) return;
    const parsed = parseTime(t);
    const isNext = next && next.name === name;
    // Current = within 30 min after prayer start
    const isCurrent = parsed && (now >= parsed) && ((now - parsed) < 30 * 60 * 1000);

    const card = document.createElement("div");
    card.className = `pt-card${isNext ? " is-next" : ""}${isCurrent ? " is-current" : ""}`;
    card.innerHTML = `
      <div class="pt-name">${name}</div>
      <div class="pt-name-ar">${ARABIC_PRAYER_NAMES[name] || ""}</div>
      <div class="pt-time">${to12h(t)}</div>`;
    grid.appendChild(card);
  });
  grid.classList.remove("hidden");
}

async function loadPrayerTimes() {
  const status = document.getElementById("prayerGpsStatus");
  const grid   = document.getElementById("prayerGpsCards");
  const meta   = document.getElementById("prayerGpsMeta");
  const cd     = document.getElementById("prayerCountdown");

  status.innerHTML = `<span class="spinner"></span>Loading prayer times…`;
  status.classList.remove("hidden", "error");
  grid.classList.add("hidden");
  meta.classList.add("hidden");
  cd.classList.add("hidden");

  try {
    const loc = await getLocation();
    const s = getSettings();
    const res = await fetch(`/api/prayer_times?lat=${loc.lat}&lng=${loc.lng}&method=${s.method}&school=${s.school}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed");

    prayerTimings = data.timings;
    renderPrayerCards(data.timings);

    // Meta row
    let gregDate = "";
    if (data.gregorian?.date) {
      const [dd, mm, yyyy] = data.gregorian.date.split("-");
      gregDate = `${mm}/${dd}/${yyyy.slice(-2)}`;
    }
    const cleanHijriMonth = (data.hijri?.month?.en || "").normalize("NFD").replace(/[\u0300-\u036f]/g,"");
    meta.innerHTML = `
      <span><b>Timezone:</b> ${esc(data.timezone || "—")}</span>
      <span><b>Method:</b> ${esc(data.method?.name || "—")}</span>
      <span><b>Date:</b> ${esc(gregDate || "—")} · ${esc(data.hijri?.day || "")} ${esc(cleanHijriMonth)} ${esc(data.hijri?.year || "")} AH</span>
    `;
    meta.classList.remove("hidden");
    status.classList.add("hidden");
    document.getElementById("btnHidePrayer").classList.remove("hidden");

    // Countdown
    clearInterval(countdownInterval);
    updateCountdown();
    countdownInterval = setInterval(updateCountdown, 1000);
  } catch (e) {
    status.textContent = `Error: ${e.message}`;
    status.classList.add("error");
  }
}

document.getElementById("btnPrayerGps").addEventListener("click", loadPrayerTimes);

document.getElementById("btnHidePrayer").addEventListener("click", () => {
  document.getElementById("prayerCountdown").classList.add("hidden");
  document.getElementById("prayerGpsCards").classList.add("hidden");
  document.getElementById("prayerGpsMeta").classList.add("hidden");
  document.getElementById("btnHidePrayer").classList.add("hidden");
});

document.getElementById("btnHideQibla").addEventListener("click", () => {
  const body = document.getElementById("qiblaBody");
  const btn  = document.getElementById("btnHideQibla");
  const hiding = !body.classList.contains("hidden");
  body.classList.toggle("hidden", hiding);
  btn.textContent = hiding ? "▶ Show compass" : "✕ Hide compass";
});

document.getElementById("btnHideTasbih").addEventListener("click", () => {
  const body = document.getElementById("tasbihBody");
  const btn  = document.getElementById("btnHideTasbih");
  const hiding = !body.classList.contains("hidden");
  body.classList.toggle("hidden", hiding);
  btn.textContent = hiding ? "▶ Show counter" : "✕ Hide counter";
});


// ===================== MOSQUES =====================
function distLabel(m) {
  if (m.distance_m < 1000) return `${m.distance_m}m away`;
  return `${m.distance_km} km away`;
}

function renderMosques(mosques) {
  const list = document.getElementById("mosqueList");
  list.innerHTML = "";
  mosques.forEach((m, i) => {
    const openTag = m.open_now === true  ? `<span class="tag tag-open">Open now</span>` :
                    m.open_now === false ? `<span class="tag tag-closed">Closed</span>` : "";
    const ratingTag = m.rating ? `<span class="tag tag-rating">★ ${m.rating}</span>` : "";
    const card = document.createElement("div");
    card.className = "mosque-card";
    card.style.animationDelay = `${i * 0.05}s`;
    card.innerHTML = `
      <div class="mosque-card-top">
        <div class="mosque-rank">${i + 1}</div>
        <div class="mosque-info">
          <div class="mosque-name">${esc(m.name)}</div>
          <div class="mosque-addr">${esc(m.address || "—")}</div>
          <div class="mosque-tags">
            <span class="tag tag-dist">📍 ${esc(distLabel(m))}</span>
            ${openTag}
            ${ratingTag}
          </div>
        </div>
      </div>
      <div class="mosque-actions">
        <a href="${safeUrl(m.maps_directions_url)}" target="_blank" rel="noopener" class="link-btn primary">🗺 Directions</a>
        ${m.website
          ? `<a href="${safeUrl(m.website)}" target="_blank" rel="noopener" class="link-btn">🌐 Website</a>`
          : `<a href="${safeUrl(m.maps_place_url)}" target="_blank" rel="noopener" class="link-btn">Details</a>`}
      </div>
    `;
    list.appendChild(card);
  });
  list.classList.remove("hidden");
  document.getElementById("btnHideMosques").classList.remove("hidden");
}

async function loadMosques() {
  const status = document.getElementById("mosqueStatus");
  const list   = document.getElementById("mosqueList");

  status.innerHTML = `<span class="spinner"></span>Finding nearby masjid…`;
  status.classList.remove("hidden", "error");
  list.classList.add("hidden");

  try {
    const loc = await getLocation();
    const limit = getSettings().limit;
    const res = await fetch(`/api/nearby_mosques?lat=${loc.lat}&lng=${loc.lng}&limit=${limit}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed");

    renderMosques(data.mosques);
    status.classList.add("hidden");
  } catch (e) {
    status.textContent = `Error: ${e.message}`;
    status.classList.add("error");
  }
}

document.getElementById("btnFind").addEventListener("click", loadMosques);
document.getElementById("btnHideMosques").addEventListener("click", () => {
  document.getElementById("mosqueList").classList.add("hidden");
  document.getElementById("btnHideMosques").classList.add("hidden");
});


// ===================== QIBLA =====================
let qiblaBearing = null;
let lastHeading   = null;
let watchId       = null;
let startedQibla  = false;
let usingAbsolute = false;  // true once we receive a deviceorientationabsolute event

function normalizeDeg(d) { return ((d % 360) + 360) % 360; }

function rotateArrow(deg) {
  const el = document.getElementById("qiblaArrow");
  if (el) el.style.transform = `translate(-50%, -50%) rotate(${deg}deg)`;
}

function rotateLabels(deg) {
  const el = document.querySelector(".compass-labels");
  if (el) el.style.transform = `rotate(${deg}deg)`;
}

function setBearingText(v) {
  const el = document.getElementById("qiblaBearing");
  if (el) el.textContent = typeof v === "number" && !isNaN(v) ? v.toFixed(1) : "—";
}

async function fetchQibla(lat, lng) {
  const res = await fetch(`/api/qibla?lat=${lat}&lng=${lng}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Qibla failed");
  return data.bearing_deg;
}

function startLocationWatch() {
  if (!navigator.geolocation) return;
  if (watchId !== null) { navigator.geolocation.clearWatch(watchId); watchId = null; }
  watchId = navigator.geolocation.watchPosition(
    async (pos) => {
      try {
        qiblaBearing = await fetchQibla(pos.coords.latitude, pos.coords.longitude);
        setBearingText(qiblaBearing);
        const rel = typeof lastHeading === "number"
          ? normalizeDeg(qiblaBearing - lastHeading)
          : qiblaBearing;
        rotateArrow(rel);
      } catch {}
    },
    () => {},
    { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
  );
}

function handleOrientation(e) {
  // Prefer absolute (north-referenced) events; ignore non-absolute once we have them
  if (!e.absolute && usingAbsolute) return;

  let heading = null;
  if (typeof e.webkitCompassHeading === "number") {
    // iOS Safari: already clockwise from true north
    heading = e.webkitCompassHeading;
  } else if (typeof e.alpha === "number") {
    // W3C spec: alpha is counter-clockwise from north → convert to CW compass bearing
    heading = (360 - e.alpha) % 360;
  }
  if (typeof heading !== "number" || isNaN(heading)) return;

  if (e.absolute) usingAbsolute = true;

  lastHeading = normalizeDeg(heading);
  rotateLabels(-lastHeading);
  if (typeof qiblaBearing === "number") rotateArrow(normalizeDeg(qiblaBearing - lastHeading));
}

function startCompass() {
  // Listen for both; handleOrientation will prefer absolute events
  window.addEventListener("deviceorientationabsolute", handleOrientation, true);
  window.addEventListener("deviceorientation", handleOrientation, true);
}

function _doStartCompass() {
  startedQibla = true;
  usingAbsolute = false;
  startCompass();
  startLocationWatch();
}

function startQiblaLive() {
  if (startedQibla) return;
  // iOS 13+: DeviceOrientationEvent.requestPermission must be called from a user gesture.
  // Calling it on page load silently fails — show a button instead.
  if (typeof DeviceOrientationEvent !== "undefined" &&
      typeof DeviceOrientationEvent.requestPermission === "function") {
    const btn = document.getElementById("btnEnableCompass");
    if (btn) btn.style.display = "";
    return;
  }
  // Android / desktop: no permission needed, start immediately.
  _doStartCompass();
}

document.getElementById("btnEnableCompass")?.addEventListener("click", async () => {
  const btn = document.getElementById("btnEnableCompass");
  try {
    const perm = await DeviceOrientationEvent.requestPermission();
    if (perm !== "granted") {
      if (btn) btn.textContent = "Permission denied — enable in Settings > Safari > Motion & Orientation";
      return;
    }
    if (btn) btn.style.display = "none";
    _doStartCompass();
  } catch (e) {
    console.error("iOS compass permission error:", e);
  }
});

// Auto-start (Android/desktop: immediate; iOS: shows button above instead)
startQiblaLive();


// ===================== BOOT =====================
async function startEverything() {
  setHijriDate();
  loadPrayerTimes();
  loadMosques();
}

// Auto-load on page ready
startEverything();


// ===================== QURAN =====================
let surahsData = [];
let surahsLoaded = false;
let currentSurah = null;
let ayahOffset = 0;
const AYAHS_PER_LOAD = 20;
const translitCache = { en: {} };             // phonetic: EN only
const translationCache = { bn: {}, ur: {} }; // translation: BN + UR (EN always fetched)


// Toggle surah list
document.getElementById("btnToggleSurahList").addEventListener("click", async () => {
  const wrap = document.getElementById("surahListWrap");
  const btn  = document.getElementById("btnToggleSurahList");
  if (wrap.classList.contains("hidden")) {
    if (!surahsLoaded) await loadSurahList();
    wrap.classList.remove("hidden");
    btn.textContent = "Hide surahs ▴";
  } else {
    wrap.classList.add("hidden");
    btn.textContent = "Show all surahs ▾";
  }
});

async function ensureSurahData() {
  if (surahsData.length > 0) return;
  const res  = await fetch("https://api.alquran.cloud/v1/surah");
  const data = await res.json();
  surahsData = data.data;
}

async function loadSurahList() {
  surahsLoaded = true;
  const wrap = document.getElementById("surahListWrap");
  wrap.innerHTML = '<span style="color:var(--text3);font-size:13px;padding:8px"><span class="spinner"></span>Loading…</span>';
  try {
    await ensureSurahData();
    wrap.innerHTML = "";
    surahsData.forEach(s => {
      const btn = document.createElement("button");
      btn.className = "surah-item";
      btn.innerHTML = `
        <div class="surah-num-badge">${esc(s.number)}</div>
        <div class="surah-item-info">
          <div class="surah-item-en">${esc(s.englishName)} <span style="color:var(--text3);font-size:11.5px">${esc(s.englishNameTranslation)}</span></div>
          <div class="surah-item-meta">${esc(s.numberOfAyahs)} verses · ${esc(s.revelationType)}</div>
        </div>
        <div class="surah-item-ar">${esc(s.name)}</div>`;
      btn.addEventListener("click", () => openSurah(s));
      wrap.appendChild(btn);
    });
  } catch {
    wrap.innerHTML = '<span style="color:var(--red);font-size:13px;padding:8px">Failed to load. Check connection.</span>';
  }
}

function updateSurahNavButtons() {
  const idx = surahsData.findIndex(s => s.number === currentSurah.number);
  document.getElementById("btnPrevSurah").disabled = idx <= 0;
  document.getElementById("btnNextSurah").disabled = idx < 0 || idx >= surahsData.length - 1;
}

async function navigateSurah(delta) {
  try { await ensureSurahData(); } catch { return; }
  const idx  = surahsData.findIndex(s => s.number === currentSurah.number);
  const next = surahsData[idx + delta];
  if (next) await openSurah(next);
}

async function openSurah(surah) {
  currentSurah = surah;
  ayahOffset   = 0;
  try { await ensureSurahData(); } catch {}
  document.getElementById("btnNextSurahBottom").style.display = "none";
  // Show reader
  const reader = document.getElementById("quranReader");
  reader.classList.remove("hidden");
  document.getElementById("quranReaderHeader").innerHTML = `
    <span class="qr-ar">${esc(surah.name)}</span>
    <div class="qr-en">${esc(surah.englishName)} — ${esc(surah.englishNameTranslation)}</div>
    <div class="qr-meta">${esc(surah.numberOfAyahs)} verses · ${esc(surah.revelationType)}</div>`;
  document.getElementById("quranReaderAyahs").innerHTML = "";
  document.getElementById("btnLoadMoreAyahs").classList.add("hidden");
  updateSurahNavButtons();
  // Scroll to reader
  reader.scrollIntoView({ behavior: "smooth", block: "start" });
  await loadMoreAyahs();
}

async function loadMoreAyahs() {
  const surah = currentSurah;
  const offset = ayahOffset;
  const btn = document.getElementById("btnLoadMoreAyahs");
  btn.innerHTML = '<span class="spinner"></span> Loading…';
  btn.disabled = true;

  try {
    // Fetch Arabic + all translations in parallel; cache phonetic and BN/UR translations
    let trEn = translitCache.en[surah.number];
    let trBn = translationCache.bn[surah.number];
    let trUr = translationCache.ur[surah.number];
    const [arRes, enRes, trEnRes, trBnRes, trUrRes] = await Promise.all([
      fetch(`https://api.alquran.cloud/v1/surah/${surah.number}/ar.alafasy`),
      fetch(`https://api.alquran.cloud/v1/surah/${surah.number}/en.sahih`),
      trEn ? Promise.resolve(null) : fetch(`https://api.alquran.cloud/v1/surah/${surah.number}/en.transliteration`),
      trBn ? Promise.resolve(null) : fetch(`https://api.alquran.cloud/v1/surah/${surah.number}/bn.bengali`),
      trUr ? Promise.resolve(null) : fetch(`https://api.alquran.cloud/v1/surah/${surah.number}/ur.ahmedali`)
    ]);
    const arData = await arRes.json();
    const enData = await enRes.json();
    if (trEnRes) { const d = await trEnRes.json(); trEn = d.data?.ayahs || []; translitCache.en[surah.number] = trEn; }
    if (trBnRes) { const d = await trBnRes.json(); trBn = d.data?.ayahs || []; translationCache.bn[surah.number] = trBn; }
    if (trUrRes) { const d = await trUrRes.json(); trUr = d.data?.ayahs || []; translationCache.ur[surah.number] = trUr; }
    const arAyahs = arData.data.ayahs;
    const enAyahs = enData.data?.ayahs || [];
    const container = document.getElementById("quranReaderAyahs");
    const end = Math.min(offset + AYAHS_PER_LOAD, arAyahs.length);
    for (let i = offset; i < end; i++) {
      const block = document.createElement("div");
      block.className = "ayah-block";
      block.style.animationDelay = `${(i - offset) * 0.03}s`;
      block.innerHTML = `
        <div class="ayah-arabic">${esc(arAyahs[i].text)} <span class="ayah-num">${esc(arAyahs[i].numberInSurah)}</span></div>
        <div class="ayah-translit ayah-translit-en">${esc(trEn?.[i]?.text || "")}</div>
        <div class="ayah-translation ayah-translation-en">${esc(enAyahs[i]?.text || "")}</div>
        <div class="ayah-translation ayah-translation-bn">${esc(trBn?.[i]?.text || "")}</div>
        <div class="ayah-translation ayah-translation-ur">${esc(trUr?.[i]?.text || "")}</div>`;
      container.appendChild(block);
    }
    ayahOffset = end;
    if (ayahOffset < surah.numberOfAyahs) {
      btn.innerHTML = `Load more verses (${ayahOffset}/${surah.numberOfAyahs}) ▾`;
      btn.disabled = false;
      btn.classList.remove("hidden");
      document.getElementById("btnNextSurahBottom").style.display = "none";
    } else {
      btn.classList.add("hidden");
      // Show next-surah button if not at the last surah
      const idx = surahsData.findIndex(s => s.number === surah.number);
      const nextSurah = surahsData[idx + 1];
      const nextBtn = document.getElementById("btnNextSurahBottom");
      if (nextSurah) {
        nextBtn.textContent = `Continue: ${nextSurah.englishName} \u2192`;
        nextBtn.style.display = "";
      }
    }
  } catch {
    btn.innerHTML = "Failed to load. Tap to retry.";
    btn.disabled = false;
    btn.classList.remove("hidden");
  }
}

document.getElementById("btnLoadMoreAyahs").addEventListener("click", loadMoreAyahs);
document.getElementById("btnPrevSurah").addEventListener("click", () => navigateSurah(-1));
document.getElementById("btnNextSurah").addEventListener("click", () => navigateSurah(1));
document.getElementById("btnNextSurahBottom").addEventListener("click", () => navigateSurah(1));
document.getElementById("btnCloseReader").addEventListener("click", () => {
  document.getElementById("quranReader").classList.add("hidden");
});

// Phonetic selector (English only)
document.getElementById("selectTranslit").addEventListener("change", () => {
  const reader = document.getElementById("quranReader");
  const val    = document.getElementById("selectTranslit").value;
  reader.classList.remove("show-translit-en");
  if (val) reader.classList.add("show-translit-en");
});

// Translation selector (English / বাংলা / اردو / Off)
document.getElementById("selectTranslation").addEventListener("change", () => {
  const reader = document.getElementById("quranReader");
  const val    = document.getElementById("selectTranslation").value;
  reader.classList.remove("show-translation-en", "show-translation-bn", "show-translation-ur");
  if (val) reader.classList.add(`show-translation-${val}`);
});
// Set English translation on by default
document.getElementById("quranReader").classList.add("show-translation-en");



// ===================== HADITH =====================
const HADITH_MAX = { bukhari:7563, muslim:3033, abudawud:5274, tirmidhi:3956, ibnmajah:4341, nasai:5761 };
const COLL_NAMES = { bukhari:"Sahih al-Bukhari", muslim:"Sahih Muslim", abudawud:"Sunan Abu Dawud", tirmidhi:"Jami' at-Tirmidhi", ibnmajah:"Sunan Ibn Majah", nasai:"Sunan an-Nasa'i" };
let currentHadithNum = null;

// ---- Hadith browser ----
let hadithBrowserPage       = 0;
let hadithBrowserCollection = null;
let hadithBrowserOpen       = false;

function toggleHadithBrowser(forceOpen) {
  const panel = document.getElementById("hadithBrowser");
  const btn   = document.getElementById("btnHadithBrowse");
  hadithBrowserOpen = forceOpen !== undefined ? forceOpen : !hadithBrowserOpen;
  panel.classList.toggle("hidden", !hadithBrowserOpen);
  btn.style.color       = hadithBrowserOpen ? "var(--gold2)" : "";
  btn.style.borderColor = hadithBrowserOpen ? "var(--gold)"  : "";
}

async function loadHadithBrowser(reset = false) {
  const col = document.getElementById("hadithCollection").value;
  if (reset || col !== hadithBrowserCollection) {
    hadithBrowserPage = 0;
    hadithBrowserCollection = col;
    document.getElementById("hadithBrowserList").innerHTML = "";
  }
  hadithBrowserPage++;
  const moreBtn = document.getElementById("btnHadithBrowserMore");
  moreBtn.innerHTML = '<span class="spinner"></span> Loading…';
  moreBtn.disabled  = true;
  try {
    const res  = await fetch(`/api/hadith/${col}/list?page=${hadithBrowserPage}&per_page=30`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed");
    const list = document.getElementById("hadithBrowserList");
    data.hadiths.forEach(h => {
      const btn = document.createElement("button");
      btn.className = "hadith-browse-item";
      btn.innerHTML = `
        <div class="hadith-browse-num">${esc(h.number)}</div>
        <div class="hadith-browse-info">
          <div class="hadith-browse-snippet">${esc(h.snippet)}</div>
          ${h.chapter ? `<div class="hadith-browse-chapter">${esc(h.chapter)}</div>` : ""}
        </div>`;
      btn.addEventListener("click", () => {
        fetchHadith(col, h.number);
        toggleHadithBrowser(false);
      });
      list.appendChild(btn);
    });
    if (data.has_more) {
      moreBtn.innerHTML = `Load more (${data.loaded} / ${data.total}) ▾`;
      moreBtn.disabled  = false;
      moreBtn.classList.remove("hidden");
    } else {
      moreBtn.classList.add("hidden");
    }
  } catch (e) {
    moreBtn.innerHTML = "Failed to load. Tap to retry.";
    moreBtn.disabled  = false;
    moreBtn.classList.remove("hidden");
  }
}

document.getElementById("btnHadithBrowse").addEventListener("click", () => {
  toggleHadithBrowser();
  if (hadithBrowserOpen) loadHadithBrowser(true);
});
document.getElementById("btnHadithBrowserMore").addEventListener("click", () => loadHadithBrowser());
// Reset browser when collection changes
document.getElementById("hadithCollection").addEventListener("change", () => {
  if (hadithBrowserOpen) loadHadithBrowser(true);
});

document.getElementById("btnHadithClose").addEventListener("click", () => {
  document.getElementById("hadithResult").classList.add("hidden");
});
// ---- end browser ----

function showHadithStatus(msg, isErr = false) {
  const el = document.getElementById("hadithStatus");
  el.textContent = msg;
  el.className = "status-msg" + (isErr ? " error" : "");
  el.classList.remove("hidden");
  document.getElementById("hadithResult").classList.add("hidden");
}

async function fetchHadith(collection, num) {
  showHadithStatus("Loading hadith…");
  try {
    const res = await fetch(`/api/hadith/${collection}/${num}`);
    if (!res.ok) throw new Error((await res.json()).error || "Not found");
    const data = await res.json();
    document.getElementById("hadithStatus").classList.add("hidden");
    renderHadith(data, collection, num);
  } catch (e) {
    showHadithStatus(`Could not load hadith. ${e.message || "Try again or pick a different number."}`, true);
  }
}

function renderHadith(data, collection, num) {
  currentHadithNum = num;
  const text  = data.hadith_english || data.text || data.body || "Text unavailable.";
  const grade = (data.grade || "").trim();
  const chapter = data.chapter_english || data.chapter || "";
  document.getElementById("hadithLabel").textContent = `${COLL_NAMES[collection]} · #${num}`;
  document.getElementById("hadithBody").textContent = text;
  document.getElementById("hadithRef").textContent = `${COLL_NAMES[collection]}, Hadith ${num}`;
  const gEl = document.getElementById("hadithGrade");
  gEl.textContent = grade;
  gEl.className = "hadith-grade";
  if (grade.toLowerCase().includes("sahih")) gEl.classList.add("sahih");
  else if (grade.toLowerCase().includes("hasan")) gEl.classList.add("hasan");
  else if (grade.toLowerCase().includes("da'if") || grade.toLowerCase().includes("daif")) gEl.classList.add("daif");
  document.getElementById("hadithChapter").textContent = chapter ? `Chapter: ${chapter}` : "";
  document.getElementById("hadithResult").classList.remove("hidden");
  document.getElementById("btnHadithPrev").disabled = num <= 1;
  document.getElementById("btnHadithNext").disabled = num >= (HADITH_MAX[collection] || 9999);
}

document.getElementById("btnHadithPrev").addEventListener("click", () => {
  if (currentHadithNum > 1) fetchHadith(document.getElementById("hadithCollection").value, currentHadithNum - 1);
});
document.getElementById("btnHadithNext").addEventListener("click", () => {
  const col = document.getElementById("hadithCollection").value;
  if (currentHadithNum < (HADITH_MAX[col] || 9999)) fetchHadith(col, currentHadithNum + 1);
});
document.getElementById("btnHadithClose").addEventListener("click", () => {
  document.getElementById("hadithResult").classList.add("hidden");
});



// ===================== HALAL RESTAURANTS =====================
document.getElementById("btnFindHalal").addEventListener("click", loadHalalRestaurants);
document.getElementById("btnHideHalal").addEventListener("click", () => {
  document.getElementById("halalList").classList.add("hidden");
  document.getElementById("btnHideHalal").classList.add("hidden");
});

function renderHalal(restaurants) {
  const list = document.getElementById("halalList");
  list.innerHTML = "";
  const PRICE = ["","$","$$","$$$","$$$$"];
  restaurants.forEach((r, i) => {
    const openTag   = r.open_now === true  ? `<span class="tag tag-open">Open now</span>`
                    : r.open_now === false ? `<span class="tag tag-closed">Closed</span>` : "";
    const ratingTag = r.rating ? `<span class="tag tag-rating">★ ${r.rating}</span>` : "";
    const priceTag  = r.price_level ? `<span class="tag tag-dist">${PRICE[r.price_level]}</span>` : "";
    const dist      = r.distance_m < 1000 ? `${r.distance_m}m away` : `${r.distance_km} km away`;
    const card = document.createElement("div");
    card.className = "mosque-card";
    card.style.animationDelay = `${i * 0.05}s`;
    card.innerHTML = `
      <div class="mosque-card-top">
        <div class="mosque-rank">${i + 1}</div>
        <div class="mosque-info">
          <div class="mosque-name">${esc(r.name)}</div>
          <div class="mosque-addr">${esc(r.address || "—")}</div>
          <div class="mosque-tags">
            <span class="tag tag-dist">📍 ${esc(dist)}</span>
            ${openTag}${ratingTag}${priceTag}
          </div>
        </div>
      </div>
      <div class="mosque-actions">
        <a href="${safeUrl(r.maps_directions_url)}" target="_blank" rel="noopener" class="link-btn primary">🗺 Directions</a>
        ${r.website
          ? `<a href="${safeUrl(r.website)}" target="_blank" rel="noopener" class="link-btn">🌐 Website</a>`
          : `<a href="${safeUrl(r.maps_place_url)}" target="_blank" rel="noopener" class="link-btn">Details</a>`}
      </div>`;
    list.appendChild(card);
  });
  list.classList.remove("hidden");
  document.getElementById("btnHideHalal").classList.remove("hidden");
}

async function loadHalalRestaurants() {
  const status = document.getElementById("halalStatus");
  const list   = document.getElementById("halalList");
  status.innerHTML = `<span class="spinner"></span>Finding halal restaurants…`;
  status.classList.remove("hidden", "error");
  list.classList.add("hidden");
  try {
    const loc   = await getLocation();
    const limit = getSettings().halalLimit;
    const res   = await fetch(`/api/halal_restaurants?lat=${loc.lat}&lng=${loc.lng}&limit=${limit}`);
    const data  = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed");
    renderHalal(data.restaurants);
    status.classList.add("hidden");
  } catch (e) {
    status.textContent = `Error: ${e.message}`;
    status.classList.add("error");
  }
}


// ===================== HALAL GROCERY =====================
document.getElementById("btnFindGrocery").addEventListener("click", loadHalalGrocery);
document.getElementById("btnHideGrocery").addEventListener("click", () => {
  document.getElementById("groceryList").classList.add("hidden");
  document.getElementById("btnHideGrocery").classList.add("hidden");
});

function renderGrocery(stores) {
  const list = document.getElementById("groceryList");
  list.innerHTML = "";
  stores.forEach((r, i) => {
    const openTag   = r.open_now === true  ? `<span class="tag tag-open">Open now</span>`
                    : r.open_now === false ? `<span class="tag tag-closed">Closed</span>` : "";
    const ratingTag = r.rating ? `<span class="tag tag-rating">★ ${r.rating}</span>` : "";
    const dist      = r.distance_m < 1000 ? `${r.distance_m}m away` : `${r.distance_km} km away`;
    const card = document.createElement("div");
    card.className = "mosque-card";
    card.style.animationDelay = `${i * 0.05}s`;
    card.innerHTML = `
      <div class="mosque-card-top">
        <div class="mosque-rank">${i + 1}</div>
        <div class="mosque-info">
          <div class="mosque-name">${esc(r.name)}</div>
          <div class="mosque-addr">${esc(r.address || "—")}</div>
          <div class="mosque-tags">
            <span class="tag tag-dist">📍 ${esc(dist)}</span>
            ${openTag}${ratingTag}
          </div>
        </div>
      </div>
      <div class="mosque-actions">
        <a href="${safeUrl(r.maps_directions_url)}" target="_blank" rel="noopener" class="link-btn primary">🗺 Directions</a>
        ${r.website
          ? `<a href="${safeUrl(r.website)}" target="_blank" rel="noopener" class="link-btn">🌐 Website</a>`
          : `<a href="${safeUrl(r.maps_place_url)}" target="_blank" rel="noopener" class="link-btn">Details</a>`}
      </div>`;
    list.appendChild(card);
  });
  list.classList.remove("hidden");
  document.getElementById("btnHideGrocery").classList.remove("hidden");
}

async function loadHalalGrocery() {
  const status = document.getElementById("groceryStatus");
  const list   = document.getElementById("groceryList");
  status.innerHTML = `<span class="spinner"></span>Finding halal grocery stores…`;
  status.classList.remove("hidden", "error");
  list.classList.add("hidden");
  try {
    const loc   = await getLocation();
    const limit = getSettings().groceryLimit;
    const res   = await fetch(`/api/halal_grocery?lat=${loc.lat}&lng=${loc.lng}&limit=${limit}`);
    const data  = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed");
    renderGrocery(data.stores);
    status.classList.add("hidden");
  } catch (e) {
    status.textContent = `Error: ${e.message}`;
    status.classList.add("error");
  }
}


// ===================== TASBIH =====================
let tasbihCount = 0;
let tasbihGoal  = 33;

function tasbihUpdateRing() {
  const circ   = 314.16;
  const pct    = tasbihGoal > 0 ? Math.min(tasbihCount / tasbihGoal, 1) : 0;
  const offset = circ - circ * pct;
  document.getElementById("tasbihRingFg").style.strokeDashoffset = offset;
  document.getElementById("tasbihCount").textContent    = tasbihCount;
  document.getElementById("tasbihGoalLabel").textContent = `/ ${tasbihGoal}`;
}

document.getElementById("btnTasbihTap").addEventListener("click", () => {
  if (tasbihCount >= tasbihGoal) return;   // hard stop at goal
  tasbihCount++;
  tasbihUpdateRing();
  if (navigator.vibrate) navigator.vibrate(30);
  if (tasbihCount === tasbihGoal) {
    if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
    document.getElementById("btnTasbihTap").classList.add("tasbih-complete");
  }
});

document.getElementById("btnTasbihReset").addEventListener("click", () => {
  tasbihCount = 0;
  document.getElementById("btnTasbihTap").classList.remove("tasbih-complete");
  tasbihUpdateRing();
});

document.querySelectorAll(".tasbih-goal-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    tasbihGoal = parseInt(btn.dataset.goal);
    document.querySelectorAll(".tasbih-goal-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    tasbihCount = 0;
    document.getElementById("btnTasbihTap").classList.remove("tasbih-complete");
    tasbihUpdateRing();
  });
});

tasbihUpdateRing(); // initialise ring on load
