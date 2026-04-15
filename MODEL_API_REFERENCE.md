# Weather Model API Reference

All models use Open-Meteo. Common query parameters for all calls:
```
timezone=auto
wind_speed_unit=mph
temperature_unit=fahrenheit
precipitation_unit=inch
current_weather=true
```

Daily params (all models):
```
daily=weather_code,sunrise,sunset,uv_index_max,precipitation_sum
```

---

## 1. GFS (current app model)

- **Base URL:** `https://api.open-meteo.com/v1/gfs`
- **No `models=` param needed** (dedicated endpoint)
- **Max forecast_days:** 14
- **Coverage:** Global

### Hourly params:
```
wind_speed_10m,wind_speed_80m,wind_speed_180m,
wind_direction_10m,wind_direction_80m,wind_direction_180m,
wind_gusts_10m,
windspeed_1000hPa,winddirection_1000hPa,
windspeed_975hPa,winddirection_975hPa,
windspeed_950hPa,winddirection_950hPa,
windspeed_925hPa,winddirection_925hPa,
windspeed_900hPa,winddirection_900hPa,
windspeed_850hPa,winddirection_850hPa,
windspeed_800hPa,winddirection_800hPa,
windspeed_700hPa,winddirection_700hPa,
windspeed_600hPa,winddirection_600hPa,
windspeed_500hPa,winddirection_500hPa,
windspeed_400hPa,winddirection_400hPa,
temperature_2m,temperature_80m,
temperature_1000hPa,temperature_975hPa,temperature_950hPa,
temperature_925hPa,temperature_900hPa,temperature_850hPa,
temperature_800hPa,temperature_700hPa,temperature_600hPa,
temperature_500hPa,temperature_400hPa,
cloud_cover,cloud_cover_low,cloud_cover_mid,cloud_cover_high,
cloud_cover_1000hPa,cloud_cover_975hPa,cloud_cover_950hPa,
cloud_cover_925hPa,cloud_cover_900hPa,cloud_cover_850hPa,
cloud_cover_800hPa,cloud_cover_700hPa,cloud_cover_600hPa,
cloud_cover_500hPa,cloud_cover_400hPa,cloud_cover_300hPa,
cloud_cover_250hPa,cloud_cover_200hPa,cloud_cover_150hPa,
cloud_cover_100hPa,cloud_cover_70hPa,cloud_cover_50hPa,
cloud_cover_30hPa,
weather_code,relative_humidity_2m,dew_point_2m,is_day,
boundary_layer_height,visibility,lifted_index,cape,
precipitation_probability
```

### Notes:
- 180m wind/direction requested but may fail (fallback removes them)
- No temperature_180m
- Uses `windspeed_XhPa` / `winddirection_XhPa` naming (no underscore)
- Pressure levels for wind/temp: 1000,975,950,925,900,850,800,700,600,500,400
- Cloud pressure levels: 1000,975,950,925,900,850,800,700,600,500,400,300,250,200,150,100,70,50,30

---

## 2. ICON (current app model)

- **Base URL:** `https://api.open-meteo.com/v1/dwd-icon`
- **No `models=` param needed** (dedicated endpoint)
- **Max forecast_days:** 7
- **Coverage:** Global

### Hourly params:
```
wind_speed_10m,wind_speed_80m,wind_speed_180m,
wind_direction_10m,wind_direction_80m,wind_direction_180m,
wind_gusts_10m,
windspeed_1000hPa,winddirection_1000hPa,
windspeed_975hPa,winddirection_975hPa,
windspeed_950hPa,winddirection_950hPa,
windspeed_925hPa,winddirection_925hPa,
windspeed_900hPa,winddirection_900hPa,
windspeed_850hPa,winddirection_850hPa,
windspeed_800hPa,winddirection_800hPa,
windspeed_700hPa,winddirection_700hPa,
windspeed_600hPa,winddirection_600hPa,
windspeed_500hPa,winddirection_500hPa,
windspeed_400hPa,winddirection_400hPa,
temperature_2m,temperature_80m,temperature_180m,
temperature_1000hPa,temperature_975hPa,temperature_950hPa,
temperature_925hPa,temperature_900hPa,temperature_850hPa,
temperature_800hPa,temperature_700hPa,temperature_600hPa,
temperature_500hPa,temperature_400hPa,
cloud_cover,cloud_cover_low,cloud_cover_mid,cloud_cover_high,
cloud_cover_1000hPa,cloud_cover_975hPa,cloud_cover_950hPa,
cloud_cover_925hPa,cloud_cover_900hPa,cloud_cover_850hPa,
cloud_cover_800hPa,cloud_cover_700hPa,cloud_cover_600hPa,
cloud_cover_500hPa,cloud_cover_400hPa,cloud_cover_300hPa,
cloud_cover_250hPa,cloud_cover_200hPa,cloud_cover_150hPa,
cloud_cover_100hPa,cloud_cover_70hPa,cloud_cover_50hPa,
cloud_cover_30hPa,
weather_code,relative_humidity_2m,dew_point_2m,is_day,
precipitation
```

