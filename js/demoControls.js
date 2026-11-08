/**
 * Kadal Signal - Hidden Demo Controls
 * Triggered by tapping the "KADAL SIGNAL" title 5 times.
 * Enables live judge demonstrations:
 *  1. Triggering an INCOIS Red Alert + Still-at-Sea boats
 *  2. Toggling offline cached snapshot fallback
 *  3. Resetting demo to clean baseline
 */

import { getState, setState, subscribe, getSelectedSite } from './state.js';
import { simulateAlert, resetDemo, setOfflineFallback, isOfflineSnapshot } from './api.js';
import { t } from './i18n.js';

let tapCount = 0;
let tapTimer = null;

export function initDemoControls() {
  const brandTitle = document.getElementById('brand-title-area');
  const modal = document.getElementById('demo-modal');

  // Tap 5 times within 3 seconds to reveal
  if (brandTitle) {
    brandTitle.addEventListener('click', () => {
      tapCount++;
      clearTimeout(tapTimer);

      tapTimer = setTimeout(() => {
        tapCount = 0;
      }, 3000);

      if (tapCount >= 5) {
        tapCount = 0;
        setState({ activeModal: 'demo' });
      }
    });
  }

  // Subscribe to state to toggle modal
  subscribe((state, prevState) => {
    if (modal && state.activeModal !== prevState.activeModal) {
      modal.classList.toggle('active', state.activeModal === 'demo');
      if (state.activeModal === 'demo') {
        renderDemoControls(modal);
      }
    }
  });

  // Close handlers
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal || e.target.closest('.modal-close-btn')) {
        setState({ activeModal: null });
      }
    });
  }
}

function renderDemoControls(modal) {
  const container = modal.querySelector('.modal-body');
  if (!container) return;

  const site = getSelectedSite();
  const targetSiteId = site ? site.id : 'site-1';
  const targetSiteName = site ? site.name : 'Vizhinjam Harbour';
  const isOffline = isOfflineSnapshot();

  container.innerHTML = `
    <div style="margin-bottom: 16px;">
      <div class="deck-tagline">HACKATHON DEMO CONTROL PANEL</div>
      <h3 style="font-size: 18px; font-weight: 800; color: var(--navy); margin-top: 2px;">
        ${t('demo_title')}
      </h3>
      <p style="font-size: 12px; color: var(--grey); margin-top: 4px;">
        Secret judge demo panel. Use to trigger live alert scenarios or demonstrate offline resilience.
      </p>
    </div>

    <div style="display: flex; flex-direction: column; gap: 12px;">
      <!-- 1. Simulate Alert -->
      <button
        type="button"
        id="demo-btn-simulate"
        class="btn-primary"
        style="background-color: var(--red); justify-content: flex-start; padding: 12px 16px;"
      >
        <span style="font-size: 20px;">🚨</span>
        <div style="text-align: left;">
          <div>${t('demo_simulate_alert')}</div>
          <div style="font-size: 11px; opacity: 0.85; font-weight: 400;">Target: ${targetSiteName}</div>
        </div>
      </button>

      <!-- 2. Toggle Offline Snapshot -->
      <button
        type="button"
        id="demo-btn-offline"
        class="btn-secondary"
        style="justify-content: flex-start; padding: 12px 16px; border-color: var(--amber);"
      >
        <span style="font-size: 20px;">📡</span>
        <div style="text-align: left;">
          <div>${t('demo_offline_toggle')}</div>
          <div style="font-size: 11px; color: ${isOffline ? 'var(--amber)' : 'var(--grey)'}; font-weight: 600;">
            Status: ${isOffline ? t('demo_offline_active') : t('demo_online_active')}
          </div>
        </div>
      </button>

      <!-- 3. Reset Demo -->
      <button
        type="button"
        id="demo-btn-reset"
        class="btn-secondary"
        style="justify-content: flex-start; padding: 12px 16px;"
      >
        <span style="font-size: 20px;">🔄</span>
        <div style="text-align: left;">
          <div>${t('demo_reset')}</div>
          <div style="font-size: 11px; color: var(--grey); font-weight: 400;">Restore initial baseline mock data</div>
        </div>
      </button>
    </div>

    <div style="margin-top: 16px; padding-top: 12px; border-top: 1px solid var(--grey-light); text-align: center;">
      <button type="button" class="btn-secondary modal-close-btn" style="min-height: 40px; width: 100%;">
        Close Panel
      </button>
    </div>
  `;

  // Attach button action listeners
  const btnSimulate = container.querySelector('#demo-btn-simulate');
  const btnOffline = container.querySelector('#demo-btn-offline');
  const btnReset = container.querySelector('#demo-btn-reset');

  if (btnSimulate) {
    btnSimulate.addEventListener('click', async () => {
      btnSimulate.disabled = true;
      try {
        await simulateAlert(targetSiteId);
        setState({ selectedSiteId: targetSiteId, isCardOpen: true, activeModal: null });
      } catch (err) {
        alert('Simulation failed: ' + err.message);
      }
    });
  }

  if (btnOffline) {
    btnOffline.addEventListener('click', () => {
      const nextMode = !isOfflineSnapshot();
      setOfflineFallback(nextMode);
      renderDemoControls(modal);
    });
  }

  if (btnReset) {
    btnReset.addEventListener('click', async () => {
      btnReset.disabled = true;
      try {
        await resetDemo();
        renderDemoControls(modal);
        alert('Demo state restored to initial baseline.');
      } catch (err) {
        alert('Reset failed: ' + err.message);
      }
    });
  }
}
