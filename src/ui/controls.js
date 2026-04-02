// Wire up all settings controls (now in bottom panel + header view toggles)
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

  // Forecast day sliders
  const gfsDays = document.getElementById('gfs-days');
  const gfsDaysVal = document.getElementById('gfs-days-val');
  gfsDays.addEventListener('input', () => {
    gfsDaysVal.textContent = gfsDays.value;
  });
  gfsDays.addEventListener('change', () => {
    callbacks.onForecastDaysChange('gfs', parseInt(gfsDays.value));
  });

  const iconDays = document.getElementById('icon-days');
  const iconDaysVal = document.getElementById('icon-days-val');
  iconDays.addEventListener('input', () => {
    iconDaysVal.textContent = iconDays.value;
  });
  iconDays.addEventListener('change', () => {
    callbacks.onForecastDaysChange('icon', parseInt(iconDays.value));
  });

  // Show all locations
  document.getElementById('show-all-locations').addEventListener('click', () => {
    callbacks.onShowAllLocations();
  });

  // Reset
  document.getElementById('reset-defaults').addEventListener('click', () => {
    callbacks.onReset();
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

  // Forecast days
  if (prefs.gfsDays) {
    document.getElementById('gfs-days').value = prefs.gfsDays;
    document.getElementById('gfs-days-val').textContent = prefs.gfsDays;
  }
  if (prefs.iconDays) {
    document.getElementById('icon-days').value = prefs.iconDays;
    document.getElementById('icon-days-val').textContent = prefs.iconDays;
  }
}
