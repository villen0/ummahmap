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

    if (name === 'quran'  && !surahsLoaded)           loadSurahList();
    if (name === 'hadith' && !hadithBrowserCollection) loadHadithBrowser(true);

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
  { text: "Indeed, with hardship comes ease.", src: "Qur'an 94:6" },
  { text: "So remember Me; I will remember you.", src: "Qur'an 2:152" },
  { text: "Allah does not burden a soul beyond that it can bear.", src: "Qur'an 2:286" },
  { text: "Whoever relies upon Allah — He is sufficient for him.", src: "Qur'an 65:3" },
  { text: "Verily, with every difficulty there is relief.", src: "Qur'an 94:5" },
  { text: "And He found you lost and guided you.", src: "Qur'an 93:7" },
  { text: "Your Lord has not forsaken you, nor has He become displeased.", src: "Qur'an 93:3" },
  { text: "When My servants ask you about Me — I am near.", src: "Qur'an 2:186" },
  { text: "Indeed, Allah is with the patient.", src: "Qur'an 2:153" },
  { text: "Do not grieve; indeed Allah is with us.", src: "Qur'an 9:40" },
  { text: "Seek help through patience and prayer.", src: "Qur'an 2:45" },
  { text: "And He is with you wherever you are.", src: "Qur'an 57:4" },
  { text: "With the remembrance of Allah do hearts find rest.", src: "Qur'an 13:28" },
  { text: "So be patient with gracious patience.", src: "Qur'an 70:5" },
  { text: "Trust in Allah; He loves those who rely upon Him.", src: "Qur'an 3:159" },
  { text: "Perhaps Allah will bring after that a different matter.", src: "Qur'an 65:1" },
  { text: "My mercy encompasses all things.", src: "Qur'an 7:156" },
  { text: "Allah intends for you ease and does not intend for you hardship.", src: "Qur'an 2:185" },
  { text: "And He is the Forgiving, the Loving.", src: "Qur'an 85:14" },
  { text: "Whoever is grateful — I will surely increase him in favour.", src: "Qur'an 14:7" },
  { text: "He knows what is in every heart.", src: "Qur'an 67:13" },
  { text: "And your Lord is the Forgiving, the Full of Mercy.", src: "Qur'an 18:58" },
  { text: "Call upon Me; I will respond to you.", src: "Qur'an 40:60" },
  { text: "Allah is the ally of those who believe.", src: "Qur'an 2:257" },
  { text: "Do good; indeed Allah loves the doers of good.", src: "Qur'an 2:195" },
  { text: "The best among you are those who have the best manners.", src: "Hadith · Bukhari" },
  { text: "Speak good or remain silent.", src: "Hadith · Bukhari & Muslim" },
  { text: "The strong person controls himself when angry.", src: "Hadith · Bukhari & Muslim" },
  { text: "Allah is beautiful and loves beauty.", src: "Hadith · Muslim" },
  { text: "Make things easy, do not make them difficult.", src: "Hadith · Bukhari" },
  { text: "None of you truly believes until he loves for his brother what he loves for himself.", src: "Hadith · Bukhari & Muslim" },
  { text: "Smiling at your brother is an act of charity.", src: "Hadith · Tirmidhi" },
  { text: "Show mercy to those on earth; the One in heaven will show mercy to you.", src: "Hadith · Abu Dawud" },
  { text: "Do not underestimate any good deed, even greeting your brother with a cheerful face.", src: "Hadith · Muslim" },
  { text: "The most beloved deeds to Allah are the most consistent, even if small.", src: "Hadith · Bukhari & Muslim" },
  { text: "Be in this world as if you were a stranger or a traveller.", src: "Hadith · Bukhari" },
  { text: "A Muslim is one from whose tongue and hand other Muslims are safe.", src: "Hadith · Bukhari" },
  { text: "Cleanliness is part of faith.", src: "Hadith · Muslim" },
  { text: "The deen is sincerity.", src: "Hadith · Muslim" },
  { text: "Take advantage of five before five: youth, health, wealth, free time, and life.", src: "Hadith · Bayhaqi" },
];

let quoteQueue = [];
function nextQuote() {
  if (!quoteQueue.length) {
    quoteQueue = [...Array(QUOTES.length).keys()].sort(() => Math.random() - 0.5);
  }
  return QUOTES[quoteQueue.pop()];
}

