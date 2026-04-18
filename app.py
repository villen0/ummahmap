import os
import math
import time
import smtplib
import requests
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from urllib.parse import quote_plus
from flask import Flask, render_template, request, jsonify
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
GOOGLE_KEY = os.getenv("GOOGLE_MAPS_API_KEY")

KAABA_LAT = 21.422487
KAABA_LNG = 39.826206

# Simple in-memory cache
_cache = {}
CACHE_TTL = 300  # 5 minutes

def cache_get(key):
    entry = _cache.get(key)
    if entry and (time.time() - entry["ts"]) < CACHE_TTL:
        return entry["data"]
    return None

def cache_set(key, data):
    _cache[key] = {"ts": time.time(), "data": data}

def bearing_to_kaaba(lat, lng):
    phi1 = math.radians(lat)
    phi2 = math.radians(KAABA_LAT)
    d_lambda = math.radians(KAABA_LNG - lng)
    y = math.sin(d_lambda) * math.cos(phi2)
    x = math.cos(phi1) * math.sin(phi2) - math.sin(phi1) * math.cos(phi2) * math.cos(d_lambda)
    brng = (math.degrees(math.atan2(y, x)) + 360) % 360
    return brng

def haversine_km(lat1, lng1, lat2, lng2):
    R = 6371
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lng2 - lng1)
    a = math.sin(dphi/2)**2 + math.cos(phi1)*math.cos(phi2)*math.sin(dlambda/2)**2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

@app.route("/")
def home():
    return render_template("index.html", app_name="UmmahMap")

@app.route("/.well-known/assetlinks.json")
def assetlinks():
    data = [{
        "relation": ["delegate_permission/common.handle_all_urls"],
        "target": {
            "namespace": "android_app",
            "package_name": "org.ummahmap.twa",
            "sha256_cert_fingerprints": ["PLACEHOLDER_REPLACE_AFTER_BUBBLEWRAP"]
        }
    }]
    return jsonify(data)

@app.route("/api/nearby_mosques")
def nearby_mosques():
    lat = request.args.get("lat", type=float)
    lng = request.args.get("lng", type=float)
    limit = min(request.args.get("limit", default=5, type=int), 10)

    if not (lat and lng and GOOGLE_KEY):
        return jsonify({"error": "Missing lat/lng or GOOGLE_MAPS_API_KEY"}), 400

    cache_key = f"mosques_{round(lat,3)}_{round(lng,3)}_{limit}"
    cached = cache_get(cache_key)
    if cached:
        return jsonify(cached)

    # New Places API (v1) — Nearby Search
    url = "https://places.googleapis.com/v1/places:searchNearby"
    headers = {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": GOOGLE_KEY,
        "X-Goog-FieldMask": (
            "places.id,places.displayName,places.formattedAddress,"
            "places.location,places.rating,places.websiteUri,"
            "places.currentOpeningHours.openNow"
        )
    }
    body = {
        "includedTypes": ["mosque"],
        "maxResultCount": limit,
        "locationRestriction": {
            "circle": {
                "center": {"latitude": lat, "longitude": lng},
                "radius": 10000
            }
        },
        "rankPreference": "DISTANCE"
    }
    r = requests.post(url, json=body, headers=headers, timeout=15)
    data = r.json()

    results = data.get("places", [])
    if not results:
        return jsonify({"error": "No mosques found nearby"}), 404

    mosques = []
    for m in results:
        mlat = m["location"]["latitude"]
        mlng = m["location"]["longitude"]
        place_id = m.get("id", "")
        name = m.get("displayName", {}).get("text", "")
        dist_km = haversine_km(lat, lng, mlat, mlng)
        mosques.append({
            "name": name,
            "place_id": place_id,
            "address": m.get("formattedAddress", ""),
            "lat": mlat,
            "lng": mlng,
            "distance_km": round(dist_km, 2),
            "distance_m": round(dist_km * 1000),
            "rating": m.get("rating"),
            "open_now": m.get("currentOpeningHours", {}).get("openNow"),
            "website": m.get("websiteUri") or None,
            "maps_directions_url": f"https://www.google.com/maps/dir/?api=1&destination={mlat},{mlng}&destination_place_id={place_id}",
            "maps_place_url": f"https://www.google.com/maps/search/?api=1&query={quote_plus(name)}&query_place_id={place_id}"
        })

    payload = {"mosques": mosques, "count": len(mosques)}
    cache_set(cache_key, payload)
    return jsonify(payload)

