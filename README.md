# UmmahMap 🕌

Simple Mosque Finder web app (Flask).

## Features
- Nearest Mosque via Google Places (type=mosque)
- Directions link (Google Maps)
- Prayer times by GPS (AlAdhan API, calculated adhan times)
- Qibla bearing + indicator
- Hijri date (browser Intl Islamic calendar)
- Rotating motivational quote (every 5 minutes)

## Local Run
1) Create `.env`:
   GOOGLE_MAPS_API_KEY=YOUR_KEY

2) Install + run:
   python -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   python app.py

Open http://127.0.0.1:5000

### Run on a different port
PORT=5050 python app.py

## Nice UI
- GPS prayer times are rendered as user-friendly cards (not raw JSON).
