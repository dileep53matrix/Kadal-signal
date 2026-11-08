/**
 * Kadal Signal - Harbour Departure & Return Board Controller
 * Tracks active fishing crafts at the selected landing centre.
 * Supports single-tap toggling of boat status (Mark departed / Mark returned)
 * with instant reflection across the application.
 */

import { getState, setState, subscribe, getSelectedSite, getSiteBoats } from './state';
import { markBoat } from './api';
import { t } from './i18n';

export function initSiteBoard(): void {
  const modal = document.getElementById('board-modal');
  if (!modal) return;

  // Toggle modal display
  subscribe((state, prevState) => {
    if (state.activeModal !== prevState.activeModal) {
      modal.classList.toggle('active', state.activeModal === 'board');
      if (state.activeModal === 'board') {
        renderBoardContent(modal);
      }
    } else if (
      state.activeModal === 'board' &&
      (state.boats !== prevState.boats ||
       state.selectedSiteId !== prevState.selectedSiteId ||
       state.language !== prevState.language)
    ) {
      renderBoardContent(modal);
    }
  });

  // Close handlers
  modal.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    if (target === modal || target.closest('.modal-close-btn')) {
      setState({ activeModal: null });
    }
  });

  // Single-tap button click delegation to toggle boat departed / returned
  modal.addEventListener('click', async (e) => {
    const target = e.target as HTMLElement;
    const btn = target.closest<HTMLButtonElement>('.boat-toggle-btn');
    if (!btn) return;

    const boatId = btn.dataset.boatId;
    const targetStatus = btn.dataset.targetStatus as 'out' | 'back';
    if (!boatId || !targetStatus) return;

    btn.disabled = true;
    try {
      await markBoat(boatId, targetStatus);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      alert('Failed to update boat log: ' + msg);
    } finally {
      btn.disabled = false;
    }
  });
}

function renderBoardContent(modal: HTMLElement): void {
  const container = modal.querySelector<HTMLElement>('.modal-body');
  if (!container) return;

  const site = getSelectedSite();
  if (!site) {
    container.innerHTML = `<p style="color: var(--grey); padding: 16px;">${t('select_site_prompt')}</p>`;
    return;
  }

  const boats = getSiteBoats(site.id);
  const outCount = boats.filter(b => b.status === 'out').length;
  const dockedCount = boats.length - outCount;

  const lastUpdatedTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const { offlineMode } = getState();

  container.innerHTML = `
    <!-- Board Header -->
    <div class="board-header">
      <div class="deck-tagline">${t('board_title')}</div>
      <h3 class="board-site-title">${site.name}</h3>
      <div class="board-status-row">
        <span class="board-time-label">
          ${t('signal_last_updated', { time: lastUpdatedTime })}
        </span>
        <span class="snapshot-pill ${offlineMode ? '' : 'hidden'}">
          ${t('cached_snapshot_badge')}
        </span>
        <span class="board-live-tag ${offlineMode ? 'hidden' : ''}">
          ● LIVE LOG
        </span>
      </div>
    </div>

    <!-- Tally Metrics -->
    <div class="board-metrics-grid">
      <div class="board-metric-card ${outCount > 0 ? 'alert' : ''}">
        <div class="metric-num">${outCount}</div>
        <div class="metric-title">${t('status_at_sea').toUpperCase()}</div>
      </div>
      <div class="board-metric-card safe">
        <div class="metric-num">${dockedCount}</div>
        <div class="metric-title">${t('status_docked').toUpperCase()}</div>
      </div>
    </div>

    <!-- Boat Registry List -->
    <div class="boat-registry-list">
      ${boats.length === 0 ? `
        <div class="empty-boats-state">No registered fishing crafts for this harbour landing centre.</div>
      ` : boats.map(boat => {
        const isOut = (boat.status === 'out');
        return `
          <div class="boat-log-row ${isOut ? 'at-sea' : 'docked'}">
            <div class="boat-details">
              <div class="boat-name-line">
                <span class="boat-indicator-dot"></span>
                <strong class="boat-name-text">${boat.demo_name}</strong>
              </div>
              <div class="boat-status-sub">
                ${isOut
                  ? `At Sea (Departed: ${boat.departed_at ? new Date(boat.departed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Unknown'})`
                  : 'Docked at harbour'}
              </div>
            </div>

            <button
              type="button"
              class="boat-toggle-btn ${isOut ? 'btn-mark-back' : 'btn-mark-out'}"
              data-boat-id="${boat.id}"
              data-target-status="${isOut ? 'back' : 'out'}"
            >
              ${isOut ? `⚓ ${t('btn_mark_returned')}` : `🌊 ${t('btn_mark_departed')}`}
            </button>
          </div>
        `;
      }).join('')}
    </div>
  `;
}