### Notes:
- Has 180m wind + temperature (unique to ICON)
- 180m params are optional/fallback (may fail)
- Uses `windspeed_XhPa` / `winddirection_XhPa` naming (no underscore)
- Pressure levels same as GFS
- No visibility, boundary_layer_height, lifted_index, precipitation_probability

---

## 3. ECMWF (`ecmwf_ifs`)

- **Base URL:** `https://api.open-meteo.com/v1/forecast`
- **models=** `ecmwf_ifs`
- **Max forecast_days:** 15
- **Coverage:** Global

### Hourly params (only fields that return data):
```
wind_speed_10m,wind_speed_100m,wind_speed_200m,
wind_direction_10m,wind_direction_100m,wind_direction_200m,
wind_gusts_10m,
temperature_2m,dew_point_2m,
precipitation,rain,
weather_code,
cloud_cover,cloud_cover_low,cloud_cover_mid,cloud_cover_high,
cape,is_day
```

### Notes:
- Surface-only model: NO pressure level data at all (all hPa fields return null)
- Uses 100m and 200m surface levels instead of 80m/180m
- No relative_humidity_2m, no visibility, no precipitation_probability
- No boundary_layer_height, no lifted_index
- Has precipitation (inches) but not precipitation_probability
- Only 3 altitude rows possible: 10m (33ft), 100m (328ft), 200m (656ft)

---

## 4. HRRR CONUS (`gfs_hrrr`)

- **Base URL:** `https://api.open-meteo.com/v1/forecast`
- **models=** `gfs_hrrr`
- **Max forecast_days:** 3
- **Coverage:** US (CONUS) only

### Hourly params (only fields that return data):
```
wind_speed_10m,wind_speed_80m,
wind_direction_10m,wind_direction_80m,
wind_gusts_10m,
wind_speed_1000hPa,wind_direction_1000hPa,
wind_speed_975hPa,wind_direction_975hPa,
wind_speed_950hPa,wind_direction_950hPa,
wind_speed_925hPa,wind_direction_925hPa,
wind_speed_900hPa,wind_direction_900hPa,
wind_speed_875hPa,wind_direction_875hPa,
wind_speed_850hPa,wind_direction_850hPa,
wind_speed_825hPa,wind_direction_825hPa,
wind_speed_800hPa,wind_direction_800hPa,
wind_speed_775hPa,wind_direction_775hPa,
wind_speed_750hPa,wind_direction_750hPa,
wind_speed_725hPa,wind_direction_725hPa,
wind_speed_700hPa,wind_direction_700hPa,
temperature_2m,
temperature_1000hPa,temperature_975hPa,temperature_950hPa,
temperature_925hPa,temperature_900hPa,temperature_875hPa,
temperature_850hPa,temperature_825hPa,temperature_800hPa,
temperature_775hPa,temperature_750hPa,temperature_725hPa,
temperature_700hPa,
cloud_cover,cloud_cover_low,cloud_cover_mid,cloud_cover_high,
cloud_cover_1000hPa,cloud_cover_975hPa,cloud_cover_950hPa,
cloud_cover_925hPa,cloud_cover_900hPa,cloud_cover_875hPa,
cloud_cover_850hPa,cloud_cover_825hPa,cloud_cover_800hPa,
cloud_cover_775hPa,cloud_cover_750hPa,cloud_cover_725hPa,
cloud_cover_700hPa,
relative_humidity_2m,dew_point_2m,is_day,
precipitation_probability,rain,showers,
visibility,cape
```

