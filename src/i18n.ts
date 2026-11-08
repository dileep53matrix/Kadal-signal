/**
 * Kadal Signal - Localization Module (i18n)
 * English and Malayalam UI strings with strong typing and parameter interpolation.
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
    board_title: "HARBOUR DEPARTURE & RETURN LOG",
    status_at_sea: "At Sea",
    status_docked: "Docked / Returned",
    btn_mark_departed: "Mark Departed",
    btn_mark_returned: "Mark Returned",
    select_site_prompt: "Select a harbour to view active vessels.",

    // Demo Controls
    demo_title: "DEMO SIMULATION CONTROLS",
    demo_simulate_alert: "Simulate INCOIS Red Alert",
    demo_offline_toggle: "Toggle Offline Snapshot",
    demo_offline_active: "Offline Fallback (Active)",
    demo_online_active: "Live Mode (Active)",
    demo_reset: "Reset Demo to Baseline",

    // Queue / Contribution
    queue_title: "HARBOUR VALIDATION QUEUE",
    queue_subtitle: "Discrepancies identified between CMFRI census and OpenStreetMap data requiring local community verification.",
    queue_contribute_prompt: "Have local knowledge of this landing centre? Submit a verification report.",
    form_facilities_header: "Verified Facilities Available On-Site",
    form_photo_label: "Photo Proof URL (Optional)",
    form_photo_placeholder: "https://example.com/harbour.jpg",
    form_submit_btn: "Submit Ground Truth Report",
    form_submitting: "Submitting..."
  },
  ml: {
    app_title: "കടൽ സിഗ്നൽ",
    app_subtitle: "കേരളം",
    app_tagline: "തീരുമാന സഹായം, ഔദ്യോഗിക മുന്നറിയിപ്പല്ല",
    bottom_credits: "ഭൂപടം: ഓപ്പൺസ്ട്രീറ്റ്മാപ്പ് | വിവരങ്ങൾ: CMFRI, INCOIS, ഓപ്പൺ-മീറ്റിയോ | തീരുമാന സഹായം, ഔദ്യോഗിക മുന്നറിയിപ്പല്ല",
    cached_snapshot_badge: "ഓഫ്‌ലൈൻ സ്നാപ്പ്ഷോട്ട്",
    live_badge: "തത്സമയം",

    // Confidence tiers
    confidence_low: "കുറഞ്ഞ കൃത്യത",
    confidence_medium: "ഇടത്തരം",
    confidence_verified: "സ്ഥിരീകരിച്ചത്",
    confidence_reports_count: "{count} അനുയോജ്യ റിപ്പോർട്ടുകൾ",
    confidence_sources: "CMFRI + OSM",
    validation_status_1_of_2: "സ്ഥിരീകരണത്തിനായി 1 റിപ്പോർട്ട് കൂടി വേണം",
    validation_status_verified: "തദ്ദേശീയരുടെ 2+ റിപ്പോർട്ടുകളാൽ സ്ഥിരീകരിച്ചു",

    // Signal lights
    signal_green: "പച്ച (സുരക്ഷിതം)",
    signal_amber: "മഞ്ഞ (ജാഗ്രത)",
    signal_red: "ചുവപ്പ് (അപകടം)",
    signal_none: "സിഗ്നൽ ലഭ്യമല്ല",
    signal_green_desc: "കടൽ ശാന്തമാണ്. മീൻപിടുത്തത്തിന് അനുകൂലം.",
    signal_amber_desc: "ജാഗ്രത പാലിക്കുക. ശക്തമായ തിരമാലകൾക്ക് സാധ്യത.",
    signal_red_desc: "കടലിൽ പോകരുത്! ഇൻകോയിസ് മുന്നറിയിപ്പ് നിലവിലുണ്ട്.",
    signal_valid_until: "{time} വരെ പ്രാബല്യത്തിൽ",
    signal_last_updated: "അവസാനം പുതുക്കിയത്: {time}",

    // Facilities
    facility_ice: "ഐസ് പ്ലാന്റ്",
    facility_fuel: "ഇന്ധന പമ്പ്",
    facility_shelter: "പുലിമുട്ട് / സുരക്ഷിത താവളം",
    facility_auction: "ലേലപ്പുര",

    // Site Card & Actions
    btn_contribute: "വിവരം നൽകുക",
    btn_boat_log: "ബോട്ട് ലോഗ്",
    btn_listen_malayalam: "ശബ്ദസന്ദേശം കേൾക്കുക",
    btn_listening: "കേൾക്കുന്നു...",
    btn_tts_unsupported: "ശബ്ദം ലഭ്യമല്ല",
    still_at_sea_header: "ഇപ്പോഴും കടലിലുള്ള ബോട്ടുകൾ",
    still_at_sea_warning: "മുന്നറിയിപ്പ് നിലവിലുണ്ട്! ഈ ബോട്ടുകൾ കടലിലാണ്:",
    no_boats_at_sea: "എല്ലാ ബോട്ടുകളും സുരക്ഷിതമായി തിരിച്ചെത്തി.",

    // Filters
    filter_all: "എല്ലാം",
    filter_confidence: "വിശ്വാസ്യത",
    filter_facilities: "സൗകര്യങ്ങൾ",
    filter_signal: "സിഗ്നൽ",
    filter_clear: "മായ്ക്കുക",
    filter_site_count: "{count} കേന്ദ്രങ്ങൾ",

    // Board / Departure Log
    board_title: "ഹാർബർ പുറപ്പെടൽ - തിരിച്ചുവരവ് ലോഗ്",
    status_at_sea: "കടലിൽ",
    status_docked: "തീരത്ത് എത്തി",
    btn_mark_departed: "പുറപ്പെട്ടതായി രേഖപ്പെടുത്തുക",
    btn_mark_returned: "തിരിച്ചെത്തിയതായി രേഖപ്പെടുത്തുക",
    select_site_prompt: "വിവരങ്ങൾ കാണാൻ ഒരു ഹാർബർ തിരഞ്ഞെടുക്കുക.",

    // Demo Controls
    demo_title: "ഡെമോ നിയന്ത്രണങ്ങൾ",
    demo_simulate_alert: "റെഡ് അലർട്ട് സിമുലേറ്റ് ചെയ്യുക",
    demo_offline_toggle: "ഓഫ്‌ലൈൻ സ്നാപ്പ്ഷോട്ട് മാറ്റുക",
    demo_offline_active: "ഓഫ്‌ലൈൻ മോഡ് സജീവം",
    demo_online_active: "ലൈവ് മോഡ് സജീവം",
    demo_reset: "ഡെമോ പുനഃസ്ഥാപിക്കുക",

    // Queue / Contribution
    queue_title: "ഹാർബർ സ്ഥിരീകരണ പട്ടിക",
    queue_subtitle: "CMFRI വിവരങ്ങളും OSM ഭൂപടവും തമ്മിലുള്ള വ്യത്യാസങ്ങൾ പരിശോധിക്കുക.",
    queue_contribute_prompt: "ഈ ലാൻഡിംഗ് സെന്ററിനെക്കുറിച്ച് വിവരങ്ങൾ അറിയാമോ? ഇവിടെ രേഖപ്പെടുത്താം.",
    form_facilities_header: "തീരത്തുള്ള സൗകര്യങ്ങൾ",
    form_photo_label: "ഫോട്ടോ ലിങ്ക് (ഓപ്ഷണൽ)",
    form_photo_placeholder: "https://example.com/harbour.jpg",
    form_submit_btn: "റിപ്പോർട്ട് സമർപ്പിക്കുക",
    form_submitting: "സമർപ്പിക്കുന്നു..."
  }
} as const;

export type TranslationKey = keyof typeof STRINGS.en;
export type Language = 'en' | 'ml';

let currentLang: Language = 'en';

export function getLang(): Language {
  return currentLang;
}

export function setLang(lang: Language): void {
  currentLang = lang;
}

export function t(key: TranslationKey, params?: Record<string, string | number>): string {
  const dictionary = STRINGS[currentLang] || STRINGS.en;
  let str: string = (dictionary as Record<string, string>)[key] || STRINGS.en[key] || key;

  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      str = str.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
    });
  }

  return str;
}
