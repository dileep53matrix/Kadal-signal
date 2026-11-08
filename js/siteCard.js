/**
 * Kadal Signal - Site Card Controller (Bottom Sheet / Desktop Side Panel)
 * Renders site details matching the deck mock-up order, manages polling,
 * handles Malayalam speech synthesis, and tracks Still at Sea vessels.
 */

import { CONFIG } from './config.js';
import { getState, setState, subscribe, getSelectedSite } from './state.js';
import { getSite } from './api.js';
import { t } from './i18n.js';

let pollingTimer = null;
let currentSpeechUtterance = null;
let previousConfidence = null;

export function initSiteCard() {
  const panel = document.getElementById('site-card-panel');
  if (!panel) return;

  // Bottom sheet handle bar tap to toggle expansion on mobile
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
        stopSpeech();
      }
    }

    if (state.isCardExpanded !== prevState.isCardExpanded) {
      panel.classList.toggle('expanded', state.isCardExpanded);
    }

    if (
      state.isCardOpen &&
      (state.selectedSiteId !== prevState.selectedSiteId ||
       state.sites !== prevState.sites ||
       state.boats !== prevState.boats)
    ) {
      renderCardContent(panel);
    }
  });

  // Attach event delegation for buttons inside card
  panel.addEventListener('click', (e) => {
    // Close button
    if (e.target.closest('#card-close-btn')) {
      setState({ isCardOpen: false, selectedSiteId: null });
      return;
    }

    // Contribute button
    if (e.target.closest('#btn-card-contribute')) {
      setState({ activeModal: 'contribute' });
      return;
    }

    // Boat Log button
    if (e.target.closest('#btn-card-boat-log')) {
      setState({ activeModal: 'board' });
      return;
    }

    // Validation Queue trigger (clicking confidence badge or matching reports text)
    if (e.target.closest('#confidence-clickable-area')) {
      setState({ activeModal: 'queue' });
      return;
    }

    // Speaker button for Malayalam speech synthesis
    const speakerBtn = e.target.closest('#btn-malayalam-speak');
    if (speakerBtn) {
      const text = speakerBtn.dataset.speechText;
      playMalayalamSpeech(text, speakerBtn);
    }
  });
}

/**
 * Poll getSite() every 3 seconds while card is open
 */
function startPolling(siteId) {
  stopPolling();
  if (!siteId) return;

  pollingTimer = setInterval(async () => {
    try {
      const updatedSite = await getSite(siteId);
      if (updatedSite) {
        const { sites } = getState();
        const idx = sites.findIndex(s => s.id === siteId);
        if (idx !== -1) {
          const newSites = [...sites];
          newSites[idx] = updatedSite;
          setState({ sites: newSites });
        }
      }
    } catch (err) {
      console.warn('[SiteCard Polling Error]:', err);
    }
  }, CONFIG.POLLING_INTERVAL_MS);
}

function stopPolling() {
  if (pollingTimer) {
    clearInterval(pollingTimer);
    pollingTimer = null;
  }
}

/**
 * Speech synthesis with graceful fallback
 */
function playMalayalamSpeech(text, btnElement) {
  if (!('speechSynthesis' in window)) {
    alert(t('btn_tts_unsupported'));
    return;
  }

  if (window.speechSynthesis.speaking) {
    window.speechSynthesis.cancel();
    btnElement.classList.remove('playing');
    return;
  }

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'ml-IN';
  utterance.rate = 0.95;

  btnElement.classList.add('playing');

  utterance.onend = () => {
    btnElement.classList.remove('playing');
  };

  utterance.onerror = (e) => {
    console.warn('[TTS Error]:', e);
    btnElement.classList.remove('playing');
  };

  currentSpeechUtterance = utterance;
  window.speechSynthesis.speak(utterance);
}

function stopSpeech() {
  if ('speechSynthesis' in window && window.speechSynthesis.speaking) {
    window.speechSynthesis.cancel();
  }
}

/**
 * Render complete site card according to deck mockup layout order
 */