### Notes:
- Uses `wind_speed_XhPa` / `wind_direction_XhPa` naming (WITH underscore, unlike GFS/ICON endpoints)
- Extra pressure levels not in current app: 875, 825, 775, 750, 725
- Missing: temperature_80m (null), uv_index (null)
- No 180m data, no boundary_layer_height, no lifted_index
- Only 3-day forecast range
- High resolution (3km grid), best for short-range detail
- Pressure levels: 1000,975,950,925,900,875,850,825,800,775,750,725,700 (13 levels, max 700hPa)

---

## 5. GFS Seamless (`gfs_seamless`)

- **Base URL:** `https://api.open-meteo.com/v1/forecast`
- **models=** `gfs_seamless`
- **Max forecast_days:** 14
- **Coverage:** Global

### Hourly params (all fields return data):
```
wind_speed_10m,wind_speed_80m,
wind_direction_10m,wind_direction_80m,
wind_gusts_10m,
wind_speed_1000hPa,wind_direction_1000hPa,
wind_speed_975hPa,wind_direction_975hPa,
wind_speed_950hPa,wind_direction_950hPa,
wind_speed_925hPa,wind_direction_925hPa,
wind_speed_900hPa,wind_direction_900hPa,
wind_speed_875hPa,wind_direction_875hPa,
wind_speed_850hPa,wind_direction_850hPa,
wind_speed_825hPa,wind_direction_825hPa,
wind_speed_800hPa,wind_direction_800hPa,
wind_speed_775hPa,wind_direction_775hPa,
wind_speed_750hPa,wind_direction_750hPa,
wind_speed_725hPa,wind_direction_725hPa,
wind_speed_700hPa,wind_direction_700hPa,
temperature_2m,temperature_80m,
temperature_1000hPa,temperature_975hPa,temperature_950hPa,
temperature_925hPa,temperature_900hPa,temperature_875hPa,
temperature_850hPa,temperature_825hPa,temperature_800hPa,
temperature_775hPa,temperature_750hPa,temperature_725hPa,
temperature_700hPa,
cloud_cover,cloud_cover_low,cloud_cover_mid,cloud_cover_high,
cloud_cover_1000hPa,cloud_cover_975hPa,cloud_cover_950hPa,
cloud_cover_925hPa,cloud_cover_900hPa,cloud_cover_875hPa,
cloud_cover_850hPa,cloud_cover_825hPa,cloud_cover_800hPa,
cloud_cover_775hPa,cloud_cover_750hPa,cloud_cover_725hPa,
cloud_cover_700hPa,
relative_humidity_2m,dew_point_2m,is_day,
precipitation_probability,rain,showers,
visibility,cape,uv_index
```

### Notes:
- Uses `wind_speed_XhPa` / `wind_direction_XhPa` naming (WITH underscore)
- Most complete model: all 74 fields return real data
- Extra pressure levels not in current app: 875, 825, 775, 750, 725
- Has temperature_80m (unlike HRRR)
- No 180m data, no boundary_layer_height, no lifted_index
- Pressure levels: 1000,975,950,925,900,875,850,825,800,775,750,725,700 (13 levels, max 700hPa)

---

## 6. NBM CONUS (`ncep_nbm_conus`)

- **Base URL:** `https://api.open-meteo.com/v1/forecast`
- **models=** `ncep_nbm_conus`
- **Max forecast_days:** 14
- **Coverage:** US (CONUS) only

### Hourly params (only fields that return data):
```
wind_speed_10m,wind_speed_80m,
wind_direction_10m,wind_direction_80m,
wind_gusts_10m,
temperature_2m,
relative_humidity_2m,dew_point_2m,is_day,
precipitation_probability,rain,showers,
cloud_cover,
visibility,cape
```

### Notes:
- Surface-only model: NO pressure level data (all hPa fields return null)
- No cloud layers (low/mid/high all null), only total cloud_cover
- No temperature_80m, no uv_index
- Only 2 altitude rows possible: 10m (33ft), 80m (262ft)
- Good supplementary surface data (visibility, precip probability, cape)

---

## 7. NAM CONUS (`ncep_nam_conus`)

