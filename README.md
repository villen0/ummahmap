# UmmahMap 🕌

A Muslim utility web app — mosque finder, prayer times, Qibla compass, Quran reader, Hadith browser, Tasbih counter, and more.

Installable as a PWA (Progressive Web App) with a mosque icon on iOS and Android home screens.

## Features

### 🕌 Masjid (Discover tab)
- Nearest mosques with distance, open/closed status, ratings, and Google Maps directions
- Configurable results (1–10) in Settings

### 🍽 Halal Restaurants (Discover tab)
- Nearby halal restaurants with ratings, open/closed status, and directions
- Configurable results (1–10) in Settings

### 🛒 Halal Grocery (Discover tab)
- Nearby halal grocery stores with ratings, open/closed status, and directions
- Configurable results (1–10) in Settings

### 🌙 Prayer Times (Prayer tab)
- GPS-based adhan times via AlAdhan API
- Live countdown to next prayer
- Hijri date shown in the header
- Supports multiple calculation methods and Asr juristic schools

### 🧭 Qibla Compass (Prayer tab)
- Calculates bearing to Mecca from current location
- Live rotating compass using device orientation (iOS requires tapping "Enable Live Compass")

### 📖 Quran Reader (Quran tab)
- Browse all 114 surahs
- Arabic text with optional English phonetic (transliteration)
- Translation dropdown: English, বাংলা (Bengali), اردو (Urdu), or Off
- Loads ayahs in batches with "Load more" pagination

### 📜 Hadith (Hadith tab)
- Browse Hadith collections (Bukhari, Muslim, etc.)
- Navigate by book and hadith number

### 📿 Tasbih Counter (Tasbih tab)
- Digital tasbih with goals: 33, 99, 100
- Hard-stops at goal — count cannot exceed target
- Reset button, progress ring animation
- Vibration feedback on each tap and on completion (Android/Chrome)

### ⚙️ Settings
- Prayer calculation method
- Asr juristic school (Shafi / Hanafi)
- Number of mosques / halal restaurants / halal grocery stores to show
- Saved in localStorage

### ⚡ Performance
- 5-minute server-side cache on all external API calls
- Rotating Qur'an & Hadith quotes in the header (cycles every 5 minutes)

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
- **Google Places API (v1)** — mosque, halal restaurant, and halal grocery search
- **AlAdhan API** — calculated prayer times (free, no key needed)
- **AlQuran Cloud API** — Quran Arabic text, transliteration, and translations

## Deployment
The app uses Gunicorn and is ready to deploy on Render, Railway, or any platform supporting Python web apps.
Set `GOOGLE_MAPS_API_KEY` as an environment variable on your platform.

## Stack
- Backend: Python / Flask
- Frontend: Vanilla JS, HTML, CSS (no frameworks)
- Fonts: Amiri (Arabic serif) + DM Sans
- PWA: `manifest.json` with mosque SVG icon, installable on iOS & Android
