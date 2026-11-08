/**
 * Kadal Signal - Harbour Departure & Return Board Controller
 * Tracks active fishing crafts at the selected landing centre.
 * Supports single-tap toggling of boat status (Mark departed / Mark returned)
 * with instant reflection on the "Still at Sea" list.
 */

import { getState, setState, subscribe, getSelectedSite, getSiteBoats } from './state.js';
import { markBoat } from './api.js';
import { t } from './i18n.js';

export function initSiteBoard() {
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
      (state.boats !== prevState.boats || state.selectedSiteId !== prevState.selectedSiteId)
    ) {
      renderBoardContent(modal);
    }
  });

  // Close handlers
  modal.addEventListener('click', (e) => {
    if (e.target === modal || e.target.closest('.modal-close-btn')) {
      setState({ activeModal: null });
    }
  });

  // Single-tap button click delegation to toggle boat departed / returned
  modal.addEventListener('click', async (e) => {
    const btn = e.target.closest('.boat-toggle-btn');
    if (!btn) return;

    const boatId = btn.dataset.boatId;
    const targetStatus = btn.dataset.targetStatus; // 'out' | 'back'

    btn.disabled = true;
    try {
      await markBoat(boatId, targetStatus);
    } catch (err) {
      alert('Failed to update boat log: ' + err.message);
    } finally {
      btn.disabled = false;
    }
  });
}

function renderBoardContent(modal) {
  const container = modal.querySelector('.modal-body');
  if (!container) return;

  const site = getSelectedSite();
  if (!site) {
    container.innerHTML = `<p style="color: var(--grey);">${t('select_site_prompt')}</p>`;
    return;
  }

  const boats = getSiteBoats(site.id);
  const outCount = boats.filter(b => b.status === 'out').length;
  const dockedCount = boats.length - outCount;

  const lastUpdatedTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const { offlineMode } = getState();

  container.innerHTML = `
    <!-- Board Header -->
    <div style="margin-bottom: 16px;">
      <div class="deck-tagline">${t('board_title')}</div>
      <h3 style="font-size: 20px; font-weight: 800; color: var(--navy);">${site.name}</h3>
      <div style="display: flex; align-items: center; justify-content: space-between; margin-top: 6px;">
        <span style="font-size: 12px; color: var(--grey); font-weight: 600;">
          ${t('signal_last_updated', { time: lastUpdatedTime })}
        </span>
        <span class="snapshot-pill ${offlineMode ? '' : 'hidden'}" style="margin: 0;">
          ${t('cached_snapshot_badge')}
        </span>
        <span class="${offlineMode ? 'hidden' : ''}" style="font-size: 11px; font-weight: 800; background: var(--green-tint); color: var(--green); padding: 2px 8px; border-radius: var(--radius-full);">
          ● LIVE LOG
        </span>
      </div>
    </div>

    <!-- Tally Metrics -->
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 16px;">
      <div style="background: ${outCount > 0 ? '#FEF2F2' : 'var(--grey-faint)'}; border: 1.5px solid ${outCount > 0 ? 'var(--red)' : 'var(--grey-light)'}; border-radius: var(--radius-md); padding: 10px; text-align: center;">
        <div style="font-size: 24px; font-weight: 900; color: ${outCount > 0 ? 'var(--red)' : 'var(--navy)'};">${outCount}</div>
        <div style="font-size: 12px; font-weight: 700; color: ${outCount > 0 ? 'var(--red)' : 'var(--grey)'};">
          ${t('status_at_sea').toUpperCase()}
        </div>
      </div>
      <div style="background: #ECFDF5; border: 1.5px solid var(--green); border-radius: var(--radius-md); padding: 10px; text-align: center;">
        <div style="font-size: 24px; font-weight: 900; color: var(--green);">${dockedCount}</div>
        <div style="font-size: 12px; font-weight: 700; color: var(--green);">
          ${t('status_docked').toUpperCase()}
        </div>
      </div>
    </div>

    <!-- Boats List -->
    <div style="font-size: 11px; font-weight: 800; letter-spacing: 1px; color: var(--teal); margin-bottom: 8px;">
      REGISTERED FISHING VESSELS (${boats.length})
    </div>

    ${boats.length === 0 ? `
      <div style="padding: 24px; text-align: center; color: var(--grey); background: var(--grey-faint); border-radius: var(--radius-sm);">
        No crafts registered for this landing centre.
      </div>
    ` : `
      <div style="display: flex; flex-direction: column; gap: 10px;">
        ${boats.map(boat => {
          const isOut = (boat.status === 'out');
          const timeStr = boat.departed_at ? new Date(boat.departed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

          return `
            <div class="boat-item-card">
              <div class="boat-item-top">
                <span class="boat-name">⛵ ${boat.demo_name}</span>
                <span class="boat-status-tag ${isOut ? 'out' : 'back'}">
                  ${isOut ? '🔴 ' + t('status_at_sea') : '🟢 ' + t('status_docked')}
                </span>
              </div>

              ${isOut ? `
                <div style="font-size: 12px; color: var(--red); font-weight: 600;">
                  ${t('boat_departed_time', { time: timeStr })}
                </div>
              ` : `
                <div style="font-size: 12px; color: var(--grey); font-weight: 500;">
                  Moored safely at harbour basin
                </div>
              `}

              <button
                type="button"
                class="boat-toggle-btn ${isOut ? 'mark-back' : 'mark-out'}"
                data-boat-id="${boat.id}"
                data-target-status="${isOut ? 'back' : 'out'}"
              >
                ${isOut ? '⚓ ' + t('btn_mark_returned') : '🌊 ' + t('btn_mark_departed')}
              </button>
            </div>
          `;
        }).join('')}
      </div>
    `}
  `;
}