@app.route("/api/halal_restaurants")
def halal_restaurants():
    lat   = request.args.get("lat", type=float)
    lng   = request.args.get("lng", type=float)
    limit = min(request.args.get("limit", default=5, type=int), 10)
    if not (lat and lng and GOOGLE_KEY):
        return jsonify({"error": "Missing lat/lng or GOOGLE_MAPS_API_KEY"}), 400
    cache_key = f"halal_{round(lat,3)}_{round(lng,3)}_{limit}"
    cached = cache_get(cache_key)
    if cached:
        return jsonify(cached)

    # New Places API (v1) — Text Search for halal restaurants
    url = "https://places.googleapis.com/v1/places:searchText"
    headers = {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": GOOGLE_KEY,
        "X-Goog-FieldMask": (
            "places.id,places.displayName,places.formattedAddress,"
            "places.location,places.rating,places.userRatingCount,"
            "places.priceLevel,places.websiteUri,"
            "places.currentOpeningHours.openNow"
        )
    }
    price_map = {
        "PRICE_LEVEL_FREE": 0,
        "PRICE_LEVEL_INEXPENSIVE": 1,
        "PRICE_LEVEL_MODERATE": 2,
        "PRICE_LEVEL_EXPENSIVE": 3,
        "PRICE_LEVEL_VERY_EXPENSIVE": 4
    }
    body = {
        "textQuery": "halal restaurant",
        "maxResultCount": limit,
        "locationBias": {
            "circle": {
                "center": {"latitude": lat, "longitude": lng},
                "radius": 5000
            }
        },
        "rankPreference": "DISTANCE"
    }
    r = requests.post(url, json=body, headers=headers, timeout=15)
    data = r.json()

    results = data.get("places", [])
    if not results:
        return jsonify({"error": "No halal restaurants found nearby"}), 404

    restaurants = []
    for m in results:
        mlat = m["location"]["latitude"]
        mlng = m["location"]["longitude"]
        place_id = m.get("id", "")
        name = m.get("displayName", {}).get("text", "")
        dist_km = haversine_km(lat, lng, mlat, mlng)
        restaurants.append({
            "name": name,
            "place_id": place_id,
            "address": m.get("formattedAddress", ""),
            "lat": mlat, "lng": mlng,
            "distance_km": round(dist_km, 2),
            "distance_m": round(dist_km * 1000),
            "rating": m.get("rating"),
            "user_ratings_total": m.get("userRatingCount"),
            "price_level": price_map.get(m.get("priceLevel", ""), None),
            "open_now": m.get("currentOpeningHours", {}).get("openNow"),
            "website": m.get("websiteUri") or None,
            "maps_directions_url": f"https://www.google.com/maps/dir/?api=1&destination={mlat},{mlng}&destination_place_id={place_id}",
            "maps_place_url": f"https://www.google.com/maps/search/?api=1&query={quote_plus(name)}&query_place_id={place_id}"
        })
    payload = {"restaurants": restaurants, "count": len(restaurants)}
    cache_set(cache_key, payload)
    return jsonify(payload)

@app.route("/api/halal_grocery")
def halal_grocery():
    lat   = request.args.get("lat", type=float)
    lng   = request.args.get("lng", type=float)
    limit = min(request.args.get("limit", default=5, type=int), 10)
    if not (lat and lng and GOOGLE_KEY):
        return jsonify({"error": "Missing lat/lng or GOOGLE_MAPS_API_KEY"}), 400
    cache_key = f"grocery_{round(lat,3)}_{round(lng,3)}_{limit}"
    cached = cache_get(cache_key)
    if cached:
        return jsonify(cached)

    url = "https://places.googleapis.com/v1/places:searchText"
    headers = {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": GOOGLE_KEY,
        "X-Goog-FieldMask": (
            "places.id,places.displayName,places.formattedAddress,"
            "places.location,places.rating,places.userRatingCount,"
            "places.websiteUri,places.currentOpeningHours.openNow"
        )
    }
    body = {
        "textQuery": "halal grocery store",
        "maxResultCount": limit,
        "locationBias": {
            "circle": {
                "center": {"latitude": lat, "longitude": lng},
                "radius": 10000
            }
        },
        "rankPreference": "DISTANCE"
    }
    r = requests.post(url, json=body, headers=headers, timeout=15)
    data = r.json()

    results = data.get("places", [])
    if not results:
        return jsonify({"error": "No halal grocery stores found nearby"}), 404

    stores = []
    for m in results:
        mlat = m["location"]["latitude"]
        mlng = m["location"]["longitude"]
        place_id = m.get("id", "")
        name = m.get("displayName", {}).get("text", "")
        dist_km = haversine_km(lat, lng, mlat, mlng)
        stores.append({
            "name": name,
            "place_id": place_id,
            "address": m.get("formattedAddress", ""),
            "lat": mlat, "lng": mlng,
            "distance_km": round(dist_km, 2),
            "distance_m": round(dist_km * 1000),
            "rating": m.get("rating"),
            "user_ratings_total": m.get("userRatingCount"),
            "open_now": m.get("currentOpeningHours", {}).get("openNow"),
            "website": m.get("websiteUri") or None,
            "maps_directions_url": f"https://www.google.com/maps/dir/?api=1&destination={mlat},{mlng}&destination_place_id={place_id}",
            "maps_place_url": f"https://www.google.com/maps/search/?api=1&query={quote_plus(name)}&query_place_id={place_id}"
        })
    payload = {"stores": stores, "count": len(stores)}
    cache_set(cache_key, payload)
    return jsonify(payload)

