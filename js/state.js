/**
 * Kadal Signal - Shared State Manager
 * Lightweight observable store with pub/sub architecture.
 */

const initialState = {
  sites: [],
  selectedSiteId: null,
  boats: [],
  pendingReports: [],
  filters: {
    confidence: null, // 'low' | 'medium' | 'verified' | null
    facility: null,   // 'ice' | 'fuel' | 'shelter' | 'auction' | null
    light: null       // 'green' | 'amber' | 'red' | null
  },
  offlineMode: false,
  isCardOpen: false,
  isCardExpanded: false,
  activeModal: null, // 'contribute' | 'board' | 'queue' | 'demo' | null
  isLoading: true,
  errorMessage: null,
  lastUpdated: new Date().toISOString()
};

let currentState = { ...initialState };
const listeners = new Set();

/**
 * Get a copy of the current state
 */
export function getState() {
  return currentState;
}

/**
 * Update state and notify all subscribers
 */
export function setState(updates) {
  const prevState = currentState;
  currentState = {
    ...currentState,
    ...updates,
    filters: updates.filters ? { ...currentState.filters, ...updates.filters } : currentState.filters
  };

  listeners.forEach(fn => {
    try {
      fn(currentState, prevState);
    } catch (err) {
      console.error("[State Listener Error]:", err);
    }
  });
}

/**
 * Subscribe to state changes. Returns an unsubscribe function.
 */
export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/**
 * Convenience selector: Get the currently selected site object
 */
export function getSelectedSite() {
  if (!currentState.selectedSiteId) return null;
  return currentState.sites.find(s => s.id === currentState.selectedSiteId) || null;
}

/**
 * Convenience selector: Get all boats belonging to a specific site
 */
export function getSiteBoats(siteId) {
  if (!siteId) return [];
  return currentState.boats.filter(b => b.site_id === siteId);
}

/**
 * Convenience selector: Get sites filtered by active filter chips
 */
export function getFilteredSites() {
  const { sites, filters } = currentState;
  return sites.filter(site => {
    // 1. Confidence filter
    if (filters.confidence && site.confidence !== filters.confidence) {
      return false;
    }
    // 2. Facility filter
    if (filters.facility && (!site.facilities || !site.facilities[filters.facility])) {
      return false;
    }
    // 3. Signal light filter
    if (filters.light) {
      const siteLight = site.signal?.light || null;
      if (siteLight !== filters.light) {
        return false;
      }
    }
    return true;
  });
}
