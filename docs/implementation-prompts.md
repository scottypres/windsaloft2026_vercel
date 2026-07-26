# Soar Forecaster — Implementation Prompts

**Session 0** is a standalone research task — run it with **Claude Fable 5**.
**Sessions 1–5** are implementation — run with **Claude Opus 5**, effort `xhigh`
(`high` is fine for Session 1).

One branch, sessions run **in order**. Do not parallelize — nearly every session touches
`main.js`, `table.js`, `preferences.js`, or `models.js`.

Session 0 produces a findings document that Session 3 and Session 5 both consume. Do not
start Session 3 until Session 0's findings exist.

> Note if you hit an immediate error on Fable: it requires 30-day data retention and is
> unavailable under zero-data-retention org settings — every request 400s regardless of
> payload. If that happens, run Session 0 on Opus 5 instead.

---

## SESSION 0 — Open-Meteo API discovery (run with Fable)

**This is a research task. Write no application code. Produce one findings document.**

I am adding several European weather models to a winds-aloft forecasting app that
consumes the Open-Meteo API. Before any code is written, I need the exact, *verified*
URL parameters and naming conventions for each model. Naming conventions, available
pressure levels, and even which variables exist at all vary between models — assumptions
here are expensive to unwind later.

Open-Meteo has substantial documentation. Read it thoroughly, then confirm everything
against live API responses. Documentation and actual behavior sometimes disagree; the
live response wins.

### Documentation to read

- https://open-meteo.com/en/docs — main forecast API, full variable list
- https://open-meteo.com/en/docs/dwd-api — DWD ICON (Global / EU / D2, and the seamless blend)
- https://open-meteo.com/en/docs/meteoswiss-api — MeteoSwiss ICON CH1 / CH2
- https://open-meteo.com/en/docs/geosphere-austria-api — AROME Austria
- https://open-meteo.com/en/docs/ecmwf-api — ECMWF IFS
- https://open-meteo.com/en/docs/ensemble-api — ensemble products
- https://open-meteo.com/en/pricing — API call weighting and free-tier limits

### Models to investigate

| App label | Suspected Open-Meteo ID | Notes |
|---|---|---|
| MeteoSwiss Seamless | `meteoswiss_icon_seamless` | Confirmed working in this URL: `https://api.open-meteo.com/v1/forecast?latitude=47.37&longitude=8.55&hourly=temperature_2m,cloud_base&models=meteoswiss_icon_seamless,meteoswiss_icon_ch1,meteoswiss_icon_ch2&forecast_days=3` |
| MeteoSwiss CH1 | `meteoswiss_icon_ch1` | ~1 km. Believed **not** to support winds aloft (pressure levels) — verify. |
| MeteoSwiss CH2 | `meteoswiss_icon_ch2` | ~2.1 km. Same question. |
| DWD ICON-D2 | `icon_d2` | ~2.2 km, ~48 h. Believed to be included inside DWD's seamless ICON API. |
| DWD ICON Seamless | *(see below)* | The app currently hits `https://api.open-meteo.com/v1/dwd-icon` with **no `models=` parameter at all**. |
| AROME Austria | *(find it — do not guess)* | GeoSphere Austria, ~2.5 km, ~60 h, 3-hourly updates. |
| ECMWF IFS HRES | `ecmwf_ifs` | Already used by the app. |

### For each model, record

1. **Exact endpoint + `models=` value.** Which base URL, and the precise model string.
   Note whether the model is reachable from the general `/v1/forecast` endpoint, a
   dedicated endpoint, or both — and whether results differ between them.
2. **Parameter naming convention.** Critically: is it `wind_speed_850hPa` /
   `wind_direction_850hPa` (underscore style) or `windspeed_850hPa` / `winddirection_850hPa`
   (no underscore)? The app already branches on this per model via `windParamPrefix` /
   `windDirParamPrefix`, so getting it wrong yields silent all-null rows rather than an error.
