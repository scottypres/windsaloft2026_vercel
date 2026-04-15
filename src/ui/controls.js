import { MODEL_ORDER } from '../data/models.js';

// Wire up all settings controls
export function initControls(callbacks) {
  // View toggles in the header
  const viewBtns = document.querySelectorAll('#header-view-toggles .view-btn');
  viewBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      viewBtns.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      callbacks.onViewChange(btn.dataset.view);
    });
  });

  // Filter checkboxes
  const checkboxIds = {
    'daylight-filter': 'showDaylightOnly',
    'hide-high-alt': 'hideHighAltitude',
    'wind-shear': 'showWindShear',
  };
  for (const [id, key] of Object.entries(checkboxIds)) {
    document.getElementById(id).addEventListener('change', (e) => {
      callbacks.onToggle(key, e.target.checked);
    });
  }

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

  // Per-model toggles and day sliders
  for (const modelId of MODEL_ORDER) {
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

  // View
  if (prefs.view) {
    document.querySelectorAll('#header-view-toggles .view-btn').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.view === prefs.view);
    });
  }

  // Checkboxes
  const checkboxMap = {
    showDaylightOnly: 'daylight-filter',
    hideHighAltitude: 'hide-high-alt',
    showWindShear: 'wind-shear',
    showFogMode: 'fog-mode',
  };
  for (const [key, id] of Object.entries(checkboxMap)) {
    const el = document.getElementById(id);
    if (el && prefs[key] != null) el.checked = prefs[key];
  }

  // Best hours
  if (prefs.bestHoursThreshold != null) {
    document.getElementById('best-hours').checked = true;
    document.getElementById('best-hours-threshold').value = prefs.bestHoursThreshold;
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
