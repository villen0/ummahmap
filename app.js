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
  let heading = null;
  if (typeof e.webkitCompassHeading === "number") heading = e.webkitCompassHeading;
  else if (typeof e.alpha === "number") heading = e.alpha;
  if (typeof heading !== "number" || isNaN(heading)) return;
  lastHeading = normalizeDeg(heading);
  if (typeof qiblaBearing === "number") rotateArrow(normalizeDeg(qiblaBearing - lastHeading));
}

function startCompass() {
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
let quranSearchVisible = false;

document.getElementById("btnQuranSearch").addEventListener("click", () => {
  quranSearchVisible = !quranSearchVisible;
  document.getElementById("quranSearchRow").classList.toggle("hidden", !quranSearchVisible);
  if (quranSearchVisible) document.getElementById("quranSearchInput").focus();
});

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
    await fetchVerse(parseInt(colonMatch[1]), parseInt(colonMatch[2]));
  } else {
    await fetchVerseBySearch(input);
  }
}

function showQuranStatus(msg, isError = false) {
  const el = document.getElementById("quranStatus");
  el.textContent = msg;
  el.className = "status-msg" + (isError ? " error" : "");
  el.classList.remove("hidden");
  document.getElementById("quranResult").classList.add("hidden");
}

function hideQuranStatus() {
  document.getElementById("quranStatus").classList.add("hidden");
}

async function fetchVerse(surah, ayah) {
  showQuranStatus("Loading verse…");
  try {
    const [arRes, enRes] = await Promise.all([
      fetch(`https://api.alquran.cloud/v1/ayah/${surah}:${ayah}/ar.alafasy`),
      fetch(`https://api.alquran.cloud/v1/ayah/${surah}:${ayah}/en.asad`)
    ]);
    const arData = await arRes.json();
    const enData = await enRes.json();
    if (arData.code !== 200) throw new Error("Verse not found");
    hideQuranStatus();
    renderVerse(arData.data, enData.data);
  } catch (e) {
    showQuranStatus("Could not load verse. Check the reference.", true);
  }
}

async function fetchRandomVerse() {
  showQuranStatus("Loading random verse…");
  try {
    const randomSurah = Math.floor(Math.random() * 114) + 1;
    const surahRes = await fetch(`https://api.alquran.cloud/v1/surah/${randomSurah}`);
    const surahData = await surahRes.json();
    const totalAyahs = surahData.data.numberOfAyahs;
    const randomAyah = Math.floor(Math.random() * totalAyahs) + 1;
    await fetchVerse(randomSurah, randomAyah);
  } catch (e) {
    showQuranStatus("Could not load verse. Try again.", true);
  }
}

async function fetchVerseBySearch(query) {
  showQuranStatus("Searching…");
  try {
    const res = await fetch(`https://api.alquran.cloud/v1/search/${encodeURIComponent(query)}/all/en.asad`);
    const data = await res.json();
    if (data.code !== 200 || !data.data?.matches?.length) {
      showQuranStatus("No verses found for that search.", true);
      return;
    }
    const match = data.data.matches[0];
    await fetchVerse(match.surah.number, match.numberInSurah);
  } catch (e) {
    showQuranStatus("Search failed. Try again.", true);
  }
}

function renderVerse(arData, enData) {
  document.getElementById("quranArabic").textContent = arData.text;
  document.getElementById("quranTranslation").textContent = `"${enData?.text || ""}"`;
  document.getElementById("quranMeta").innerHTML = `
    <span>📖 Surah ${arData.surah.englishName} (${arData.surah.number})</span>
    <span>Verse ${arData.numberInSurah}</span>
    <span>${arData.surah.revelationType}</span>
  `;
  document.getElementById("quranResult").classList.remove("hidden");
}

// Load a verse on page load
fetchRandomVerse();


// ===================== HADITH =====================
const HADITH_MAX = {
  bukhari: 7563, muslim: 3033, abudawud: 5274, tirmidhi: 3956, ibnmajah: 4341
};

document.getElementById("btnHadithRandom").addEventListener("click", fetchRandomHadith);

function showHadithStatus(msg, isError = false) {
  const el = document.getElementById("hadithStatus");
  el.textContent = msg;
  el.className = "status-msg" + (isError ? " error" : "");
  el.classList.remove("hidden");
  document.getElementById("hadithResult").classList.add("hidden");
}

function hideHadithStatus() {
  document.getElementById("hadithStatus").classList.add("hidden");
}