3. **Pressure levels that return real data.** Probe the full list the app uses —
   1000, 975, 950, 925, 900, 875, 850, 825, 800, 775, 750, 725, 700 hPa, then 675, 650,
   625, 600, 575, 550, 525, 500, 450, 400, 350, 300, 250, 200, 150, 100 hPa. For each
   model, report which levels return real values, which return all-nulls, and which cause
   a 400. **This is the app's core feature — be exhaustive here.**
4. **Surface levels available** (10 m, 80 m, 100 m, 120 m, 180 m, 200 m — wind and temperature).
5. **`cloud_base` support.** Confirmed present on the MeteoSwiss models. Check every
   model. Record the exact parameter name, the unit returned (metres vs feet), and
   whether the value is AGL or MSL. Also note whether related fields exist:
   `boundary_layer_height`, `freezing_level_height`, `convective_inhibition`.
6. **Other variables**, present or absent: `cape`, `wind_gusts_10m`, `relative_humidity_2m`,
   `dew_point_2m`, `visibility`, `precipitation_probability`, `precipitation`, `rain`,
   `showers`, `cloud_cover`, `cloud_cover_low`, `cloud_cover_mid`, `cloud_cover_high`,
   `cloud_cover_<level>hPa`, `weather_code`, `is_day`, `uv_index`.
7. **Maximum `forecast_days`** before the API errors or silently truncates.
8. **Update cadence** — model run hours (UTC) and the typical lag between run time and
   data being available. This drives cache TTLs, so precision matters.

### Specific questions that must be answered

**A. Are CH1 and CH2 deterministic or ensemble via the standard endpoint?**
The example URL above requests them from the *regular* forecast API, not the ensemble
API. Determine whether that returns a single deterministic series per variable (cheap)
or ensemble members (expensive — CH1 is believed to be 11 members, CH2 21). Check whether
member-suffixed fields (`_member01` etc.) appear. Also check whether they are separately
available via `https://ensemble-api.open-meteo.com/v1/ensemble`, and how the two differ.
**This materially changes both cost and UI design, so be definitive.**

**B. Do CH1 and CH2 support winds aloft at all?**
I believe Open-Meteo does not yet serve pressure-level wind/temperature for these models.
Confirm or refute with live requests. If unsupported, state clearly which variables *are*
available so the app can render a reduced row set for them.

**C. What does `https://api.open-meteo.com/v1/dwd-icon` return with no `models=` parameter?**
Is it the seamless D2 → EU → Global blend, or a single sub-model? Compare a bare
no-`models=` request against explicit `models=icon_seamless`, `models=icon_d2`,
`models=icon_eu`, and `models=icon_global` at an Alpine coordinate (47.27, 11.40) and
diff the returned values hour by hour.

**D. Does a separate ICON-D2 row add anything over DWD ICON Seamless?**
If the seamless blend already serves D2 data for Alpine coordinates in the first ~48 h,
an explicit ICON-D2 row may be largely redundant. Quantify: over the first 48 h at an
Alpine point, how much do the two actually differ? Give a clear recommendation on whether
a separate row is worth a separate request.

**E. Is `ecmwf_ifs` already native 9 km IFS HRES?**
ECMWF moved to open data on 2025-10-01 and Open-Meteo reportedly now serves full 9 km
HRES. Compare `models=ecmwf_ifs` against `models=ecmwf_ifs025` — check resolution/grid
metadata and diff the values. If `ecmwf_ifs` is already 9 km, the app's existing ECMWF
row needs only a label change and no new model.

**F. How is API call weight actually calculated, and what are the free-tier limits?**
Confirm the current formula and the per-day / per-hour / per-minute caps. Then compute the
approximate weight of one request for each model above, so I can budget.

### Rules

- **Never guess a model ID.** If one 400s, find the correct string in the documentation.
  Report failures explicitly rather than substituting something that happens to work.
