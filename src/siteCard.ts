/**
 * Kadal Signal - Site Card Controller (Bottom Sheet / Desktop Side Panel)
 * Renders rich site details, marine telemetry (waves, wind), Malayalam speech synthesis,
 * and live "Still at Sea" boat status tracking.
 */

import { CONFIG } from './config';
import { getState, setState, subscribe, getSelectedSite, getSiteBoats } from './state';
import { getSite } from './api';
import { t, getLang } from './i18n';
import { playHarbourWarningAudio, stopAllSpeech } from './audio';

let pollingTimer: ReturnType<typeof setInterval> | null = null;

export function initSiteCard(): void {
  const panel = document.getElementById('site-card-panel');
  if (!panel) return;

  // Handle bar tap to toggle expansion on mobile
  const handleBar = panel.querySelector('.sheet-handle-bar');
  if (handleBar) {
    handleBar.addEventListener('click', () => {
      const { isCardExpanded } = getState();
      setState({ isCardExpanded: !isCardExpanded });
    });
  }

  // Subscribe to state updates
  subscribe((state, prevState) => {
    if (state.isCardOpen !== prevState.isCardOpen) {
      panel.classList.toggle('open', state.isCardOpen);
      if (state.isCardOpen) {
        startPolling(state.selectedSiteId);
      } else {
        stopPolling();
        stopAllSpeech();
      }
    }

    if (state.isCardExpanded !== prevState.isCardExpanded) {
      panel.classList.toggle('expanded', state.isCardExpanded);
    }

    if (
      state.isCardOpen &&
      (state.selectedSiteId !== prevState.selectedSiteId ||
       state.sites !== prevState.sites ||
       state.boats !== prevState.boats ||
       state.language !== prevState.language)
    ) {
      renderCardContent(panel);
    }
  });

  // Action clicks inside the card
  panel.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;

    if (target.closest('#card-close-btn')) {
      setState({ isCardOpen: false, selectedSiteId: null });
      return;
    }

    if (target.closest('#btn-card-contribute')) {
      setState({ activeModal: 'contribute' });
      return;
    }

    if (target.closest('#btn-card-boat-log')) {
      setState({ activeModal: 'board' });
      return;
    }

    if (target.closest('#confidence-clickable-area')) {
      setState({ activeModal: 'queue' });
      return;
    }

    const speakerBtn = target.closest<HTMLButtonElement>('#btn-malayalam-speak');
    if (speakerBtn) {
      const site = getSelectedSite();
      if (!site) return;

      speakerBtn.disabled = true;
      speakerBtn.classList.add('playing');
      speakerBtn.innerHTML = `<span>🔊</span> ${t('btn_listening')}`;

      playHarbourWarningAudio(
        site.name,
        site.signal?.light || 'green',
        site.signal?.reason_ml,
        site.signal?.reason_en,
        () => {
          speakerBtn.classList.add('playing');
          speakerBtn.innerHTML = `<span>🔊</span> ${t('btn_listening')}`;
        },
        () => {
          speakerBtn.disabled = false;
          speakerBtn.classList.remove('playing');
          speakerBtn.innerHTML = `<span>🔊</span> ${t('btn_listen_malayalam')}`;
        }
      );
    }
  });
}

function startPolling(siteId: string | null): void {
  stopPolling();
  if (!siteId) return;

  pollingTimer = setInterval(async () => {
    try {
      const updatedSite = await getSite(siteId);
      if (updatedSite) {
        const { sites } = getState();
        const idx = sites.findIndex(s => s.id === siteId);
        if (idx !== -1) {
          const nextSites = [...sites];
          nextSites[idx] = updatedSite;
          setState({ sites: nextSites });
        }
      }
    } catch (e) {
      console.warn('Polling getSite failed:', e);
    }
  }, CONFIG.POLLING_INTERVAL_MS);
}

function stopPolling(): void {
  if (pollingTimer) {
    clearInterval(pollingTimer);
    pollingTimer = null;
  }
}

