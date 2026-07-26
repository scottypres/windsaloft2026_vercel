# Open-Meteo model findings — Session 0

**Produced:** 2026-07-26 (probes run ~17:05–17:25 UTC)
**Method:** every claim below was verified against a live Open-Meteo response. Documentation
was read first (`/en/docs`, `/en/docs/dwd-api`, `/en/docs/meteoswiss-api`,
`/en/docs/geosphere-austria-api`, `/en/docs/ecmwf-api`, `/en/pricing`) and is cited where it
agrees; where docs and live responses disagreed, the live response is reported and the
disagreement is called out.
**Test coordinates:** Innsbruck `47.27, 11.40` (elev 577 m), Interlaken `46.69, 7.86` (elev 580 m).
Domain checks also used Chamonix `45.92, 6.87`, Munich `48.14, 11.58`, Loxahatchee `26.68, -80.27`.

---

## 0. Headline findings (read this first)

1. **The `windParamPrefix` / `windDirParamPrefix` branching in `models.js` is unnecessary.**
   Both `wind_speed_850hPa` and `windspeed_850hPa` work on **every** model and on **both**
   `/v1/forecast` and `/v1/dwd-icon`. They are aliases; the values are byte-identical. There
   is no silent-null risk from naming. Use the underscore style everywhere. (§2, question in
   brief item 2.)

2. **No pressure level ever causes a 400.** Open-Meteo accepts any `*_<n>hPa` parameter it
   knows about and returns an all-null array when the model has no data for it. The whole
   29-level probe set was requested from every model in a single call with zero errors. The
   `optionalParamsFor()` fallback path in `weather.js` therefore never fires for pressure
   levels — it is dead weight, not a safety net.

3. **MeteoSwiss CH1/CH2 return a single deterministic series from `/v1/forecast`.** No
   `_memberNN` fields. They are ordinary cheap models. Ensemble members exist only on
   `ensemble-api.open-meteo.com`. → **No lazy-fetch gating needed.** (Question A.)

4. **Neither MeteoSwiss model nor AROME Austria has any winds aloft.** Zero pressure levels,
   and no 80/100/120/180/200 m surface levels either — **10 m only**. (Question B.)

5. **`cloud_base` is a MeteoSwiss-only variable.** Of every model tested it is non-null only
   on `meteoswiss_icon_*` (and, incidentally, `dmi_harmonie_arome_europe`). ICON, ECMWF, GFS,
   AROME Austria, Météo-France AROME, KNMI Harmonie, ARPAE ICON-2I and MET Norway all return
   the field present-but-all-null. **Session 5's red-border filter will only ever draw on the
   three MeteoSwiss rows.**

6. **`cloud_base` is never null on MeteoSwiss — "no cloud" is encoded as `20900` m**, not as
   `null`. Session 5's brief assumes `null` means no cloud; that assumption is wrong for the
   only models that have the variable. (§8.)

7. **A separate ICON-D2 row is 100 % redundant.** At Innsbruck, `models=icon_d2` and
   `models=icon_seamless` (and the bare `/v1/dwd-icon` endpoint) are **bit-identical for all
   48 h** on `temperature_2m`, `wind_speed_850hPa` and `temperature_850hPa` — mean absolute
   difference exactly `0.000`. (Questions C and D.)

8. **`ecmwf_ifs` is already the native 9 km IFS HRES** — label change only, no new model. But
   it has **no pressure levels**. The bare `/v1/ecmwf` endpoint is *not* HRES; it is IFS 0.25.
   (Question E.)

9. **New failure mode not in the brief's list of three.** `geosphere_arome_austria` outside
   its domain returns **HTTP 200 with a body containing bare `nan` literals** — invalid JSON,
   so `response.json()` throws. `fetchModel()` will fall into its catch block, retry the
   reduced URL, and throw again from an unguarded `resp.json()`. Guard for it. (§9.)

---

## 1. Summary table — pressure-level support

Requested at Innsbruck (MeteoSwiss at Interlaken), `forecast_days=1`, all 29 levels the app
uses, in one call per model. `Y` = real values for all 24 hours. `·` = field present, all null.
**No cell in this table was a 400.**

| hPa  | mswiss_seamless | mswiss_ch1 | mswiss_ch2 | icon_seamless | icon_d2 | icon_eu | icon_global | arome_austria | ecmwf_ifs | ecmwf_ifs025 | gfs_seamless |
|------|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|
| 1000 | · | · | · | Y | Y | Y | Y | · | · | Y | Y |
| 975  | · | · | · | Y | Y | Y | Y | · | · | · | Y |
| 950  | · | · | · | Y | Y | Y | Y | · | · | · | Y |
| 925  | · | · | · | Y | Y | Y | Y | · | · | Y | Y |
| 900  | · | · | · | Y | Y | Y | Y | · | · | · | Y |
| 875  | · | · | · | · | · | · | · | · | · | · | Y |
| 850  | · | · | · | Y | Y | Y | Y | · | · | Y | Y |
| 825  | · | · | · | · | · | · | · | · | · | · | Y |
| 800  | · | · | · | Y | Y | Y | Y | · | · | · | Y |
| 775  | · | · | · | · | · | · | · | · | · | · | Y |
| 750  | · | · | · | · | · | · | · | · | · | · | Y |
| 725  | · | · | · | · | · | · | · | · | · | · | Y |
| 700  | · | · | · | Y | Y | Y | Y | · | · | Y | Y |
| 675  | · | · | · | · | · | · | · | · | · | · | Y |
| 650  | · | · | · | · | · | · | · | · | · | · | Y |
| 625  | · | · | · | · | · | · | · | · | · | · | Y |
| 600  | · | · | · | Y | Y | Y | Y | · | · | Y | Y |
| 575  | · | · | · | · | · | · | · | · | · | · | Y |
| 550  | · | · | · | · | · | · | · | · | · | · | Y |
| 525  | · | · | · | · | · | · | · | · | · | · | Y |
| 500  | · | · | · | Y | Y | Y | Y | · | · | Y | Y |
| 450  | · | · | · | · | · | · | · | · | · | · | Y |
| 400  | · | · | · | Y | Y | Y | Y | · | · | Y | Y |
| 350  | · | · | · | · | · | · | · | · | · | · | Y |
| 300  | · | · | · | Y | Y | Y | Y | · | · | Y | Y |
| 250  | · | · | · | Y | Y | Y | Y | · | · | Y | Y |
| 200  | · | · | · | Y | Y | Y | Y | · | · | Y | Y |
| 150  | · | · | · | Y | **·** | Y | Y | · | · | Y | Y |
| 100  | · | · | · | Y | **·** | Y | Y | · | · | Y | Y |
| **count** | **0** | **0** | **0** | **16** | **14** | **16** | **16** | **0** | **0** | **12** | **29** |

