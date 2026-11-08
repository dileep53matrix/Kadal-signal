/**
 * Kadal Signal - Validation Queue & Contribution Modal Controller
 * Handles CMFRI vs OSM discrepancies, community ground-truth reporting,
 * and 2-of-2 consensus promoting harbour confidence to "verified".
 */

import { getState, setState, subscribe, getSelectedSite } from './state';
import { getPendingReports, submitContribution, getSite } from './api';
import { t } from './i18n';
import { Facilities } from './types';

export function initQueueAndContribution(): void {
  const queueModal = document.getElementById('queue-modal');
  const contributeModal = document.getElementById('contribute-modal');

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

  [queueModal, contributeModal].forEach(modal => {
    if (!modal) return;
    modal.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      if (target === modal || target.closest('.modal-close-btn')) {
        setState({ activeModal: null });
      }
    });
  });

  if (contributeModal) {
    contributeModal.addEventListener('submit', async (e) => {
      e.preventDefault();
      const form = e.target as HTMLFormElement;
      const site = getSelectedSite();
      if (!site) return;

      const submitBtn = form.querySelector<HTMLButtonElement>('button[type="submit"]');
      if (submitBtn) submitBtn.disabled = true;

      const elements = form.elements as unknown as Record<string, HTMLInputElement>;
      const facilities: Facilities = {
        ice: elements['facility_ice']?.checked || false,
        fuel: elements['facility_fuel']?.checked || false,
        shelter: elements['facility_shelter']?.checked || false,
        auction: elements['facility_auction']?.checked || false
      };

      const photoUrl = elements['photo_url']?.value?.trim() || null;

      try {
        await submitContribution(site.id, facilities, photoUrl);

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

        setState({ activeModal: null, isCardOpen: true });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        alert('Contribution submission failed: ' + msg);
      } finally {
        if (submitBtn) submitBtn.disabled = false;
      }
    });
  }
}

