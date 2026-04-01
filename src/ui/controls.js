// Build the control panel UI and wire up events
export function initControls(container, callbacks) {
  container.innerHTML = `
    <div class="controls-panel">
      <div class="controls-section">
        <div class="view-toggles">
          <button class="view-btn active" data-view="wind">Wind Speed</button>
          <button class="view-btn" data-view="temp">Temperature</button>
          <button class="view-btn" data-view="clouds">Clouds + Thermals</button>
        </div>
      </div>

      <div class="controls-section">
        <label class="toggle-label">
          <input type="checkbox" id="daylight-filter"> Daylight Only
        </label>
        <label class="toggle-label">
          <input type="checkbox" id="hide-high-alt"> Hide &gt;5000ft
        </label>
        <label class="toggle-label">
          <input type="checkbox" id="wind-shear"> Wind Shear
        </label>
        <label class="toggle-label">
          <input type="checkbox" id="fog-mode"> Fog Mode
        </label>
        <label class="toggle-label">
          <input type="checkbox" id="best-hours"> Best Hours
          <input type="number" id="best-hours-threshold" value="15" min="1" max="50" class="small-input">
          mph
        </label>
      </div>

      <div class="controls-section supp-toggles" id="supp-toggles">
        <span class="section-title">Extra Rows:</span>
        <label class="toggle-label"><input type="checkbox" data-supp="gusts"> Gusts</label>
        <label class="toggle-label"><input type="checkbox" data-supp="cape"> CAPE</label>
        <label class="toggle-label"><input type="checkbox" data-supp="liftedIndex"> Lift Index</label>
        <label class="toggle-label"><input type="checkbox" data-supp="precipProb"> Precip %</label>
        <label class="toggle-label"><input type="checkbox" data-supp="precipInches"> Precip in</label>
        <label class="toggle-label"><input type="checkbox" data-supp="temp"> Temp</label>
        <label class="toggle-label"><input type="checkbox" data-supp="humidity"> Humidity</label>
        <label class="toggle-label"><input type="checkbox" data-supp="dewpointSpread"> DP Spread</label>
        <label class="toggle-label"><input type="checkbox" data-supp="visibility"> Visibility</label>
        <label class="toggle-label"><input type="checkbox" data-supp="cloudCover"> Clouds</label>
        <label class="toggle-label"><input type="checkbox" data-supp="thermals"> Thermals</label>
      </div>

      <div class="controls-section">
        <span class="section-title">Wind Colors (mph):</span>
        <label class="inline-label">Calm ≤
          <input type="number" id="threshold-calm" value="7" min="1" max="50" class="small-input">
        </label>
        <label class="inline-label">Moderate ≤
          <input type="number" id="threshold-moderate" value="15" min="1" max="80" class="small-input">
        </label>
        <label class="inline-label">Strong ≥
          <input type="number" id="threshold-strong" value="20" min="1" max="100" class="small-input">
        </label>
      </div>

      <div class="controls-section">
        <span class="section-title">Forecast Days:</span>
        <label class="inline-label">GFS:
          <input type="range" id="gfs-days" min="1" max="14" value="7" class="range-input">
          <span id="gfs-days-val">7</span>
        </label>
        <label class="inline-label">ICON:
          <input type="range" id="icon-days" min="1" max="7" value="5" class="range-input">
          <span id="icon-days-val">5</span>
        </label>
      </div>

      <div class="controls-section">
        <button id="show-all-locations" class="action-btn">Show All Locations</button>
        <button id="reset-defaults" class="action-btn danger-btn">Reset Defaults</button>
      </div>
    </div>
  `;

  // Wire events
  const viewBtns = container.querySelectorAll('.view-btn');
  viewBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      viewBtns.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      callbacks.onViewChange(btn.dataset.view);
    });
  });

  // Checkbox toggles
  const checkboxIds = {
    'daylight-filter': 'showDaylightOnly',
    'hide-high-alt': 'hideHighAltitude',
    'wind-shear': 'showWindShear',
    'fog-mode': 'showFogMode',
  };
  for (const [id, key] of Object.entries(checkboxIds)) {
    container.querySelector(`#${id}`).addEventListener('change', (e) => {
      callbacks.onToggle(key, e.target.checked);
    });
  }

  // Best hours
  container.querySelector('#best-hours').addEventListener('change', (e) => {
    const threshold = e.target.checked
      ? parseInt(container.querySelector('#best-hours-threshold').value) || 15
      : null;
    callbacks.onToggle('bestHoursThreshold', threshold);
  });
  container.querySelector('#best-hours-threshold').addEventListener('change', (e) => {
    if (container.querySelector('#best-hours').checked) {
      callbacks.onToggle('bestHoursThreshold', parseInt(e.target.value) || 15);
    }
  });

  // Supplementary row toggles
  container.querySelectorAll('[data-supp]').forEach((cb) => {
    cb.addEventListener('change', () => {
      callbacks.onSuppChange(getSuppState(container));
    });
  });

  // Wind thresholds
  ['threshold-calm', 'threshold-moderate', 'threshold-strong'].forEach((id) => {
    container.querySelector(`#${id}`).addEventListener('change', () => {
      callbacks.onThresholdsChange({
        calm: parseInt(container.querySelector('#threshold-calm').value) || 7,
        moderate: parseInt(container.querySelector('#threshold-moderate').value) || 15,
        strong: parseInt(container.querySelector('#threshold-strong').value) || 20,
      });
    });
  });

  // Forecast day sliders
  const gfsDays = container.querySelector('#gfs-days');
  const gfsDaysVal = container.querySelector('#gfs-days-val');
  gfsDays.addEventListener('input', () => {
    gfsDaysVal.textContent = gfsDays.value;
  });
  gfsDays.addEventListener('change', () => {
    callbacks.onForecastDaysChange('gfs', parseInt(gfsDays.value));
  });

  const iconDays = container.querySelector('#icon-days');
  const iconDaysVal = container.querySelector('#icon-days-val');
  iconDays.addEventListener('input', () => {
    iconDaysVal.textContent = iconDays.value;
  });
  iconDays.addEventListener('change', () => {
    callbacks.onForecastDaysChange('icon', parseInt(iconDays.value));
  });

  // Show all locations
  container.querySelector('#show-all-locations').addEventListener('click', () => {
    callbacks.onShowAllLocations();
  });

  // Reset
  container.querySelector('#reset-defaults').addEventListener('click', () => {
    callbacks.onReset();
  });
}