- **Verify against live responses.** Docs can be stale or incomplete.
- Use a consistent Alpine test coordinate: **47.27, 11.40** (Innsbruck area). For
  MeteoSwiss-specific checks also test **46.69, 7.86** (Interlaken).
- Where a variable is unsupported, distinguish between *400 error*, *field absent from
  response*, and *field present but all-null* — the app handles these three differently.

### Output

Write findings to `docs/openmeteo-model-findings.md` in the repo. Structure it as one
section per model, with a copy-pasteable working example URL for each, plus a summary
table of pressure-level support across all models, and a separate section answering
questions A–F. This document is the input to the implementation sessions — someone should
be able to write model configs directly from it without re-reading Open-Meteo's docs.

---

## SESSION 1 — Cleanup, layout labels, and borders

Read all changes below before starting. Implement them directly. Summarize what you
changed after each numbered section. Run the app and verify visually before finishing.

**1. Remove Lifted Index entirely.**
`lifted_index` is never actually requested from Open-Meteo — no model config's
`extraHourlyParams` includes it, so `transform.js` always sets it to null. It is dead
code. Remove: the `liftedIndex` checkbox in `index.html`, the `liftedIndex` key in
`prefs.supplementaryRows` (`src/state/preferences.js`), the row-render branch in
`src/ui/table.js`, and the field in `src/data/transform.js`. Add a migration in
`loadPrefs()` that strips a stale `liftedIndex` key from saved localStorage prefs so
existing users don't carry a dead field forward.

**2. Cloud altitude ranges in settings labels only.**
In the Extra Rows section of `index.html`, append altitude ranges to the three cloud
layer labels, based on Open-Meteo's definitions (low <3 km, mid 3–8 km, high >8 km):

- ft: `Low Cld (0-9.8 kft)`, `Mid Cld (9.8-26.2 kft)`, `High Cld (>26.2 kft)`
- m:  `Low Cld (0-3 km)`, `Mid Cld (3-8 km)`, `High Cld (>8 km)`

These must switch with the active altitude unit. Do **not** add these ranges to the
table row headers — settings only. Verify against Open-Meteo's docs whether these
bounds are AGL or MSL and label accordingly; if the docs are ambiguous, omit the
AGL/MSL suffix rather than guessing.

**3. Coordinates on the main page.**
To the right of the current location display (`#current-location-bar`), show the
coordinates in parentheses.

**4. Saved locations — two lines.**
In `src/ui/locations.js`, extend each saved location entry to two lines: name on line
one, coordinates indented on line two.

**5. Layout control renames** (labels only, not the underlying pref keys):
- `Hdr H` → `Col Hdr H`
- `Label W` → `Row Hdr W`
- `Extra font` → `Extra Row Font`
- `Gap` → `Table Gap`

**6. Cell border centering.**
Currently `borderWidth` appears to be applied as inset spacing — at value 0 the borders
of adjacent cells overlap perfectly (the desired look), but at higher values they
separate and the value acts as padding between cell content and cell perimeter.
Investigate why. Change it so borders are always centered between adjacent cells and
overlap perfectly (left border of one cell exactly overlapping the right border of its
neighbor) regardless of the `borderWidth` value, while still keeping content padding
adjustable. Consider `border-collapse: collapse`, negative margins, or `outline` /
`box-shadow` rather than `border` — pick whichever fits the existing table structure.

**7. Wind shear borders.**
Wind shear borders currently double in visible thickness when two adjacent cells both
have shear. Make them behave exactly like the cell borders from item 6 — centered and
overlapping, never doubling.

---

## SESSION 2 — Region profiles (USA / Europe)

Read all changes below before starting. Implement directly, summarizing after each
section. This session restructures `src/state/preferences.js`, which later sessions
depend on — get it right before moving on.

**1. Region toggle UI.**
Add a two-button segmented control — `USA` | `Europe` — directly above the location
search box and GPS button (they live in `.search-row` inside `.search-wrapper` in
`src/ui/locations.js`). Buttons must touch with no gap between them. Mutually
exclusive: exactly one active at any time. Defaults to USA on first load. The selected
region persists to localStorage like every other preference and restores on reload.

