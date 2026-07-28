import {
  modelOrderFor,
  modelLabelFor,
  MODEL_CONFIGS,
  ENSEMBLE_CONFIGS,
  ENSEMBLE_ORDER,
} from '../data/models.js';
import { makeReorderable, DRAG_HANDLE_HTML } from './reorder.js';
import { ALTITUDE_UNIT_LABELS, windTo } from '../data/units.js';
import { MAX_ROW_FEET } from '../data/altitudes.js';

// Upper bound for the "Hide >" input, in thousands of each altitude unit —
// no altitude row sits above this, so a higher cutoff would hide nothing.
export function maxHideAboveThousands(unit) {
  const max = unit === 'm' ? MAX_ROW_FEET * 0.3048 : MAX_ROW_FEET;
  return Math.ceil(max / 1000);
}

// The order the models are listed and drawn in, for the active region.
export function orderedModels(prefs) {
  const region = prefs.activeRegion || 'usa';
  const saved = Array.isArray(prefs.modelOrder) ? prefs.modelOrder : [];
  const valid = modelOrderFor(region);
  return saved.length ? saved.filter((id) => valid.includes(id)) : [...valid];
}

export function orderedEnsembles(prefs) {
  const saved = Array.isArray(prefs.ensembleOrder) ? prefs.ensembleOrder : [];
  return saved.length ? saved.filter((id) => ENSEMBLE_ORDER.includes(id)) : [...ENSEMBLE_ORDER];
}

// Build the model rows for the active region. The two regions have different
// model sets and the order is user-editable, so these are generated rather
// than written out in index.html.
//
// In the ensemble view the same list shows the ensemble models instead — they
// are what is on screen, so they are what the dropdown should let you reorder.
// Ensembles carry no per-model toggle or day slider (both are always fetched
// together, over one shared range), so their rows are name and member count.
export function renderModelToggles(prefs) {
  const list = document.getElementById('model-toggle-list');
  if (!list) return;
  const region = prefs.activeRegion || 'usa';
  const ensembleMode = prefs.view === 'ensemble';

  list.classList.toggle('ensemble-mode', ensembleMode);

  if (ensembleMode) {
    list.innerHTML = orderedEnsembles(prefs)
      .map((id) => {
        const config = ENSEMBLE_CONFIGS[id];
        if (!config) return '';
        return (
          `<div class="toggle-label model-toggle" data-order-id="${id}">` +
          DRAG_HANDLE_HTML +
          `<span class="model-name">${config.label}</span>` +
          `<span class="model-note">${config.memberCount} members</span>` +
          `</div>`
        );
      })
      .join('');
    return;
  }

  list.innerHTML = orderedModels(prefs)
    .map((id) => {
      const config = MODEL_CONFIGS[id];
      const days = prefs.modelDays?.[id] ?? config.defaultDays;
      const on = prefs.modelToggles?.[id] ? ' checked' : '';
      return (
        `<div class="toggle-label model-toggle" data-order-id="${id}">` +
        DRAG_HANDLE_HTML +
        `<label class="model-name">` +
        `<input type="checkbox" data-model-toggle="${id}"${on}> ${modelLabelFor(id, region)}` +
        `</label>` +
        `<input type="range" data-model-days="${id}" min="1" max="${config.maxDays}" value="${days}" class="range-input">` +
        `<span data-model-days-val="${id}">${days}</span>d` +
        `</div>`
      );
    })
    .join('');
}

// Populate the All Locations model picker with this region's models and the
// ensembles. Kept in sync with the model list so a reorder or region switch
// reorders the options too.
export function renderAllLocationsSelect(prefs) {
  const select = document.getElementById('all-locations-model');
  if (!select) return;
  const region = prefs.activeRegion || 'usa';
  const options = [
    ...orderedModels(prefs).map((id) => [id, modelLabelFor(id, region)]),
    ...orderedEnsembles(prefs).map((id) => [id, ENSEMBLE_CONFIGS[id]?.label || id]),
  ];
  select.innerHTML = options
    .map(([id, label]) => `<option value="${id}">${label}</option>`)
    .join('');
  if (prefs.allLocationsModel) select.value = prefs.allLocationsModel;
}

