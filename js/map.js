/**
 * Kadal Signal - Leaflet Map Controller
 * Renders Kerala coastline, customized circle markers with dual-encoded
 * signal fills and confidence rings, and handles interactive selection.
 */

import { CONFIG } from './config.js';
import { getState, setState, subscribe, getFilteredSites } from './state.js';

let mapInstance = null;
const markerMap = new Map(); // siteId -> L.circleMarker
let markerGroup = null;

/**
 * Determine marker fill color based on signal light
 */
function getSignalFillColor(signal) {
  if (!signal || !signal.light) return '#8A94A6'; // Grey if no signal
  switch (signal.light.toLowerCase()) {
    case 'green': return '#1E9E55';
    case 'amber': return '#E8A317';
    case 'red': return '#D93A2B';
    default: return '#8A94A6';
  }
}

/**
 * Determine border ring options based on confidence tier
 * low = dashed, medium = amber outline, verified = solid tick-accented ring
 */
function getConfidenceRingStyle(confidence, isSelected = false) {
  const baseWeight = isSelected ? 4 : 2.5;

  switch (confidence) {
    case 'low':
      return {
        color: isSelected ? '#0B2545' : '#64748B',
        weight: baseWeight,
        dashArray: '4, 4',
        opacity: 0.95
      };
    case 'medium':
      return {
        color: isSelected ? '#0B2545' : '#D97706',
        weight: baseWeight + 0.5,
        dashArray: '6, 3',
        opacity: 1
      };
    case 'verified':
    default:
      return {
        color: isSelected ? '#0B2545' : '#0B2545',
        weight: baseWeight + 1,
        dashArray: null,
        opacity: 1
      };
  }
}

/**
 * Initialize Leaflet Map
 */
export function initMap() {
  if (mapInstance) return mapInstance;

  const { DEFAULT_CENTER, DEFAULT_ZOOM, MIN_ZOOM, MAX_ZOOM, MAX_BOUNDS, TILE_URL, TILE_ATTRIBUTION } = CONFIG.MAP;

  // Initialize L.map instance
  mapInstance = L.map('map', {
    center: DEFAULT_CENTER,
    zoom: DEFAULT_ZOOM,
    minZoom: MIN_ZOOM,
    maxZoom: MAX_ZOOM,
    maxBounds: MAX_BOUNDS,
    zoomControl: false // Custom placement for mobile touch ergonomics
  });

  // Re-position zoom controls to top-right
  L.control.zoom({ position: 'topright' }).addTo(mapInstance);

  // Add OpenStreetMap base tile layer
  L.tileLayer(TILE_URL, {
    attribution: TILE_ATTRIBUTION,
    maxZoom: MAX_ZOOM,
    crossOrigin: true
  }).addTo(mapInstance);

  markerGroup = L.featureGroup().addTo(mapInstance);

  // Close card when tapping empty map area
  mapInstance.on('click', (e) => {
    // If click was on canvas/tiles rather than marker
    if (e.originalEvent && !e.originalEvent._markerClicked) {
      setState({ isCardOpen: false });
    }
  });

  // Subscribe to state updates for live marker updates
  subscribe((state, prevState) => {
    if (
      state.sites !== prevState.sites ||
      state.filters !== prevState.filters ||
      state.selectedSiteId !== prevState.selectedSiteId
    ) {
      renderMarkers();
    }
  });

  return mapInstance;
}

/**
 * Render or refresh all site markers based on current filtered state
 */
export function renderMarkers() {
  if (!mapInstance || !markerGroup) return;

  const filteredSites = getFilteredSites();
  const filteredIds = new Set(filteredSites.map(s => s.id));
  const { selectedSiteId } = getState();

  // Remove markers no longer matching filter
  for (const [id, marker] of markerMap.entries()) {
    if (!filteredIds.has(id)) {
      markerGroup.removeLayer(marker);
      markerMap.delete(id);
    }
  }

  // Create or update markers for filtered sites
  filteredSites.forEach(site => {
    const isSelected = (site.id === selectedSiteId);
    const fillColor = getSignalFillColor(site.signal);
    const ringStyle = getConfidenceRingStyle(site.confidence, isSelected);
    const radius = isSelected ? 12 : 9;

    let marker = markerMap.get(site.id);

    if (!marker) {
      // Create new circleMarker
      marker = L.circleMarker([site.lat, site.lon], {
        radius,
        fillColor,
        fillOpacity: 0.9,
        ...ringStyle
      });

      // Bind accessible tooltip
      const confLabel = site.confidence.toUpperCase();
      const signalLabel = site.signal?.light ? site.signal.light.toUpperCase() : 'NO SIGNAL';
      marker.bindTooltip(`<strong>${site.name}</strong><br/>Signal: ${signalLabel} | ${confLabel}`, {
        direction: 'top',
        offset: [0, -8]
      });

      // Handle marker tap/click
      marker.on('click', (e) => {
        if (e.originalEvent) {
          e.originalEvent._markerClicked = true;
        }
        L.DomEvent.stopPropagation(e);

        setState({
          selectedSiteId: site.id,
          isCardOpen: true
        });

        // Pan map gently to clicked marker
        mapInstance.panTo([site.lat, site.lon], { animate: true, duration: 0.5 });
      });

      markerGroup.addLayer(marker);
      markerMap.set(site.id, marker);
    } else {
      // Update existing marker styles
      marker.setLatLng([site.lat, site.lon]);
      marker.setRadius(radius);
      marker.setStyle({
        fillColor,
        fillOpacity: 0.9,
        ...ringStyle
      });
      // Bring selected marker to front
      if (isSelected) {
        marker.bringToFront();
      }
    }
  });
}

/**
 * Pan and focus on a specific site
 */
export function focusSite(siteId) {
  const { sites } = getState();
  const site = sites.find(s => s.id === siteId);
  if (site && mapInstance) {
    mapInstance.setView([site.lat, site.lon], 11, { animate: true });
  }
}