**2. Region is a full profile switch.**
Restructure `preferences.js` so each region owns an independent copy of: model toggles,
model-day sliders, extra-row toggles, saved locations, last-viewed location, units,
**and layout settings**. Switching regions swaps the whole bundle.

Suggested shape — one top-level `activeRegion` field plus
`profiles: { usa: {...}, europe: {...} }` under the existing `soar_preferences`
localStorage key. Everything is per-region, including `layout` — there are no global
settings other than `activeRegion` itself.

**Write a migration** in `loadPrefs()`: existing users have a flat prefs object. Migrate
it into `profiles.usa` and set `activeRegion: 'usa'` so nobody loses their saved
locations or settings. Seed `profiles.europe` from the Europe defaults, **except** copy
the user's existing `layout` into Europe as well — their tuned cell sizes and fonts
should carry over as Europe's starting point rather than resetting to stock defaults.

**3. Unit defaults per region.**
First time a region is ever used: USA → °F / mph / ft. Europe → °C / **km/h** / meters.
After that, whatever the user sets within a region persists for that region across
reloads, independent of the other region's settings.

**IMPORTANT — do not add unit parameters to the API request.** `src/api/weather.js`
(lines ~76-78 and ~255) currently hardcodes `temperature_unit: 'fahrenheit'`,
`wind_speed_unit: 'mph'`, `precipitation_unit: 'inch'`. Keep it that way. `cacheKey()`
in `src/api/cache.js` has no unit component, so making units affect the request would
serve wrong-unit data from cache AND double the number of API calls made.

Convert client-side instead. The conversion layer already exists in `src/data/units.js`
and **already supports km/h** (`kmh: 1.609344`, `WIND_UNIT_LABELS.kmh`), plus
`metersToFeet` and the `tempTo`/`windTo`/`altitudeLabel` helpers used throughout
`table.js`. This should mostly be a matter of setting the right defaults, not building
new conversion code — but verify every display path handles metric correctly.

**4. Europe default location.**
`DEFAULTS.lastLocation` is hardcoded to Loxahatchee, FL. Europe needs its own default —
use **Interlaken, Switzerland (46.6863, 7.8632)**. Verify these coordinates resolve
correctly via the app's geocoding before hardcoding them.

---

## SESSION 3 — Europe model set

**Prerequisite: read `docs/openmeteo-model-findings.md` (produced by Session 0) before
writing anything.** It contains verified endpoints, `models=` strings, parameter naming
conventions, per-model pressure-level support, and update cadences. Do not write a model
config from memory or from assumption — every value should trace to that document.

If the findings document is missing, incomplete, or contradicts what you observe in a
live response, stop and report rather than guessing.

### 1. Region-scoped model lists

`src/data/models.js` currently exports one flat `MODEL_ORDER` and one `ENSEMBLE_CONFIGS`.
Split these per region:

- **USA:** unchanged — HRRR, ECMWF, GFS, ICON, NAM; ensembles GEFS + ECMWF-ENS.
- **Europe:** remove HRRR and NAM entirely (both are CONUS-only domains — they return no
  data for Alpine coordinates, so requesting them is pure wasted quota).

`main.js` should read the active region to pick which list drives fetching and settings
rendering. The fetch/cache logic itself does not change.

### 2. Europe model list

| Model | Label | Default state |
|---|---|---|
| MeteoSwiss ICON Seamless | `MeteoSwiss Seamless` | **ON — the only default-on model** |
| MeteoSwiss ICON-CH1 | `MeteoSwiss CH1` | off |
| MeteoSwiss ICON-CH2 | `MeteoSwiss CH2` | off |
| DWD ICON-D2 | `ICON-D2` | off |
| AROME Austria | `AROME Austria` | off |
| ECMWF IFS HRES | `ECMWF IFS HRES (9km)` | off |
| DWD ICON Seamless | `DWD ICON Seamless` | off |
| GFS Seamless | `GFS` | off |

