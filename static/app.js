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
    method: parseInt(localStorage.getItem("um_method") || "2", 10),
    school:  parseInt(localStorage.getItem("um_school")  || "0", 10),
    limit:   parseInt(localStorage.getItem("um_limit")   || "5", 10)
  };
}

function saveSettings() {
  const m = document.getElementById("settingMethod").value;
  const s = document.getElementById("settingSchool").value;
  const l = document.getElementById("settingLimit").value;
  localStorage.setItem("um_method", m);
  localStorage.setItem("um_school", s);
  localStorage.setItem("um_limit", l);
}

function applySettingsToUI() {
  const s = getSettings();
  document.getElementById("settingMethod").value = s.method;
  document.getElementById("settingSchool").value  = s.school;
  document.getElementById("settingLimit").value   = s.limit;
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
  // Re-fetch everything with new settings
  cachedLoc = null;
  startEverything();
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
      { enableHighAccuracy: false, timeout: 20000, maximumAge: 60000 }
    );
  });
}


// ===================== HIJRI DATE =====================
async function setHijriDate() {
  const el = document.getElementById("hijriDate");
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
  cd.innerHTML = `<span>⏱ Next prayer — <b>${next.name}</b></span><span class="countdown-time">${formatCountdown(ms)}</span>`;
}

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
    card.innerHTML = `<div class="pt-name">${name}</div><div class="pt-time">${t}</div>`;
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
      <span><b>Timezone:</b> ${data.timezone || "—"}</span>
      <span><b>Method:</b> ${data.method?.name || "—"}</span>
      <span><b>Date:</b> ${gregDate || "—"} · ${data.hijri?.day || ""} ${cleanHijriMonth} ${data.hijri?.year || ""} AH</span>
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
      <div class="mosque-rank">${i + 1}</div>
      <div class="mosque-info">
        <div class="mosque-name">${m.name}</div>
        <div class="mosque-addr">${m.address || "—"}</div>
        <div class="mosque-tags">
          <span class="tag tag-dist">📍 ${distLabel(m)}</span>
          ${openTag}
          ${ratingTag}
        </div>
      </div>
      <div class="mosque-actions">
        <a href="${m.maps_directions_url}" target="_blank" rel="noopener" class="link-btn primary">🗺 Directions</a>
        <a href="${m.maps_place_url}" target="_blank" rel="noopener" class="link-btn">Details</a>
      </div>
    `;
    list.appendChild(card);
  });
  list.classList.remove("hidden");
}

async function loadMosques() {
  const status = document.getElementById("mosqueStatus");
  const list   = document.getElementById("mosqueList");

  status.innerHTML = `<span class="spinner"></span>Finding nearby mosques…`;
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
  if (typeof qiblaBearing === "number") rotateArrow(normalizeDeg(qiblaBearing - lastHeading));
}

function startCompass() {
  // Listen for both; handleOrientation will prefer absolute events
  window.addEventListener("deviceorientationabsolute", handleOrientation, true);
  window.addEventListener("deviceorientation", handleOrientation, true);
}

async function ensureMotionPermissioniOS() {
  if (typeof DeviceOrientationEvent !== "undefined" && typeof DeviceOrientationEvent.requestPermission === "function") {
    const perm = await DeviceOrientationEvent.requestPermission();
    if (perm !== "granted") throw new Error("Motion permission denied");
  }
}

async function startQiblaLive({ fromButton = false } = {}) {
  if (startedQibla) return;
  startedQibla = true;
  usingAbsolute = false;
  try {
    await ensureMotionPermissioniOS();
  } catch (e) {
    console.log("Motion permission:", e.message);
    startedQibla = false;
    if (!fromButton) return;
  }
  startCompass();
  startLocationWatch();
}

document.getElementById("btnQibla").addEventListener("click", async () => {
  startedQibla = false;
  try { await startQiblaLive({ fromButton: true }); }
  catch (e) { console.warn("Qibla error:", e.message); }
});

// Auto-start (Android works; iOS needs tap)
startQiblaLive({ fromButton: false });


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

// Toggle search bar
document.getElementById("btnQuranToggleSearch").addEventListener("click", () => {
  const row = document.getElementById("quranSearchRow");
  row.classList.toggle("hidden");
  if (!row.classList.contains("hidden")) document.getElementById("quranSearchInput").focus();
});

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

async function loadSurahList() {
  surahsLoaded = true;
  const wrap = document.getElementById("surahListWrap");
  wrap.innerHTML = '<span style="color:var(--text3);font-size:13px;padding:8px"><span class="spinner"></span>Loading…</span>';
  try {
    const res  = await fetch("https://api.alquran.cloud/v1/surah");
    const data = await res.json();
    surahsData  = data.data;
    wrap.innerHTML = "";
    surahsData.forEach(s => {
      const btn = document.createElement("button");
      btn.className = "surah-item";
      btn.innerHTML = `
        <div class="surah-num-badge">${s.number}</div>
        <div class="surah-item-info">
          <div class="surah-item-en">${s.englishName} <span style="color:var(--text3);font-size:11.5px">${s.englishNameTranslation}</span></div>
          <div class="surah-item-meta">${s.numberOfAyahs} verses · ${s.revelationType}</div>
        </div>
        <div class="surah-item-ar">${s.name}</div>`;
      btn.addEventListener("click", () => openSurah(s));
      wrap.appendChild(btn);
    });
  } catch {
    wrap.innerHTML = '<span style="color:var(--red);font-size:13px;padding:8px">Failed to load. Check connection.</span>';
  }
}

async function openSurah(surah) {
  currentSurah = surah;
  ayahOffset   = 0;
  // Hide single-verse result
  document.getElementById("quranResult").classList.add("hidden");
  document.getElementById("quranStatus").classList.add("hidden");
  // Show reader
  const reader = document.getElementById("quranReader");
  reader.classList.remove("hidden");
  document.getElementById("quranReaderHeader").innerHTML = `
    <span class="qr-ar">${surah.name}</span>
    <div class="qr-en">${surah.englishName} — ${surah.englishNameTranslation}</div>
    <div class="qr-meta">${surah.numberOfAyahs} verses · ${surah.revelationType}</div>`;
  document.getElementById("quranReaderAyahs").innerHTML = "";
  document.getElementById("btnLoadMoreAyahs").classList.add("hidden");
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
    const [arRes, enRes] = await Promise.all([
      fetch(`https://api.alquran.cloud/v1/surah/${surah.number}/ar.alafasy`),
      fetch(`https://api.alquran.cloud/v1/surah/${surah.number}/en.sahih`)
    ]);
    const arData = await arRes.json();
    const enData = await enRes.json();
    const arAyahs = arData.data.ayahs;
    const enAyahs = enData.data?.ayahs || [];
    const container = document.getElementById("quranReaderAyahs");
    const end = Math.min(offset + AYAHS_PER_LOAD, arAyahs.length);
    for (let i = offset; i < end; i++) {
      const block = document.createElement("div");
      block.className = "ayah-block";
      block.style.animationDelay = `${(i - offset) * 0.03}s`;
      block.innerHTML = `
        <div class="ayah-arabic">${arAyahs[i].text} <span class="ayah-num">${arAyahs[i].numberInSurah}</span></div>
        <div class="ayah-translation">${enAyahs[i]?.text || ""}</div>`;
      container.appendChild(block);
    }
    ayahOffset = end;
    if (ayahOffset < surah.numberOfAyahs) {
      btn.innerHTML = `Load more verses (${ayahOffset}/${surah.numberOfAyahs}) ▾`;
      btn.disabled = false;
      btn.classList.remove("hidden");
    } else {
      btn.classList.add("hidden");
    }
  } catch {
    btn.innerHTML = "Failed to load. Tap to retry.";
    btn.disabled = false;
    btn.classList.remove("hidden");
  }
}