async function fetchRandomHadith() {
  const collection = document.getElementById("hadithCollection").value;
  const max = HADITH_MAX[collection] || 3000;
  const num = Math.floor(Math.random() * max) + 1;
  showHadithStatus("Loading hadith…");
  try {
    const res = await fetch(`https://hadith-api.vercel.app/api/hadith/${collection}/${num}`);
    if (!res.ok) throw new Error();
    const data = await res.json();
    hideHadithStatus();
    renderHadith(data, collection, num);
  } catch (e) {
    // Try a fallback: different random number
    try {
      const num2 = Math.floor(Math.random() * 500) + 1;
      const res2 = await fetch(`https://hadith-api.vercel.app/api/hadith/${collection}/${num2}`);
      if (!res2.ok) throw new Error();
      const data2 = await res2.json();
      hideHadithStatus();
      renderHadith(data2, collection, num2);
    } catch {
      showHadithStatus("Could not load hadith. Try again.", true);
    }
  }
}

function renderHadith(data, collection, num) {
  const collectionNames = {
    bukhari: "Sahih al-Bukhari", muslim: "Sahih Muslim",
    abudawud: "Sunan Abu Dawud", tirmidhi: "Jami' at-Tirmidhi", ibnmajah: "Sunan Ibn Majah"
  };
  const text = data.hadith_english || data.text || data.body || "Text unavailable.";
  const grade = data.grade || "";
  const gradeClass = grade.toLowerCase().includes("sahih") ? "hadith-grade-sahih"
                   : grade.toLowerCase().includes("hasan") ? "hadith-grade-hasan" : "";
  document.getElementById("hadithText").textContent = text;
  document.getElementById("hadithMeta").innerHTML = `
    <span class="tag">${collectionNames[collection] || collection}</span>
    <span class="tag">#${num}</span>
    ${grade ? `<span class="tag ${gradeClass}">${grade}</span>` : ""}
  `;
  document.getElementById("hadithResult").classList.remove("hidden");
}

// Load on page load
fetchRandomHadith();


// ===================== HALAL RESTAURANTS =====================
document.getElementById("btnFindHalal").addEventListener("click", findHalalRestaurants);

function showHalalStatus(msg, isError = false) {
  const el = document.getElementById("halalStatus");
  el.textContent = msg;
  el.className = "status-msg" + (isError ? " error" : "");
  el.classList.remove("hidden");
  document.getElementById("halalList").classList.add("hidden");
}

function hideHalalStatus() {
  document.getElementById("halalStatus").classList.add("hidden");
}

async function findHalalRestaurants() {
  showHalalStatus("⏳ Getting your location…");
  try {
    const loc = await getLocation();
    showHalalStatus("🍽️ Finding halal restaurants nearby…");
    const s = getSettings();
    const res = await fetch(`/api/halal_restaurants?lat=${loc.lat}&lng=${loc.lng}&limit=${s.limit}`);
    const data = await res.json();
    if (!res.ok || data.error) throw new Error(data.error || "Failed");
    hideHalalStatus();
    renderHalalRestaurants(data.restaurants);
  } catch (e) {
    showHalalStatus("⚠️ " + (e.message || "Could not find halal restaurants."), true);
  }
}

const PRICE_LABELS = ["", "$", "$$", "$$$", "$$$$"];

function renderHalalRestaurants(restaurants) {
  const list = document.getElementById("halalList");
  list.innerHTML = "";
  restaurants.forEach((r, i) => {
    const openTag = r.open_now === true ? `<span class="tag tag-open">Open</span>`
                  : r.open_now === false ? `<span class="tag tag-closed">Closed</span>` : "";
    const ratingTag = r.rating ? `<span class="tag tag-rating">★ ${r.rating}${r.user_ratings_total ? ` (${r.user_ratings_total})` : ""}</span>` : "";
    const priceTag = r.price_level ? `<span class="tag tag-dist">${PRICE_LABELS[r.price_level]}</span>` : "";
    const distTag = r.distance_m < 1000
      ? `<span class="tag tag-dist">${r.distance_m}m away</span>`
      : `<span class="tag tag-dist">${r.distance_km}km away</span>`;
    const card = document.createElement("div");
    card.className = "mosque-card";
    card.style.animationDelay = `${i * 0.06}s`;
    card.innerHTML = `
      <div class="mosque-rank">${i + 1}</div>
      <div class="mosque-info">
        <div class="mosque-name">${r.name}</div>
        <div class="mosque-addr">${r.address}</div>
        <div class="mosque-tags">${distTag}${openTag}${ratingTag}${priceTag}</div>
      </div>
      <div class="mosque-actions">
        <a href="${r.maps_directions_url}" target="_blank" rel="noopener" class="link-btn primary">🗺️ Directions</a>
        <a href="${r.maps_place_url}" target="_blank" rel="noopener" class="link-btn">ℹ️ Details</a>
      </div>
    `;
    list.appendChild(card);
  });
  list.classList.remove("hidden");
}
