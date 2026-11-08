/**
 * Kadal Signal - Leaflet Map Controller
 * Highly optimized, typed map rendering for Kerala Coastline.
 * Custom dual-encoded markers: outer confidence ring + inner signal radar.
 */

import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { CONFIG } from './config';
import { getState, setState, subscribe, getFilteredSites } from './state';
import { HarbourSite, SignalLight, ConfidenceTier } from './types';

let mapInstance: L.Map | null = null;
const markerMap = new Map<string, L.CircleMarker>();
let markerGroup: L.FeatureGroup | null = null;

function getSignalFillColor(light?: SignalLight): string {
  switch (light) {
    case 'green': return '#10B981'; // Vivid Emerald
    case 'amber': return '#F59E0B'; // Vivid Amber
    case 'red': return '#EF4444';   // Crimson Alert Red
    default: return '#94A3B8';      // Neutral Slate
  }
}

function getConfidenceRingStyle(confidence: ConfidenceTier, isSelected = false): L.PathOptions {
  const baseWeight = isSelected ? 4 : 2.5;

  switch (confidence) {
    case 'low':
      return {
        color: isSelected ? '#38BDF8' : '#64748B',
        weight: baseWeight,
        dashArray: '4, 4',
        opacity: 0.95
      };
    case 'medium':
      return {
        color: isSelected ? '#38BDF8' : '#D97706',
        weight: baseWeight + 0.5,
        dashArray: '6, 3',
        opacity: 1
      };
    case 'verified':
    default:
      return {
        color: isSelected ? '#38BDF8' : '#0F172A',
        weight: baseWeight + 1,
        dashArray: undefined,
        opacity: 1
      };
  }
}

export function initMap(): L.Map {
  if (mapInstance) return mapInstance;

  const { DEFAULT_CENTER, DEFAULT_ZOOM, MIN_ZOOM, MAX_ZOOM, MAX_BOUNDS, TILE_URL, TILE_ATTRIBUTION } = CONFIG.MAP;

  mapInstance = L.map('map', {
    center: DEFAULT_CENTER,
    zoom: DEFAULT_ZOOM,
    minZoom: MIN_ZOOM,
    maxZoom: MAX_ZOOM,
    maxBounds: MAX_BOUNDS,
    zoomControl: false
  });

  L.control.zoom({ position: 'topright' }).addTo(mapInstance);

  L.tileLayer(TILE_URL, {
    attribution: TILE_ATTRIBUTION,
    maxZoom: MAX_ZOOM,
    crossOrigin: true
  }).addTo(mapInstance);

  markerGroup = L.featureGroup().addTo(mapInstance);

  // Close sheet when tapping blank water or land
  mapInstance.on('click', (e: L.LeafletMouseEvent) => {
    const originalEvent = e.originalEvent as MouseEvent & { _markerClicked?: boolean };
    if (originalEvent && !originalEvent._markerClicked) {
      setState({ isCardOpen: false });
    }
  });

  // State subscription to refresh markers
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

export function renderMarkers(): void {
  if (!mapInstance || !markerGroup) return;

  const filteredSites = getFilteredSites();
  const filteredIds = new Set(filteredSites.map(s => s.id));
  const { selectedSiteId } = getState();

  // Prune deleted/filtered markers
  for (const [id, marker] of markerMap.entries()) {
    if (!filteredIds.has(id)) {
      markerGroup.removeLayer(marker);
      markerMap.delete(id);
    }
  }

  filteredSites.forEach(site => {
    const isSelected = (site.id === selectedSiteId);
    const fillColor = getSignalFillColor(site.signal?.light);
    const ringStyle = getConfidenceRingStyle(site.confidence, isSelected);
    const radius = isSelected ? 13 : 9;

    let marker = markerMap.get(site.id);

    if (!marker) {
      marker = L.circleMarker([site.lat, site.lon], {
        radius,
        fillColor,
        fillOpacity: 0.95,
        ...ringStyle
      });

      const confLabel = site.confidence.toUpperCase();
      const signalLabel = site.signal?.light ? site.signal.light.toUpperCase() : 'NO SIGNAL';
      marker.bindTooltip(`
        <div style="font-family: inherit; font-size: 12px; line-height: 1.4;">
          <strong style="font-weight: 700; color: #0F172A;">${site.name}</strong><br/>
          <span style="color: ${fillColor}; font-weight: 700;">● ${signalLabel}</span> | <span>${confLabel}</span>
        </div>
      `, {
        direction: 'top',
        offset: [0, -8],
        className: 'custom-map-tooltip'
      });

      marker.on('click', (e: L.LeafletMouseEvent) => {
        const originalEvent = e.originalEvent as MouseEvent & { _markerClicked?: boolean };
        if (originalEvent) originalEvent._markerClicked = true;
        L.DomEvent.stopPropagation(e);

        setState({
          selectedSiteId: site.id,
          isCardOpen: true
        });

        if (mapInstance) {
          mapInstance.panTo([site.lat, site.lon], { animate: true, duration: 0.5 });
        }
      });

      if (markerGroup) {
        markerGroup.addLayer(marker);
      }
      markerMap.set(site.id, marker);
    } else {
      marker.setLatLng([site.lat, site.lon]);
      marker.setRadius(radius);
      marker.setStyle({
        fillColor,
        fillOpacity: 0.95,
        ...ringStyle
      });

      if (isSelected) {
        marker.bringToFront();
      }
    }
  });
}

export function focusSite(siteId: string): void {
  const { sites } = getState();
  const site = sites.find((s: HarbourSite) => s.id === siteId);
  if (site && mapInstance) {
    mapInstance.setView([site.lat, site.lon], 11, { animate: true });
  }
}
