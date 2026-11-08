/**
 * Kadal Signal - Type-Safe Reactive State Manager
 * Observable store with pub/sub architecture and selectors.
 */

import { AppState, HarbourSite, BoatRecord, FilterState } from './types';

const initialState: AppState = {
  sites: [],
  selectedSiteId: null,
  boats: [],
  pendingReports: [],
  filters: {
    confidence: null,
    facility: null,
    light: null,
    search: ''
  },
  offlineMode: false,
  isCardOpen: false,
  isCardExpanded: false,
  activeModal: null,
  isLoading: true,
  errorMessage: null,
  lastUpdated: new Date().toISOString(),
  language: 'en'
};

let currentState: AppState = { ...initialState };
type Listener = (state: AppState, prevState: AppState) => void;
const listeners = new Set<Listener>();

export function getState(): AppState {
  return currentState;
}

export function setState(updates: Partial<AppState>): void {
  const prevState = currentState;
  const nextFilters: FilterState = updates.filters
    ? { ...currentState.filters, ...updates.filters }
    : currentState.filters;

  currentState = {
    ...currentState,
    ...updates,
    filters: nextFilters
  };

  listeners.forEach(fn => {
    try {
      fn(currentState, prevState);
    } catch (err) {
      console.error("[State Listener Error]:", err);
    }
  });
}

export function subscribe(fn: Listener): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function getSelectedSite(): HarbourSite | null {
  if (!currentState.selectedSiteId) return null;
  return currentState.sites.find(s => s.id === currentState.selectedSiteId) || null;
}

export function getSiteBoats(siteId: string | null): BoatRecord[] {
  if (!siteId) return [];
  return currentState.boats.filter(b => b.site_id === siteId);
}

export function getFilteredSites(): HarbourSite[] {
  const { sites, filters } = currentState;
  const searchLower = filters.search.trim().toLowerCase();

  return sites.filter(site => {
    // 1. Text Search filter (matches name, name_ml, or district)
    if (searchLower) {
      const matchName = site.name.toLowerCase().includes(searchLower);
      const matchNameMl = site.name_ml ? site.name_ml.toLowerCase().includes(searchLower) : false;
      const matchDistrict = site.district.toLowerCase().includes(searchLower);
      if (!matchName && !matchNameMl && !matchDistrict) {
        return false;
      }
    }

    // 2. Confidence filter
    if (filters.confidence && site.confidence !== filters.confidence) {
      return false;
    }

    // 3. Facility filter
    if (filters.facility && (!site.facilities || !site.facilities[filters.facility])) {
      return false;
    }

    // 4. Signal light filter
    if (filters.light) {
      const siteLight = site.signal?.light || null;
      if (siteLight !== filters.light) {
        return false;
      }
    }

    return true;
  });
}
