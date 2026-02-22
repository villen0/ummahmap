const QUOTES = [
  "Indeed, with hardship comes ease. (Qur'an 94:6)",
  "So remember Me; I will remember you. (Qur'an 2:152)",
  "Allah does not burden a soul beyond that it can bear. (Qur'an 2:286)",
  "The best among you are those who have the best manners. (Hadith)",
  "Whoever relies upon Allah - then He is sufficient for him. (Qur'an 65:3)"
];

function setQuote() {
  const q = QUOTES[Math.floor(Math.random() * QUOTES.length)];
  document.getElementById("quote").textContent = q;
}
setQuote();
setInterval(setQuote, 5 * 60 * 1000);



async function setHijriDate() {
  const el = document.getElementById("hijriDate");

  try {
    const pos = await getLocation();

    const res = await fetch(
      `/api/prayer_times?lat=${pos.lat}&lng=${pos.lng}`
    );

    const data = await res.json();
    const h = data.hijri;

    const cleanMonth = h.month.en
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

    el.textContent =
      `Hijri: ${h.weekday?.en || ""}, ${h.day} ${cleanMonth} ${h.year} AH`;

  } catch (e) {
    el.textContent = "Hijri: Unable to load";
  }
}

setHijriDate();

function getLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error("Geolocation not supported"));
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => reject(err),
      { enableHighAccuracy: true, timeout: 12000 }
    );
  });
}

document.getElementById("btnFind").addEventListener("click", async () => {
  const box = document.getElementById("mosqueBox");
  box.textContent = "Finding nearest mosque...";
  try {
    const loc = await getLocation();
    const res = await fetch(`/api/nearest_mosque?lat=${loc.lat}&lng=${loc.lng}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed");

    box.innerHTML = `
      <div><b>${data.name}</b></div>
      <div class="muted">${data.address || ""}</div>
      <div class="muted">(${data.lat.toFixed(5)}, ${data.lng.toFixed(5)})</div>
    `;

    const dir = document.getElementById("btnDirections");
    dir.href = data.maps_directions_url;
    dir.style.display = "inline-block";
    dir.textContent = "Open Directions (Google Maps)";
  } catch (e) {
    box.textContent = `Error: ${e.message}`;
  }
});

document.getElementById("btnPrayerGps").addEventListener("click", async () => {
  const status = document.getElementById("prayerGpsStatus");
  const grid = document.getElementById("prayerGpsCards");
  const meta = document.getElementById("prayerGpsMeta");

  status.textContent = "Loading prayer times...";
  grid.style.display = "none";
  meta.style.display = "none";
  grid.innerHTML = "";
  meta.innerHTML = "";

  try {
    const loc = await getLocation();
    // Defaults: method=2 (ISNA), school=0 (Shafi). If you prefer Hanafi: school=1
    const res = await fetch(`/api/prayer_times?lat=${loc.lat}&lng=${loc.lng}&method=2&school=0`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed");

    const timings = data.timings || {};
    const order = ["Fajr", "Sunrise", "Dhuhr", "Asr", "Maghrib", "Isha"];

    order.forEach((name) => {
      const t = timings[name];
      if (!t) return;

      const card = document.createElement("div");
      card.className = "ptCard";
      card.innerHTML = `
        <div class="ptName">${name}</div>
        <div class="ptTime">${t}</div>
      `;
      grid.appendChild(card);
    });

    const tz = data.timezone ? data.timezone : "";
    const methodName = data.method?.name ? data.method.name : "";
    const hijri = data.hijri?.date ? data.hijri.date : "";
    const hijriLabel = data.hijri?.weekday?.en ? data.hijri.weekday.en : "";
    let gregDate = "";
if (data.gregorian?.date) {
  const parts = data.gregorian.date.split("-"); // DD-MM-YYYY
  if (parts.length === 3) {
    const dd = parts[0];
    const mm = parts[1];
    const yyyy = parts[2];
    const yy = yyyy.slice(-2);
    gregDate = `${mm}/${dd}/${yy}`; // mm/dd/yy
  }
}

    meta.innerHTML = `
      <div><b>Timezone:</b> ${tz || "—"}</div>
      <div><b>Method:</b> ${methodName || "—"}</div>
      <div><b>Today:</b> ${gregDate || "—"} &nbsp;|&nbsp; <b>Hijri:</b> ${hijriLabel ? (hijriLabel + ", ") : ""}${hijri || "—"}</div>
    `;

    status.textContent = "";
    grid.style.display = "grid";
    meta.style.display = "block";
  } catch (e) {
    status.textContent = `Error: ${e.message}`;
  }
});

document.getElementById("btnPrayer").addEventListener("click", async () => {
  const status = document.getElementById("prayerStatus");
  const out = document.getElementById("prayerBox");
  status.textContent = "Loading prayer times from website...";
  out.textContent = "";
  const url = document.getElementById("prayerUrl").value.trim();
  const rowSel = document.getElementById("rowSel").value.trim();
  const nameSel = document.getElementById("nameSel").value.trim();
  const timeSel = document.getElementById("timeSel").value.trim();

  try {
    const qs = new URLSearchParams({
      url,
      row_selector: rowSel,
      name_selector: nameSel,
      time_selector: timeSel
    });

    const res = await fetch(`/api/prayer_times_from_website?${qs.toString()}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed");
    status.textContent = "";
    out.textContent = JSON.stringify(data, null, 2);
  } catch (e) {
    status.textContent = `Error: ${e.message}`;
    out.textContent = "Tip: update the CSS selectors to match the mosque website.";

  }
});

// ===================== QIBLA: LIVE COMPASS (iPhone + Android) =====================
let qiblaBearing = null; // bearing to Kaaba (0-360)
let heading = null; // device heading (0-360)
let compassStarted = false;

const qiblaArrowEl = document.getElementById("qiblaArrow");
const qiblaBearingEl = document.getElementById("qiblaBearing");
const btnQibla = document.getElementById("btnQibla");

function normalizeDeg(d) {
  return (d % 360 + 360) % 360;
}

function rotateArrow(relativeDeg) {
  // keep translateX(-50%) because your CSS centers the arrow
  qiblaArrowEl.style.transform = `translateX(-50%) rotate(${relativeDeg}deg)`;
}

async function getLocationOnce() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error("Geolocation not supported"));
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => reject(err),
      { enableHighAccuracy: true, timeout: 12000 }
    );
  });
}

