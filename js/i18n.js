/**
 * Kadal Signal - Localization Module (i18n)
 * English and Malayalam UI strings.
 * Note: Malayalam translations marked with TODO: C to review are placeholders for teammate C.
 */

export const STRINGS = {
  en: {
    app_title: "KADAL SIGNAL",
    app_subtitle: "KERALA",
    app_tagline: "DECISION AID, NOT AN OFFICIAL ADVISORY",
    bottom_credits: "Map: OpenStreetMap contributors | Data: CMFRI, INCOIS, Open-Meteo | Decision aid, not an official advisory",
    cached_snapshot_badge: "Cached Snapshot",
    live_badge: "Live",

    // Confidence tiers
    confidence_low: "LOW",
    confidence_medium: "MEDIUM",
    confidence_verified: "VERIFIED",
    confidence_reports_count: "{count} matching reports",
    confidence_sources: "CMFRI + OSM",
    validation_status_1_of_2: "1 of 2 matching reports to verify",
    validation_status_verified: "Verified by 2+ matching community reports",

    // Signal lights
    signal_green: "GREEN",
    signal_amber: "AMBER",
    signal_red: "RED",
    signal_none: "NO SIGNAL",
    signal_green_desc: "Normal operations. Favorable sea state.",
    signal_amber_desc: "Exercise caution. Swell / local turbulence.",
    signal_red_desc: "Do not venture out. INCOIS warning active.",
    signal_valid_until: "Valid until {time}",
    signal_last_updated: "Last updated: {time}",

    // Facilities
    facility_ice: "Ice Plant",
    facility_fuel: "Fuel Bunk",
    facility_shelter: "Shelter / Breakwater",
    facility_auction: "Auction Hall",

    // Site Card & Actions
    btn_contribute: "Contribute",
    btn_boat_log: "Boat Log",
    btn_listen_malayalam: "Listen in Malayalam",
    btn_listening: "Playing...",
    btn_tts_unsupported: "Audio unavailable",
    still_at_sea_header: "STILL AT SEA",
    still_at_sea_warning: "ALERT ACTIVE: Boats currently out at sea:",
    no_boats_at_sea: "All logged boats accounted for at harbour.",

    // Filters
    filter_all: "All",
    filter_confidence: "Confidence",
    filter_facilities: "Facilities",
    filter_signal: "Signal",
    filter_clear: "Clear",
    filter_site_count: "{count} sites",

    // Board / Departure Log
    board_title: "Harbour Departure & Return Log",
    btn_mark_departed: "Mark Departed",
    btn_mark_returned: "Mark Returned",
    status_at_sea: "At Sea",
    status_docked: "Docked / Returned",
    boat_departed_time: "Departed at {time}",

    // Validation Queue
    queue_title: "Site Verification Reports",
    queue_empty: "No pending reports for this harbour.",
    queue_pending_item: "Report #{id} submitted {time}",
    queue_matches: "Matches existing facilities",
    queue_mismatch: "Differs from existing facilities",

    // Contribution Modal
    contrib_title: "Contribute Harbour Truth",
    contrib_desc: "Help verify facilities at {site}. Two matching reports turn this site VERIFIED.",
    contrib_photo_label: "Upload Landing Centre Photo (optional)",
    contrib_facilities_label: "Verify Active Facilities on Ground:",
    contrib_submit: "Submit Community Report",
    contrib_cancel: "Cancel",
    contrib_success: "Report submitted! Updating harbour truth...",

    // Demo Controls
    demo_title: "Hidden Demo Controls",
    demo_simulate_alert: "Simulate INCOIS Alert (Selected Site)",
    demo_reset: "Reset Demo to Initial State",
    demo_offline_toggle: "Toggle Offline Mode (Test Fallback)",
    demo_offline_active: "Offline Mode Active (Cached Snapshot)",
    demo_online_active: "Online Mode Active",

    // Empty / Error states
    select_site_prompt: "Tap any harbour marker on the coast to view signal & facility details.",
    loading_data: "Loading Kerala harbour data...",
    error_loading: "Unable to load live data. Switched to cached offline snapshot."
  },

  ml: {
    // Malayalam strings - // TODO: C to review
    app_title: "കടൽ സിഗ്നൽ",
    app_subtitle: "കേരളം",
    app_tagline: "തീരുമാന സഹായി, ഔദ്യോഗിക മുന്നറിയിപ്പല്ല",
    bottom_credits: "ഭൂപടം: ഓപ്പൺസ്ട്രീറ്റ്മാപ്പ് | വിവരങ്ങൾ: CMFRI, INCOIS, Open-Meteo | തീരുമാന സഹായി മാത്രം",
    cached_snapshot_badge: "ഓഫ്‌ലൈൻ വിവരങ്ങൾ",
    live_badge: "തത്സമയം",

    confidence_low: "കുറഞ്ഞ സ്ഥിരീകരണം",
    confidence_medium: "ഇടത്തരം സ്ഥിരീകരണം",
    confidence_verified: "സ്ഥിരീകരിച്ചത്",
    confidence_reports_count: "{count} സ്ഥിരീകരിച്ച റിപ്പോർട്ടുകൾ",
    confidence_sources: "CMFRI + OSM വിവരങ്ങൾ",
    validation_status_1_of_2: "സ്ഥിരീകരിക്കാൻ 2-ൽ 1 റിപ്പോർട്ട് കൂടി വേണം",
    validation_status_verified: "2 കമ്മ്യൂണിറ്റി റിപ്പോർട്ടുകളാൽ പൂർണ്ണമായും സ്ഥിരീകരിച്ചു",

    signal_green: "പച്ച (സുരക്ഷിതം)",
    signal_amber: "മഞ്ഞ (ജാഗ്രത)",
    signal_red: "ചുവപ്പ് (അപകടകരം)",
    signal_none: "സിഗ്നൽ ലഭ്യമല്ല",
    signal_green_desc: "കടലിൽ പോകാൻ അനുയോജ്യമായ അന്തരീക്ഷം.",
    signal_amber_desc: "ജാഗ്രത പാലിക്കുക. ഉയർന്ന തിരമാലകൾക്ക് സാധ്യത.",
    signal_red_desc: "കടലിൽ പോകരുത്! ഇൻകോയിസ് ജാഗ്രതാ നിർദ്ദേശം.",
    signal_valid_until: "{time} വരെ സാധുത",
    signal_last_updated: "പുതുക്കിയത്: {time}",

    facility_ice: "ഐസ് പ്ലാന്റ്",
    facility_fuel: "ഡീസൽ/പെട്രോൾ ബങ്ക്",
    facility_shelter: "ബോട്ട് ഷെൽട്ടർ",
    facility_auction: "ലേലപ്പുര",

    btn_contribute: "വിവരം പങ്കിടുക",
    btn_boat_log: "ബോട്ട് ലോഗ്",
    btn_listen_malayalam: "ശബ്ദം കേൾക്കുക",
    btn_listening: "പ്ലേ ചെയ്യുന്നു...",
    btn_tts_unsupported: "ശബ്ദം ലഭ്യമല്ല",
    still_at_sea_header: "കടലിലുള്ള ബോട്ടുകൾ",
    still_at_sea_warning: "അപകട മുന്നറിയിപ്പ്: നിലവിൽ കടലിലുള്ള ബോട്ടുകൾ:",
    no_boats_at_sea: "എല്ലാ ബോട്ടുകളും സുരക്ഷിതമായി തിരിച്ചെത്തിയിട്ടുണ്ട്.",

    filter_all: "എല്ലാം",
    filter_confidence: "സ്ഥിരീകരണം",
    filter_facilities: "സൗകര്യങ്ങൾ",
    filter_signal: "സിഗ്നൽ",
    filter_clear: "മാറ്റുക",
    filter_site_count: "{count} കേന്ദ്രങ്ങൾ",

    board_title: "ബോട്ട് വരവ്/പോക്ക് രജിസ്റ്റർ",
    btn_mark_departed: "പോയതായി രേഖപ്പെടുത്തുക",
    btn_mark_returned: "തിരിച്ചെത്തിയതായി രേഖപ്പെടുത്തുക",
    status_at_sea: "കടലിൽ",
    status_docked: "തീരത്ത്",
    boat_departed_time: "പുറപ്പെട്ട സമയം: {time}",

    queue_title: "സ്ഥിരീകരണ റിപ്പോർട്ടുകൾ",
    queue_empty: "പുതിയ റിപ്പോർട്ടുകൾ ലഭ്യമല്ല.",
    queue_pending_item: "റിപ്പോർട്ട് #{id} സമർപ്പിച്ചത് {time}",
    queue_matches: "നിലവിലെ വിവരങ്ങളുമായി പൊരുത്തപ്പെടുന്നു",
    queue_mismatch: "നിലവിലെ വിവരങ്ങളുമായി വ്യത്യാസമുണ്ട്",

    contrib_title: "തുറമുഖ വിവരങ്ങൾ നൽകുക",
    contrib_desc: "{site}-ലെ സൗകര്യങ്ങൾ പരിശോധിക്കുക. രണ്ട് റിപ്പോർട്ടുകൾ ഒത്തുപോയാൽ സൈറ്റ് സ്ഥിരീകരിക്കപ്പെടും.",
    contrib_photo_label: "തുറമുഖ ഫോട്ടോ ചേർക്കുക (നിർബന്ധമില്ല)",
    contrib_facilities_label: "നിലവിലുള്ള സൗകര്യങ്ങൾ തിരഞ്ഞെടുക്കുക:",
    contrib_submit: "റിപ്പോർട്ട് സമർപ്പിക്കുക",
    contrib_cancel: "റദ്ദാക്കുക",
    contrib_success: "റിപ്പോർട്ട് വിജയകരമായി സമർപ്പിച്ചു!",

    demo_title: "ഡെമോ നിയന്ത്രണങ്ങൾ",
    demo_simulate_alert: "ഇൻകോയിസ് അലേർട്ട് സിമുലേറ്റ് ചെയ്യുക",
    demo_reset: "ഡെമോ പുനഃക്രമീകരിക്കുക",
    demo_offline_toggle: "ഓഫ്‌ലൈൻ മോഡ് മാറ്റുക",
    demo_offline_active: "ഓഫ്‌ലൈൻ മോഡ് പ്രവർത്തിക്കുന്നു",
    demo_online_active: "ഓൺലൈൻ മോഡ് പ്രവർത്തിക്കുന്നു",

    select_site_prompt: "തീരത്തെ ഏതെങ്കിലും പോയിന്റിൽ ക്ലിക്ക് ചെയ്ത് വിശദാംശങ്ങൾ കാണുക.",
    loading_data: "വിവരങ്ങൾ ലഭ്യമാക്കുന്നു...",
    error_loading: "തത്സമയ വിവരങ്ങൾ ലഭ്യമല്ല, ഓഫ്‌ലൈൻ വിവരങ്ങൾ കാണിക്കുന്നു."
  }
};

let currentLang = 'en';

export function getLang() {
  return currentLang;
}

export function setLang(lang) {
  if (STRINGS[lang]) {
    currentLang = lang;
  }
}

/**
 * Translate a key with optional dynamic variable interpolation
 * Usage: t('filter_site_count', { count: 8 })
 */
export function t(key, vars = {}, lang = currentLang) {
  const dict = STRINGS[lang] || STRINGS.en;
  let text = dict[key] || STRINGS.en[key] || key;

  if (vars && typeof vars === 'object') {
    Object.keys(vars).forEach(varKey => {
      text = text.replace(new RegExp(`\\{${varKey}\\}`, 'g'), vars[varKey]);
    });
  }
  return text;
}
