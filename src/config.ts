/**
 * Kadal Signal - Configuration
 * Central runtime switches, map bounds, and service endpoints.
 */

export const CONFIG = {
  // Mock vs real backend switch
  USE_MOCK: true,

  // Real backend base URL
  API_BASE_URL: 'https://api.kadalsignal.local/v1',

  // Polling interval in ms when a site card is open
  POLLING_INTERVAL_MS: 3000,

  // Map defaults tailored for Kerala coastal geography
  MAP: {
    DEFAULT_CENTER: [10.2, 76.2] as [number, number],
    DEFAULT_ZOOM: 7.5,
    MIN_ZOOM: 6.5,
    MAX_ZOOM: 16,
    // Bounding box covering Kerala coastline
    MAX_BOUNDS: [
      [7.8, 74.5],  // Southwest (Arabian Sea off Kanyakumari/Vizhinjam)
      [13.2, 77.8]  // Northeast (Kasargod/Western Ghats boundary)
    ] as [[number, number], [number, number]],
    TILE_URL: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    TILE_ATTRIBUTION: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors'
  }
} as const;