function setQuote() {
  const textEl = document.getElementById("quote");
  const srcEl  = document.getElementById("quoteSrc");
  if (!textEl) return;
  textEl.style.opacity = "0";
  if (srcEl) srcEl.style.opacity = "0";
  setTimeout(() => {
    const q = nextQuote();
    textEl.textContent = q.text;
    textEl.style.opacity = "1";
    if (srcEl) { srcEl.textContent = q.src; srcEl.style.opacity = "1"; }
  }, 400);
}
setQuote();
setInterval(setQuote, 45 * 1000);


// ===================== SETTINGS =====================
function getSettings() {
  return {
    method:       parseInt(localStorage.getItem("um_method")         || "2", 10),
    school:       parseInt(localStorage.getItem("um_school")         || "0", 10),
    limit:        parseInt(localStorage.getItem("um_limit")          || "3", 10),
    halalLimit:   parseInt(localStorage.getItem("um_halal_limit")    || "3", 10),
    groceryLimit:   parseInt(localStorage.getItem("um_grocery_limit")    || "3", 10),
    clothingLimit:  parseInt(localStorage.getItem("um_clothing_limit")   || "3", 10)
  };
}

function saveSettings() {
  const m   = document.getElementById("settingMethod").value;
  const s   = document.getElementById("settingSchool").value;
  const l   = document.getElementById("settingLimit").value;
  const hl  = document.getElementById("settingHalalLimit").value;
  const gl  = document.getElementById("settingGroceryLimit").value;
  const cl  = document.getElementById("settingClothingLimit").value;
  localStorage.setItem("um_method", m);
  localStorage.setItem("um_school", s);
  localStorage.setItem("um_limit", l);
  localStorage.setItem("um_halal_limit", hl);
  localStorage.setItem("um_grocery_limit", gl);
  localStorage.setItem("um_clothing_limit", cl);
}

function applySettingsToUI() {
  const s = getSettings();
  document.getElementById("settingMethod").value         = s.method;
  document.getElementById("settingSchool").value         = s.school;
  document.getElementById("settingLimit").value          = s.limit;
  document.getElementById("settingHalalLimit").value     = s.halalLimit;
  document.getElementById("settingGroceryLimit").value   = s.groceryLimit;
  document.getElementById("settingClothingLimit").value  = s.clothingLimit;
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


// ===================== REPORT ISSUE =====================
function openReport() {
  closeSettings();
  document.getElementById("reportPanel").classList.remove("hidden");
  document.getElementById("reportOverlay").classList.remove("hidden");
  document.getElementById("reportStatus").classList.add("hidden");
  document.getElementById("reportDescription").value = "";
  document.getElementById("reportEmail").value = "";
  document.getElementById("reportType").selectedIndex = 0;
}

function closeReport() {
  document.getElementById("reportPanel").classList.add("hidden");
  document.getElementById("reportOverlay").classList.add("hidden");
}

document.getElementById("openReport").addEventListener("click", openReport);
document.getElementById("closeReport").addEventListener("click", closeReport);
document.getElementById("reportOverlay").addEventListener("click", closeReport);

document.getElementById("btnSubmitReport").addEventListener("click", async () => {
  const type = document.getElementById("reportType").value;
  const description = document.getElementById("reportDescription").value.trim();
  const email = document.getElementById("reportEmail").value.trim();
  const status = document.getElementById("reportStatus");
  const btn = document.getElementById("btnSubmitReport");

  if (!description) {
    status.textContent = "Please describe the issue before sending.";
    status.classList.remove("hidden");
    status.classList.add("error");
    return;
  }

  btn.disabled = true;
  status.innerHTML = '<span class="spinner"></span> Sending…';
  status.classList.remove("hidden", "error");

  try {
    const res = await fetch("/api/report_issue", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, description, email })
    });
    const data = await res.json();
    if (data.success) {
      status.textContent = "Thank you! Your report has been sent.";
      status.classList.remove("error");
      document.getElementById("reportDescription").value = "";
      document.getElementById("reportEmail").value = "";
      setTimeout(closeReport, 2000);
    } else {
      throw new Error(data.error || "Unknown error");
    }
  } catch (e) {
    status.textContent = "Failed to send. Please try again later.";
    status.classList.add("error");
  } finally {
    btn.disabled = false;
  }
});


