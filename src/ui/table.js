import { windArrow } from './arrows.js';
import {
  windColor,
  tempColor,
  cloudColor,
  cloudTextColor,
  capeColor,
  precipColor,
  precipInchesColor,
  humidityColor,
  visibilityColor,
  textColorFor,
  spreadColor,
} from '../data/colors.js';
import { BEST_HOURS_MAX_FEET } from '../data/altitudes.js';
import {
  DEFAULT_UNITS,
  WIND_UNIT_LABELS,
  windTo,
  tempTo,
  tempDeltaTo,
  altitudeLabel,
  aglLabel,
} from '../data/units.js';

// A pressure level within this many feet of the site elevation still counts as
// "at ground" rather than underground — avoids greying a row that is basically
// at the surface due to standard-atmosphere rounding.
const GROUND_TOL_FEET = 30;

// Render a full forecast table into a container element
export function renderTable(container, data, options = {}) {
  const {
    view = 'wind', // 'wind' | 'temp' | 'clouds'
    windThresholds = { calm: 7, moderate: 15, strong: 20 },
    showDaylightOnly = false,
    hideHighAltitude = false,
    hideAboveFeet = 5000,
    showWindShear = false,
    showFogMode = false,
    bestHoursThreshold = null,
    supplementaryRows = {},
    isEnsemble = false,
    sharedDaylight = null,
    units = DEFAULT_UNITS,
    showGroundLevel = false,
    siteElevationFt = null,
  } = options;

  // Filter hours
  let hourIndices = data.hours.map((_, i) => i);

  if (showDaylightOnly) {
    // Use the shared cross-model daylight mask when available so every table
    // shows the same columns for the same timestamps (keeps day dividers
    // aligned between stacked tables); fall back to this model's own flag.
    hourIndices = hourIndices.filter((i) => {
      const h = data.hours[i];
      const shared = sharedDaylight ? sharedDaylight.get(h.time) : undefined;
      return shared != null ? shared : h.isDay;
    });
  }

  if (bestHoursThreshold != null) {
    const lowAlts = data.altitudes.filter((a) => a.feet <= BEST_HOURS_MAX_FEET);
    hourIndices = hourIndices.filter((i) => {
      return lowAlts.every((alt) => {
        const speed = alt.wind[i]?.speed;
        return speed == null || speed <= bestHoursThreshold;
      });
    });
  }

  if (hourIndices.length === 0) {
    const msg = data.hours.length === 0
      ? 'No forecast data available for this location.'
      : 'No hours match the current filters.';
    container.innerHTML = `<div class="no-data">${msg}</div>`;
    return;
  }

  // Choose altitude rows
  let altRows;
  if (view === 'clouds') {
    altRows = data.cloudAltitudes || [];
  } else {
    altRows = data.altitudes;
  }
  if (hideHighAltitude) {
    altRows = altRows.filter((a) => a.feet <= hideAboveFeet);
  }
  // In temp view, skip altitude rows where all temp values are null
  if (view === 'temp') {
    altRows = altRows.filter((a) => a.temp && a.temp.some((t) => t != null));
  }

  // Ground-level (site elevation) mode: re-express every altitude on a single
  // "height above your site" axis. Pressure levels are MSL, so their AGL is
  // feet − siteElevation; the 10m/80m… surface rows are already AGL. We tag
  // each row with its AGL, re-sort by it (so surface winds land at the ground
  // line instead of being pinned to the bottom), then drop everything below the
  // terrain — those levels are underground at this site and unflyable.
  const groundOn = showGroundLevel && siteElevationFt != null && altRows.length > 0;
  if (groundOn) {
    altRows = altRows
      .map((a) => ({ ...a, _agl: a.key.endsWith('hPa') ? a.feet - siteElevationFt : a.feet }))
      .filter((a) => a._agl >= -GROUND_TOL_FEET)
      .sort((a, b) => b._agl - a._agl);
  }

  const html = [];
  const headerLabel = data.modelLabel || data.model.toUpperCase();

  // For ensemble models, show label above the table
  if (isEnsemble) {
    html.push(`<div class="table-model-label">${headerLabel}</div>`);
  }

  html.push('<table class="forecast-table">');

  // Header
  html.push('<thead><tr>');
  html.push(`<th class="corner-cell">${isEnsemble ? '' : headerLabel}</th>`);
  let prevDate = '';
  for (const i of hourIndices) {
    const h = data.hours[i];
    const dayClass = h.isDay ? 'day-col' : 'night-col';
    const boundary = h.dateLabel !== prevDate && prevDate !== '' ? ' day-boundary' : '';
    prevDate = h.dateLabel;
    html.push(
      `<th class="hour-header ${dayClass}${boundary}">` +
        `<div class="date-label">${h.dateLabel}</div>` +
        `<div class="dow-label">${h.dayOfWeek}</div>` +
        `<div class="hour-label">${h.hourLabel}</div>` +
        `</th>`
    );
  }
  html.push('</tr></thead>');

  // Body
  html.push('<tbody>');

  // Altitude rows
  for (const alt of altRows) {
    const surfaceClass = alt.key === '10m' ? ' surface-row' : '';
    html.push(`<tr class="alt-data-row${surfaceClass}">`);
    if (groundOn) {
      html.push(
        `<td class="alt-label" title="${alt.feet.toLocaleString()}ft MSL">${aglLabel(alt._agl, units.altitude)}</td>`
      );
    } else {
      html.push(`<td class="alt-label">${altitudeLabel(alt.feet, units.altitude)}</td>`);
    }

    for (let j = 0; j < hourIndices.length; j++) {
      const i = hourIndices[j];
      const h = data.hours[i];
      const dayClass = h.isDay ? 'day-col' : 'night-col';
      const boundary =
        j > 0 && data.hours[hourIndices[j - 1]]?.dateLabel !== h.dateLabel
          ? ' day-boundary'
          : '';

      if (view === 'wind' || (isEnsemble && view !== 'clouds' && view !== 'temp')) {
        const w = alt.wind[i];
        const speed = w?.speed;
        const dir = w?.direction;
        let bg;
        if (isEnsemble) {
          // Ensemble: color based on spread (confidence), not wind speed
          bg = spreadColor(w?.spread);
        } else {
          bg = windColor(speed, windThresholds);
        }
        const color = textColorFor(bg);
        const val = speed != null ? Math.round(windTo(speed, units.wind)) : '?';
        const arrow = windArrow(dir);
        const title = isEnsemble && w?.spread != null
          ? ` title="\u00b1${Math.round(windTo(w.spread, units.wind) * 10) / 10} ${WIND_UNIT_LABELS[units.wind]} spread"`
          : '';
        html.push(
          `<td class="cell ${dayClass}${boundary}" style="background:${bg};color:${color}" data-alt="${alt.key}" data-hour="${i}"${title}>` +
            `<div class="cell-value">${val}</div>${arrow ? `<div class="cell-arrow">${arrow}</div>` : ''}</td>`
        );
      } else if (view === 'temp') {
        const t = alt.temp ? alt.temp[i] : null;
        const val = t != null ? Math.round(tempTo(t, units.temp)) : '?';
        const bg = tempColor(t);
        const color = textColorFor(bg);
        html.push(
          `<td class="cell ${dayClass}${boundary}" style="background:${bg};color:${color}">${val}°</td>`
        );
      } else if (view === 'clouds') {
        const c = alt.cloud ? alt.cloud[i] : null;
        const val = c != null ? Math.round(c) : '?';
        const bg = cloudColor(c);
        const color = cloudTextColor(c);
        html.push(
          `<td class="cell ${dayClass}${boundary}" style="background:${bg};color:${color}">${val}%</td>`
        );
      }
    }
    html.push('</tr>');
  }

  // Everything underground has been filtered out, so the ground line closes
  // out the altitude block.
  if (groundOn) {
    html.push(groundLineRow(siteElevationFt, units, hourIndices.length));
  }

  // Supplementary rows
  if (view === 'wind' || view === 'clouds' || isEnsemble) {
    const suppRows = buildSupplementaryRows(data, view, hourIndices, windThresholds, supplementaryRows, isEnsemble, units);
    const fogLabels = new Set(['DP Spread', `Temp °${units.temp}`, 'Vis (mi)']);
    for (const row of suppRows) {
      const promoted = row.label === 'Gusts' ? ' supp-row-promoted' : '';
      html.push(`<tr class="supp-row${promoted}">`);
      html.push(`<td class="alt-label supp-label">${row.label}</td>`);
      for (let j = 0; j < hourIndices.length; j++) {
        const cell = row.cells[j];
        const hi = hourIndices[j];
        const h = data.hours[hi];
        const dayClass = h.isDay ? 'day-col' : 'night-col';
        const boundary =
          j > 0 && data.hours[hourIndices[j - 1]]?.dateLabel !== h.dateLabel ? ' day-boundary' : '';
        let fogClass = '';
        if (showFogMode && fogLabels.has(row.label)) {
          const humidity = data.surface.humidity[hi];
          const dpSpread = data.surface.dewpointSpread[hi];
          const vis = data.surface.visibility ? data.surface.visibility[hi] : null;
          if (
            (humidity != null && humidity > 90) ||
            (dpSpread != null && dpSpread < 3) ||
            (vis != null && vis < 2)
          ) {
            fogClass = ' fog-warning';
          }
        }
        html.push(
          `<td class="cell supp-cell ${dayClass}${boundary}${fogClass}" style="background:${cell.bg};color:${cell.color}">${cell.val}</td>`
        );
      }
      html.push('</tr>');
    }
  }

  html.push('</tbody></table>');

  container.innerHTML = html.join('');

  // Post-render: wind shear detection
  if ((view === 'wind' || isEnsemble) && showWindShear) {
    applyWindShear(container, altRows, hourIndices);
  }
}

