/**
 * Kadal Signal - API Layer
 * Strongly typed service layer interfacing with the backend or local mock state.
 */

import { CONFIG } from './config';
import { setState } from './state';
import { HarbourSite, BoatRecord, PendingReport, Facilities } from './types';

// In-memory working copies for mock mutations
let mockSites: HarbourSite[] | null = null;
let mockBoats: BoatRecord[] | null = null;
let mockPendingReports: PendingReport[] = [];
let initialSitesSnapshot: HarbourSite[] | null = null;
let initialBoatsSnapshot: BoatRecord[] | null = null;

let isOfflineFallbackActive = false;

export function isOfflineSnapshot(): boolean {
  return isOfflineFallbackActive;
}

export function setOfflineFallback(val: boolean): void {
  isOfflineFallbackActive = val;
  setState({ offlineMode: val });
}

/**
 * Initialize mock memory from JSON files or cached snapshot
 */
async function initMockData(): Promise<void> {
  if (mockSites && mockBoats) return;

  try {
    if (isOfflineFallbackActive) {
      const snapRes = await fetch('./data/cached-snapshot.json');
      const snapData = await snapRes.json();
      mockSites = JSON.parse(JSON.stringify(snapData.sites)) as HarbourSite[];
      mockBoats = JSON.parse(JSON.stringify(snapData.boats)) as BoatRecord[];
    } else {
      const [sitesRes, boatsRes] = await Promise.all([
        fetch('./data/mock-sites.json'),
        fetch('./data/mock-boats.json')
      ]);

      if (!sitesRes.ok || !boatsRes.ok) {
        throw new Error('Failed to fetch mock data files');
      }

      mockSites = (await sitesRes.json()) as HarbourSite[];
      mockBoats = (await boatsRes.json()) as BoatRecord[];
    }

    mockPendingReports = [
      {
        id: "rep-101",
        site_id: "site-4",
        facilities: { ice: true, fuel: true, shelter: false, auction: true },
        photo: null,
        submitted_at: new Date(Date.now() - 3600000).toISOString(),
        matches_existing: true
      }
    ];

    initialSitesSnapshot = JSON.parse(JSON.stringify(mockSites));
    initialBoatsSnapshot = JSON.parse(JSON.stringify(mockBoats));
  } catch (err) {
    console.warn('[Kadal Signal] Network error reading live mock, falling back to cached snapshot:', err);
    isOfflineFallbackActive = true;
    setState({ offlineMode: true });

    const snapRes = await fetch('./data/cached-snapshot.json');
    const snapData = await snapRes.json();
    mockSites = JSON.parse(JSON.stringify(snapData.sites)) as HarbourSite[];
    mockBoats = JSON.parse(JSON.stringify(snapData.boats)) as BoatRecord[];
    initialSitesSnapshot = JSON.parse(JSON.stringify(mockSites));
    initialBoatsSnapshot = JSON.parse(JSON.stringify(mockBoats));
  }
}

/**
 * Get all sites
 */
export async function getSites(): Promise<HarbourSite[]> {
  if (CONFIG.USE_MOCK || isOfflineFallbackActive) {
    await initMockData();
    return JSON.parse(JSON.stringify(mockSites || []));
  }

  try {
    const res = await fetch(`${CONFIG.API_BASE_URL}/sites`);
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    const sites = (await res.json()) as HarbourSite[];
    isOfflineFallbackActive = false;
    setState({ offlineMode: false });
    return sites;
  } catch (err) {
    console.warn('[Kadal Signal] Real API failed, falling back to cached snapshot:', err);
    isOfflineFallbackActive = true;
    setState({ offlineMode: true });
    await initMockData();
    return JSON.parse(JSON.stringify(mockSites || []));
  }
}

/**
 * Get one site by ID
 */