function renderCardContent(panel) {
  const container = panel.querySelector('.site-card-scroll');
  if (!container) return;

  const site = getSelectedSite();
  if (!site) {
    container.innerHTML = `
      <div style="padding: 24px; text-align: center; color: var(--grey);">
        <p>${t('select_site_prompt')}</p>
      </div>
    `;
    return;
  }

  // Detect confidence promotion (Medium -> Verified) for animation
  const isNowVerified = (site.confidence === 'verified');
  const shouldAnimateFlip = (previousConfidence === 'medium' && isNowVerified);
  previousConfidence = site.confidence;

  // Formatting helpers
  const signal = site.signal;
  const light = signal?.light ? signal.light.toLowerCase() : 'none';
  const lightWord = light === 'none' ? t('signal_none') : light.toUpperCase();
  const reasonEn = signal?.reason_en || "No daily forecast or INCOIS advisory active for this landing point.";
  const reasonMl = signal?.reason_ml || "പ്രത്യേക ജാഗ്രതാ നിർദ്ദേശങ്ങളൊന്നും ലഭ്യമല്ല.";
  const validUntilFormatted = signal?.valid_until ? new Date(signal.valid_until).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--';

  // Facilities data
  const fac = site.facilities || { ice: false, fuel: false, shelter: false, auction: false };

  // Still at sea vessels list
  const { boats } = getState();
  const siteBoats = boats.filter(b => b.site_id === site.id);
  const boatsAtSea = siteBoats.filter(b => b.status === 'out');
  const isRedAlert = (light === 'red');

  container.innerHTML = `
    <!-- 1. Label, Site Name, District -->
    <div class="deck-tagline">KADAL SIGNAL | KERALA</div>
    <div class="site-header-row">
      <div>
        <h2 class="site-title">${site.name}</h2>
        <div class="site-district">${site.district} District</div>
      </div>
      <button type="button" class="card-close-btn" id="card-close-btn" aria-label="Close card">✕</button>
    </div>

    <!-- 2. Confidence badge + matching reports + sources -->
    <div class="confidence-row" id="confidence-clickable-area" style="cursor: pointer;" title="Tap to view verification queue">
      <div class="confidence-badge ${site.confidence} ${shouldAnimateFlip ? 'anim-flip' : ''}">
        ${site.confidence === 'verified' ? '✓' : (site.confidence === 'medium' ? '⚡' : '⋯')}
        ${site.confidence.toUpperCase()}
      </div>
      <span class="confidence-meta">
        ${site.report_count} ${t('confidence_reports_count', { count: site.report_count })}
      </span>
      <span class="confidence-sources">
        ${site.sources ? site.sources.join(' + ') : 'CMFRI + OSM'}
      </span>
      <span style="font-size: 11px; color: var(--teal); margin-left: auto; font-weight: 700;">View Queue →</span>
    </div>

    <!-- 3. Facility Chips (missing = faded with a cross, never hidden) -->
    <div class="facilities-section">
      <div class="facilities-label">${t('filter_facilities')}</div>
      <div class="facilities-grid">
        <div class="facility-chip ${fac.ice ? 'present' : 'missing'}">
          ${fac.ice ? '<span>✓</span>' : '<span>✕</span>'}
          <span>${t('facility_ice')}</span>
        </div>
        <div class="facility-fuel facility-chip ${fac.fuel ? 'present' : 'missing'}">
          ${fac.fuel ? '<span>✓</span>' : '<span>✕</span>'}
          <span>${t('facility_fuel')}</span>
        </div>
        <div class="facility-shelter facility-chip ${fac.shelter ? 'present' : 'missing'}">
          ${fac.shelter ? '<span>✓</span>' : '<span>✕</span>'}
          <span>${t('facility_shelter')}</span>
        </div>
        <div class="facility-auction facility-chip ${fac.auction ? 'present' : 'missing'}">
          ${fac.auction ? '<span>✓</span>' : '<span>✕</span>'}
          <span>${t('facility_auction')}</span>
        </div>
      </div>
    </div>

    <!-- 4. Photo (only if present) -->
    ${site.photo ? `
      <div class="site-photo-container">
        <img src="${site.photo}" alt="${site.name} Landing Centre" class="site-photo" loading="lazy" />
      </div>
    ` : ''}

    <!-- 5. Light Block: Three circles, large word, reason, valid until -->
    <div class="signal-light-block signal-${light}">
      <div class="signal-traffic-row">
        <div class="traffic-circles">
          <div class="traffic-circle c-red ${light === 'red' ? 'active' : ''}"></div>
          <div class="traffic-circle c-amber ${light === 'amber' ? 'active' : ''}"></div>
          <div class="traffic-circle c-green ${light === 'green' ? 'active' : ''}"></div>
        </div>
        <div class="signal-word-badge">
          ${light === 'green' ? '🟢' : (light === 'amber' ? '🟡' : (light === 'red' ? '🔴' : '⚪'))}
          ${lightWord}
        </div>
      </div>
      <p class="signal-reason">${reasonEn}</p>
      <div class="signal-validity">
        ${t('signal_valid_until', { time: validUntilFormatted })}
        ${signal?.source_label ? `<span style="margin-left: 6px; text-transform: uppercase; font-size: 10px; background: rgba(0,0,0,0.06); padding: 2px 6px; border-radius: 4px;">${signal.source_label}</span>` : ''}
      </div>
    </div>

    <!-- 6. Malayalam text line with speaker button -->
    <div class="malayalam-box">
      <div class="malayalam-text">${reasonMl}</div>
      <button type="button" class="speaker-btn" id="btn-malayalam-speak" data-speech-text="${reasonMl}" title="${t('btn_listen_malayalam')}">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
          <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
        </svg>
      </button>
    </div>

    <!-- 7. "STILL AT SEA" list in red when signal is red and boats are out -->
    ${(isRedAlert && boatsAtSea.length > 0) ? `
      <div class="still-at-sea-container">
        <div class="still-at-sea-header">
          <span>⚠️</span>
          <span>${t('still_at_sea_header')}: ${boatsAtSea.length} VESSELS AT SEA</span>
        </div>
        <ul class="still-at-sea-boats">
          ${boatsAtSea.map(b => `
            <li class="still-at-sea-item">
              <span>⛵ ${b.demo_name}</span>
              <span class="still-at-sea-time">${b.departed_at ? new Date(b.departed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'At Sea'}</span>
            </li>
          `).join('')}
        </ul>
      </div>
    ` : ''}

    <!-- Action Buttons: Contribute + Boat Log -->
    <div class="card-actions-row">
      <button type="button" class="btn-primary" id="btn-card-contribute">
        <span>📸</span>
        <span>${t('btn_contribute')}</span>
      </button>
      <button type="button" class="btn-secondary" id="btn-card-boat-log">
        <span>📋</span>
        <span>${t('btn_boat_log')}</span>
      </button>
    </div>

    <!-- 8. Footer Disclaimer -->
    <div class="card-disclaimer">
      ${t('app_tagline')}
    </div>
  `;
}