// Wire up all settings controls
export function initControls(callbacks, prefs) {
  // View dropdown in the header
  const viewDropdownBtn = document.getElementById('view-dropdown-btn');
  const viewDropdownMenu = document.getElementById('view-dropdown-menu');
  const viewItems = document.querySelectorAll('#view-dropdown-menu .view-dropdown-item');

  const VIEW_LABELS = { wind: 'Wind', temp: 'Temp', clouds: 'Clouds', ensemble: 'Ensemble', 'all-locations': 'All Locations' };

  viewDropdownBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    viewDropdownMenu.classList.toggle('hidden');
  });

  viewItems.forEach((item) => {
    item.addEventListener('click', () => {
      viewItems.forEach((b) => b.classList.remove('active'));
      item.classList.add('active');
      viewDropdownBtn.childNodes[0].textContent = VIEW_LABELS[item.dataset.view] + ' ';
      viewDropdownMenu.classList.add('hidden');
      callbacks.onViewChange(item.dataset.view);
    });
  });

  // Close dropdown on outside click
  document.addEventListener('click', () => {
    viewDropdownMenu.classList.add('hidden');
  });

  // Filter checkboxes
  const checkboxIds = {
    'daylight-filter': 'showDaylightOnly',
    'hide-high-alt': 'hideHighAltitude',
    'wind-shear': 'showWindShear',
    'ground-level': 'showGroundLevel',
  };
  for (const [id, key] of Object.entries(checkboxIds)) {
    document.getElementById(id).addEventListener('change', (e) => {
      callbacks.onToggle(key, e.target.checked);
    });
  }

  // "Hide >" cutoff, typed in thousands of the selected altitude unit
  document.getElementById('hide-high-alt-threshold').addEventListener('change', (e) => {
    callbacks.onHideAboveChange(parseFloat(e.target.value));
  });
  // Fog mode: auto-enable related supplementary rows
  document.getElementById('fog-mode').addEventListener('change', (e) => {
    callbacks.onToggle('showFogMode', e.target.checked);
    if (e.target.checked) {
      ['dewpointSpread', 'temp', 'visibility'].forEach((key) => {
        const cb = document.querySelector(`[data-supp="${key}"]`);
        if (cb && !cb.checked) {
          cb.checked = true;
        }
      });
      callbacks.onSuppChange(getSuppState());
    }
  });

  // Best hours
  document.getElementById('best-hours').addEventListener('change', (e) => {
    const threshold = e.target.checked
      ? parseInt(document.getElementById('best-hours-threshold').value) || 15
      : null;
    callbacks.onToggle('bestHoursThreshold', threshold);
  });
  document.getElementById('best-hours-threshold').addEventListener('change', (e) => {
    if (document.getElementById('best-hours').checked) {
      callbacks.onToggle('bestHoursThreshold', parseInt(e.target.value) || 15);
    }
  });

  // Supplementary row toggles
  document.querySelectorAll('[data-supp]').forEach((cb) => {
    cb.addEventListener('change', () => {
      callbacks.onSuppChange(getSuppState());
    });
  });

  // Drag-to-reorder. The handler re-reads the DOM order on drop, so it works
  // for whichever list is currently rendered.
  const modelList = document.getElementById('model-toggle-list');
  makeReorderable(modelList, (order) => callbacks.onModelReorder(order));

  // All Locations model picker
  const allLocSelect = document.getElementById('all-locations-model');
  if (allLocSelect) {
    allLocSelect.addEventListener('change', () => {
      callbacks.onAllLocationsModelChange(allLocSelect.value);
    });
  }

  // Per-model toggles and day sliders (rows are generated above)
  for (const modelId of modelOrderFor(prefs?.activeRegion || 'usa')) {
    const toggle = document.querySelector(`[data-model-toggle="${modelId}"]`);
    const slider = document.querySelector(`[data-model-days="${modelId}"]`);
    const valSpan = document.querySelector(`[data-model-days-val="${modelId}"]`);

    if (toggle) {
      toggle.addEventListener('change', (e) => {
        callbacks.onModelToggle(modelId, e.target.checked);
      });
    }
    if (slider && valSpan) {
      slider.addEventListener('input', () => {
        valSpan.textContent = slider.value;
      });
      slider.addEventListener('change', () => {
        callbacks.onModelDaysChange(modelId, parseInt(slider.value));
      });
    }
  }

  // Show all locations
  document.getElementById('show-all-locations').addEventListener('click', () => {
    callbacks.onShowAllLocations();
  });

  // Reset (with confirmation)
  document.getElementById('reset-defaults').addEventListener('click', () => {
    if (confirm('Reset all settings to defaults? Your saved locations will be kept.')) {
      callbacks.onReset();
    }
  });
}