document.getElementById("btnLoadMoreAyahs").addEventListener("click", loadMoreAyahs);

// Random verse
document.getElementById("btnQuranRandom").addEventListener("click", fetchRandomVerse);
document.getElementById("btnQuranGo").addEventListener("click", handleQuranSearch);
document.getElementById("quranSearchInput").addEventListener("keydown", e => {
  if (e.key === "Enter") handleQuranSearch();
});

async function handleQuranSearch() {
  const input = document.getElementById("quranSearchInput").value.trim();
  if (!input) return;
  const colonMatch = input.match(/^(\d+):(\d+)$/);
  if (colonMatch) {
    await fetchSingleVerse(parseInt(colonMatch[1]), parseInt(colonMatch[2]));
  } else {
    await fetchVerseByKeyword(input);
  }
}

function showQuranStatus(msg, isErr = false) {
  const el = document.getElementById("quranStatus");
  el.textContent = msg;
  el.className = "status-msg" + (isErr ? " error" : "");
  el.classList.remove("hidden");
  document.getElementById("quranResult").classList.add("hidden");
  document.getElementById("quranReader").classList.add("hidden");
}

async function fetchSingleVerse(surah, ayah) {
  showQuranStatus("Loading verse…");
  try {
    const [arRes, enRes] = await Promise.all([
      fetch(`https://api.alquran.cloud/v1/ayah/${surah}:${ayah}/ar.alafasy`),
      fetch(`https://api.alquran.cloud/v1/ayah/${surah}:${ayah}/en.sahih`)
    ]);
    const arData = await arRes.json();
    const enData = await enRes.json();
    if (arData.code !== 200) throw new Error();
    document.getElementById("quranStatus").classList.add("hidden");
    renderSingleVerse(arData.data, enData.data);
  } catch {
    showQuranStatus("Verse not found. Try e.g. 2:255", true);
  }
}