export async function getSite(id: string): Promise<HarbourSite | null> {
  if (CONFIG.USE_MOCK || isOfflineFallbackActive) {
    await initMockData();
    const site = mockSites?.find(s => s.id === id);
    return site ? JSON.parse(JSON.stringify(site)) : null;
  }

  try {
    const res = await fetch(`${CONFIG.API_BASE_URL}/sites/${id}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    return (await res.json()) as HarbourSite;
  } catch (err) {
    console.warn(`[Kadal Signal] getSite(${id}) failed, checking memory/cache:`, err);
    await initMockData();
    const site = mockSites?.find(s => s.id === id);
    return site ? JSON.parse(JSON.stringify(site)) : null;
  }
}

/**
 * Submit community contribution for a site
 */
export async function submitContribution(
  siteId: string,
  facilities: Facilities,
  photo: string | null = null
): Promise<{ success: boolean; report: PendingReport; site: HarbourSite }> {
  if (CONFIG.USE_MOCK || isOfflineFallbackActive) {
    await initMockData();
    const site = mockSites?.find(s => s.id === siteId);
    if (!site) throw new Error(`Site with ID ${siteId} not found`);

    const matches = (
      Boolean(facilities.ice) === Boolean(site.facilities.ice) &&
      Boolean(facilities.fuel) === Boolean(site.facilities.fuel) &&
      Boolean(facilities.shelter) === Boolean(site.facilities.shelter) &&
      Boolean(facilities.auction) === Boolean(site.facilities.auction)
    );

    const newReport: PendingReport = {
      id: `rep-${Date.now().toString().slice(-4)}`,
      site_id: siteId,
      facilities: { ...facilities },
      photo: photo || null,
      submitted_at: new Date().toISOString(),
      matches_existing: matches
    };

    mockPendingReports.push(newReport);

    if (matches) {
      site.report_count = (site.report_count || 0) + 1;
      if (site.report_count >= 2) {
        site.confidence = "verified";
      }
    }

    if (photo) {
      site.photo = photo;
    }
    site.last_updated = new Date().toISOString();

    setState({
      sites: JSON.parse(JSON.stringify(mockSites)),
      pendingReports: [...mockPendingReports]
    });

    return {
      success: true,
      report: newReport,
      site: JSON.parse(JSON.stringify(site))
    };
  }

  const res = await fetch(`${CONFIG.API_BASE_URL}/sites/${siteId}/contribute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ facilities, photo })
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: Contribution failed`);
  return await res.json();
}

/**
 * Get pending reports for a site
 */
export async function getPendingReports(siteId: string): Promise<PendingReport[]> {
  if (CONFIG.USE_MOCK || isOfflineFallbackActive) {
    await initMockData();
    const reports = mockPendingReports.filter(r => r.site_id === siteId);
    return JSON.parse(JSON.stringify(reports));
  }

  try {
    const res = await fetch(`${CONFIG.API_BASE_URL}/sites/${siteId}/reports`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    return [];
  }
}

/**
 * Mark boat status as "out" or "back"
 */
export async function markBoat(
  boatId: string,
  status: 'out' | 'back'
): Promise<{ success: boolean; boat: BoatRecord }> {
  if (CONFIG.USE_MOCK || isOfflineFallbackActive) {
    await initMockData();
    const boat = mockBoats?.find(b => b.id === boatId);
    if (!boat) throw new Error(`Boat ${boatId} not found`);

    boat.status = status;
    if (status === 'out') {
      boat.departed_at = new Date().toISOString();
    }

    const site = mockSites?.find(s => s.id === boat.site_id);
    if (site) {
      if (!site.boats_at_sea) site.boats_at_sea = [];
      if (status === 'out' && !site.boats_at_sea.includes(boatId)) {
        site.boats_at_sea.push(boatId);
      } else if (status === 'back') {
        site.boats_at_sea = site.boats_at_sea.filter(id => id !== boatId);
      }
      site.last_updated = new Date().toISOString();
    }

    setState({
      boats: JSON.parse(JSON.stringify(mockBoats)),
      sites: JSON.parse(JSON.stringify(mockSites))
    });

    return { success: true, boat: JSON.parse(JSON.stringify(boat)) };
  }

  const res = await fetch(`${CONFIG.API_BASE_URL}/boats/${boatId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status })
  });
  if (!res.ok) throw new Error(`Failed to update boat ${boatId}`);
  return await res.json();
}

/**
 * DEMO HELPER: Simulate INCOIS high-wave warning on a selected site
 */
export async function simulateAlert(siteId: string): Promise<HarbourSite | null> {
  await initMockData();
  const site = mockSites?.find(s => s.id === siteId);
  if (!site) return null;

  site.signal = {
    light: "red",
    reason_en: "INCOIS high-wave alert active for Kerala. Valid until tomorrow.",
    reason_ml: "ഇൻകോയിസ് ഉയർന്ന തിരമാല മുന്നറിയിപ്പ് നൽകിയിട്ടുണ്ട്. നാളെ വരെ പ്രാബല്യത്തിൽ.",
    valid_until: new Date(Date.now() + 86400000).toISOString(),
    source_label: "live",
    wave_height: 3.8,
    wind_speed: 28
  };
  site.last_updated = new Date().toISOString();

  if (mockBoats) {
    const siteBoats = mockBoats.filter(b => b.site_id === siteId);
    if (siteBoats.length >= 2 && (!site.boats_at_sea || site.boats_at_sea.length === 0)) {
      siteBoats[0].status = 'out';
      siteBoats[0].departed_at = new Date(Date.now() - 7200000).toISOString();
      siteBoats[1].status = 'out';
      siteBoats[1].departed_at = new Date(Date.now() - 3600000).toISOString();
      site.boats_at_sea = [siteBoats[0].id, siteBoats[1].id];
    }
  }

  setState({
    sites: JSON.parse(JSON.stringify(mockSites)),
    boats: JSON.parse(JSON.stringify(mockBoats))
  });

  return JSON.parse(JSON.stringify(site));
}

/**
 * DEMO HELPER: Reset in-memory data to baseline
 */
export async function resetDemo(): Promise<boolean> {
  if (initialSitesSnapshot && initialBoatsSnapshot) {
    mockSites = JSON.parse(JSON.stringify(initialSitesSnapshot));
    mockBoats = JSON.parse(JSON.stringify(initialBoatsSnapshot));
  } else {
    mockSites = null;
    mockBoats = null;
    await initMockData();
  }

  mockPendingReports = [
    {
      id: "rep-101",
      site_id: "site-4",
      facilities: { ice: true, fuel: true, shelter: false, auction: true },
      photo: null,
      submitted_at: new Date(Date.now() - 3600000).toISOString(),
      matches_existing: true
    }
  ];

  isOfflineFallbackActive = false;

  setState({
    sites: JSON.parse(JSON.stringify(mockSites)),
    boats: JSON.parse(JSON.stringify(mockBoats)),
    pendingReports: [...mockPendingReports],
    offlineMode: false,
    selectedSiteId: null,
    isCardOpen: false,
    activeModal: null
  });

  return true;
}