// Render the ground-line marker row: an earthy divider labeling the site's
// true elevation, sitting between the above-ground and sub-terrain rows.
function groundLineRow(siteElevationFt, units, numCols) {
  const elev =
    units.altitude === 'm'
      ? `${Math.round(siteElevationFt * 0.3048).toLocaleString()} m`
      : `${Math.round(siteElevationFt).toLocaleString()} ft`;
  return (
    '<tr class="ground-line-row">' +
    '<td class="alt-label ground-line-label">Ground</td>' +
    `<td class="ground-line-cell" colspan="${numCols}">▲ your site ≈ ${elev} MSL ▲</td>` +
    '</tr>'
  );
}

function buildSupplementaryRows(data, view, hourIndices, windThresholds, shown, isEnsemble, units = DEFAULT_UNITS) {
  const rows = [];
  const s = data.surface;

  // Helper: for ensemble view, use spread-based color; otherwise use field-specific color
  function ensOrColor(spreadArr, i, normalBg) {
    if (isEnsemble && spreadArr) {
      const sp = spreadArr[i];
      const bg = spreadColor(sp);
      return { bg, color: textColorFor(bg) };
    }
    return { bg: normalBg, color: textColorFor(normalBg) };
  }

  if (view === 'wind' || view === 'ensemble') {
    if (shown.gusts) {
      rows.push(makeRow('Gusts', hourIndices, (i) => {
        const v = s.gusts[i];
        const val = v != null ? Math.round(windTo(v, units.wind)) : '?';
        const { bg, color } = ensOrColor(s.gustsSpread, i, windColor(v, windThresholds));
        return { val, bg, color };
      }));
    }
    if (shown.cape && s.cape) {
      rows.push(makeRow('CAPE', hourIndices, (i) => {
        const v = s.cape[i];
        const val = v != null ? Math.round(v) : '?';
        const { bg, color } = ensOrColor(s.capeSpread, i, capeColor(v));
        return { val, bg, color };
      }));
    }
    if (shown.precipProb && s.precipProb) {
      rows.push(makeRow('Precip %', hourIndices, (i) => {
        const v = s.precipProb[i];
        const val = v != null ? `${Math.round(v)}` : '?';
        const bg = precipColor(v);
        return { val, bg, color: textColorFor(bg) };
      }));
    }
    if (shown.precipInches && (s.precipInches || s.rainInches)) {
      const src = s.precipInches || s.rainInches;
      rows.push(makeRow('Precip in', hourIndices, (i) => {
        const v = src[i];
        const val = v != null ? v.toFixed(2) : '?';
        const { bg, color } = ensOrColor(s.rainSpread, i, precipInchesColor(v));
        return { val, bg, color };
      }));
    }
    if (shown.temp) {
      rows.push(makeRow(`Temp °${units.temp}`, hourIndices, (i) => {
        const v = s.temp2m[i];
        const val = v != null ? Math.round(tempTo(v, units.temp)) : '?';
        const { bg, color } = ensOrColor(s.temp2mSpread, i, tempColor(v));
        return { val, bg, color };
      }));
    }
    if (shown.humidity && s.humidity && s.humidity.length) {
      rows.push(makeRow('Humid %', hourIndices, (i) => {
        const v = s.humidity[i];
        const val = v != null ? `${Math.round(v)}` : '?';
        const { bg, color } = ensOrColor(s.humiditySpread, i, humidityColor(v));
        return { val, bg, color };
      }));
    }
    if (shown.dewpointSpread) {
      rows.push(makeRow('DP Spread', hourIndices, (i) => {
        const v = s.dewpointSpread[i];
        const val = v != null ? `${Math.round(tempDeltaTo(v, units.temp) * 10) / 10}°` : '?';
        const normalBg = v != null && v < 3 ? '#e74c3c' : v != null && v < 6 ? '#f0c040' : '#66bb6a';
        const { bg, color } = ensOrColor(s.dewpointSpreadSpread, i, normalBg);
        return { val, bg, color };
      }));
    }
    if (shown.visibility && s.visibility) {
      rows.push(makeRow('Vis (mi)', hourIndices, (i) => {
        const v = s.visibility[i];
        const val = v != null ? v.toFixed(1) : '?';
        const { bg, color } = ensOrColor(s.visibilitySpread, i, visibilityColor(v));
        return { val, bg, color };
      }));
    }
    if (shown.cloudCover) {
      rows.push(makeRow('Clouds %', hourIndices, (i) => {
        const v = s.cloudCover[i];
        const val = v != null ? `${Math.round(v)}` : '?';
        const { bg, color } = ensOrColor(s.cloudCoverSpread, i, cloudColor(v));
        return { val, bg, color };
      }));
    }
    if (shown.cloudLow && s.cloudLow && s.cloudLow.length) {
      rows.push(makeRow('Low Cld %', hourIndices, (i) => {
        const v = s.cloudLow[i];
        const val = v != null ? `${Math.round(v)}` : '?';
        const { bg, color } = ensOrColor(s.cloudLowSpread, i, cloudColor(v));
        return { val, bg, color };
      }));
    }
    if (shown.cloudMid && s.cloudMid && s.cloudMid.length) {
      rows.push(makeRow('Mid Cld %', hourIndices, (i) => {
        const v = s.cloudMid[i];
        const val = v != null ? `${Math.round(v)}` : '?';
        const { bg, color } = ensOrColor(s.cloudMidSpread, i, cloudColor(v));
        return { val, bg, color };
      }));
    }
    if (shown.cloudHigh && s.cloudHigh && s.cloudHigh.length) {
      rows.push(makeRow('High Cld %', hourIndices, (i) => {
        const v = s.cloudHigh[i];
        const val = v != null ? `${Math.round(v)}` : '?';
        const { bg, color } = ensOrColor(s.cloudHighSpread, i, cloudColor(v));
        return { val, bg, color };
      }));
    }
  }

  if (view === 'clouds') {
    if (shown.cloudHigh !== false && s.cloudHigh && s.cloudHigh.length) {
      rows.push(makeRow('High Clouds', hourIndices, (i) => {
        const v = s.cloudHigh[i];
        const val = v != null ? `${Math.round(v)}` : '?';
        const bg = cloudColor(v);
        return { val, bg, color: cloudTextColor(v) };
      }));
    }
    if (shown.cloudMid !== false && s.cloudMid && s.cloudMid.length) {
      rows.push(makeRow('Mid Clouds', hourIndices, (i) => {
        const v = s.cloudMid[i];
        const val = v != null ? `${Math.round(v)}` : '?';
        const bg = cloudColor(v);
        return { val, bg, color: cloudTextColor(v) };
      }));
    }
    if (shown.cloudLow !== false && s.cloudLow && s.cloudLow.length) {
      rows.push(makeRow('Low Clouds', hourIndices, (i) => {
        const v = s.cloudLow[i];
        const val = v != null ? `${Math.round(v)}` : '?';
        const bg = cloudColor(v);
        return { val, bg, color: cloudTextColor(v) };
      }));
    }
  }

  return rows;
}