@app.route("/api/qibla")
def qibla():
    lat = request.args.get("lat", type=float)
    lng = request.args.get("lng", type=float)
    if not (lat and lng):
        return jsonify({"error": "Missing lat/lng"}), 400
    return jsonify({"bearing_deg": bearing_to_kaaba(lat, lng)})

@app.route("/api/prayer_times")
def prayer_times():
    lat = request.args.get("lat", type=float)
    lng = request.args.get("lng", type=float)
    method = request.args.get("method", default=2, type=int)
    school = request.args.get("school", default=0, type=int)

    if not (lat and lng):
        return jsonify({"error": "Missing lat/lng"}), 400

    # Validate enumerated parameters
    VALID_METHODS = {1,2,3,4,5,7,8,9,10,11,12,13,14,15,16,17,99}
    if method not in VALID_METHODS:
        method = 2
    if school not in (0, 1):
        school = 0

    cache_key = f"prayer_{round(lat,3)}_{round(lng,3)}_{method}_{school}"
    cached = cache_get(cache_key)
    if cached:
        return jsonify(cached)

    url = "https://api.aladhan.com/v1/timings"
    params = {"latitude": lat, "longitude": lng, "method": method, "school": school}
    r = requests.get(url, params=params, timeout=15)
    data = r.json()

    if data.get("code") != 200:
        return jsonify({"error": "Failed to fetch prayer times"}), 502

    timings = data["data"]["timings"]
    meta = data["data"]["meta"]
    date = data["data"]["date"]

    payload = {
        "timings": {
            "Fajr": timings.get("Fajr"),
            "Sunrise": timings.get("Sunrise"),
            "Dhuhr": timings.get("Dhuhr"),
            "Asr": timings.get("Asr"),
            "Maghrib": timings.get("Maghrib"),
            "Isha": timings.get("Isha")
        },
        "hijri": date.get("hijri"),
        "gregorian": date.get("gregorian"),
        "timezone": meta.get("timezone"),
        "method": meta.get("method")
    }
    cache_set(cache_key, payload)
    return jsonify(payload)

# Permanent in-memory cache for hadith collections (they never change)
_hadith_collections = {}

HADITH_EDITIONS = {
    "bukhari":  "eng-bukhari",
    "muslim":   "eng-muslim",
    "abudawud": "eng-abudawud",
    "tirmidhi": "eng-tirmidhi",
    "ibnmajah": "eng-ibnmajah",
    "nasai":    "eng-nasai",
}

def load_hadith_collection(collection):
    """Fetch full collection from GitHub raw on first use, cache forever."""
    if collection in _hadith_collections:
        return _hadith_collections[collection]
    edition = HADITH_EDITIONS[collection]
    url = f"https://raw.githubusercontent.com/fawazahmed0/hadith-api/1/editions/{edition}.min.json"
    r = requests.get(url, timeout=30)
    r.raise_for_status()
    data = r.json()
    # Build lookup dict: hadithnumber → hadith object
    lookup = {h["hadithnumber"]: h for h in data.get("hadiths", [])}
    # Also store section names for chapter lookup
    sections = data.get("metadata", {}).get("sections", {})
    _hadith_collections[collection] = {"hadiths": lookup, "sections": sections}
    return _hadith_collections[collection]