// ===================== QURAN BOOKMARKS =====================
const BM_KEY = "um_quran_bookmarks";

function getBookmarks() {
  try { return JSON.parse(localStorage.getItem(BM_KEY)) || []; }
  catch { return []; }
}
function saveBookmarks(bms) {
  localStorage.setItem(BM_KEY, JSON.stringify(bms));
}
function isBookmarked(surahNum, ayahNum) {
  return getBookmarks().some(b => b.surah === surahNum && b.ayah === ayahNum);
}
function toggleBookmark(surahNum, ayahNum, surahName, surahAr) {
  let bms = getBookmarks();
  const idx = bms.findIndex(b => b.surah === surahNum && b.ayah === ayahNum);
  if (idx >= 0) {
    bms.splice(idx, 1);
  } else {
    bms.unshift({ surah: surahNum, ayah: ayahNum, surahName, surahAr });
    if (bms.length > 20) bms = bms.slice(0, 20);
  }
  saveBookmarks(bms);
  renderBookmarkSection();
  return idx < 0;
}
function renderBookmarkSection() {
  const bms = getBookmarks();
  const wrap = document.getElementById("quranBookmarks");
  const list = document.getElementById("bookmarkList");
  if (!bms.length) { wrap.classList.add("hidden"); return; }
  wrap.classList.remove("hidden");
  list.innerHTML = bms.map(b =>
    `<button class="bookmark-card" data-surah="${b.surah}" data-ayah="${b.ayah}">
      <span class="bookmark-ref">${esc(b.surahName)} &middot; Ayah ${b.ayah}</span>
      <span class="bookmark-ar">${esc(b.surahAr)}</span>
    </button>`
  ).join("");
  list.querySelectorAll(".bookmark-card").forEach(card => {
    card.addEventListener("click", async () => {
      try { await ensureSurahData(); } catch { return; }
      const s = surahsData.find(x => x.number === +card.dataset.surah);
      if (!s) return;
      await openSurah(s);
      await scrollToAyah(+card.dataset.ayah);
    });
  });
}

document.getElementById("btnClearBookmarks").addEventListener("click", () => {
  saveBookmarks([]);
  renderBookmarkSection();
});

renderBookmarkSection();


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
}

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



// ===================== MOSQUES =====================
function distLabel(m) {
  const mi = m.distance_km * 0.621371;
  return mi < 0.1 ? `${Math.round(mi * 5280)} ft away` : `${mi.toFixed(1)} mi away`;
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
let qiblaBearing    = null;
let lastHeading     = null;
let smoothedHeading = null;
let rafPending      = false;
let watchId         = null;
let startedQibla    = false;
let usingAbsolute   = false;  // true once we receive a deviceorientationabsolute event

function normalizeDeg(d) { return ((d % 360) + 360) % 360; }

// Interpolate between two angles via shortest path (handles 0/360 wraparound)
function lerpAngle(from, to, alpha) {
  const diff = ((to - from + 540) % 360) - 180;
  return (from + diff * alpha + 360) % 360;
}

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

  // Low-pass filter — 0.15 = 85% history, 15% new reading; eliminates iOS jitter
  if (smoothedHeading === null) {
    smoothedHeading = normalizeDeg(heading);
  } else {
    smoothedHeading = lerpAngle(smoothedHeading, normalizeDeg(heading), 0.15);
  }
  lastHeading = smoothedHeading;

  // Throttle DOM writes to animation frames (avoids 50Hz+ thrashing on iOS)
  if (!rafPending) {
    rafPending = true;
    requestAnimationFrame(() => {
      rafPending = false;
      rotateLabels(-lastHeading);
      if (typeof qiblaBearing === "number") rotateArrow(normalizeDeg(qiblaBearing - lastHeading));
    });
  }
}

function startCompass() {
  // Listen for both; handleOrientation will prefer absolute events
  window.addEventListener("deviceorientationabsolute", handleOrientation, true);
  window.addEventListener("deviceorientation", handleOrientation, true);
}

