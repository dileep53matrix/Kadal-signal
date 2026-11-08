/**
 * Kadal Signal - Filter Bar Controller
 * Instant filtering with live search, facility pills, confidence, and signal status.
 */

import { getState, setState, subscribe, getFilteredSites } from './state';
import { t } from './i18n';
import { ConfidenceTier, FacilityKey, SignalLight } from './types';

export function initFilters(): void {
  const container = document.getElementById('filter-bar');
  if (!container) return;

  renderFilterBar(container);

  subscribe((state, prevState) => {
    if (
      state.filters !== prevState.filters ||
      state.sites !== prevState.sites ||
      state.language !== prevState.language
    ) {
      updateFilterDOM(container);
    }
  });
}

function renderFilterBar(container: HTMLElement): void {
  const { filters } = getState();

  container.innerHTML = `
    <!-- Search Input -->
    <div class="filter-search-box">
      <span class="search-icon">🔍</span>
      <input
        type="text"
        id="harbour-search-input"
        class="search-input"
        placeholder="Search harbours, districts..."
        value="${filters.search || ''}"
      />
      ${filters.search ? `<button type="button" class="search-clear-btn" id="search-clear-btn">✕</button>` : ''}
    </div>

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

    <!-- Site Count Badge -->
    <div class="filter-count-badge" id="filter-count-badge">
      0 sites
    </div>
  `;

  // Search input handler
  const searchInput = container.querySelector<HTMLInputElement>('#harbour-search-input');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      const target = e.target as HTMLInputElement;
      setState({
        filters: {
          ...getState().filters,
          search: target.value
        }
      });
    });
  }

  // Search clear button
  container.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    if (target.id === 'search-clear-btn') {
      setState({
        filters: {
          ...getState().filters,
          search: ''
        }
      });
      if (searchInput) searchInput.value = '';
    }
  });

  // Filter chips click delegation
  container.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    const chip = target.closest<HTMLButtonElement>('.filter-chip');
    if (chip) {
      const type = chip.dataset.filterType as keyof typeof filters;
      const value = chip.dataset.value;
      const currentFilters = getState().filters;

      const currentVal = currentFilters[type];
      const newVal = (currentVal === value) ? null : value;

      setState({
        filters: {
          ...currentFilters,
          [type]: newVal as ConfidenceTier & FacilityKey & SignalLight
        }
      });
    }

    // Clear all filters
    if (target.closest('#filter-clear-btn')) {
      setState({
        filters: {
          confidence: null,
          facility: null,
          light: null,
          search: ''
        }
      });
      if (searchInput) searchInput.value = '';
    }
  });

  updateFilterDOM(container);
}

function updateFilterDOM(container: HTMLElement): void {
  const { filters } = getState();
  const filteredSites = getFilteredSites();

  // Update active state on all chips
  const chips = container.querySelectorAll<HTMLButtonElement>('.filter-chip');
  chips.forEach(chip => {
    const type = chip.dataset.filterType as keyof typeof filters;
    const value = chip.dataset.value;
    const isActive = filters[type] === value;
    chip.classList.toggle('active', isActive);
  });

  // Update count badge
  const countBadge = container.querySelector<HTMLElement>('#filter-count-badge');
  if (countBadge) {
    countBadge.textContent = t('filter_site_count', { count: filteredSites.length });
  }

  // Update clear button visibility
  const clearBtn = container.querySelector<HTMLElement>('#filter-clear-btn');
  const hasActiveFilters = Boolean(filters.confidence || filters.facility || filters.light || filters.search);
  if (clearBtn) {
    clearBtn.classList.toggle('visible', hasActiveFilters);
  }
}