async function fetchVerseByKeyword(query) {
  showQuranStatus("Searching…");
  try {
    const res  = await fetch(`https://api.alquran.cloud/v1/search/${encodeURIComponent(query)}/all/en.sahih`);
    const data = await res.json();
    if (data.code !== 200 || !data.data?.matches?.length) throw new Error();
    const m = data.data.matches[0];
    await fetchSingleVerse(m.surah.number, m.numberInSurah);
  } catch {
    showQuranStatus("No results found. Try a different keyword.", true);
  }
}

async function fetchRandomVerse() {
  document.getElementById("quranReader").classList.add("hidden");
  showQuranStatus("Loading random verse…");
  try {
    const sRes  = await fetch(`https://api.alquran.cloud/v1/surah/${Math.floor(Math.random()*114)+1}`);
    const sData = await sRes.json();
    const total = sData.data.numberOfAyahs;
    await fetchSingleVerse(sData.data.number, Math.floor(Math.random()*total)+1);
  } catch {
    showQuranStatus("Could not load verse. Try again.", true);
  }
}

function renderSingleVerse(ar, en) {
  document.getElementById("quranArabic").textContent = ar.text;
  document.getElementById("quranTranslation").textContent = `"${en?.text || ""}"`;
  document.getElementById("quranMeta").innerHTML = `
    <span>📖 ${ar.surah.englishName} (${ar.surah.number}:${ar.numberInSurah})</span>
    <span>${ar.surah.revelationType}</span>`;
  document.getElementById("quranResult").classList.remove("hidden");
}

// Load a random verse on boot
fetchRandomVerse();


// ===================== HADITH =====================
const HADITH_MAX = { bukhari:7563, muslim:3033, abudawud:5274, tirmidhi:3956, ibnmajah:4341, nasai:5761 };
const COLL_NAMES = { bukhari:"Sahih al-Bukhari", muslim:"Sahih Muslim", abudawud:"Sunan Abu Dawud", tirmidhi:"Jami' at-Tirmidhi", ibnmajah:"Sunan Ibn Majah", nasai:"Sunan an-Nasa'i" };

document.getElementById("btnHadithRandom").addEventListener("click", fetchRandomHadith);
document.getElementById("btnHadithGo").addEventListener("click", () => {
  const num = parseInt(document.getElementById("hadithNumber").value);
  if (num > 0) fetchHadith(document.getElementById("hadithCollection").value, num);
});
document.getElementById("hadithNumber").addEventListener("keydown", e => {
  if (e.key === "Enter") document.getElementById("btnHadithGo").click();
});

function showHadithStatus(msg, isErr = false) {
  const el = document.getElementById("hadithStatus");
  el.textContent = msg;
  el.className = "status-msg" + (isErr ? " error" : "");
  el.classList.remove("hidden");
  document.getElementById("hadithResult").classList.add("hidden");
}

async function fetchRandomHadith() {
  const col = document.getElementById("hadithCollection").value;
  await fetchHadith(col, Math.floor(Math.random() * (HADITH_MAX[col] || 3000)) + 1);
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
}

// Load on boot
fetchRandomHadith();


// ===================== HALAL RESTAURANTS =====================
document.getElementById("btnFindHalal").addEventListener("click", loadHalalRestaurants);

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
      <div class="mosque-rank">${i + 1}</div>
      <div class="mosque-info">
        <div class="mosque-name">${r.name}</div>
        <div class="mosque-addr">${r.address || "—"}</div>
        <div class="mosque-tags">
          <span class="tag tag-dist">📍 ${dist}</span>
          ${openTag}${ratingTag}${priceTag}
        </div>
      </div>
      <div class="mosque-actions">
        <a href="${r.maps_directions_url}" target="_blank" rel="noopener" class="link-btn primary">🗺 Directions</a>
        <a href="${r.maps_place_url}" target="_blank" rel="noopener" class="link-btn">Details</a>
      </div>`;
    list.appendChild(card);
  });
  list.classList.remove("hidden");
}

async function loadHalalRestaurants() {
  const status = document.getElementById("halalStatus");
  const list   = document.getElementById("halalList");
  status.innerHTML = `<span class="spinner"></span>Finding halal restaurants…`;
  status.classList.remove("hidden", "error");
  list.classList.add("hidden");
  try {
    const loc   = await getLocation();
    const limit = getSettings().limit;
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