async function renderQueueContent(modal: HTMLElement): Promise<void> {
  const container = modal.querySelector<HTMLElement>('.modal-body');
  if (!container) return;

  const site = getSelectedSite();
  if (!site) {
    container.innerHTML = `<p style="color: var(--grey); padding: 16px;">${t('select_site_prompt')}</p>`;
    return;
  }

  const reports = await getPendingReports(site.id);
  const matchingCount = site.report_count || 0;
  const isVerified = (site.confidence === 'verified');

  container.innerHTML = `
    <div class="queue-header-box">
      <div class="deck-tagline">${t('queue_title')}</div>
      <h3 class="queue-site-name">${site.name}</h3>
      <p class="queue-subtitle-text">${t('queue_subtitle')}</p>
    </div>

    <!-- CMFRI vs OSM Evidence Comparison Table -->
    <div class="evidence-comparison-card">
      <div class="evidence-header">
        <strong>Data Sources & Discrepancies</strong>
        <span class="source-badge">CMFRI Census 2020 vs OSM 2026</span>
      </div>
      <table class="evidence-table">
        <thead>
          <tr>
            <th>Facility</th>
            <th>CMFRI Data</th>
            <th>OSM Observation</th>
            <th>Ground Consensus</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Ice Plant</td>
            <td>${site.facilities?.ice ? 'Recorded' : 'Not Listed'}</td>
            <td>${site.facilities?.ice ? 'Present' : 'Absent'}</td>
            <td><strong style="color: ${site.facilities?.ice ? 'var(--green)' : 'var(--grey)'};">${site.facilities?.ice ? '✓ Verified' : '✕ Missing'}</strong></td>
          </tr>
          <tr>
            <td>Fuel Bunk</td>
            <td>${site.facilities?.fuel ? 'Recorded' : 'Not Listed'}</td>
            <td>${site.facilities?.fuel ? 'Present' : 'Absent'}</td>
            <td><strong style="color: ${site.facilities?.fuel ? 'var(--green)' : 'var(--grey)'};">${site.facilities?.fuel ? '✓ Verified' : '✕ Missing'}</strong></td>
          </tr>
          <tr>
            <td>Shelter / Breakwater</td>
            <td>${site.facilities?.shelter ? 'Recorded' : 'Not Listed'}</td>
            <td>${site.facilities?.shelter ? 'Present' : 'Absent'}</td>
            <td><strong style="color: ${site.facilities?.shelter ? 'var(--green)' : 'var(--grey)'};">${site.facilities?.shelter ? '✓ Verified' : '✕ Missing'}</strong></td>
          </tr>
          <tr>
            <td>Auction Hall</td>
            <td>${site.facilities?.auction ? 'Recorded' : 'Not Listed'}</td>
            <td>${site.facilities?.auction ? 'Present' : 'Absent'}</td>
            <td><strong style="color: ${site.facilities?.auction ? 'var(--green)' : 'var(--grey)'};">${site.facilities?.auction ? '✓ Verified' : '✕ Missing'}</strong></td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Consensus Progress Bar -->
    <div class="consensus-progress-box">
      <div class="progress-labels">
        <span>Verification Consensus: <strong>${matchingCount} / 2 matching reports</strong></span>
        <span style="color: ${isVerified ? 'var(--green)' : 'var(--amber)'}; font-weight: 700;">
          ${isVerified ? 'VERIFIED' : 'PENDING'}
        </span>
      </div>
      <div class="progress-track">
        <div class="progress-fill" style="width: ${Math.min(100, (matchingCount / 2) * 100)}%;"></div>
      </div>
    </div>

    <!-- Pending Reports List -->
    <div class="reports-stream-section">
      <h4 class="section-heading">Recent Community Submissions (${reports.length})</h4>
      ${reports.length === 0 ? `
        <div class="empty-reports-state">No community reports submitted for this site yet.</div>
      ` : reports.map(r => `
        <div class="report-entry-card">
          <div class="report-meta">
            <strong>${r.id}</strong>
            <span>${new Date(r.submitted_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span>
          </div>
          <div class="report-tags">
            ${Object.entries(r.facilities).map(([key, val]) => `
              <span class="report-pill ${val ? 'active' : 'inactive'}">${key}: ${val ? 'Yes' : 'No'}</span>
            `).join('')}
          </div>
        </div>
      `).join('')}
    </div>

    <!-- Action to open contribute modal -->
    <div style="margin-top: 20px;">
      <button type="button" class="btn-primary" id="btn-queue-open-contribute" style="width: 100%;">
        ${t('btn_contribute')}
      </button>
    </div>
  `;

  const btnContribute = container.querySelector('#btn-queue-open-contribute');
  if (btnContribute) {
    btnContribute.addEventListener('click', () => {
      setState({ activeModal: 'contribute' });
    });
  }
}

function renderContributionForm(modal: HTMLElement): void {
  const container = modal.querySelector<HTMLElement>('.modal-body');
  if (!container) return;

  const site = getSelectedSite();
  if (!site) {
    container.innerHTML = `<p style="color: var(--grey); padding: 16px;">${t('select_site_prompt')}</p>`;
    return;
  }

  container.innerHTML = `
    <div class="contribute-header-box">
      <div class="deck-tagline">HARBOUR TRUTH CONTRIBUTION</div>
      <h3 class="contribute-site-title">${site.name}</h3>
      <p class="contribute-prompt-sub">${t('queue_contribute_prompt')}</p>
    </div>

    <form id="contribution-ground-form" class="contribution-form">
      <h4 class="form-section-title">${t('form_facilities_header')}</h4>
      
      <div class="facilities-checkbox-list">
        <label class="checkbox-option">
          <input type="checkbox" name="facility_ice" ${site.facilities?.ice ? 'checked' : ''} />
          <div class="option-content">
            <strong>❄️ ${t('facility_ice')}</strong>
            <span>Operational ice supply for boat holds</span>
          </div>
        </label>
        
        <label class="checkbox-option">
          <input type="checkbox" name="facility_fuel" ${site.facilities?.fuel ? 'checked' : ''} />
          <div class="option-content">
            <strong>⛽ ${t('facility_fuel')}</strong>
            <span>Diesel / kerosene dispensing point</span>
          </div>
        </label>
        
        <label class="checkbox-option">
          <input type="checkbox" name="facility_shelter" ${site.facilities?.shelter ? 'checked' : ''} />
          <div class="option-content">
            <strong>⚓ ${t('facility_shelter')}</strong>
            <span>Breakwater wall or calm mooring basin</span>
          </div>
        </label>
        
        <label class="checkbox-option">
          <input type="checkbox" name="facility_auction" ${site.facilities?.auction ? 'checked' : ''} />
          <div class="option-content">
            <strong>🏷️ ${t('facility_auction')}</strong>
            <span>Designated landing auction hall</span>
          </div>
        </label>
      </div>

      <div class="form-input-group">
        <label for="photo_url" class="form-label">${t('form_photo_label')}</label>
        <input
          type="url"
          id="photo_url"
          name="photo_url"
          class="form-text-input"
          placeholder="${t('form_photo_placeholder')}"
        />
      </div>

      <div class="form-submit-row">
        <button type="submit" class="btn-primary" style="width: 100%;">
          ${t('form_submit_btn')}
        </button>
      </div>
    </form>
  `;
}
