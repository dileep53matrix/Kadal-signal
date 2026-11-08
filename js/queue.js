/**
 * Kadal Signal - Validation Queue & Contribution Modal Controller
 * Handles community verification reports, live status inspection (1 of 2 matching reports),
 * and submitting new crowd-sourced facility observations.
 */

import { getState, setState, subscribe, getSelectedSite } from './state.js';
import { getPendingReports, submitContribution, getSite } from './api.js';
import { t } from './i18n.js';

export function initQueueAndContribution() {
  const queueModal = document.getElementById('queue-modal');
  const contributeModal = document.getElementById('contribute-modal');

  // Subscribe to state to toggle modal visibility
  subscribe((state, prevState) => {
    if (state.activeModal !== prevState.activeModal) {
      if (queueModal) {
        queueModal.classList.toggle('active', state.activeModal === 'queue');
        if (state.activeModal === 'queue') {
          renderQueueContent(queueModal);
        }
      }
      if (contributeModal) {
        contributeModal.classList.toggle('active', state.activeModal === 'contribute');
        if (state.activeModal === 'contribute') {
          renderContributionForm(contributeModal);
        }
      }
    }
  });

  // Modal background click or close button handlers
  [queueModal, contributeModal].forEach(modal => {
    if (!modal) return;
    modal.addEventListener('click', (e) => {
      if (e.target === modal || e.target.closest('.modal-close-btn')) {
        setState({ activeModal: null });
      }
    });
  });

  // Handle contribution form submission
  if (contributeModal) {
    contributeModal.addEventListener('submit', async (e) => {
      e.preventDefault();
      const form = e.target;
      const site = getSelectedSite();
      if (!site) return;

      const submitBtn = form.querySelector('button[type="submit"]');
      if (submitBtn) submitBtn.disabled = true;

      const facilities = {
        ice: form.elements['facility_ice']?.checked || false,
        fuel: form.elements['facility_fuel']?.checked || false,
        shelter: form.elements['facility_shelter']?.checked || false,
        auction: form.elements['facility_auction']?.checked || false
      };

      const photoUrl = form.elements['photo_url']?.value?.trim() || null;

      try {
        await submitContribution(site.id, facilities, photoUrl);

        // Immediate refetch to reflect changes live
        const updatedSite = await getSite(site.id);
        if (updatedSite) {
          const { sites } = getState();
          const idx = sites.findIndex(s => s.id === site.id);
          if (idx !== -1) {
            const nextSites = [...sites];
            nextSites[idx] = updatedSite;
            setState({ sites: nextSites });
          }
        }

        // Close contribution modal and open site card
        setState({ activeModal: null, isCardOpen: true });
      } catch (err) {
        alert('Contribution submission failed: ' + err.message);
      } finally {
        if (submitBtn) submitBtn.disabled = false;
      }
    });
  }
}

/**
 * Render validation queue reports for the selected harbour
 */