function _doStartCompass() {
  startedQibla    = true;
  usingAbsolute   = false;
  smoothedHeading = null;
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
  // Collapse surah browser so only the reader is visible
  document.getElementById("surahListWrap").classList.add("hidden");
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
  reader.scrollIntoView({ behavior: "smooth", block: "start" });
  await loadMoreAyahs();
}


// Core fetch+render — no button state touched. Returns { end, total }.
async function renderAyahBatch(surah, offset) {
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
    const ayahNum = arAyahs[i].numberInSurah;
    const block = document.createElement("div");
    block.className = "ayah-block";
    block.dataset.ayah = ayahNum;
    block.style.animationDelay = `${(i - offset) * 0.03}s`;
    block.innerHTML = `
      <div class="ayah-arabic">${esc(arAyahs[i].text)} <span class="ayah-num">${esc(ayahNum)}</span></div>
      <div class="ayah-translit ayah-translit-en">${esc(trEn?.[i]?.text || "")}</div>
      <div class="ayah-translation ayah-translation-en">${esc(enAyahs[i]?.text || "")}</div>
      <div class="ayah-translation ayah-translation-bn">${esc(trBn?.[i]?.text || "")}</div>
      <div class="ayah-translation ayah-translation-ur">${esc(trUr?.[i]?.text || "")}</div>
      <div class="ayah-footer"></div>`;
    const bmBtn = document.createElement("button");
    const alreadyBm = isBookmarked(surah.number, ayahNum);
    bmBtn.className = "ayah-bookmark-btn" + (alreadyBm ? " bookmarked" : "");
    bmBtn.title = "Bookmark this ayah";
    bmBtn.innerHTML = alreadyBm ? "🔖 Bookmarked" : "🔖 Bookmark";
    bmBtn.addEventListener("click", () => {
      const added = toggleBookmark(surah.number, ayahNum, surah.englishName, surah.name);
      if (added) { bmBtn.classList.add("bookmarked"); bmBtn.innerHTML = "🔖 Bookmarked"; }
      else        { bmBtn.classList.remove("bookmarked"); bmBtn.innerHTML = "🔖 Bookmark"; }
    });
    block.querySelector(".ayah-footer").appendChild(bmBtn);
    container.appendChild(block);
  }
  ayahOffset = end;
  return { end, total: surah.numberOfAyahs };
}

// User-facing load — manages button state, calls renderAyahBatch.
async function loadMoreAyahs() {
  const surah = currentSurah;
  const offset = ayahOffset;
  const btn = document.getElementById("btnLoadMoreAyahs");
  btn.innerHTML = '<span class="spinner"></span> Loading…';
  btn.disabled = true;
  try {
    const { end, total } = await renderAyahBatch(surah, offset);
    if (end < total) {
      btn.innerHTML = `Load more verses (${end}/${total}) ▾`;
      btn.disabled = false;
      btn.classList.remove("hidden");
      document.getElementById("btnNextSurahBottom").style.display = "none";
    } else {
      btn.classList.add("hidden");
      const idx = surahsData.findIndex(s => s.number === surah.number);
      const nextSurah = surahsData[idx + 1];
      const nextBtn = document.getElementById("btnNextSurahBottom");
      if (nextSurah) { nextBtn.textContent = `Continue: ${nextSurah.englishName} \u2192`; nextBtn.style.display = ""; }
    }
  } catch {
    btn.innerHTML = "Failed to load. Tap to retry.";
    btn.disabled = false;
    btn.classList.remove("hidden");
  }
}

// Silent scroll-to-ayah — calls renderAyahBatch directly, never touches button.
async function scrollToAyah(ayahNum) {
  const surah = currentSurah;
  while (ayahOffset < ayahNum && ayahOffset < surah.numberOfAyahs) {
    const before = ayahOffset;
    try { await renderAyahBatch(surah, ayahOffset); } catch { break; }
    if (ayahOffset === before) break;
  }
  const block = document.querySelector(`#quranReaderAyahs [data-ayah="${ayahNum}"]`);
  if (!block) return;
  setTimeout(() => {
    block.scrollIntoView({ behavior: "smooth", block: "center" });
    block.classList.add("ayah-highlight");
    setTimeout(() => block.classList.remove("ayah-highlight"), 2000);
  }, 150);
}

