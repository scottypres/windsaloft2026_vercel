import { modelLabelFor } from '../data/models.js';

// Model Info popup content, per region. Every resolution, range, update
// cadence and pressure-level claim here traces to docs/openmeteo-model-findings.md,
// which verified each one against a live Open-Meteo response.

const CARDS = {
  hrrr: {
    title: 'HRRR',
    tag: 'High-Resolution Rapid Refresh',
    meta: 'Resolution: 3 km • Range: 0–48 hrs • Updates: Hourly • Coverage: Continental US',
    body: 'The highest resolution model available, HRRR excels at capturing local terrain effects, convective initiation, and fine-scale wind patterns. Updated every hour, it provides the freshest short-range forecast.',
    accuracy: 'Excellent 0–12 hrs, good 12–24 hrs, degrades significantly after 24 hrs. Best model for same-day planning. Trust it most for the next 6–12 hours.',
  },
  ecmwf: {
    title: 'ECMWF',
    tag: 'IFS HRES, 9 km',
    meta: 'Resolution: 9 km (O1280 grid) • Range: 0–15 days • Updates: 2x daily (00Z, 12Z) • Coverage: Global',
    body: 'Widely considered the gold standard for medium-range forecasting, and this is the full-resolution 9 km HRES rather than the 0.25° open-data set. Note it publishes no pressure-level winds — this row shows surface levels only (10/100/200 m).',
    accuracy: 'Very good 0–5 days, good 5–10 days, diminishing skill 10–15 days. Generally the most reliable model for planning several days ahead.',
  },
  gfs_seamless: {
    title: 'GFS',
    tag: 'Global Forecast System (Seamless)',
    meta: 'Resolution: ~13 km • Range: 0–14 days • Updates: 4x daily (00/06/12/18Z) • Coverage: Global',
    body: "NOAA's primary global model, and the only one here with a complete set of pressure levels — all 29 the app can display, from 1000 hPa to 100 hPa. GFS Seamless blends higher-resolution models for the short range.",
    accuracy: 'Good 0–5 days, moderate 5–10 days, low skill beyond 10 days. Generally slightly behind ECMWF but still very useful. More frequent updates can catch changes faster.',
  },
  icon: {
    title: 'ICON Seamless',
    tag: 'DWD, D2 → EU → Global blend',
    meta: 'Resolution: ~2 km near-term, ~7 km EU, ~11 km global • Range: 0–7.5 days • Updates: every 3 hrs • Coverage: Global',
    body: "Germany's DWD model, served as a seamless blend: ICON-D2 drives the first 48 hours, then ICON-EU to 5 days, then ICON Global. Verified identical to requesting ICON-D2 directly over its whole range, which is why there is no separate D2 row. Serves 16 pressure levels.",
    accuracy: 'Good 0–3 days, moderate 3–5 days, drops off beyond 5 days. Comparable to GFS overall, often better for European locations.',
  },
  nam: {
    title: 'NAM',
    tag: 'North American Mesoscale',
    meta: 'Resolution: ~12 km • Range: 0–84 hrs • Updates: 4x daily • Coverage: North America',
    body: "NOAA's regional mesoscale model for North America. Provides a useful second opinion alongside HRRR for short-range forecasts. Better at resolving frontal boundaries and precipitation patterns than global models.",
    accuracy: 'Good 0–2 days, moderate 2–3 days, low skill beyond 3 days. Most useful as a comparison to HRRR in the first 48 hours.',
  },

  meteoswiss_seamless: {
    title: 'MeteoSwiss Seamless',
    tag: 'ICON-CH1 → ICON-CH2 blend',
    meta: 'Resolution: ~1 km to 33 hrs, then ~2 km • Range: 0–5 days • Updates: every 3 hrs • Coverage: Alps and surrounds',
    body: "MeteoSwiss's own ICON blend and the sharpest picture available in the Alps: ICON-CH1 at 1 km for the first 33 hours, then ICON-CH2 out to 5 days. Surface only — Open-Meteo publishes no pressure-level winds for any MeteoSwiss product, so this row shows 10 m wind and 2 m temperature plus the supplementary rows.",
    accuracy: 'Excellent 0–24 hrs in complex terrain, good to 3 days, moderate beyond. The default Europe model and the best first look at an Alpine site.',
  },
  meteoswiss_ch1: {
    title: 'MeteoSwiss CH1',
    tag: 'ICON-CH1, 1 km',
    meta: 'Resolution: ~1 km • Range: 0–33 hrs • Updates: every 3 hrs • Coverage: Alps and surrounds',
    body: 'The highest-resolution model in this app at roughly 1 km, resolving individual valleys and ridges. Short range and surface only. Open-Meteo serves the deterministic run here; the 11-member ensemble lives on a separate endpoint this app does not use.',
    accuracy: 'Excellent 0–18 hrs, good to its 33 hr limit. Use it to sharpen a same-day or next-morning call the Seamless blend already suggested.',
  },
  meteoswiss_ch2: {
    title: 'MeteoSwiss CH2',
    tag: 'ICON-CH2, 2 km',
    meta: 'Resolution: ~2 km • Range: 0–5 days • Updates: 4x daily (00/06/12/18Z) • Coverage: Alps and surrounds',
    body: 'The longer-range half of the MeteoSwiss pair at roughly 2 km, running out to 120 hours. Surface only, same variable set as CH1. Open-Meteo serves the deterministic run; the 21-member ensemble is on a separate endpoint.',
    accuracy: 'Good 0–3 days, moderate 3–5 days. Useful for checking whether a multi-day Alpine pattern holds.',
  },
  arome_austria: {
    title: 'AROME Austria',
    tag: 'GeoSphere Austria',
    meta: 'Resolution: 2.5 km • Range: 0–60 hrs • Updates: every 3 hrs • Coverage: Eastern Alps',
    body: 'GeoSphere Austria\'s high-resolution model, centred on the Eastern Alps but returning data across a wider area including Switzerland and southern Germany. Surface only, and the thinnest variable set here — no freezing level, visibility or precipitation probability.',
    accuracy: 'Good 0–24 hrs in the Eastern Alps, moderate to its 60 hr limit. Best used as a second opinion against MeteoSwiss for Austrian sites.',
  },
  ecmwf_ifs025: {
    title: 'ECMWF IFS (25km)',
    tag: 'IFS 0.25° open data',
    meta: 'Resolution: 0.25° (~25 km) • Range: 0–15 days • Updates: 2x daily (00Z, 12Z) • Coverage: Global',
    body: "The 0.25° open-data IFS. Coarser than the 9 km HRES, but it is the only ECMWF product Open-Meteo serves with pressure-level winds — 12 levels from 1000 hPa to 100 hPa — so it is the ECMWF row that can actually draw an altitude profile. Use it for the medium-range picture, not for terrain detail.",
    accuracy: 'Very good 0–5 days, good 5–10 days, diminishing 10–15 days. The best long-range guidance here; pair it with MeteoSwiss for the near term.',
  },
};

