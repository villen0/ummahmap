# UmmahMap 🕌

A Muslim utility web app — mosque finder, prayer times, Qibla compass, and Hijri date.

## Features
- 📍 **Nearby Mosques** — list of up to 10 nearest mosques with distance, open/closed status, ratings, and Google Maps directions
- 🌙 **Prayer Times** — GPS-based adhan times (AlAdhan API) with live countdown to next prayer
- 🧭 **Qibla Compass** — bearing to Mecca, with live device orientation on mobile
- 📅 **Hijri Date** — shown in the header on load
- 💬 **Rotating Quotes** — Qur'an & Hadith quotes cycling every 5 minutes
- ⚙️ **Settings** — prayer calculation method, Asr juristic school, number of mosques to show (saved in localStorage)
- ⚡ **Caching** — 5-minute server-side cache on external API calls

## Local Setup

1. Create `.env` in the project root:
   ```
   GOOGLE_MAPS_API_KEY=YOUR_KEY_HERE
   ```

2. Install dependencies and run:
   ```bash
   python -m venv venv
   source venv/bin/activate        # Windows: venv\Scripts\activate
   pip install -r requirements.txt
   python app.py
   ```

3. Open http://127.0.0.1:10000

### Run on a different port
```bash
PORT=5050 python app.py
```

## APIs Used
- **Google Places API** — nearby mosque search
- **AlAdhan API** — calculated prayer times (free, no key needed)

## Deployment
The app uses Gunicorn and is ready to deploy on Render, Railway, or any platform supporting Python web apps.
Set `GOOGLE_MAPS_API_KEY` as an environment variable on your platform.

## Stack
- Backend: Python / Flask
- Frontend: Vanilla JS, HTML, CSS (no frameworks)
- Fonts: Amiri (Arabic serif) + DM Sans