document.getElementById("btnLoadMoreAyahs").addEventListener("click", loadMoreAyahs);
document.getElementById("btnPrevSurah").addEventListener("click", () => navigateSurah(-1));
document.getElementById("btnNextSurah").addEventListener("click", () => navigateSurah(1));
document.getElementById("btnNextSurahBottom").addEventListener("click", () => navigateSurah(1));
document.getElementById("btnCloseReader").addEventListener("click", async () => {
  document.getElementById("quranReader").classList.add("hidden");
  const wrap = document.getElementById("surahListWrap");
  if (!surahsLoaded) await loadSurahList();
  wrap.classList.remove("hidden");
  document.getElementById("quranSurahBrowser").scrollIntoView({ behavior: "smooth", block: "start" });
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

document.getElementById("btnHadithBrowserMore").addEventListener("click", () => loadHadithBrowser());
document.getElementById("hadithCollection").addEventListener("change", () => loadHadithBrowser(true));

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
  const text  = data.text || "Text unavailable.";
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
    const dist      = distLabel(r);
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

function renderClothing(stores) {
  const list = document.getElementById("clothingList");
  list.innerHTML = "";
  stores.forEach((r, i) => {
    const openTag   = r.open_now === true  ? `<span class="tag tag-open">Open now</span>`
                    : r.open_now === false ? `<span class="tag tag-closed">Closed</span>` : "";
    const ratingTag = r.rating ? `<span class="tag tag-rating">★ ${r.rating}</span>` : "";
    const dist      = distLabel(r);
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
}

async function loadIslamicClothing() {
  const status = document.getElementById("clothingStatus");
  const list   = document.getElementById("clothingList");
  status.innerHTML = `<span class="spinner"></span>Finding Islamic clothing stores…`;
  status.classList.remove("hidden", "error");
  list.classList.add("hidden");
  try {
    const loc   = await getLocation();
    const limit = getSettings().clothingLimit;
    const res   = await fetch(`/api/islamic_clothing?lat=${loc.lat}&lng=${loc.lng}&limit=${limit}`);
    const data  = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed");
    renderClothing(data.stores);
    status.classList.add("hidden");
    document.getElementById("btnHideClothing").classList.remove("hidden");
  } catch (e) {
    status.textContent = `Error: ${e.message}`;
    status.classList.add("error");
  }
}

document.getElementById("btnFindClothing").addEventListener("click", loadIslamicClothing);
document.getElementById("btnHideClothing").addEventListener("click", () => {
  document.getElementById("clothingList").classList.add("hidden");
  document.getElementById("btnHideClothing").classList.add("hidden");
});
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
    const dist      = distLabel(r);
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


// ===================== PWA INSTALL BANNER =====================
(function initInstallBanner() {
  const DISMISSED_KEY = "um_install_dismissed";

  const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const isStandalone = window.matchMedia("(display-mode: standalone)").matches
    || window.navigator.standalone;

  // Already installed — never show banner
  if (isStandalone) { localStorage.setItem(DISMISSED_KEY, "1"); return; }
  if (localStorage.getItem(DISMISSED_KEY)) return;

  const banner     = document.getElementById("installBanner");
  const btnInstall = document.getElementById("btnInstall");
  const btnDismiss = document.getElementById("btnInstallDismiss");
  const iosGuide   = document.getElementById("iosInstallGuide");
  const btnIosClose = document.getElementById("btnIosGuideClose");

  let deferredPrompt = null;

  function dismissBanner() {
    banner.classList.add("hidden");
    iosGuide.classList.add("hidden");
    localStorage.setItem(DISMISSED_KEY, "1");
  }

  btnDismiss.addEventListener("click", dismissBanner);
  btnIosClose.addEventListener("click", () => iosGuide.classList.add("hidden"));

  // Chrome / Edge / Android — native install prompt
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e;
    setTimeout(() => banner.classList.remove("hidden"), 3000);
  });

  btnInstall.addEventListener("click", async () => {
    if (deferredPrompt) {
      // Android/Chrome: trigger native prompt
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      deferredPrompt = null;
      dismissBanner();
    } else if (isIos) {
      // iOS: show step-by-step guide
      banner.classList.add("hidden");
      iosGuide.classList.remove("hidden");
    }
  });

  // iOS: show banner after 3 s
  if (isIos) {
    setTimeout(() => banner.classList.remove("hidden"), 3000);
  }
})();