@app.route("/api/hadith/<collection>/list")
def hadith_list(collection):
    if collection not in HADITH_EDITIONS:
        return jsonify({"error": "Unknown collection"}), 400
    page     = request.args.get("page", default=1, type=int)
    per_page = min(request.args.get("per_page", default=30, type=int), 50)
    try:
        col = load_hadith_collection(collection)
    except Exception:
        return jsonify({"error": "Could not load collection"}), 503
    hadiths     = col["hadiths"]
    sections    = col["sections"]
    sorted_nums = sorted(hadiths.keys())
    total = len(sorted_nums)
    start = (page - 1) * per_page
    end   = start + per_page
    result = []
    for num in sorted_nums[start:end]:
        h       = hadiths[num]
        text    = h.get("text", "")
        snippet = (text[:120] + "…") if len(text) > 120 else text
        ref     = h.get("reference", {})
        chapter = sections.get(str(ref.get("book", "")), "")
        result.append({"number": num, "snippet": snippet, "chapter": chapter})
    return jsonify({"hadiths": result, "page": page, "total": total,
                    "loaded": min(end, total), "has_more": end < total})

@app.route("/api/hadith/<collection>/<int:num>")
def hadith(collection, num):
    if collection not in HADITH_EDITIONS:
        return jsonify({"error": "Unknown collection"}), 400
    try:
        col = load_hadith_collection(collection)
    except Exception:
        return jsonify({"error": "Could not load collection"}), 503
    h = col["hadiths"].get(num)
    if not h:
        return jsonify({"error": f"Hadith {num} not found in {collection}"}), 404
    # Resolve chapter name from section metadata
    ref = h.get("reference", {})
    book_num = str(ref.get("book", ""))
    chapter = col["sections"].get(book_num, "")
    # Flatten grades array to a single string
    grades = h.get("grades", [])
    grade_str = grades[0].get("grade", "") if grades else ""
    return jsonify({
        "number":  num,
        "text":    h.get("text", ""),
        "grade":   grade_str,
        "chapter": chapter,
        "reference": ref,
    })

@app.route("/api/hadith/<collection>/search")
def hadith_search(collection):
    if collection not in HADITH_EDITIONS:
        return jsonify({"error": "Unknown collection"}), 400
    q = request.args.get("q", "").strip()
    if not q:
        return jsonify({"error": "Missing search query"}), 400
    try:
        col = load_hadith_collection(collection)
    except Exception:
        return jsonify({"error": "Could not load collection"}), 503

    q_lower = q.lower()
    hadiths = col["hadiths"]
    sections = col["sections"]
    results = []
    for num in sorted(hadiths.keys()):
        h = hadiths[num]
        text = h.get("text", "")
        if q_lower in text.lower():
            snippet = (text[:150] + "…") if len(text) > 150 else text
            ref = h.get("reference", {})
            chapter = sections.get(str(ref.get("book", "")), "")
            results.append({"number": num, "snippet": snippet, "chapter": chapter})
            if len(results) >= 20:
                break

    return jsonify({"results": results, "total": len(results), "query": q})


@app.route("/api/report_issue", methods=["POST"])
def report_issue():
    data = request.get_json(silent=True) or {}
    issue_type = str(data.get("type", "General")).strip()[:100]
    description = str(data.get("description", "")).strip()[:2000]
    user_email = str(data.get("email", "")).strip()[:200]

    if not description:
        return jsonify({"error": "Description is required"}), 400

    gmail_user = "ummahmap.org@gmail.com"
    gmail_pass = os.getenv("GMAIL_APP_PASSWORD", "")

    if not gmail_pass:
        return jsonify({"error": "Email service not configured"}), 503

    body = f"Issue Type: {issue_type}\n"
    if user_email:
        body += f"From: {user_email}\n"
    body += f"\n{description}"

    msg = MIMEMultipart()
    msg["From"] = gmail_user
    msg["To"] = gmail_user
    msg["Subject"] = f"[UmmahMap Report] {issue_type}"
    msg.attach(MIMEText(body, "plain"))

    try:
        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
            server.login(gmail_user, gmail_pass)
            server.sendmail(gmail_user, gmail_user, msg.as_string())
    except Exception as e:
        return jsonify({"error": "Failed to send report"}), 500

    return jsonify({"success": True})


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 10000))
    app.run(host="0.0.0.0", port=port)