async function fetchQiblaBearing(lat, lng) {
  const res = await fetch(`/api/qibla?lat=${lat}&lng=${lng}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Qibla API failed");
  return Number(data.bearing_deg);
}

function updateNeedle() {
  if (typeof qiblaBearing !== "number") return;
  if (typeof heading !== "number") {
    // If we don't have compass heading yet, at least point to absolute bearing
    rotateArrow(qiblaBearing);
    return;
  }
  const relative = normalizeDeg(qiblaBearing - heading);
  rotateArrow(relative);
}

// iOS Safari: best heading is webkitCompassHeading
function handleOrientation(e) {
  let newHeading = null;

  if (typeof e.webkitCompassHeading === "number") {
    // iOS Safari gives compass heading directly (0 = north)
    newHeading = e.webkitCompassHeading;
  } else if (typeof e.alpha === "number") {
    // Many Android devices: alpha is 0..360 but direction can be reversed depending on browser.
    // Common approach: heading = 360 - alpha
    newHeading = 360 - e.alpha;
  }

  if (typeof newHeading === "number") {
    heading = normalizeDeg(newHeading);
    updateNeedle();
  }
}

function startCompassListeners() {
  if (compassStarted) return;
  compassStarted = true;

  // Some browsers fire only one of these; listen to both.
  window.addEventListener("deviceorientationabsolute", handleOrientation, true);
  window.addEventListener("deviceorientation", handleOrientation, true);
}

// iPhone permission (must be called from a user gesture)
async function requestIOSPermissionIfNeeded() {
  if (
    typeof DeviceOrientationEvent !== "undefined" &&
    typeof DeviceOrientationEvent.requestPermission === "function"
  ) {
    const p = await DeviceOrientationEvent.requestPermission();
    if (p !== "granted") throw new Error("Motion/orientation permission denied");
  }
}

async function startQibla() {
  // 1) Get bearing once (based on location)
  const loc = await getLocationOnce();
  qiblaBearing = await fetchQiblaBearing(loc.lat, loc.lng);
  qiblaBearingEl.textContent = qiblaBearing.toFixed(1);

  // 2) Start compass
  startCompassListeners();

  // 3) Update immediately even if compass is slow
  updateNeedle();
}

// Button = required for iPhone, optional for Android
btnQibla.addEventListener("click", async () => {
  try {
    await requestIOSPermissionIfNeeded();
    await startQibla();
  } catch (e) {
    alert(`Qibla error: ${e.message}`);
  }
});

// Auto-start on Android/desktop (won't work on iPhone unless user taps)
(async () => {
  try {
    await startQibla();
  } catch (e) {
    // iPhone will land here until user taps the button (permission requirement)
    console.log("Qibla auto-start blocked (likely iPhone permission). Tap 'Update Qibla'.", e);
  }
})();