async function renderQueueContent(modal) {
  const container = modal.querySelector('.modal-body');
  if (!container) return;

  const site = getSelectedSite();
  if (!site) {
    container.innerHTML = `<p style="color: var(--grey);">${t('select_site_prompt')}</p>`;
    return;
  }

  container.innerHTML = `<div style="text-align: center; padding: 20px;">${t('loading_data')}</div>`;

  try {
    const reports = await getPendingReports(site.id);

    const isVerified = (site.confidence === 'verified');
    const reportsCount = site.report_count || 0;

    container.innerHTML = `
      <div style="margin-bottom: 16px;">
        <h3 style="font-size: 17px; font-weight: 800; color: var(--navy);">${site.name}</h3>
        <p style="font-size: 13px; color: var(--grey);">${site.district} District</p>
      </div>

      <!-- Verification progress card -->
      <div style="background: ${isVerified ? '#ECFDF5' : '#FFFBEB'}; border: 1.5px solid ${isVerified ? 'var(--green)' : 'var(--amber)'}; padding: 12px; border-radius: var(--radius-md); margin-bottom: 16px;">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
          <span style="font-size: 13px; font-weight: 800; color: ${isVerified ? 'var(--green)' : '#B45309'};">
            ${isVerified ? '✓ VERIFIED STATUS ACTIVE' : '⚡ VALIDATION IN PROGRESS'}
          </span>
          <span style="font-size: 12px; font-weight: 700; color: var(--navy);">
            ${reportsCount} of 2 matching reports
          </span>
        </div>
        <p style="font-size: 12px; color: #475569; line-height: 1.4;">
          ${isVerified ? t('validation_status_verified') : t('validation_status_1_of_2')}
        </p>
      </div>

      <!-- Pending reports listing -->
      <div style="font-size: 12px; font-weight: 800; letter-spacing: 1px; color: var(--teal); margin-bottom: 8px;">
        LOGGED COMMUNITY REPORTS (${reports.length})
      </div>

      ${reports.length === 0 ? `
        <div style="padding: 20px; text-align: center; color: var(--grey); background: var(--grey-faint); border-radius: var(--radius-sm);">
          ${t('queue_empty')}
        </div>
      ` : `
        <div style="display: flex; flex-direction: column; gap: 10px;">
          ${reports.map(rep => `
            <div style="border: 1px solid var(--grey-light); border-radius: var(--radius-md); padding: 12px; background: var(--white);">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                <span style="font-size: 13px; font-weight: 700; color: var(--navy);">Report ${rep.id}</span>
                <span style="font-size: 11px; color: var(--grey);">
                  ${new Date(rep.submitted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <div style="display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 6px;">
                <span class="facility-chip ${rep.facilities?.ice ? 'present' : 'missing'}" style="min-height: 28px; font-size: 11px; padding: 2px 8px;">Ice</span>
                <span class="facility-chip ${rep.facilities?.fuel ? 'present' : 'missing'}" style="min-height: 28px; font-size: 11px; padding: 2px 8px;">Fuel</span>
                <span class="facility-chip ${rep.facilities?.shelter ? 'present' : 'missing'}" style="min-height: 28px; font-size: 11px; padding: 2px 8px;">Shelter</span>
                <span class="facility-chip ${rep.facilities?.auction ? 'present' : 'missing'}" style="min-height: 28px; font-size: 11px; padding: 2px 8px;">Auction</span>
              </div>
              <div style="font-size: 11px; font-weight: 700; color: ${rep.matches_existing ? 'var(--green)' : '#DC2626'};">
                ${rep.matches_existing ? '✓ ' + t('queue_matches') : '⚠ ' + t('queue_mismatch')}
              </div>
            </div>
          `).join('')}
        </div>
      `}

      <div style="margin-top: 16px;">
        <button type="button" class="btn-primary" style="width: 100%;" onclick="document.querySelector('#queue-modal').classList.remove('active'); window.__openContributeModal();">
          + Add Matching Report (Demo Flip)
        </button>
      </div>
    `;
  } catch (err) {
    container.innerHTML = `<p style="color: var(--red);">Error loading reports: ${err.message}</p>`;
  }
}

// Global hook for demo button
window.__openContributeModal = () => {
  setState({ activeModal: 'contribute' });
};

/**
 * Render the contribution questionnaire for the selected harbour
 */
function renderContributionForm(modal) {
  const container = modal.querySelector('.modal-body');
  if (!container) return;

  const site = getSelectedSite();
  if (!site) {
    container.innerHTML = `<p style="color: var(--grey);">${t('select_site_prompt')}</p>`;
    return;
  }

  // Pre-fill checkboxes matching site facilities to make it easy for user to demo the 2nd matching report!
  const fac = site.facilities || { ice: true, fuel: true, shelter: false, auction: true };

  container.innerHTML = `
    <form id="community-contrib-form">
      <div style="margin-bottom: 14px;">
        <h3 style="font-size: 17px; font-weight: 800; color: var(--navy);">${t('contrib_title')}</h3>
        <p style="font-size: 13px; color: var(--grey); margin-top: 2px;">
          ${t('contrib_desc', { site: site.name })}
        </p>
      </div>

      <div class="form-group">
        <label class="form-label">${t('contrib_facilities_label')}</label>

        <label class="checkbox-option">
          <input type="checkbox" name="facility_ice" ${fac.ice ? 'checked' : ''} />
          <span>❄️ ${t('facility_ice')} (Available on site)</span>
        </label>

        <label class="checkbox-option">
          <input type="checkbox" name="facility_fuel" ${fac.fuel ? 'checked' : ''} />
          <span>⛽ ${t('facility_fuel')} (Marine diesel / kerosene)</span>
        </label>

        <label class="checkbox-option">
          <input type="checkbox" name="facility_shelter" ${fac.shelter ? 'checked' : ''} />
          <span>⚓ ${t('facility_shelter')} (Breakwater / safe basin)</span>
        </label>

        <label class="checkbox-option">
          <input type="checkbox" name="facility_auction" ${fac.auction ? 'checked' : ''} />
          <span>🏷️ ${t('facility_auction')} (Active auction hall)</span>
        </label>
      </div>

      <div class="form-group">
        <label class="form-label">${t('contrib_photo_label')}</label>
        <input
          type="url"
          name="photo_url"
          placeholder="https://... (or leave blank to use harbour snapshot)"
          style="width: 100%; min-height: 44px; padding: 8px 12px; border: 1px solid var(--grey-light); border-radius: var(--radius-sm); font-size: 14px;"
        />
      </div>

      <div style="display: flex; gap: 10px; margin-top: 20px;">
        <button type="submit" class="btn-primary" style="flex: 2;">
          ${t('contrib_submit')}
        </button>
        <button type="button" class="btn-secondary modal-close-btn" style="flex: 1;">
          ${t('contrib_cancel')}
        </button>
      </div>
    </form>
  `;
}
