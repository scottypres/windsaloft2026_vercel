import { searchLocations, reverseGeocode } from '../api/geocoding.js';

const MAX_SAVED = 6;

export function initLocationUI(container, callbacks) {
  container.innerHTML = `
    <div class="location-panel">
      <div class="search-wrapper">
        <div class="search-row">
          <input type="text" id="location-search" placeholder="Search location..." autocomplete="off">
          <button id="gps-btn" class="gps-btn" title="Use current location">GPS</button>
        </div>
        <div id="search-results" class="search-results hidden"></div>
      </div>
      <div id="current-location" class="current-location"></div>
      <div class="saved-locations">
        <div class="saved-header">
          <span class="section-title">Saved Locations</span>
          <button id="save-location-btn" class="small-btn" disabled>Save Current</button>
        </div>
        <ul id="saved-list" class="saved-list"></ul>
        <button id="show-all-locations" class="action-btn" style="margin-top:0.5rem;width:100%">Show All Locations</button>
      </div>
    </div>
  `;

  const searchInput = container.querySelector('#location-search');
  const resultsDiv = container.querySelector('#search-results');
  const saveBtn = container.querySelector('#save-location-btn');
  const gpsBtn = container.querySelector('#gps-btn');

  let currentLocation = null;

  gpsBtn.addEventListener('click', () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }
    gpsBtn.textContent = '...';
    gpsBtn.disabled = true;
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const loc = await reverseGeocode(pos.coords.latitude, pos.coords.longitude);
          selectLocation(loc);
        } catch {
          // Fallback: use coords directly
          selectLocation({
            lat: pos.coords.latitude,
            lon: pos.coords.longitude,
            shortName: `${pos.coords.latitude.toFixed(2)}, ${pos.coords.longitude.toFixed(2)}`,
            name: `${pos.coords.latitude}, ${pos.coords.longitude}`,
          });
        } finally {
          gpsBtn.textContent = 'GPS';
          gpsBtn.disabled = false;
        }
      },
      () => {
        alert('Unable to get your location. Please check your browser permissions.');
        gpsBtn.textContent = 'GPS';
        gpsBtn.disabled = false;
      },
      { enableHighAccuracy: false, timeout: 10000 }
    );
  });

  searchInput.addEventListener('input', async () => {
    const query = searchInput.value;
    if (query.length < 2) {
      resultsDiv.classList.add('hidden');
      return;
    }
    try {
      const results = await searchLocations(query);
      if (results.length === 0) {
        resultsDiv.classList.add('hidden');
        return;
      }
      resultsDiv.innerHTML = results
        .map(
          (r, i) =>
            `<div class="search-result" data-idx="${i}">${r.shortName}<span class="search-full">${r.name}</span></div>`
        )
        .join('');
      resultsDiv.classList.remove('hidden');

      resultsDiv.querySelectorAll('.search-result').forEach((el) => {
        el.addEventListener('click', () => {
          const loc = results[parseInt(el.dataset.idx)];
          selectLocation(loc);
        });
      });
    } catch {
      resultsDiv.classList.add('hidden');
    }
  });

  // Close dropdown on outside click
  document.addEventListener('click', (e) => {
    if (!container.contains(e.target)) {
      resultsDiv.classList.add('hidden');
    }
  });

  function selectLocation(loc) {
    currentLocation = loc;
    searchInput.value = '';
    resultsDiv.classList.add('hidden');
    container.querySelector('#current-location').textContent = loc.shortName;
    saveBtn.disabled = false;
    callbacks.onLocationSelect(loc);
  }

  saveBtn.addEventListener('click', () => {
    if (currentLocation) {
      callbacks.onSaveLocation(currentLocation);
    }
  });

  return {
    setCurrentLocation(loc) {
      currentLocation = loc;
      container.querySelector('#current-location').textContent = loc.shortName;
      saveBtn.disabled = false;
    },
    renderSavedLocations(locations) {
      const list = container.querySelector('#saved-list');
      if (locations.length === 0) {
        list.innerHTML = '<li class="empty-msg">No saved locations</li>';
        return;
      }
      list.innerHTML = locations
        .map(
          (loc, i) =>
            `<li class="saved-item">
              <span class="saved-name" data-idx="${i}">${loc.shortName}</span>
              <button class="delete-btn" data-idx="${i}">&times;</button>
            </li>`
        )
        .join('');

      list.querySelectorAll('.saved-name').forEach((el) => {
        el.addEventListener('click', () => {
          const loc = locations[parseInt(el.dataset.idx)];
          selectLocation(loc);
        });
      });

      list.querySelectorAll('.delete-btn').forEach((el) => {
        el.addEventListener('click', (e) => {
          e.stopPropagation();
          callbacks.onDeleteLocation(parseInt(el.dataset.idx));
        });
      });
    },
  };
}