// Show the "Hide >" cutoff for the currently selected altitude unit, with a
// matching suffix ("k ft" / "k m") and bound.
export function refreshHideAboveInput(prefs) {
  const input = document.getElementById('hide-high-alt-threshold');
  const unitLabel = document.getElementById('hide-high-alt-unit');
  if (!input || !unitLabel) return;

  const unit = prefs.units?.altitude || 'ft';
  input.max = maxHideAboveThousands(unit);
  input.value = prefs.hideAboveThousands?.[unit] ?? (unit === 'm' ? 3 : 5);
  unitLabel.textContent = `k ${ALTITUDE_UNIT_LABELS[unit]}`;
}

// Open-Meteo's cloud layers are fixed altitude bands: low up to 3 km, mid
// 3–8 km, high above 8 km. Shown in the settings labels only (never in the
// table row headers) so the columns stay narrow. The docs say "altitude"
// without specifying AGL or MSL, so no datum suffix is claimed here.
const CLOUD_LAYER_RANGES = {
  ft: { low: '(0-9.8 kft)', mid: '(9.8-26.2 kft)', high: '(>26.2 kft)' },
  m: { low: '(0-3 km)', mid: '(3-8 km)', high: '(>8 km)' },
};

export function refreshCloudRangeLabels(prefs) {
  const ranges = CLOUD_LAYER_RANGES[prefs.units?.altitude || 'ft'] || CLOUD_LAYER_RANGES.ft;
  document.querySelectorAll('[data-cloud-range]').forEach((el) => {
    el.textContent = ranges[el.dataset.cloudRange] || '';
  });
}

function getSuppState() {
  const state = {};
  document.querySelectorAll('[data-supp]').forEach((cb) => {
    state[cb.dataset.supp] = cb.checked;
  });
  return state;
}

// Restore UI state from preferences
export function restoreControlState(prefs) {
  if (!prefs) return;

  // View dropdown
  if (prefs.view || prefs.showAllLocations) {
    const labels = { wind: 'Wind', temp: 'Temp', clouds: 'Clouds', ensemble: 'Ensemble', 'all-locations': 'All Locations' };
    const activeKey = prefs.showAllLocations ? 'all-locations' : (prefs.view || 'wind');
    const dropBtn = document.getElementById('view-dropdown-btn');
    if (dropBtn) dropBtn.childNodes[0].textContent = (labels[activeKey] || 'Wind') + ' ';
    document.querySelectorAll('#view-dropdown-menu .view-dropdown-item').forEach((item) => {
      item.classList.toggle('active', item.dataset.view === activeKey);
    });
  }

  // Checkboxes
  const checkboxMap = {
    showDaylightOnly: 'daylight-filter',
    hideHighAltitude: 'hide-high-alt',
    showWindShear: 'wind-shear',
    showFogMode: 'fog-mode',
    showGroundLevel: 'ground-level',
  };
  for (const [key, id] of Object.entries(checkboxMap)) {
    const el = document.getElementById(id);
    if (el && prefs[key] != null) el.checked = prefs[key];
  }

  // "Hide >" cutoff and its unit suffix
  refreshHideAboveInput(prefs);
  refreshCloudRangeLabels(prefs);

  // Best hours (threshold is stored in mph, displayed in the selected unit)
  if (prefs.bestHoursThreshold != null) {
    document.getElementById('best-hours').checked = true;
    document.getElementById('best-hours-threshold').value = Math.max(
      1,
      Math.round(windTo(prefs.bestHoursThreshold, prefs.units?.wind || 'mph'))
    );
  }

  // Supplementary rows
  if (prefs.supplementaryRows) {
    for (const [key, val] of Object.entries(prefs.supplementaryRows)) {
      const el = document.querySelector(`[data-supp="${key}"]`);
      if (el) el.checked = val;
    }
  }

  // Model toggles and day sliders
  if (prefs.modelToggles) {
    for (const [modelId, enabled] of Object.entries(prefs.modelToggles)) {
      const toggle = document.querySelector(`[data-model-toggle="${modelId}"]`);
      if (toggle) toggle.checked = enabled;
    }
  }
  if (prefs.modelDays) {
    for (const [modelId, days] of Object.entries(prefs.modelDays)) {
      const slider = document.querySelector(`[data-model-days="${modelId}"]`);
      const valSpan = document.querySelector(`[data-model-days-val="${modelId}"]`);
      if (slider) slider.value = days;
      if (valSpan) valSpan.textContent = days;
    }
  }
}
