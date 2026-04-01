# Soar Forecaster — Rebuild Specification

## What It Is
A client-side weather forecast app for paramotor/sailplane pilots. It shows hourly weather data across multiple altitude levels in large scrollable tables. Two weather models (GFS and ICON) are displayed in separate tables, one above the other.

## Tech
Single-page app. No framework required — use whatever you think is best. No backend. All data comes from free public APIs.

---

## Data Sources

### 1. Open-Meteo GFS
- `https://api.open-meteo.com/v1/gfs`
- Max 14 days forecast

### 2. Open-Meteo ICON (DWD)
- `https://api.open-meteo.com/v1/dwd-icon`
- Max 7 days forecast

### 3. Nominatim Geocoding (OpenStreetMap)
- `https://nominatim.openstreetmap.org/search?format=json&q={query}`
- For location search → returns lat/lon

## How API Calls Work

Both weather APIs use the same query structure:
```
{baseUrl}?latitude={lat}&longitude={lon}&hourly={params}&daily={dailyParams}&current_weather=true&temperature_unit=fahrenheit&wind_speed_unit=mph&precipitation_unit=inch&timezone=auto&forecast_days={days}
```

### Hourly parameters requested (both models unless noted):

**Wind data:**
- `wind_speed_10m`, `wind_speed_80m`, `wind_speed_180m`
- `wind_direction_10m`, `wind_direction_80m`, `wind_direction_180m`
- `wind_gusts_10m`
- Wind at pressure levels: `windspeed_{X}hPa` and `winddirection_{X}hPa` for X = 1000, 975, 950, 925, 900, 850, 800, 700, 600, 500, 400

**Temperature data:**
- `temperature_2m`, `temperature_80m`
- `temperature_{X}hPa` for X = 1000, 975, 950, 925, 900, 850, 800, 700, 600, 500, 400

**Cloud data:**
- `cloud_cover`, `cloud_cover_low`, `cloud_cover_mid`, `cloud_cover_high`
- `cloud_cover_{X}hPa` for X = 1000, 975, 950, 925, 900, 850, 800, 700, 600, 500, 400, 300, 250, 200, 150, 100, 70, 50, 30

**Other:**
- `weather_code`, `relative_humidity_2m`, `dew_point_2m`, `is_day`
- GFS only: `boundary_layer_height`, `visibility`, `lifted_index`, `cape`, `precipitation_probability`
- ICON only: `precipitation`
- ICON also requests: `temperature_180m`

### Daily parameters:
`weather_code`, `sunrise`, `sunset`, `uv_index_max`, `precipitation_sum`

### Fallback logic:
Some parameters (GFS: 10m winds; ICON: 180m winds) may not be available. Try the full parameter list first. If the API errors, retry without those params and fill them with null arrays.

### Caching:
Cache responses in localStorage for 15 minutes per model/location combo.

---

## The Table — Core Layout

This is the heart of the app. Each model gets its own table. The table is a giant grid:

### Columns = Hours
Each column is one hour of the forecast. The header shows:
- Date (M/D)
- Day of week (2 letters)
- Hour (12-hour format with AM/PM)

Mark columns as "daylight" or "nighttime" using the `is_day` array from the API (extend it by 1 hour on each side of sunrise/sunset). Add visual separation between day boundaries (thick vertical borders where the date changes).

### Rows = Altitudes
Each row is an altitude level, ordered highest to lowest. The row header shows altitude in feet. Altitudes come from two sources:

Surface meters (converted to feet): 10m=33ft, 80m=262ft, 180m=591ft

Pressure levels converted to feet using this table:
```
1000hPa → 361ft     975hPa → 1050ft    950hPa → 1640ft
925hPa  → 2625ft    900hPa → 3281ft    850hPa → 4921ft
800hPa  → 6234ft    700hPa → 9843ft    600hPa → 13780ft
500hPa  → 18373ft   400hPa → 23622ft   300hPa → 30184ft
250hPa  → 34121ft   200hPa → 38714ft   150hPa → 44948ft
100hPa  → 53150ft
```

The first column (altitude labels) should be sticky (stays visible while scrolling horizontally). The header row should also be sticky vertically.

---

## Three Table Views (User Toggles Between Them)

### 1. Wind Speed (default view)

Each cell shows:
- Wind speed in mph (rounded integer)
- A directional arrow showing where wind is blowing TO (rotate 180° from the meteorological direction value)
- Color-coded background: blue (calm) → green (moderate) → red (strong), with user-configurable thresholds (defaults: blue ≤7, green ≤15, red ≥20 mph)
- Null values show "?"

Below the altitude rows, show optional additional data rows (each toggleable via checkbox):
- **Gusts** — wind_gusts_10m, same color scheme
- **CAPE** (GFS only) — convective energy, color from white→lightblue→green→yellow→red
- **Lifted Index** (GFS only) — stability metric, blue (stable, ≥6) → red (unstable, ≤0)
- **Precip %** (GFS only) — 0-100%, white→dark blue gradient
- **Precip inches** (ICON only) — white→blue gradient
- **Temp °F** — surface temperature with temp color scheme
- **Relative Humidity** — percentage
- **Dewpoint Spread** — computed as temperature_2m minus dew_point_2m
- **Visibility in miles** (GFS only) — API returns meters, multiply by 0.000621371
- **Cloud Cover %** — grey opacity background (darker = cloudier)

### 2. Temperature View

Each cell shows temperature in °F at that altitude. Color: white (≤32) → blue (32-55) → green (55-72) → red (72-90) → dark red (90+).

### 3. Clouds + Thermals View

Each cell shows cloud cover % at that pressure level. Background is black with opacity proportional to cloud cover (0% = white, 100% = 75% black).

Additional rows:
- **Thermals (ft)** (GFS only) — boundary_layer_height, only show values during ~10am-5pm
- **High/Mid/Low Clouds** summary rows

---

## Features to Include

1. **Location search** with autocomplete from Nominatim (debounce ~500ms)
2. **Saved locations** — save up to 10 locations, persist in cookies/localStorage. Click to load weather.
3. **Display All Saved Locations** — show a GFS table for every saved location stacked vertically
4. **Daylight filter** — toggle to show only daylight hours or all 24 hours
5. **High altitude toggle** — show/hide rows above 5000ft
6. **Wind shear detection** — when enabled, highlight adjacent-altitude cells where: speed diff >10mph OR (speed diff >5mph AND direction diff >90°)
7. **Fog mode** — when enabled, highlight cells where humidity >90%, dewpoint spread <3°F, or visibility <20mi with a red border
8. **Best Hours filter** — hide time columns where wind at the lowest 3 altitude rows (33ft, 262ft, 361ft) exceeds a threshold (default 15mph)
9. **Configurable wind color thresholds** — user sets the mph breakpoints for blue/green/red
10. **Configurable forecast length** — sliders for GFS (1-14 days) and ICON (1-7 days)
11. **Reset to defaults** — clears all saved preferences and reloads

## Persistence
Save user preferences (thresholds, checkbox states, saved locations, last location, forecast lengths, toggle states) in cookies or localStorage so they survive page reloads. Restore them on page load and auto-fetch weather if a previous location exists.

---

Make your own decisions on styling, layout, component structure, and UX improvements. The critical thing is the table visualization with the correct data at the correct altitudes, the color coding, and the three views.