function getSuppState(container) {
  const state = {};
  container.querySelectorAll('[data-supp]').forEach((cb) => {
    state[cb.dataset.supp] = cb.checked;
  });
  return state;
}

// Restore UI state from preferences
export function restoreControlState(container, prefs) {
  if (!prefs) return;

  // View
  if (prefs.view) {
    container.querySelectorAll('.view-btn').forEach((btn) => {
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
    const el = container.querySelector(`#${id}`);
    if (el && prefs[key] != null) el.checked = prefs[key];
  }

  // Best hours
  if (prefs.bestHoursThreshold != null) {
    container.querySelector('#best-hours').checked = true;
    container.querySelector('#best-hours-threshold').value = prefs.bestHoursThreshold;
  }

  // Supplementary rows
  if (prefs.supplementaryRows) {
    for (const [key, val] of Object.entries(prefs.supplementaryRows)) {
      const el = container.querySelector(`[data-supp="${key}"]`);
      if (el) el.checked = val;
    }
  }

  // Thresholds
  if (prefs.windThresholds) {
    container.querySelector('#threshold-calm').value = prefs.windThresholds.calm;
    container.querySelector('#threshold-moderate').value = prefs.windThresholds.moderate;
    container.querySelector('#threshold-strong').value = prefs.windThresholds.strong;
  }

  // Forecast days
  if (prefs.gfsDays) {
    container.querySelector('#gfs-days').value = prefs.gfsDays;
    container.querySelector('#gfs-days-val').textContent = prefs.gfsDays;
  }
  if (prefs.iconDays) {
    container.querySelector('#icon-days').value = prefs.iconDays;
    container.querySelector('#icon-days-val').textContent = prefs.iconDays;
  }
}