function makeRow(label, hourIndices, cellFn) {
  return {
    label,
    cells: hourIndices.map((i) => cellFn(i)),
  };
}

function applyWindShear(container, altRows, hourIndices) {
  const table = container.querySelector('.forecast-table');
  if (!table) return;
  // Select only altitude data rows (skips the ground-line marker and supp
  // rows) so this NodeList stays index-aligned with altRows, even when
  // ground-level mode has re-sorted the rows by height-above-ground.
  const rows = table.querySelectorAll('tbody tr.alt-data-row');

  for (let colIdx = 0; colIdx < hourIndices.length; colIdx++) {
    const hi = hourIndices[colIdx];
    for (let rowIdx = 0; rowIdx < altRows.length - 1; rowIdx++) {
      const upper = altRows[rowIdx].wind[hi];
      const lower = altRows[rowIdx + 1].wind[hi];
      if (!upper || !lower || upper.speed == null || lower.speed == null) continue;

      const speedDiff = Math.abs(upper.speed - lower.speed);
      let dirDiff = Math.abs((upper.direction || 0) - (lower.direction || 0));
      if (dirDiff > 180) dirDiff = 360 - dirDiff;

      if (speedDiff > 10 || (speedDiff > 5 && dirDiff > 90)) {
        const cellUpper = rows[rowIdx]?.children[colIdx + 1];
        const cellLower = rows[rowIdx + 1]?.children[colIdx + 1];
        if (cellUpper) cellUpper.classList.add('wind-shear');
        if (cellLower) cellLower.classList.add('wind-shear');
      }
    }
  }
}
