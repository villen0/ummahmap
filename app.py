import os
import math
import requests
from bs4 import BeautifulSoup
from flask import Flask, render_template, request, jsonify
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
GOOGLE_KEY = os.getenv("GOOGLE_MAPS_API_KEY")

KAABA_LAT = 21.422487
KAABA_LNG = 39.826206

def bearing_to_kaaba(lat, lng):
    phi1 = math.radians(lat)
    phi2 = math.radians(KAABA_LAT)
    d_lambda = math.radians(KAABA_LNG - lng)

    y = math.sin(d_lambda) * math.cos(phi2)
    x = math.cos(phi1) * math.sin(phi2) - math.sin(phi1) * math.cos(phi2) * math.cos(d_lambda)
    brng = (math.degrees(math.atan2(y, x)) + 360) % 360
    return brng

@app.route("/")
def home():
    return render_template("index.html", app_name="UmmahMap")

@app.route("/api/nearest_mosque")
def nearest_mosque():
    lat = request.args.get("lat", type=float)
    lng = request.args.get("lng", type=float)
    if not (lat and lng and GOOGLE_KEY):
        return jsonify({"error": "Missing lat/lng or GOOGLE_MAPS_API_KEY"}), 400

    url = "https://maps.googleapis.com/maps/api/place/nearbysearch/json"
    params = {
        "key": GOOGLE_KEY,
        "location": f"{lat},{lng}",
        "rankby": "distance",
        "type": "mosque"
    }
    r = requests.get(url, params=params, timeout=15)
    data = r.json()

    results = data.get("results", [])
    if not results:
        return jsonify({"error": "No mosques found nearby"}), 404

    m = results[0]
    mosque = {
        "name": m.get("name"),
        "place_id": m.get("place_id"),
        "address": m.get("vicinity") or m.get("formatted_address", ""),
        "lat": m["geometry"]["location"]["lat"],
        "lng": m["geometry"]["location"]["lng"],
        "maps_directions_url": f"https://www.google.com/maps/dir/?api=1&destination={m['geometry']['location']['lat']},{m['geometry']['location']['lng']}"
    }
    return jsonify(mosque)

@app.route("/api/qibla")
def qibla():
    lat = request.args.get("lat", type=float)
    lng = request.args.get("lng", type=float)
    if not (lat and lng):
        return jsonify({"error": "Missing lat/lng"}), 400
    return jsonify({"bearing_deg": bearing_to_kaaba(lat, lng)})

@app.route("/api/prayer_times")
def prayer_times():
    """
    Location-based prayer times from AlAdhan (calculated adhan times).
    Note: Masjid iqama times can differ.
    Query:
      /api/prayer_times?lat=..&lng=..&method=2&school=0
    """
    lat = request.args.get("lat", type=float)
    lng = request.args.get("lng", type=float)
    method = request.args.get("method", default=2, type=int)  # 2 = ISNA
    school = request.args.get("school", default=0, type=int)  # 0 = Shafi, 1 = Hanafi

    if not (lat and lng):
        return jsonify({"error": "Missing lat/lng"}), 400

    url = "https://api.aladhan.com/v1/timings"
    params = {
        "latitude": lat,
        "longitude": lng,
        "method": method,
        "school": school
    }

    r = requests.get(url, params=params, timeout=15)
    data = r.json()

    if data.get("code") != 200:
        return jsonify({"error": "Failed to fetch prayer times", "raw": data}), 502

    timings = data["data"]["timings"]
    meta = data["data"]["meta"]
    date = data["data"]["date"]

    return jsonify({
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
    })

if __name__ == "__main__":
    port = int(os.getenv("PORT", "5000"))
    app.run(host="0.0.0.0", port=port, debug=True)