`wind_speed_<n>hPa`, `wind_direction_<n>hPa`, `temperature_<n>hPa` and `cloud_cover_<n>hPa`
all follow the same pattern per model — a level that has wind also has temperature and cloud
cover, and vice versa. No mixed cases were found.

**Levels the app currently requests that ICON never fills:** 875, 825, 775, 750, 725, 675,
650, 625, 575, 550, 525, 450, 350 — 13 levels × 4 variables = 52 wasted parameters per ICON
request (~26 % of that request's billed weight). Trimming `pressureLevels` /
`highPressureLevels` for ICON to the 16 real levels is a free saving.

**Levels above the app's set:** DWD docs additionally list 70, 50 and 30 hPa; ECMWF docs list
50 hPa. Not tested; not needed (100 hPa ≈ 53 000 ft is already above the app's ceiling).

---

## 2. Parameter naming convention — settled

Tested on `/v1/forecast?models=<each of the 12 models>` and on `/v1/dwd-icon`:

```
wind_speed_850hPa,wind_direction_850hPa   → works everywhere
windspeed_850hPa,winddirection_850hPa     → works everywhere, identical values
```

Both styles returned 24/24 real values on every model that has 850 hPa data, and matching
all-null arrays on every model that does not. The dedicated `/v1/dwd-icon` endpoint accepts
**both** — the app's comment that it "uses NO underscore" is stale. `wind_speed_180m` and
`temperature_180m` also work fine on `/v1/dwd-icon`, so `icon.optionalParams` is unnecessary.

**Recommendation:** set `windParamPrefix: 'wind_speed_'` / `windDirParamPrefix:
'wind_direction_'` for every model including `icon`, or drop the fields entirely. Do this as a
separate small commit — it is behaviour-preserving.

---

## 3. Per-model detail

### 3.1 MeteoSwiss ICON Seamless — `meteoswiss_icon_seamless`

- **Endpoint:** `https://api.open-meteo.com/v1/forecast` with `&models=meteoswiss_icon_seamless`.
  No dedicated endpoint exists (the MeteoSwiss docs page only ever shows `/v1/forecast`).
- **Composition:** CH1 for the first ~33 h, then CH2 to 120 h. Verified by horizon arithmetic
  (§6) — the seamless horizon matches CH2's exactly.
- **Pressure levels:** none.
- **Surface levels:** **10 m only.** `wind_speed_80m/100m/120m/180m/200m`,
  `wind_direction_*` and `temperature_80m…200m` are all present-but-null.
- **`cloud_base`:** ✅ present, unit **m**, **MSL** (§8).
- **Other variables:** `cape` ✅, `convective_inhibition` ✅, `freezing_level_height` ✅,
  `snowfall_height` ✅, `sunshine_duration` ✅, `wind_gusts_10m` ✅,
  `relative_humidity_2m` ✅, `dew_point_2m` ✅, `precipitation_probability` ✅,
  `precipitation`/`rain`/`showers`/`snowfall` ✅, `cloud_cover` + low/mid/high ✅,
  `weather_code` ✅, `is_day` ✅, `surface_pressure`/`pressure_msl` ✅.
  **Absent (all-null):** `visibility`, `uv_index`, `boundary_layer_height`, `cloud_top`,
  `lightning_potential`.
- **Domain:** Alps + surrounding — Innsbruck, Interlaken, Chamonix, Munich all return data.
  Outside the domain → **HTTP 400 `"No data is available for this location"`**.
- **Max `forecast_days`:** 16 is accepted; data ends at CH2's horizon (132 h out from 00 Z on
  the test day). Set `maxDays: 6`, `defaultDays: 5`.

```
https://api.open-meteo.com/v1/forecast?latitude=46.69&longitude=7.86&hourly=wind_speed_10m,wind_direction_10m,wind_gusts_10m,temperature_2m,cloud_base,cape,convective_inhibition,freezing_level_height,relative_humidity_2m,dew_point_2m,precipitation_probability,precipitation,rain,showers,cloud_cover,cloud_cover_low,cloud_cover_mid,cloud_cover_high,weather_code,is_day&models=meteoswiss_icon_seamless&forecast_days=5
```

### 3.2 MeteoSwiss ICON-CH1 — `meteoswiss_icon_ch1`

Identical variable set to §3.1. Differences:

- **Resolution / horizon:** 0.01° (~1 km), **33 h**, updated **every 3 hours** (docs table,
  confirmed by horizon arithmetic).
- **Deterministic** from `/v1/forecast` — single series, no members (§Question A).
- **Max `forecast_days`:** 2. Set `maxDays: 2`, `defaultDays: 2`.

```
https://api.open-meteo.com/v1/forecast?latitude=46.69&longitude=7.86&hourly=wind_speed_10m,wind_direction_10m,wind_gusts_10m,temperature_2m,cloud_base,cloud_cover,cloud_cover_low,cloud_cover_mid,cloud_cover_high&models=meteoswiss_icon_ch1&forecast_days=2
```

### 3.3 MeteoSwiss ICON-CH2 — `meteoswiss_icon_ch2`

- 0.02° (~2 km), **120 h**, updated **every 6 hours** (00/06/12/18 Z).
- Same variables as §3.1. `maxDays: 6`, `defaultDays: 5`.

```
https://api.open-meteo.com/v1/forecast?latitude=46.69&longitude=7.86&hourly=wind_speed_10m,wind_direction_10m,wind_gusts_10m,temperature_2m,cloud_base,cloud_cover,cloud_cover_low,cloud_cover_mid,cloud_cover_high&models=meteoswiss_icon_ch2&forecast_days=5
```

### 3.4 DWD ICON Seamless — bare `/v1/dwd-icon`, or `/v1/forecast&models=icon_seamless`

- **The two are identical.** `https://api.open-meteo.com/v1/dwd-icon` with no `models=`
  returns exactly the same numbers as `/v1/dwd-icon&models=icon_seamless` and as
  `/v1/forecast&models=icon_seamless` — mean abs diff `0.000` over 48 h on all three test
  variables. The bare endpoint **is** the D2 → EU → Global seamless blend. (Question C.)
- **Pressure levels:** 16 (see table). **Surface:** wind + direction at 10/80/100/120/180/200 m
  all real; temperature only at 2 m / 80 m / 120 m / 180 m (`temperature_100m` and
  `temperature_200m` are null).
- **`cloud_base`:** ❌ all-null. (DWD docs list a "Convective Cloud Base" variable but it is
  not exposed as `cloud_base` on this API.)
- **Other:** `cape` ✅ (the app's config says `cape: false` — **that is wrong**),
  `convective_inhibition` ✅, `freezing_level_height` ✅, `visibility` ✅ (app says false —
  also wrong), `geopotential_height_850hPa` ✅, `precipitation_probability` ✅ (seamless only;
  null on icon_eu / icon_d2 / icon_global individually), `snowfall` ✅, `weather_code` ✅.
  **Null:** `cloud_base`, `boundary_layer_height`, `uv_index`, `temperature_100m`,
  `temperature_200m`.
- **Max `forecast_days`:** the dwd-icon docs say `0-10`, but `forecast_days=16` was **accepted
  with HTTP 200** — the docs are stale. Data ends at ICON-Global's horizon: 192 h out from
  00 Z on the test day (7.5-day model from the 12 Z run). `maxDays: 8`, `defaultDays: 7`.

```
https://api.open-meteo.com/v1/dwd-icon?latitude=47.27&longitude=11.40&hourly=wind_speed_10m,wind_direction_10m,wind_speed_850hPa,wind_direction_850hPa,temperature_850hPa,cloud_cover_850hPa,wind_speed_500hPa,temperature_2m,cape,visibility&forecast_days=7
```

### 3.5 DWD ICON-D2 — `icon_d2`

- **Endpoint:** `/v1/forecast&models=icon_d2` (also reachable as `/v1/dwd-icon&models=icon_d2`).
- 0.02° (~2 km), **48 h** horizon, updated **every 3 hours**.
- **Pressure levels:** 14 — the ICON set minus 150 and 100 hPa (D2's model top).
- **Values are identical to the seamless blend for the whole 48 h** at an Alpine point. See
  Question D — **recommend not shipping this row.**
- `precipitation_probability` is null on `icon_d2` (it is a seamless-only synthesis).

```
https://api.open-meteo.com/v1/forecast?latitude=47.27&longitude=11.40&hourly=wind_speed_10m,wind_direction_10m,wind_speed_850hPa,wind_direction_850hPa,temperature_850hPa,temperature_2m,cape&models=icon_d2&forecast_days=2
```

### 3.6 AROME Austria — `geosphere_arome_austria`

**The model ID was found in the docs page markup, not guessed.** `geosphere_arome_austria`.

- **Endpoint:** `https://api.open-meteo.com/v1/forecast` with `&models=geosphere_arome_austria`.
  No dedicated endpoint.
- 2.5 km, **60 h** horizon, updated **every 3 hours** (docs body text: "It is updated every 3
  hours and provides forecasts for 60 hours").
- **Pressure levels:** none. **Surface levels: 10 m only.**
- **`cloud_base`:** ❌ all-null.
- **Present:** `temperature_2m`, `wind_speed_10m`, `wind_direction_10m`, `wind_gusts_10m`,
  `cape`, `convective_inhibition`, `relative_humidity_2m`, `dew_point_2m`, `precipitation`,
  `rain`, `showers`, `snowfall`, `cloud_cover` + low/mid/high, `weather_code`, `is_day`,
  `surface_pressure`, `pressure_msl`.
  **Null:** everything at 80–200 m, all pressure levels, `cloud_base`,
  `boundary_layer_height`, **`freezing_level_height`**, `visibility`,
  `precipitation_probability`, `uv_index`.
- **Domain:** returns data at Innsbruck, Interlaken, Chamonix and Munich (wider than "Austria").
  **Outside the domain it returns HTTP 200 with an unparseable `nan` body** — see §9.
- **Max `forecast_days`:** 3. `maxDays: 3`, `defaultDays: 3`.

```
https://api.open-meteo.com/v1/forecast?latitude=47.27&longitude=11.40&hourly=wind_speed_10m,wind_direction_10m,wind_gusts_10m,temperature_2m,relative_humidity_2m,dew_point_2m,cape,precipitation,rain,showers,cloud_cover,cloud_cover_low,cloud_cover_mid,cloud_cover_high,weather_code,is_day&models=geosphere_arome_austria&forecast_days=3
```

### 3.7 ECMWF IFS HRES — `ecmwf_ifs`

- **9 km O1280 grid, native HRES.** ECMWF docs: *"The ECMWF IFS model runs every 6 hours at a
  9 km resolution. Open-Meteo delivers the full [resolution]"*. This is what the app already
  requests. **Label change only.** (Question E.)
- **Pressure levels: none.** Confirmed on both `/v1/forecast&models=ecmwf_ifs` and
  `/v1/ecmwf&models=ecmwf_ifs` — every `*_<n>hPa` field is present-but-null.
- **Surface levels:** wind + direction at 10/80/100/120/180/200 m all real. Temperature at
  2 m only (80–200 m null).
- **`cloud_base`:** ❌ null. `boundary_layer_height` ✅ (one of the few models that has it).
  `freezing_level_height` ❌ null.
- **Present:** `cape`, `convective_inhibition`, `visibility`, `precipitation_probability`,
  `precipitation`, `rain`, `showers`, `snowfall`, `cloud_cover` + low/mid/high, `weather_code`.
- **Global domain** — works at Loxahatchee too.
- **Max `forecast_days`:** 15 (360 h from the 00 Z run). Matches the app's `maxDays: 15`.

```
https://api.open-meteo.com/v1/forecast?latitude=47.27&longitude=11.40&hourly=wind_speed_10m,wind_direction_10m,wind_speed_100m,wind_direction_100m,wind_speed_200m,wind_direction_200m,temperature_2m,cape,visibility,boundary_layer_height,cloud_cover,cloud_cover_low,cloud_cover_mid,cloud_cover_high&models=ecmwf_ifs&forecast_days=7
```

### 3.8 ECMWF IFS 0.25 — `ecmwf_ifs025` (not in the plan, but relevant)

**This is the only ECMWF product with winds aloft.** 12 pressure levels (see table), 0.25°
(~25 km), 15 days. Values differ measurably from `ecmwf_ifs`: mean abs diff 0.65 °C / 0.82 km/h
on `temperature_2m` / `wind_speed_10m` over 48 h, max 2.6 °C / 2.5 km/h.

Surface levels are **10 m and 100 m only** (80/120/180/200 m null), and it lacks
`convective_inhibition`, `visibility`, `freezing_level_height` and `boundary_layer_height`.

> **Decision needed (Session 3):** the plan lists "ECMWF IFS HRES (9km)" as the Europe ECMWF
> row. That row will have **no winds aloft** — surface only, like today. If a European ECMWF
> winds-aloft row is wanted, it must be `ecmwf_ifs025` at 25 km. Not adding it; flagging it.

### 3.9 GFS Seamless — `gfs_seamless` / `gfs_global`

Both IDs work and return identical data at an Alpine point. **All 29 pressure levels return
real data** — GFS is the only model with complete coverage of the app's level set. Surface
wind at 10/80/100/120 m (180/200 m null), temperature at 2/80/100/120 m. `cloud_base` ❌ null.
`uv_index` ✅ (only model that has it). 16 days.

The app currently uses `gfs_global`; `gfs_seamless` is the better ID for Europe (it blends
GFS 0.11° where available). Values were identical at the test point.

### 3.10 Models that do **not** work in Europe

| Model | Behaviour at Alpine coords |
|---|---|
| `gfs_hrrr` | **HTTP 400** `"No data is available for this location"` at Innsbruck, Interlaken, Chamonix, Munich |
| `ncep_nam_conus` | **HTTP 400** `"No data is available for this location"` at all four |

Both are hard 400s, not silent nulls. Removing them from the Europe list (Session 3, item 1)
is required, not merely an optimisation.

---

## 4. Surface-level support summary

| Model | wind 10 m | 80 m | 100 m | 120 m | 180 m | 200 m | temp 2 m | 80 m | 100 m | 120 m | 180 m | 200 m |
|---|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|
| meteoswiss (all 3) | Y | · | · | · | · | · | Y | · | · | · | · | · |
| icon_seamless / d2 / eu / global | Y | Y | Y | Y | Y | Y | Y | Y | · | Y | Y | · |
| geosphere_arome_austria | Y | · | · | · | · | · | Y | · | · | · | · | · |
| ecmwf_ifs | Y | Y | Y | Y | Y | Y | Y | · | · | · | · | · |
| ecmwf_ifs025 | Y | · | Y | · | · | · | Y | · | · | · | · | · |
| gfs_seamless | Y | Y | Y | Y | · | · | Y | Y | Y | Y | · | · |

(`wind_direction_<n>m` matches `wind_speed_<n>m` in every case.)

The app's existing `icon.surfaceLevels: [10, 80, 180]` is correct and could be extended to
`[10, 80, 120, 180]` — 120 m has both wind and temperature.

---

## 5. `cloud_base` support summary

| Model | `cloud_base` | Unit |
|---|:--:|---|
| `meteoswiss_icon_seamless` | ✅ | m |
| `meteoswiss_icon_ch1` | ✅ | m |
| `meteoswiss_icon_ch2` | ✅ | m |
| `icon_seamless` / `icon_d2` / `icon_eu` / `icon_global` | ❌ null | — |
| `geosphere_arome_austria` | ❌ null | — |
| `ecmwf_ifs` / `ecmwf_ifs025` | ❌ null | — |
| `gfs_seamless` | ❌ null | — |
| `meteofrance_arome_france_hd` | ❌ null | — |
| `knmi_harmonie_arome_europe` | ❌ null | — |
| `italia_meteo_arpae_icon_2i` | ❌ null | — |
| `metno_seamless` | ❌ null | — |
| `dmi_harmonie_arome_europe` | ✅ | m |

Related fields, for reference:

| Field | Where it has data |
|---|---|
| `boundary_layer_height` | `ecmwf_ifs`, `gfs_seamless` only. **Null on every European high-res model.** |
| `freezing_level_height` | all MeteoSwiss, all ICON, `gfs_seamless`. Null on `ecmwf_ifs`, `ecmwf_ifs025`, `geosphere_arome_austria`. |
| `convective_inhibition` | all MeteoSwiss, `icon_seamless`/`d2`/`eu`, `geosphere_arome_austria`, `ecmwf_ifs`, `gfs_seamless`. Null on `icon_global`, `ecmwf_ifs025`. |
| `snowfall_height` | MeteoSwiss ✅ (m, MSL) — a usable proxy for freezing level. |
| `cloud_top` | not a valid variable anywhere tested (always null). |

---

## 6. Update cadence and recommended cache settings

All probes issued at **2026-07-26 ~17:11 UTC**, `forecast_days=16`, data starting
`2026-07-26T00:00Z`. Run identification is by horizon arithmetic (last non-null hour minus
documented forecast length).

| Model | Last non-null | h from 00 Z | Implied run | Doc'd length | Doc'd cadence |
|---|---|--:|---|---|---|
| `meteoswiss_icon_ch1` | 07-28T00:00 | 48 | **15 Z** | 33 h | every 3 h |
| `meteoswiss_icon_ch2` | 07-31T12:00 | 132 | **12 Z** | 120 h | every 6 h |
| `meteoswiss_icon_seamless` | 07-31T12:00 | 132 | CH2 12 Z | — | — |
| `icon_d2` | 07-28T15:00 | 63 | **15 Z** | 48 h | every 3 h |
| `icon_eu` | 07-31T12:00 | 132 | **12 Z** | 120 h | every 3 h |
| `icon_global` | 08-03T00:00 | 192 | **12 Z** | 180 h | every 6 h |
| `icon_seamless` (= bare `/v1/dwd-icon`) | 08-03T00:00 | 192 | global 12 Z | — | — |
| `geosphere_arome_austria` | 07-29T00:00 | 72 | **12 Z** | 60 h | every 3 h |
| `ecmwf_ifs` | 08-10T00:00 | 360 | **00 Z** | 360 h | every 6 h |
| `ecmwf_ifs025` | 08-10T02:00 | 362 | 00 Z | 360 h | every 6 h |
| `gfs_seamless` | 08-10T23:00 | 383 | — | 384 h | every 6 h |

**What this bounds.** At 17:11 Z the 15 Z runs of CH1 and ICON-D2 were **already serving**
→ their availability delay is **≤ 131 min**. The 15 Z run of AROME Austria was **not** serving
(still on 12 Z) → its delay is **> 131 min**. ECMWF HRES was still on 00 Z at 17:11 Z, which is
consistent with the app's existing 420-minute figure. These are one-sided bounds from a single
observation, not measured delays — the recommendations below add margin.

### Recommended config values

```js
// MeteoSwiss CH1  — 8 runs/day, fast turnaround (observed ≤131 min)
runSchedule: { type: 'fixed', hoursUTC: [0, 3, 6, 9, 12, 15, 18, 21] },
availabilityDelayMinutes: 150,

// MeteoSwiss CH2  — 4 runs/day, 120 h product
runSchedule: { type: 'fixed', hoursUTC: [0, 6, 12, 18] },
availabilityDelayMinutes: 300,

// MeteoSwiss Seamless — refreshes on the CH1 cadence in the near field
runSchedule: { type: 'fixed', hoursUTC: [0, 3, 6, 9, 12, 15, 18, 21] },
availabilityDelayMinutes: 150,

// DWD ICON-D2 (if shipped at all — see Question D)
runSchedule: { type: 'fixed', hoursUTC: [0, 3, 6, 9, 12, 15, 18, 21] },
availabilityDelayMinutes: 150,

// DWD ICON Seamless — D2 refreshes the near field every 3 h, so the app's
// current [0,6,12,18] + 240 min under-refreshes the hours users actually read
runSchedule: { type: 'fixed', hoursUTC: [0, 3, 6, 9, 12, 15, 18, 21] },
availabilityDelayMinutes: 150,

// AROME Austria — observed >131 min; 3-hourly cadence
runSchedule: { type: 'fixed', hoursUTC: [0, 3, 6, 9, 12, 15, 18, 21] },
availabilityDelayMinutes: 195,

// ECMWF IFS HRES — unchanged from today
runSchedule: { type: 'fixed', hoursUTC: [0, 12] },
availabilityDelayMinutes: 420,
```

---

## 7. Maximum `forecast_days`

`forecast_days=16` was **accepted by every model** — including `/v1/dwd-icon`, whose docs
claim a `0-10` range. Nothing 400s and nothing truncates the array; the API always returns
`16 × 24 = 384` hourly slots and pads beyond each model's horizon with `null`.

**Consequence:** `maxDays` is a *quota* decision, not an API constraint. Requesting days a
model cannot fill costs billed weight (§10) for null arrays. Recommended `maxDays` /
`defaultDays` per model:

| Model | Real horizon | `maxDays` | `defaultDays` |
|---|--:|--:|--:|
| MeteoSwiss Seamless | 120 h | 6 | 5 |
| MeteoSwiss CH1 | 33 h | 2 | 2 |
| MeteoSwiss CH2 | 120 h | 6 | 5 |
| ICON-D2 | 48 h | 3 | 2 |
| DWD ICON Seamless | 180 h | 8 | 7 |
| AROME Austria | 60 h | 3 | 3 |
| ECMWF IFS HRES | 360 h | 15 | 7 |
| GFS Seamless | 384 h | 14 | 7 |

---

## 8. `cloud_base` semantics — unit, datum, and the 20900 sentinel

**Unit:** metres (`hourly_units.cloud_base === "m"`). Requesting
`&temperature_unit=fahrenheit&wind_speed_unit=mph&precipitation_unit=inch` — as the app does —
does **not** change it. There is no altitude unit parameter. Convert client-side via
`metersToFeet` in `src/data/units.js`.

**Datum: MSL (above mean sea level), not AGL.** Decisive evidence — `meteoswiss_icon_ch1` at
Jungfraujoch (46.5475, 7.9853, DEM elevation **3484 m**):

| Hour | `cloud_base` | `cloud_cover` | `cloud_cover_low` |
|---|--:|--:|--:|
| 00:00 | 4120 | 100 | 100 |
| 06:00 | 3380 | 97 | 97 |
| 12:00 | 3380 | 100 | 100 |
| 18:00 | 3380 | 100 | 100 |

A reported base of **3380 m at a site whose surface is 3484 m**, with 100 % *low* cloud, only
makes sense on an MSL datum (the summit is 104 m inside the cloud). On an AGL datum the same
number would put the cloud base at 6864 m MSL while simultaneously reporting 100 % cloud below
3 km — a contradiction. Interlaken (elev 580 m) values of 1500–5260 m are consistent with MSL
throughout.

This matches how the app already treats altitude rows: **MSL, with an optional AGL display via
`showGroundLevel`**. Cloud base needs no special handling — subtract site elevation when
`showGroundLevel` is on, exactly like the altitude rows.

**⚠️ "No cloud" is `20900`, not `null`.** Over a 5-day `meteoswiss_icon_seamless` series at
Interlaken (120 hourly values, **zero nulls**): min `1500`, max `20900`, and the *only*
distinct value above 12 000 m was exactly `20900` — repeated whenever total cloud cover was
low. 20 900 m is approximately ICON-CH's model top; it is the "no cloud found" sentinel.

**Session 5 must handle this.** The brief says "a null `cloud_base` typically means *no
cloud*". On MeteoSwiss the field is never null, so that branch never fires and the red-border
filter would draw a full-height border on every clear hour. Recommended rule:

```js
// ponytail: 20900 m ≈ ICON-CH model top — the API's "no cloud" sentinel
const NO_CLOUD_BASE_M = 20000;
const hasCloudBase = v != null && v < NO_CLOUD_BASE_M;
```

Also note `cloud_base` is the base of the **lowest cloud layer of any type**, not of low cloud
specifically — at Interlaken 07-26T00:00 it reported 5260 m with `cloud_cover_low: 0` and
`cloud_cover_mid: 100`. For a soaring app that is arguably the wrong quantity when only mid
cloud is present; cross-checking `cloud_cover_low` before drawing the border is worth
considering.

---

## 9. Failure modes — four, not three

The brief asks to distinguish 400 / field-absent / field-present-but-null. A fourth exists:

| Mode | When | What the app sees |
|---|---|---|
| **HTTP 400** | model has no domain at the coordinate (`gfs_hrrr`, `ncep_nam_conus`, all `meteoswiss_*`, `icon_d2`, `icon_eu` outside Europe) | `{"error":true,"reason":"No data is available for this location"}` |
| **Field absent** | **never observed.** Every requested field always appears in `hourly`. | — |
| **Field present, all-null** | model exists at the coordinate but lacks that variable/level | array of `null` |
| **HTTP 200, unparseable body** ⚠️ | `geosphere_arome_austria` outside its domain | `{"latitude":nan,"longitude":nan,...}` — bare `nan` is not valid JSON. `response.json()` **throws**. No `hourly` key. |

The third mode is by far the most common and is what `transform.js` already handles by
dropping all-null rows. The fourth is new: in `fetchModel()`, a `nan` body takes the `catch`
branch, retries the reduced URL, gets the same `nan` body, and throws from an
**unguarded** `await resp.json()` on line ~118. Recommend wrapping both `resp.json()` calls
and treating a parse failure as "no data at this location", same as a 400.

---

## 10. API call weighting and free-tier limits (Question F)

**Formula** (from `/en/pricing`, "How is one API call defined?"):

> *"Requests for data covering more than 10 weather variables or extending over a period of
> more than 2 weeks for a single location are considered multiple API calls. To calculate the
> number of API calls accurately, fractional counts are used. For example, a request for 2
> weeks of data with 15 weather variables will be calculated as 1.5 API calls, while 4 weeks
> of data equals 3.0 API calls."*

```
weight = max(1, variables / 10) × max(1, days / 14) × models × locations
```

The pricing page's interactive calculator exposes exactly these four inputs
(Variables, Time length, Models, Locations), confirming they multiply. `models` is the count in
the `&models=` list — the app sends one model per request, so it is always 1.

**Free tier limits** (from the pricing comparison table):

| Window | Limit |
|---|---|
| Minute | **600** calls |
| Hour | **5 000** calls |
| Day | **10 000** calls |
| Month | 300 000 calls (*"monthly limits are not enforced"* until the statistics portal ships) |

Non-commercial use only. No rate-limit headers are returned — probed the response headers
directly, only `Date`, `Content-Type`, `Transfer-Encoding`, `Connection`. **You cannot observe
remaining quota**; budget statically.

### Weight of one request, per model

Counted from the app's actual `buildHourlyParams()` output (hourly vars only; the 5 `daily=`
params and `current_weather=true` add a little more).

**USA region, as shipped today:**

| Model | hourly vars | days | weight |
|---|--:|--:|--:|
| HRRR | 137 | 3 | **13.7** |
| GFS | 138 | 7 | **13.8** |
| ICON | 116 | 7 | **11.6** |
| ECMWF | 21 | 7 | **2.1** |
| NAM | 20 | 3 | **2.0** |
| **All five enabled, one location load** | | | **≈ 43** |

**Europe region, using the trimmed level sets from §1:**

| Model | est. hourly vars | days | weight |
|---|--:|--:|--:|
| MeteoSwiss Seamless | ~23 | 5 | **2.3** |
| MeteoSwiss CH1 | ~23 | 2 | **2.3** |
| MeteoSwiss CH2 | ~23 | 5 | **2.3** |
| AROME Austria | ~18 | 3 | **1.8** |
| DWD ICON Seamless (16 levels) | ~86 | 7 | **8.6** |
| ICON-D2 (14 levels) | ~78 | 2 | **7.8** |
| ECMWF IFS HRES | 21 | 7 | **2.1** |
| GFS Seamless | 138 | 7 | **13.8** |
| **Default Europe load (MeteoSwiss Seamless only)** | | | **≈ 2.3** |

**Budget.** A default Europe page load costs ~2.3 of 10 000 daily — the "one deterministic
request on first load" decision in Session 3 keeps Europe roughly **19× cheaper** than a
fully-enabled USA load. Even a user who enables every Europe model pays ~41/load, allowing
~240 cold loads per day. The per-minute cap (600) is only reachable by a hot loop; the app's
cache makes it unreachable in normal use.

**Cheapest available saving:** trimming ICON's dead pressure levels (§1) cuts the DWD ICON
Seamless request from 11.6 to 8.6 — a 26 % reduction for zero functional change, in both
regions.

---

## 11. Answers to questions A–F

### A. Are CH1 and CH2 deterministic or ensemble via the standard endpoint?

**Deterministic. Single series per variable. Cheap. No gating required.**

Requesting three MeteoSwiss models at once from `/v1/forecast` returns exactly one field per
(variable × model):

```
https://api.open-meteo.com/v1/forecast?latitude=46.69&longitude=7.86&hourly=temperature_2m,cloud_base&models=meteoswiss_icon_seamless,meteoswiss_icon_ch1,meteoswiss_icon_ch2&forecast_days=3
→ hourly keys: time, temperature_2m_meteoswiss_icon_seamless, cloud_base_meteoswiss_icon_seamless,
               temperature_2m_meteoswiss_icon_ch1,      cloud_base_meteoswiss_icon_ch1,
               temperature_2m_meteoswiss_icon_ch2,      cloud_base_meteoswiss_icon_ch2
```

**No `_memberNN` fields.** `generationtime_ms` was 1.13 for that call — ensemble-scale work
would be an order of magnitude higher.

Members **do** exist, but only on the ensemble API, and the counts in the brief are confirmed:

```
https://ensemble-api.open-meteo.com/v1/ensemble?latitude=46.69&longitude=7.86&hourly=temperature_2m&models=meteoswiss_icon_ch1&forecast_days=2
→ 11 fields: temperature_2m + temperature_2m_member01 … _member10   (control + 10)

… &models=meteoswiss_icon_ch2
→ 21 fields: temperature_2m + temperature_2m_member01 … _member20   (control + 20)

… &models=meteoswiss_icon_seamless
→ 1 field: temperature_2m   (no members — seamless is not an ensemble product)
```

**Difference between the two endpoints:** `/v1/forecast` gives the deterministic/control run
only; `ensemble-api` gives control + members and costs ~11× (CH1) or ~21× (CH2) the variable
count. Note the ensemble API also requires a **Professional plan** per the pricing table
("Ensemble Weather API" is not a free-tier product) — the free-tier request above still
returned data, but it is not a documented free entitlement.

**→ Session 3, item 4: the first branch applies.** CH1 and CH2 are ordinary models in the
Europe list. No lazy-fetch treatment, no separate ensemble view.

### B. Do CH1 and CH2 support winds aloft at all?

**No. Confirmed by both live probes and documentation.**

- All 29 pressure levels return all-null arrays for wind, direction, temperature and cloud
  cover, at Interlaken and at Innsbruck, on `meteoswiss_icon_ch1`, `meteoswiss_icon_ch2` and
  `meteoswiss_icon_seamless`. No 400s — silent nulls.
- The MeteoSwiss docs page lists **no `*hPa` variables at all** (grepping the rendered page
  for `temperature_<n>hPa` / `wind_speed_<n>hPa` returns nothing, whereas the same grep on the
  DWD and ECMWF pages returns full level lists). Docs and live behaviour agree.
- They also have **no 80/100/120/180/200 m levels** — 10 m is the only wind level.

**What *is* available, so the app can render a reduced row set:** 10 m wind speed/direction/
gusts, 2 m temperature/humidity/dew point, `cloud_base`, `cloud_cover` + low/mid/high, `cape`,
`convective_inhibition`, `freezing_level_height`, `snowfall_height`, `sunshine_duration`,
precipitation family, `weather_code`, `is_day`, `surface_pressure`, `pressure_msl`.

**→ Session 3, item 3:** use `pressureLevels: []` and `surfaceLevels: [10]`, following the
existing ECMWF pattern (`models.js:73`). Note these models are *thinner* than ECMWF — ECMWF has
six surface levels, MeteoSwiss has one — so a MeteoSwiss table will show a single wind row.
That will look broken unless the UI says why. Recommend an explicit "surface only — this model
has no upper-air data" note in the table header for any model with
`pressureLevels.length === 0 && surfaceLevels.length <= 1`.

### C. What does `https://api.open-meteo.com/v1/dwd-icon` return with no `models=`?

**The seamless D2 → EU → Global blend.** Not a single sub-model.

Diffed hour by hour over 48 h at 47.27, 11.40:

| Comparison | `temperature_2m` | `wind_speed_850hPa` | `temperature_850hPa` |
|---|---|---|---|
| bare vs `/v1/forecast&models=icon_seamless` | mean 0.000, max 0.000 — **identical** | 0.000 / 0.000 — **identical** | 0.000 / 0.000 — **identical** |
| bare vs `models=icon_d2` | 0.000 / 0.000 — **identical** | 0.000 / 0.000 — **identical** | 0.000 / 0.000 — **identical** |
| bare vs `models=icon_eu` | mean 1.112, max 3.500 | mean 4.202, max 16.300 | mean 0.513, max 1.900 |
| bare vs `models=icon_global` | mean 0.931, max 2.800 | mean 5.444, max 19.100 | mean 0.538, max 2.100 |

`/v1/dwd-icon&models=icon_seamless` also returns identical values to the bare form. The bare
endpoint is a convenience alias for `icon_seamless`, and within the first 48 h at an Alpine
point the blend **is** ICON-D2 verbatim. Beyond 48 h it extends via EU and Global (horizon
192 h, §6).

**→ The app's current `icon` config (`baseUrl: /v1/dwd-icon`, `modelsParam: null`) is correct
and correctly named "DWD ICON Seamless".** It could equally use
`/v1/forecast&models=icon_seamless`; there is no behavioural difference, and consolidating on
`/v1/forecast` would let the naming-prefix special case go away.

### D. Does a separate ICON-D2 row add anything over DWD ICON Seamless?

**No. Recommend not shipping it.**

Over the first 48 h at 47.27, 11.40, `models=icon_d2` and the seamless blend are **bit-identical
on every variable tested** — mean absolute difference `0.000`, maximum absolute difference
`0.000`, across all 48 hours, on `temperature_2m`, `wind_speed_850hPa` and `temperature_850hPa`.
Not "close": the same numbers.

A separate ICON-D2 row would:

- cost an extra **~7.8 weight** per location load,
- display a column that is a pixel-for-pixel duplicate of DWD ICON Seamless for its entire
  48 h range,
- and be strictly *worse* than the seamless row beyond 48 h (empty vs. EU/Global continuation)
  and at 150/100 hPa (D2's model top cuts off; seamless continues).

The only thing D2 offers that seamless does not is 15-minutely data, which this app does not use.

**→ Raising this before implementation, per Session 3's instruction.** Recommended Europe model
list is the plan's eight rows **minus ICON-D2**, i.e. seven rows. If you want the row anyway
(e.g. to make the D2 → EU handoff visible), it works fine — this is a value judgement, not a
blocker. Say the word and Session 3 ships it.

### E. Is `ecmwf_ifs` already native 9 km IFS HRES?

**Yes.** ECMWF docs model table, first row:

| Weather Model | Region | Spatial Resolution | Temporal Resolution | Forecast Length | Update frequency |
|---|---|---|---|---|---|
| IFS HRES | 🌍 Global | **9 km (O1280 grid)** | 1-hourly, 3-hourly after 90 h, 6-hourly after 144 h | 15 days | Every 6 h |
| IFS 0.25 Open-Data | 🌍 Global | 0.25° (~25 km) | 3-hourly, 6-hourly after 144 h | 15 days | Every 6 h |

Body text: *"The ECMWF IFS model runs every 6 hours at a 9 km resolution. Open-Meteo delivers
the full [resolution] … The open-data IFS 0.25 updates every 6 hours, but only offers 0.25°
resolution."*

Live diff confirms they are genuinely different products: `ecmwf_ifs` vs `ecmwf_ifs025` over
48 h at Innsbruck — `temperature_2m` mean abs diff **0.652 °C** (max 2.6), `wind_speed_10m`
mean abs diff **0.817 km/h** (max 2.5).

**→ The app's existing ECMWF row needs only a label change to "ECMWF IFS HRES (9km)". No new
model.**

**Two caveats worth knowing:**

1. **HRES has no pressure levels.** Verified on both `/v1/forecast&models=ecmwf_ifs` and
   `/v1/ecmwf&models=ecmwf_ifs` — every `*hPa` field is present-but-null. The app's
   `pressureLevels: []` is correct and must stay. If a European ECMWF winds-aloft row is
   wanted, it has to be `ecmwf_ifs025` at 25 km (12 levels).
2. **The bare `/v1/ecmwf` endpoint is IFS 0.25, not HRES.** A bare request returns pressure-level
   data whose values match `models=ecmwf_ifs025` exactly (`ws850[0..3] = 5.1, 5.1, 4.6, 4.6` in
   both). Do not "upgrade" the app to the dedicated endpoint expecting 9 km data — that would
   silently downgrade the resolution while appearing to add winds aloft. Also,
   `models=ecmwf_ifs04` returns 200 with all-null everything — a dead model ID, not an error.

### F. How is API call weight calculated, and what are the free-tier limits?

Answered in full in §10. Summary:

- `weight = max(1, vars/10) × max(1, days/14) × models × locations`, fractional.
- Free tier: **600/min, 5 000/hour, 10 000/day**, 300 000/month (unenforced). Non-commercial.
- No quota headers are exposed; budget statically.
- Per-model weights: HRRR 13.7, GFS 13.8, ICON 11.6, ECMWF 2.1, NAM 2.0 (USA, current
  config); MeteoSwiss ~2.3 each, AROME 1.8, DWD ICON Seamless 8.6 (trimmed), ICON-D2 7.8,
  ECMWF 2.1, GFS 13.8 (Europe).
- Default Europe load = **~2.3 weight**. Full USA load = **~43**.

---

## 12. Corrections to existing app config, found incidentally

Not part of the brief, but these are wrong in `src/data/models.js` today and each is a
one-line fix:

| Config | Says | Live behaviour |
|---|---|---|
| `icon.capabilities.cape` | `false` | `cape` returns real data on `/v1/dwd-icon` |
| `icon.capabilities.visibility` | `false` | `visibility` returns real data (m) |
| `icon.windParamPrefix` comment | *"dedicated endpoint uses NO underscore"* | both styles work; see §2 |
| `icon.optionalParams` | `wind_speed_180m`, `wind_direction_180m`, `temperature_180m` listed as failure-prone | all three work on `/v1/dwd-icon` |
| `icon.pressureLevels` + `HIGH_PRESSURE_LEVELS` | 24 levels requested | only 16 return data; 13 of the requested levels are always null |
| `icon.surfaceLevels` | `[10, 80, 180]` | `120 m` also has both wind and temperature |

---

## 13. Reproducing these probes

The probe scripts are not committed (throwaway research code). Each finding above is
reproducible from the copy-pasteable URLs in §3 plus these three:

```bash
# Pressure-level sweep for any model — every level in one call, no 400s
curl -s "https://api.open-meteo.com/v1/forecast?latitude=47.27&longitude=11.40&forecast_days=1&models=icon_seamless&hourly=$(for l in 1000 975 950 925 900 875 850 825 800 775 750 725 700 675 650 625 600 575 550 525 500 450 400 350 300 250 200 150 100; do printf 'wind_speed_%shPa,' $l; done | sed 's/,$//')"

# Ensemble member check
curl -s "https://ensemble-api.open-meteo.com/v1/ensemble?latitude=46.69&longitude=7.86&hourly=temperature_2m&models=meteoswiss_icon_ch1&forecast_days=2" | head -c 400

# cloud_base datum test (Jungfraujoch, DEM elevation 3484 m)
curl -s "https://api.open-meteo.com/v1/forecast?latitude=46.5475&longitude=7.9853&hourly=cloud_base,cloud_cover_low&models=meteoswiss_icon_ch1&forecast_days=1"
```
