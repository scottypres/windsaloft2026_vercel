import { searchLocations } from '../api/geocoding.js';

const MAX_SAVED = 10;

export function initLocationUI(container, callbacks) {
  container.innerHTML = `
    <div class="location-panel">
      <div class="search-wrapper">
        <input type="text" id="location-search" placeholder="Search location..." autocomplete="off">
        <div id="search-results" class="search-results hidden"></div>
      </div>
      <div id="current-location" class="current-location"></div>
      <div class="saved-locations">
        <div class="saved-header">
          <span class="section-title">Saved Locations</span>
          <button id="save-location-btn" class="small-btn" disabled>Save Current</button>
        </div>
        <ul id="saved-list" class="saved-list"></ul>
      </div>
    </div>
  `;

  const searchInput = container.querySelector('#location-search');
  const resultsDiv = container.querySelector('#search-results');
  const saveBtn = container.querySelector('#save-location-btn');

  let currentLocation = null;

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