- **Base URL:** `https://api.open-meteo.com/v1/forecast`
- **models=** `ncep_nam_conus`
- **Max forecast_days:** 4 (API accepts higher but data only goes ~3.5 days)
- **Coverage:** US (CONUS) only

### Hourly params (only fields that return data):
```
wind_speed_10m,wind_speed_80m,
wind_direction_10m,wind_direction_80m,
wind_gusts_10m,
temperature_2m,
relative_humidity_2m,dew_point_2m,is_day,
rain,showers,
cloud_cover,cloud_cover_low,cloud_cover_mid,cloud_cover_high,
visibility,cape
```

### Notes:
- Surface-only model: NO pressure level data (all hPa fields return null)
- Has cloud layers (low/mid/high) unlike NBM
- No precipitation_probability (null), no temperature_80m, no uv_index
- Only 2 altitude rows possible: 10m (33ft), 80m (262ft)
- Short effective range (~3.5 days despite accepting higher forecast_days)

---

## Key Differences: Parameter Naming

| Endpoint | Wind pressure param format | Example |
|----------|---------------------------|---------|
| `/v1/gfs` | `windspeed_XhPa` (no underscore) | `windspeed_850hPa` |
| `/v1/dwd-icon` | `windspeed_XhPa` (no underscore) | `windspeed_850hPa` |
| `/v1/forecast?models=...` | `wind_speed_XhPa` (WITH underscore) | `wind_speed_850hPa` |

This naming difference affects: HRRR, GFS Seamless, NBM, NAM, and ECMWF.

## Pressure Level Availability Summary

| Level | GFS | ICON | ECMWF | HRRR | GFS Seamless | NBM | NAM |
|-------|-----|------|-------|------|-------------|-----|-----|
| 400hPa (23622ft) | Yes | Yes | - | - | - | - | - |
| 500hPa (18373ft) | Yes | Yes | - | - | - | - | - |
| 600hPa (13780ft) | Yes | Yes | - | - | - | - | - |
| 700hPa (9843ft) | Yes | Yes | - | Yes | Yes | - | - |
| 725hPa | - | - | - | Yes | Yes | - | - |
| 750hPa | - | - | - | Yes | Yes | - | - |
| 775hPa | - | - | - | Yes | Yes | - | - |
| 800hPa (6234ft) | Yes | Yes | - | Yes | Yes | - | - |
| 825hPa | - | - | - | Yes | Yes | - | - |
| 850hPa (4921ft) | Yes | Yes | - | Yes | Yes | - | - |
| 875hPa | - | - | - | Yes | Yes | - | - |
| 900hPa (3281ft) | Yes | Yes | - | Yes | Yes | - | - |
| 925hPa (2625ft) | Yes | Yes | - | Yes | Yes | - | - |
| 950hPa (1640ft) | Yes | Yes | - | Yes | Yes | - | - |
| 975hPa (1050ft) | Yes | Yes | - | Yes | Yes | - | - |
| 1000hPa (361ft) | Yes | Yes | - | Yes | Yes | - | - |

## Supplementary Data Availability

| Field | GFS | ICON | ECMWF | HRRR | GFS Seamless | NBM | NAM |
|-------|-----|------|-------|------|-------------|-----|-----|
| Gusts | Yes | Yes | Yes | Yes | Yes | Yes | Yes |
| CAPE | Yes | - | Yes | Yes | Yes | Yes | Yes |
| Lifted Index | Yes | - | - | - | - | - | - |
| Precip Probability | Yes | - | - | Yes | Yes | Yes | - |
| Precip (inches) | - | Yes | Yes | Yes* | Yes* | Yes* | Yes* |
| Visibility | Yes | - | - | Yes | Yes | Yes | Yes |
| Humidity | Yes | Yes | - | Yes | Yes | Yes | Yes |
| Dew Point | Yes | Yes | Yes | Yes | Yes | Yes | Yes |
| Boundary Layer | Yes | - | - | - | - | - | - |
| Cloud Low/Mid/High | Yes | Yes | Yes | Yes | Yes | - | Yes |
| Temperature 80m | - | Yes | - | - | Yes | - | - |

*HRRR/GFS Seamless/NBM/NAM return `rain` and `showers` separately rather than a single `precipitation` field.