function renderCardContent(panel: HTMLElement): void {
  const container = panel.querySelector<HTMLElement>('.site-card-scroll');
  if (!container) return;

  const site = getSelectedSite();
  if (!site) return;

  const lang = getLang();
  const siteName = (lang === 'ml' && site.name_ml) ? site.name_ml : site.name;
  const signal = site.signal || { light: 'green' };
  const light = signal.light || 'green';

  const reasonText = (lang === 'ml' && signal.reason_ml)
    ? signal.reason_ml
    : (signal.reason_en || (light === 'green' ? t('signal_green_desc') : light === 'amber' ? t('signal_amber') : t('signal_red')));

  const confBadgeText = site.confidence === 'verified'
    ? t('confidence_verified')
    : site.confidence === 'medium'
      ? t('confidence_medium')
      : t('confidence_low');

  const confDescription = site.confidence === 'verified'
    ? t('validation_status_verified')
    : site.report_count === 1
      ? t('validation_status_1_of_2')
      : t('confidence_reports_count', { count: site.report_count || 0 });

  // Boats at sea
  const siteBoats = getSiteBoats(site.id);
  const boatsOut = siteBoats.filter(b => b.status === 'out');

  // Simulated weather telemetry
  const waveHeight = signal.wave_height || (light === 'red' ? 3.4 : light === 'amber' ? 2.1 : 1.2);
  const windKnots = signal.wind_speed || (light === 'red' ? 26 : light === 'amber' ? 18 : 10);

  container.innerHTML = `
    <!-- Top Action Row -->
    <div class="card-top-row">
      <div class="card-district-pill">${site.district.toUpperCase()}</div>
      <button type="button" class="card-close-btn" id="card-close-btn" aria-label="Close card">✕</button>
    </div>

    <!-- Title & Verification Status -->
    <h2 class="card-site-name">${siteName}</h2>
    
    <div class="confidence-banner tier-${site.confidence}" id="confidence-clickable-area" title="Click to view validation queue">
      <div class="confidence-badge-chip">
        <span class="conf-icon">${site.confidence === 'verified' ? '✓' : site.confidence === 'medium' ? '⚡' : '⋯'}</span>
        <strong>${confBadgeText}</strong>
      </div>
      <span class="conf-text">${confDescription}</span>
      <span class="conf-arrow">›</span>
    </div>

    <!-- Marine Signal Status Banner -->
    <div class="signal-alert-card signal-${light}">
      <div class="signal-status-row">
        <span class="signal-indicator-dot"></span>
        <span class="signal-label-text">
          ${light === 'green' ? t('signal_green') : light === 'amber' ? t('signal_amber') : t('signal_red')}
        </span>
        <span class="signal-live-pill">${signal.source_label || t('live_badge')}</span>
      </div>
      <p class="signal-reason-desc">${reasonText}</p>
      
      <!-- Speech Broadcast Button -->
      <button
        type="button"
        class="speech-audio-btn"
        id="btn-malayalam-speak"
      >
        <span>🔊</span> ${t('btn_listen_malayalam')}
      </button>
    </div>

    <!-- Live Marine Weather Telemetry Grid -->
    <div class="telemetry-grid">
      <div class="telemetry-cell">
        <span class="telemetry-icon">🌊</span>
        <div class="telemetry-data">
          <span class="telemetry-val">${waveHeight.toFixed(1)} m</span>
          <span class="telemetry-label">Wave Height</span>
        </div>
      </div>
      <div class="telemetry-cell">
        <span class="telemetry-icon">💨</span>
        <div class="telemetry-data">
          <span class="telemetry-val">${windKnots} kn</span>
          <span class="telemetry-label">Wind Speed</span>
        </div>
      </div>
    </div>

    <!-- "STILL AT SEA" Alert Section -->
    ${boatsOut.length > 0 ? `
      <div class="still-at-sea-card">
        <div class="still-header">
          <span class="still-pulse-icon">⚠️</span>
          <h4>${t('still_at_sea_header')} (${boatsOut.length})</h4>
        </div>
        <p class="still-desc">${t('still_at_sea_warning')}</p>
        <ul class="still-boat-list">
          ${boatsOut.map(b => `
            <li class="still-boat-item">
              <span class="boat-icon">⛵</span>
              <strong class="boat-name">${b.demo_name}</strong>
              <span class="depart-time">${b.departed_at ? new Date(b.departed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Earlier'}</span>
            </li>
          `).join('')}
        </ul>
      </div>
    ` : ''}

    <!-- Facilities Matrix -->
    <div class="facilities-section">
      <h4 class="section-heading">Harbour Facilities</h4>
      <div class="facilities-grid">
        <div class="facility-pill ${site.facilities?.ice ? 'active' : 'inactive'}">
          <span>${site.facilities?.ice ? '✓' : '✕'}</span>
          <span>${t('facility_ice')}</span>
        </div>
        <div class="facility-pill ${site.facilities?.fuel ? 'active' : 'inactive'}">
          <span>${site.facilities?.fuel ? '✓' : '✕'}</span>
          <span>${t('facility_fuel')}</span>
        </div>
        <div class="facility-pill ${site.facilities?.shelter ? 'active' : 'inactive'}">
          <span>${site.facilities?.shelter ? '✓' : '✕'}</span>
          <span>${t('facility_shelter')}</span>
        </div>
        <div class="facility-pill ${site.facilities?.auction ? 'active' : 'inactive'}">
          <span>${site.facilities?.auction ? '✓' : '✕'}</span>
          <span>${t('facility_auction')}</span>
        </div>
      </div>
    </div>

    <!-- Quick Actions Footer -->
    <div class="card-action-buttons">
      <button type="button" class="btn-primary" id="btn-card-boat-log">
        <span>📋</span> ${t('btn_boat_log')}
      </button>
      <button type="button" class="btn-secondary" id="btn-card-contribute">
        <span>📝</span> ${t('btn_contribute')}
      </button>
    </div>
  `;
}