**Exactly one model is enabled by default in Europe: MeteoSwiss Seamless.** Every other
model is present in the list and user-toggleable, but off on first load. This is
deliberate — a first Europe page load should fire a single deterministic request. Do not
"helpfully" enable a second model for a better out-of-box view.

**Naming — read carefully.** The app's existing `icon` row (DWD's dedicated endpoint,
`modelsParam: null`) becomes **"DWD ICON Seamless"**, and the new MeteoSwiss blend is
**"MeteoSwiss Seamless"**. Neither is bare "ICON Seamless" in Europe — both are ICON
derivatives and must stay distinguishable. In the USA region, where there is no MeteoSwiss
row, rename plain `ICON` → `ICON Seamless`. Make sure these longer names wrap properly in
the table headers.

If Session 0 concluded that a separate ICON-D2 row is redundant with DWD ICON Seamless,
raise that before implementing it rather than silently adding both.

### 3. Models with no winds-aloft data

CH1 and CH2 are believed not to support pressure-level wind/temperature on Open-Meteo
(confirm against the Session 0 findings). The app already handles this case — the ECMWF
config uses `pressureLevels: []` and renders surface levels only (`models.js:73`). Follow
that existing pattern for any model lacking pressure-level data; do not special-case it.

Make sure the UI doesn't present an empty or misleading table for such models — a model
showing only surface rows should be visibly understandable as such, not look like a
loading failure.

### 4. Ensembles

Handle per the Session 0 findings for question A:

- **If CH1/CH2 return single deterministic series** from the standard forecast endpoint,
  they are ordinary models in the list above — no special treatment, no gating.
- **If they return full ensemble members**, they are expensive (roughly 10–50× a
  deterministic model). In that case give them the same lazy treatment as the existing
  GEFS/ECMWF-ENS view: fetched only when their section is opened, never on location load.

Report which branch applies before implementing it.

### 5. Cache TTLs for new models

Each new model needs a correct `runSchedule` and `availabilityDelayMinutes` in its config
so `modelTTL()` (`src/api/cache.js`) doesn't re-request before new data exists. Use the
update cadences recorded in the Session 0 findings — do not copy an existing model's
schedule as a placeholder.

### 6. Update the Model Info button content for both regions.

### 7. Fetch policy — ALREADY DECIDED, do not re-research or "optimize"

This was analyzed already. Implement it as stated; do not investigate alternatives.

- **Toggling a model ON fetches only that one model.** Never refetch the whole enabled
  set because one model changed. This is existing behavior in `onModelToggle`
  (`main.js:899-913`) — it checks `modelData[modelId]` first and calls `fetchModel()` for
  that single ID only. **Preserve it exactly.** The same applies to the model-days slider
  (`onModelDaysChange`): refetch that one model, nothing else.
- **Toggling a model OFF fetches nothing** and must not discard already-fetched data —
  re-enabling it in the same session should render from memory with zero network calls.
- **Extra-row toggles must NEVER trigger a network request.** They are render-only
  filters over data already in memory. Keep requesting each enabled model's full variable
  set in one request. Existing behavior — preserve it.
- **Ensembles are fetched lazily**, only when their view is opened.

Rationale, so you don't second-guess it: Open-Meteo bills by a weighted formula with a
hard multi-day floor, against a limited free tier. Splitting requests per-row would save
a trivial amount of weight while multiplying raw request count against the separate
per-minute and per-hour caps, and would add real complexity merging partial data into
already-rendered tables. Refetching all models on a single toggle would multiply cost by
the number of enabled models for zero benefit.

---

## SESSION 4 — Model ordering, ensemble dropdown, All Locations selector

Read all changes below before starting. Implement directly, summarizing per section.

**1. Reorderable models.**
Let the user change the display order of models. Add drag handles (triple horizontal
lines) to each model row in the Models & Forecast dropdown, draggable up and down.
Persist the order per region. Keep the current order as each region's default.

