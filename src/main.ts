/**
 * Kadal Signal - Main Application Bootstrap (TypeScript + Vite)
 * Kerala Harbour Atlas & Marine Decision Aid
 */

import './styles.css';
import { getSites } from './api';
import { setState, subscribe, getState } from './state';
import { initMap, renderMarkers } from './map';
import { initFilters } from './filters';
import { initSiteCard } from './siteCard';
import { initQueueAndContribution } from './queue';
import { initSiteBoard } from './board';
import { initDemoControls } from './demoControls';
import { getLang, setLang } from './i18n';
import { BoatRecord } from './types';

async function startApplication(): Promise<void> {
  try {
    console.log('[Kadal Signal] Starting TypeScript application bootstrap...');

    // 1. Initialize Map
    initMap();

    // 2. Initialize UI modules
    initFilters();
    initSiteCard();
    initQueueAndContribution();
    initSiteBoard();
    initDemoControls();

    // 3. Language toggle button handler
    const langBtn = document.getElementById('lang-toggle-btn');
    if (langBtn) {
      langBtn.addEventListener('click', () => {
        const nextLang = getLang() === 'en' ? 'ml' : 'en';
        setLang(nextLang);
        langBtn.textContent = nextLang === 'en' ? 'മലയാളം' : 'English';
        const { sites } = getState();
        setState({
          language: nextLang,
          sites: [...sites]
        });
      });
    }

    // 4. Header Offline Snapshot Pill sync
    const snapshotPill = document.getElementById('header-snapshot-pill');
    subscribe((state) => {
      if (snapshotPill) {
        snapshotPill.classList.toggle('hidden', !state.offlineMode);
      }
    });

    // 5. Load initial harbour atlas data
    const sites = await getSites();

    let boats: BoatRecord[] = [];
    try {
      const boatsRes = await fetch('./data/mock-boats.json');
      if (boatsRes.ok) {
        boats = (await boatsRes.json()) as BoatRecord[];
      }
    } catch (e) {
      console.warn('Boats mock load error, state will use defaults:', e);
    }

    setState({
      sites,
      boats,
      isLoading: false
    });

    renderMarkers();
    console.log('[Kadal Signal] TypeScript frontend initialized successfully!');
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    console.error('[Kadal Signal Initialization Error]:', error);
    const mapEl = document.getElementById('map');
    if (mapEl) {
      mapEl.innerHTML = `
        <div style="padding: 32px; color: #EF4444; font-family: sans-serif; text-align: center;">
          <h2 style="font-size: 20px; font-weight: 800;">Initialization error</h2>
          <p style="margin-top: 8px; color: #64748B;">${error.message}</p>
        </div>
      `;
    }
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    startApplication();
  });
} else {
  startApplication();
}
