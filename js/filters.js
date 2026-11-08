/**
 * Kadal Signal - Filter Bar Controller
 * Instant filtering by Confidence, Facility, and Signal light.
 */

import { getState, setState, subscribe, getFilteredSites } from './state.js';
import { t } from './i18n.js';

export function initFilters() {
  const container = document.getElementById('filter-bar');
  if (!container) return;

  renderFilterBar(container);

  // Subscribe to state changes to update active states and count
  subscribe((state, prevState) => {
    if (
      state.filters !== prevState.filters ||
      state.sites !== prevState.sites
    ) {
      updateFilterDOM(container);
    }
  });
}

function renderFilterBar(container) {
  container.innerHTML = `
    <!-- Confidence chips -->
    <div class="filter-chip-group">
      <span class="filter-label">${t('filter_confidence')}:</span>
      <button type="button" class="filter-chip" data-filter-type="confidence" data-value="verified" id="filter-verified">
        ✓ Verified
      </button>
      <button type="button" class="filter-chip" data-filter-type="confidence" data-value="medium" id="filter-medium">
        ⚡ Medium
      </button>
      <button type="button" class="filter-chip" data-filter-type="confidence" data-value="low" id="filter-low">
        ⋯ Low
      </button>
    </div>

    <!-- Signal chips -->
    <div class="filter-chip-group">
      <span class="filter-label">${t('filter_signal')}:</span>
      <button type="button" class="filter-chip" data-filter-type="light" data-value="green" id="filter-green">
        🟢 Green
      </button>
      <button type="button" class="filter-chip" data-filter-type="light" data-value="amber" id="filter-amber">
        🟡 Amber
      </button>
      <button type="button" class="filter-chip" data-filter-type="light" data-value="red" id="filter-red">
        🔴 Red
      </button>
    </div>

    <!-- Facility chips -->
    <div class="filter-chip-group">
      <span class="filter-label">${t('filter_facilities')}:</span>
      <button type="button" class="filter-chip" data-filter-type="facility" data-value="ice" id="filter-ice">
        ❄️ Ice
      </button>
      <button type="button" class="filter-chip" data-filter-type="facility" data-value="fuel" id="filter-fuel">
        ⛽ Fuel
      </button>
      <button type="button" class="filter-chip" data-filter-type="facility" data-value="shelter" id="filter-shelter">
        ⚓ Shelter
      </button>
      <button type="button" class="filter-chip" data-filter-type="facility" data-value="auction" id="filter-auction">
        🏷️ Auction
      </button>
    </div>

    <!-- Clear button -->
    <button type="button" class="filter-clear-btn" id="filter-clear-btn">
      ✕ ${t('filter_clear')}
    </button>

    <!-- Site Count -->
    <div class="filter-count-badge" id="filter-count-badge">
      0 sites
    </div>
  `;

  // Attach event delegation for filter chips
  container.addEventListener('click', (e) => {
    const chip = e.target.closest('.filter-chip');
    if (chip) {
      const type = chip.dataset.filterType;
      const value = chip.dataset.value;
      const { filters } = getState();

      // Toggle behavior: if already active, clear it; otherwise set it
      const currentVal = filters[type];
      const newVal = (currentVal === value) ? null : value;

      setState({
        filters: {
          ...filters,
          [type]: newVal
        }
      });
      return;
    }

    if (e.target.closest('#filter-clear-btn')) {
      setState({
        filters: {
          confidence: null,
          facility: null,
          light: null
        }
      });
    }
  });

  updateFilterDOM(container);
}

function updateFilterDOM(container) {
  const { filters } = getState();
  const filtered = getFilteredSites();

  // Update chip active classes
  const chips = container.querySelectorAll('.filter-chip');
  chips.forEach(chip => {
    const type = chip.dataset.filterType;
    const value = chip.dataset.value;
    const isActive = (filters[type] === value);

    chip.classList.toggle('active', isActive);

    // Apply color-specific active classes for lights
    if (type === 'light') {
      chip.classList.toggle('active-green', isActive && value === 'green');
      chip.classList.toggle('active-amber', isActive && value === 'amber');
      chip.classList.toggle('active-red', isActive && value === 'red');
    }
  });

  // Update count badge
  const countBadge = container.querySelector('#filter-count-badge');
  if (countBadge) {
    countBadge.textContent = t('filter_site_count', { count: filtered.length });
  }
}
