/**
 * Kadal Signal - Hidden Demo Controls
 * Triggered by tapping the "KADAL SIGNAL" header 5 times.
 * Enables live judge simulations:
 *  1. Triggering an INCOIS Red Alert + Still-at-Sea boats
 *  2. Toggling offline cached snapshot fallback
 *  3. Resetting demo to clean baseline
 */

import { setState, subscribe, getSelectedSite } from './state';
import { simulateAlert, resetDemo, setOfflineFallback, isOfflineSnapshot } from './api';
import { t } from './i18n';

let tapCount = 0;
let tapTimer: ReturnType<typeof setTimeout> | null = null;

export function initDemoControls(): void {
  const brandTitle = document.getElementById('brand-title-area');
  const modal = document.getElementById('demo-modal');

  if (brandTitle) {
    brandTitle.addEventListener('click', () => {
      tapCount++;
      if (tapTimer) clearTimeout(tapTimer);

      tapTimer = setTimeout(() => {
        tapCount = 0;
      }, 3000);

      if (tapCount >= 5) {
        tapCount = 0;
        setState({ activeModal: 'demo' });
      }
    });
  }

  subscribe((state, prevState) => {
    if (modal && state.activeModal !== prevState.activeModal) {
      modal.classList.toggle('active', state.activeModal === 'demo');
      if (state.activeModal === 'demo') {
        renderDemoControls(modal);
      }
    }
  });

  if (modal) {
    modal.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      if (target === modal || target.closest('.modal-close-btn')) {
        setState({ activeModal: null });
      }
    });
  }
}

function renderDemoControls(modal: HTMLElement): void {
  const container = modal.querySelector<HTMLElement>('.modal-body');
  if (!container) return;

  const site = getSelectedSite();
  const targetSiteId = site ? site.id : 'site-1';
  const targetSiteName = site ? site.name : 'Vizhinjam Harbour';
  const isOffline = isOfflineSnapshot();

  container.innerHTML = `
    <div class="demo-header-box">
      <div class="deck-tagline">HACKATHON DEMO CONTROL PANEL</div>
      <h3 class="demo-title">${t('demo_title')}</h3>
      <p class="demo-sub">
        Secret judge demo panel. Use to trigger live alert scenarios or demonstrate offline resilience.
      </p>
    </div>

    <div class="demo-buttons-col">
      <!-- 1. Simulate Alert -->
      <button
        type="button"
        id="demo-btn-simulate"
        class="btn-primary demo-action-btn alert-action"
      >
        <span class="demo-btn-icon">🚨</span>
        <div class="demo-btn-text">
          <div class="demo-btn-title">${t('demo_simulate_alert')}</div>
          <div class="demo-btn-sub">Target: ${targetSiteName}</div>
        </div>
      </button>

      <!-- 2. Toggle Offline Snapshot -->
      <button
        type="button"
        id="demo-btn-offline"
        class="btn-secondary demo-action-btn"
      >
        <span class="demo-btn-icon">📡</span>
        <div class="demo-btn-text">
          <div class="demo-btn-title">${t('demo_offline_toggle')}</div>
          <div class="demo-btn-sub status-${isOffline ? 'offline' : 'online'}">
            Status: ${isOffline ? t('demo_offline_active') : t('demo_online_active')}
          </div>
        </div>
      </button>

      <!-- 3. Reset Demo -->
      <button
        type="button"
        id="demo-btn-reset"
        class="btn-secondary demo-action-btn"
      >
        <span class="demo-btn-icon">🔄</span>
        <div class="demo-btn-text">
          <div class="demo-btn-title">${t('demo_reset')}</div>
          <div class="demo-btn-sub">Restore initial baseline mock data</div>
        </div>
      </button>
    </div>

    <div class="demo-modal-footer">
      <button type="button" class="btn-secondary modal-close-btn" style="width: 100%;">
        Close Panel
      </button>
    </div>
  `;

  const btnSimulate = container.querySelector<HTMLButtonElement>('#demo-btn-simulate');
  const btnOffline = container.querySelector<HTMLButtonElement>('#demo-btn-offline');
  const btnReset = container.querySelector<HTMLButtonElement>('#demo-btn-reset');

  if (btnSimulate) {
    btnSimulate.addEventListener('click', async () => {
      btnSimulate.disabled = true;
      try {
        await simulateAlert(targetSiteId);
        setState({ selectedSiteId: targetSiteId, isCardOpen: true, activeModal: null });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        alert('Simulation failed: ' + msg);
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
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        alert('Reset failed: ' + msg);
      }
    });
  }
}