const ENSEMBLE_CARDS = {
  gefs: {
    title: 'GEFS Ensemble',
    tag: '30 Members',
    meta: 'Members: 30 • Range: 0–14 days • Base: GFS',
    body: 'Runs the GFS model 30 times with slightly different initial conditions. The average gives a more stable forecast than any single run. The spread between members indicates confidence — when members agree (green), the forecast is more trustworthy; when they disagree (yellow/red), conditions are uncertain.',
  },
  ecmwf_ens: {
    title: 'ECMWF Ensemble',
    tag: '50 Members',
    meta: 'Members: 50 • Range: 0–14 days • Base: ECMWF IFS 0.25°',
    body: 'The ECMWF ensemble uses 50 perturbed members — the largest major ensemble system. Combined with the superior ECMWF base model, it provides the most reliable probabilistic forecast available. Color coding works the same as GEFS: green = high agreement, red = low agreement.',
  },
};

const TIPS = {
  usa: 'When models disagree on timing or intensity, give more weight to HRRR for 0–24 hrs and ECMWF beyond 3 days. Compare at least 2–3 models before making flying decisions. Use the Ensemble view to gauge overall forecast confidence.',
  europe: 'Only MeteoSwiss Seamless is on by default, so a fresh Europe load makes a single request — enable others as you need them. For winds aloft you need DWD ICON Seamless, ECMWF IFS (25km) or GFS; the MeteoSwiss and AROME rows are surface only. In the Alps trust MeteoSwiss for 0–24 hrs and ECMWF beyond 3 days.',
};

function card(c) {
  return (
    '<div class="model-info-card">' +
    `<h3>${c.title} <span class="model-tag">${c.tag}</span></h3>` +
    `<div class="model-meta">${c.meta}</div>` +
    `<p>${c.body}</p>` +
    (c.accuracy
      ? `<div class="model-accuracy"><strong>Accuracy vs. Time:</strong> ${c.accuracy}</div>`
      : '') +
    '</div>'
  );
}

export function renderModelInfo(modelOrder, region) {
  const body = document.querySelector('.model-info-popup-body');
  if (!body) return;
  const cards = modelOrder
    .filter((id) => CARDS[id])
    // Card headings must match the model toggles and table headers exactly,
    // and one model is named differently per region.
    .map((id) => card({ ...CARDS[id], title: modelLabelFor(id, region) }));
  const ensembles = Object.values(ENSEMBLE_CARDS).map(card);
  body.innerHTML =
    cards.join('') +
    ensembles.join('') +
    `<div class="model-info-tip"><strong>Tip:</strong> ${TIPS[region] || TIPS.usa}</div>`;
}
