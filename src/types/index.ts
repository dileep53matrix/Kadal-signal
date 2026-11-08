/**
 * Kadal Signal - Type Definitions
 * Strict domain models for Kerala Harbour Atlas & Marine Decision Aid.
 */

export type ConfidenceTier = 'low' | 'medium' | 'verified';
export type SignalLight = 'green' | 'amber' | 'red';
export type FacilityKey = 'ice' | 'fuel' | 'shelter' | 'auction';

export interface Facilities {
  ice: boolean;
  fuel: boolean;
  shelter: boolean;
  auction: boolean;
}

export interface SignalInfo {
  light: SignalLight;
  reason_en?: string;
  reason_ml?: string;
  valid_until?: string;
  source_label?: string;
  wave_height?: number; // meters
  wind_speed?: number;  // knots
}

export interface HarbourSite {
  id: string;
  name: string;
  name_ml?: string;
  district: string;
  lat: number;
  lon: number;
  confidence: ConfidenceTier;
  facilities: Facilities;
  signal: SignalInfo;
  report_count?: number;
  photo?: string | null;
  last_updated?: string;
  boats_at_sea?: string[];
  discrepancy?: string | null;
  cmfri_source?: string;
  osm_source?: string;
}

export interface BoatRecord {
  id: string;
  demo_name: string;
  site_id: string;
  status: 'out' | 'back';
  departed_at?: string;
}

export interface PendingReport {
  id: string;
  site_id: string;
  facilities: Facilities;
  photo: string | null;
  submitted_at: string;
  matches_existing: boolean;
}

export interface FilterState {
  confidence: ConfidenceTier | null;
  facility: FacilityKey | null;
  light: SignalLight | null;
  search: string;
}

export type ModalType = 'contribute' | 'board' | 'queue' | 'demo' | null;

export interface AppState {
  sites: HarbourSite[];
  selectedSiteId: string | null;
  boats: BoatRecord[];
  pendingReports: PendingReport[];
  filters: FilterState;
  offlineMode: boolean;
  isCardOpen: boolean;
  isCardExpanded: boolean;
  activeModal: ModalType;
  isLoading: boolean;
  errorMessage: string | null;
  lastUpdated: string;
  language: 'en' | 'ml';
}
