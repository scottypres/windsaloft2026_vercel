import { windArrow } from './arrows.js';
import {
  windColor,
  tempColor,
  cloudColor,
  cloudTextColor,
  capeColor,
  liftedIndexColor,
  precipColor,
  precipInchesColor,
  humidityColor,
  visibilityColor,
  textColorFor,
} from '../data/colors.js';
import { LOWEST_3_KEYS } from '../data/altitudes.js';

// Render a full forecast table into a container element
export function renderTable(container, data, options = {}) {
  const {
    view = 'wind', // 'wind' | 'temp' | 'clouds'
    windThresholds = { calm: 7, moderate: 15, strong: 20 },
    showDaylightOnly = false,
    hideHighAltitude = false,
    showWindShear = false,
    showFogMode = false,
    bestHoursThreshold = null, // null = disabled, number = max mph
    supplementaryRows = {},
  } = options;

  // Filter hours
  let hourIndices = data.hours.map((_, i) => i);

  if (showDaylightOnly) {
    hourIndices = hourIndices.filter((i) => data.hours[i].isDay);
  }

  if (bestHoursThreshold != null) {
    hourIndices = hourIndices.filter((i) => {
      return LOWEST_3_KEYS.every((key) => {
        const alt = data.altitudes.find((a) => a.key === key);
        if (!alt) return true;
        const speed = alt.wind[i]?.speed;
        return speed == null || speed <= bestHoursThreshold;
      });
    });
  }

  if (hourIndices.length === 0) {
    container.innerHTML = `<div class="no-data">No hours match the current filters.</div>`;
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
    altRows = altRows.filter((a) => !a.isHighAltitude);
  }

  const html = [];
  html.push('<table class="forecast-table">');

  // Header
  html.push('<thead><tr>');
  html.push(`<th class="corner-cell">${data.model.toUpperCase()}</th>`);
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
    html.push(`<tr class="${surfaceClass}">`);
    html.push(`<td class="alt-label">${alt.label}</td>`);

    for (const i of hourIndices) {
      const h = data.hours[i];
      const dayClass = h.isDay ? 'day-col' : 'night-col';
      const boundary =
        hourIndices.indexOf(i) > 0 &&
        data.hours[hourIndices[hourIndices.indexOf(i) - 1]]?.dateLabel !== h.dateLabel
          ? ' day-boundary'
          : '';

      if (view === 'wind') {
        const w = alt.wind[i];
        const speed = w?.speed;
        const dir = w?.direction;
        const bg = windColor(speed, windThresholds);
        const color = textColorFor(bg);
        const val = speed != null ? speed : '?';
        const arrow = windArrow(dir);
        html.push(
          `<td class="cell ${dayClass}${boundary}" style="background:${bg};color:${color}" data-alt="${alt.key}" data-hour="${i}">` +
            `<div class="cell-value">${val}</div>${arrow ? `<div class="cell-arrow">${arrow}</div>` : ''}</td>`
        );
      } else if (view === 'temp') {
        const t = alt.temp ? alt.temp[i] : null;
        const val = t != null ? Math.round(t) : '?';
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

  // Supplementary rows
  if (view === 'wind' || view === 'clouds') {
    const suppRows = buildSupplementaryRows(data, view, hourIndices, windThresholds, supplementaryRows);
    // Pre-compute fog likelihood per hour for highlighting supp cells
    const fogLabels = new Set(['DP Spread', 'Temp °F', 'Vis (mi)']);
    for (const row of suppRows) {
      html.push('<tr class="supp-row">');
      html.push(`<td class="alt-label supp-label">${row.label}</td>`);
      for (let j = 0; j < hourIndices.length; j++) {
        const cell = row.cells[j];
        const hi = hourIndices[j];
        const h = data.hours[hi];
        const dayClass = h.isDay ? 'day-col' : 'night-col';
        const boundary =
          j > 0 && data.hours[hourIndices[j - 1]]?.dateLabel !== h.dateLabel ? ' day-boundary' : '';
        // Fog warning on relevant supp cells
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
  if (view === 'wind' && showWindShear) {
    applyWindShear(container, data, altRows, hourIndices, hideHighAltitude);
  }

}

function buildSupplementaryRows(data, view, hourIndices, windThresholds, shown) {
  const rows = [];
  const s = data.surface;
  const model = data.model;

  if (view === 'wind') {
    if (shown.gusts) {
      rows.push(makeRow('Gusts', hourIndices, (i) => {
        const v = s.gusts[i];
        const val = v != null ? Math.round(v) : '?';
        return { val, bg: windColor(v, windThresholds), color: textColorFor(windColor(v, windThresholds)) };
      }));
    }
    if (shown.cape && model === 'gfs' && s.cape) {
      rows.push(makeRow('CAPE', hourIndices, (i) => {
        const v = s.cape[i];
        const val = v != null ? Math.round(v) : '?';
        const bg = capeColor(v);
        return { val, bg, color: textColorFor(bg) };
      }));
    }
    if (shown.liftedIndex && model === 'gfs' && s.liftedIndex) {
      rows.push(makeRow('Lift Idx', hourIndices, (i) => {
        const v = s.liftedIndex[i];
        const val = v != null ? v.toFixed(1) : '?';
        const bg = liftedIndexColor(v);
        return { val, bg, color: textColorFor(bg) };
      }));
    }
    if (shown.precipProb && model === 'gfs' && s.precipProb) {
      rows.push(makeRow('Precip %', hourIndices, (i) => {
        const v = s.precipProb[i];
        const val = v != null ? `${Math.round(v)}%` : '?';
        const bg = precipColor(v);
        return { val, bg, color: textColorFor(bg) };
      }));
    }
    if (shown.precipInches && model === 'icon' && s.precipInches) {
      rows.push(makeRow('Precip in', hourIndices, (i) => {
        const v = s.precipInches[i];
        const val = v != null ? v.toFixed(2) : '?';
        const bg = precipInchesColor(v);
        return { val, bg, color: textColorFor(bg) };
      }));
    }
    if (shown.temp) {
      rows.push(makeRow('Temp °F', hourIndices, (i) => {
        const v = s.temp2m[i];
        const val = v != null ? Math.round(v) : '?';
        const bg = tempColor(v);
        return { val, bg, color: textColorFor(bg) };
      }));
    }
    if (shown.humidity) {
      rows.push(makeRow('Humidity', hourIndices, (i) => {
        const v = s.humidity[i];
        const val = v != null ? `${Math.round(v)}%` : '?';
        const bg = humidityColor(v);
        return { val, bg, color: textColorFor(bg) };
      }));
    }
    if (shown.dewpointSpread) {
      rows.push(makeRow('DP Spread', hourIndices, (i) => {
        const v = s.dewpointSpread[i];
        const val = v != null ? `${v}°` : '?';
        const bg = v != null && v < 3 ? '#e74c3c' : v != null && v < 6 ? '#f0c040' : '#66bb6a';
        return { val, bg, color: textColorFor(bg) };
      }));
    }
    if (shown.visibility && model === 'gfs' && s.visibility) {
      rows.push(makeRow('Vis (mi)', hourIndices, (i) => {
        const v = s.visibility[i];
        const val = v != null ? v.toFixed(1) : '?';
        const bg = visibilityColor(v);
        return { val, bg, color: textColorFor(bg) };
      }));
    }
    if (shown.cloudCover) {
      rows.push(makeRow('Clouds %', hourIndices, (i) => {
        const v = s.cloudCover[i];
        const val = v != null ? `${Math.round(v)}%` : '?';
        const bg = cloudColor(v);
        const color = cloudTextColor(v);
        return { val, bg, color };
      }));
    }
    if (shown.cloudLow) {
      rows.push(makeRow('Low Cld', hourIndices, (i) => {
        const v = s.cloudLow[i];
        const val = v != null ? `${Math.round(v)}%` : '?';
        const bg = cloudColor(v);
        return { val, bg, color: cloudTextColor(v) };
      }));
    }
    if (shown.cloudMid) {
      rows.push(makeRow('Mid Cld', hourIndices, (i) => {
        const v = s.cloudMid[i];
        const val = v != null ? `${Math.round(v)}%` : '?';
        const bg = cloudColor(v);
        return { val, bg, color: cloudTextColor(v) };
      }));
    }
    if (shown.cloudHigh) {
      rows.push(makeRow('High Cld', hourIndices, (i) => {
        const v = s.cloudHigh[i];
        const val = v != null ? `${Math.round(v)}%` : '?';
        const bg = cloudColor(v);
        return { val, bg, color: cloudTextColor(v) };
      }));
    }
  }

  if (view === 'clouds') {
    // High/Mid/Low cloud summary rows
    if (shown.cloudHigh !== false) {
      rows.push(makeRow('High Clouds', hourIndices, (i) => {
        const v = s.cloudHigh[i];
        const val = v != null ? `${Math.round(v)}%` : '?';
        const bg = cloudColor(v);
        return { val, bg, color: cloudTextColor(v) };
      }));
    }
    if (shown.cloudMid !== false) {
      rows.push(makeRow('Mid Clouds', hourIndices, (i) => {
        const v = s.cloudMid[i];
        const val = v != null ? `${Math.round(v)}%` : '?';
        const bg = cloudColor(v);
        return { val, bg, color: cloudTextColor(v) };
      }));
    }
    if (shown.cloudLow !== false) {
      rows.push(makeRow('Low Clouds', hourIndices, (i) => {
        const v = s.cloudLow[i];
        const val = v != null ? `${Math.round(v)}%` : '?';
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

function applyWindShear(container, data, altRows, hourIndices, hideHighAltitude) {
  const filteredAlts = hideHighAltitude
    ? data.altitudes.filter((a) => !a.isHighAltitude)
    : data.altitudes;

  const table = container.querySelector('.forecast-table');
  if (!table) return;
  const rows = table.querySelectorAll('tbody tr:not(.supp-row)');

  for (let colIdx = 0; colIdx < hourIndices.length; colIdx++) {
    const hi = hourIndices[colIdx];
    for (let rowIdx = 0; rowIdx < filteredAlts.length - 1; rowIdx++) {
      const upper = filteredAlts[rowIdx].wind[hi];
      const lower = filteredAlts[rowIdx + 1].wind[hi];
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