Note: `.tables-wrapper` in `index.html` currently hardcodes one static `<div>` per model.
For ordering (and for two different regional model sets) to work cleanly, render the
table sections dynamically from the active region's model list instead. This is more work
up front than hardcoding both regions' divs, but it avoids maintaining a duplicated block
of HTML every time a model is added.

**2. Ensemble models in the Models dropdown.**
Currently the ensemble models don't appear under Models & Forecast at all. When the
ensemble view is active, the dropdown should show the ensemble models instead of the
regular deterministic models. Ordering should be saved separately for ensembles.

**3. All Locations model selector.**
Add a setting to choose which single model or ensemble is used for the All Locations
display. Make it per-region (each region remembers its own choice). Defaults: USA →
HRRR; Europe → MeteoSwiss Seamless (the only model enabled there by default).

If the selected model is toggled off, fall back to the first enabled model rather than
showing an empty view. Note this matters more in Europe than USA — Europe ships with
only one model enabled, so a user who disables MeteoSwiss Seamless without enabling
anything else leaves zero models available. Handle that case explicitly (show a clear
"no models enabled" message rather than a blank or broken view).

---

## SESSION 5 — Cloud base

**Prerequisite: read the `cloud_base` section of `docs/openmeteo-model-findings.md`
(Session 0)** for per-model support, exact parameter name, units, and whether values are
AGL or MSL.

**Request `cloud_base` natively from the API. Do NOT compute or derive it** from
temperature/dewpoint spread or any other formula. Most models expose it directly — for
example this returns it for all three MeteoSwiss models:

```
https://api.open-meteo.com/v1/forecast?latitude=47.37&longitude=8.55&hourly=temperature_2m,cloud_base&models=meteoswiss_icon_seamless,meteoswiss_icon_ch1,meteoswiss_icon_ch2&forecast_days=3
```

**1. Add `cloud_base` to the request.**
Add it to `extraHourlyParams` for every model the findings show supports it. For models
that do not support it, leave it out of the request and mark the capability false in the
model config so the UI knows the row is unavailable — do not substitute a computed value.

Note `src/data/models.js` already has an unused `boundaryLayerHeight: false` capability
flag on every model config, scaffolded but never wired up. Follow that existing
capability-flag pattern for `cloudBase`.

Handle units explicitly: if the API returns metres, convert for display via the existing
`src/data/units.js` helpers rather than adding a unit parameter to the request. Confirm
whether values are AGL or MSL and make the app's handling consistent with how it treats
altitude rows (which are MSL, with an optional AGL display mode via `showGroundLevel`).

**2. Extra row — compact display.**
Add a Cloud Base row to the Extra Rows toggles. Display must be compact so it doesn't
widen columns. Abbreviate:

- feet: `10ft → 10`, `100ft → 100`, `1000ft → 1k`, `10000ft → 10k`, `15648ft → 15.6k`
- meters: same scheme

**3. Filter — red column borders.**
Add Cloud Base to the Filters section. When enabled, for each model that has cloud-base
data, draw a vertical red border on the left and right side of each hour column,
extending from the horizontal black line above the `33ft` label up to the top of the row
closest to that hour's cloud base. Applies to the Wind and Clouds tables.

Example: if cloud base at 10AM is 5k ft, the 10AM column gets red vertical lines running
from just above the 33ft row up to the row nearest 5k ft.

Handle these edge cases explicitly and tell me what you chose:
- Cloud base **below** the lowest displayed row
- Cloud base **above** the highest displayed row
- Cloud base above the "Hide >" altitude cutoff (border should presumably clamp to the
  top of the visible rows)
- Cloud base data missing or null for a given hour (no border for that column — note that
  a null `cloud_base` typically means *no cloud*, which is meaningful, not an error)
- Models with no cloud-base support at all (no borders, and ideally an indication why)

Use the same centered/overlapping border technique established in Session 1 so these
lines don't double up against adjacent cell borders.
