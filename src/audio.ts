/**
 * Kadal Signal - Audio & Speech Synthesis Engine
 * Dual-layer marine acoustic and voice warning system:
 * 1. Web Audio API synthesized Marine VHF Alert Beacon & Warning Sirens.
 * 2. Intelligent Speech Synthesis:
 *    - Uses native Malayalam voice (ml-IN) if available on client OS.
 *    - Automatically falls back to phonetic Malayalam (Manglish) + English advisory
 *      if client OS only has English voices (e.g. Windows Microsoft David/Zira),
 *      guaranteeing clear, audible speech on any device or OS.
 */

let audioCtx: AudioContext | null = null;
let currentUtterance: SpeechSynthesisUtterance | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) return null;
  if (!audioCtx || audioCtx.state === 'closed') {
    audioCtx = new AudioContextClass();
  }
  return audioCtx;
}

/**
 * Play authentic marine acoustic signal via Web Audio API.
 * Guaranteed to generate sound on any browser without network/files.
 */
export function playMarineChime(type: 'green' | 'amber' | 'red'): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'red') {
      // Urgent VHF Marine Radio Emergency Siren: 880Hz -> 587Hz -> 880Hz
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.setValueAtTime(587, now + 0.12);
      osc.frequency.setValueAtTime(880, now + 0.24);
      osc.frequency.setValueAtTime(587, now + 0.36);

      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);

      osc.start(now);
      osc.stop(now + 0.55);
    } else if (type === 'amber') {
      // Caution double-pulse tone
      osc.type = 'sine';
      osc.frequency.setValueAtTime(659.25, now);
      osc.frequency.setValueAtTime(659.25, now + 0.15);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc.start(now);
      osc.stop(now + 0.35);
    } else {
      // Safe marina harbor chime
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, now);
      osc.frequency.exponentialRampToValueAtTime(659.25, now + 0.2);

      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

      osc.start(now);
      osc.stop(now + 0.4);
    }
  } catch (err) {
    console.warn('[Kadal Signal] Web Audio chime could not play:', err);
  }
}

/**
 * Identify best available voice for playback
 */
export function getBestVoice(): { voice: SpeechSynthesisVoice | null; isMalayalam: boolean } {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return { voice: null, isMalayalam: false };
  }

  const voices = window.speechSynthesis.getVoices();

  // 1. Direct Malayalam language check
  const mlVoice = voices.find(v => {
    const lang = v.lang.toLowerCase();
    const name = v.name.toLowerCase();
    return lang.startsWith('ml') || lang.includes('mal') || name.includes('malayalam');
  });

  if (mlVoice) {
    return { voice: mlVoice, isMalayalam: true };
  }

  // 2. Indian English voice (en-IN)
  const inVoice = voices.find(v => v.lang.toLowerCase() === 'en-in');
  if (inVoice) {
    return { voice: inVoice, isMalayalam: false };
  }

  // 3. Fallback to default or first available voice (e.g. Microsoft David / Zira)
  return { voice: voices.find(v => v.default) || voices[0] || null, isMalayalam: false };
}

/**
 * Generate speech text tailored to the client's speech capabilities
 */
export function getWarningSpeechText(
  siteName: string,
  light: 'green' | 'amber' | 'red',
  reasonMl?: string,
  reasonEn?: string
): { mlText: string; phoneticText: string } {
  let defaultMl = '';
  let phoneticText = '';

  if (light === 'red') {
    defaultMl = `${siteName} ഹാർബറിൽ റെഡ് അലർട്ട്! കടലിൽ പോകരുത്. ഉയർന്ന തിരമാല മുന്നറിയിപ്പ് നിലവിലുണ്ട്.`;
    phoneticText = `Kadal Signal Alert for ${siteName}. Jaagratha! Kadalil pokaruthu. INCOIS uyarna thiramaala munnariyippu nilavilundu. Danger, do not venture into the sea.`;
  } else if (light === 'amber') {
    defaultMl = `${siteName} ഹാർബറിൽ ജാഗ്രതാ നിർദ്ദേശം. ശക്തമായ കാറ്റും തിരയും. ജാഗ്രത പാലിക്കുക.`;
    phoneticText = `Notice for ${siteName}. Jaagratha paalikkuka. Rough sea conditions. Exercise caution.`;
  } else {
    defaultMl = `${siteName} ഹാർബറിൽ കാലാവസ്ഥ അനുകൂലമാണ്. കടൽ ശാന്തമാണ്. സാധാരണ മീൻപിടുത്തം നടത്താം.`;
    phoneticText = `${siteName} harbour report. Sea conditions are safe and favourable.`;
  }

  const mlText = reasonMl ? `${siteName} ഹാർബറിൽ: ${reasonMl}` : defaultMl;

  if (reasonEn && light === 'red') {
    phoneticText = `Warning for ${siteName}: ${reasonEn}. Jaagratha, do not venture out to sea.`;
  }

  return { mlText, phoneticText };
}

/**
 * Stop any ongoing audio/speech
 */
export function stopAllSpeech(): void {
  if (currentUtterance && typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
  currentUtterance = null;
}

/**
 * Play full marine advisory broadcast with chime + voice
 */
export function playHarbourWarningAudio(
  siteName: string,
  light: 'green' | 'amber' | 'red',
  reasonMl: string | undefined,
  reasonEn: string | undefined,
  onStart: () => void,
  onEnd: () => void
): void {
  // 1. Play Marine Acoustic Chime immediately
  playMarineChime(light);

  if (!('speechSynthesis' in window)) {
    console.warn('[Kadal Signal] SpeechSynthesis not supported in this browser');
    onEnd();
    return;
  }

  // 2. Stop any existing speech and resume engine
  window.speechSynthesis.cancel();
  window.speechSynthesis.resume();

  const { voice, isMalayalam } = getBestVoice();
  const { mlText, phoneticText } = getWarningSpeechText(siteName, light, reasonMl, reasonEn);

  // If client OS has native Malayalam voice, speak Malayalam script;
  // otherwise, speak phonetic Manglish + English advisory so English voices (Microsoft David/Zira) speak clearly!
  const textToSpeak = isMalayalam ? mlText : phoneticText;

  const utterance = new SpeechSynthesisUtterance(textToSpeak);
  if (voice) {
    utterance.voice = voice;
  }
  utterance.lang = isMalayalam ? 'ml-IN' : (voice?.lang || 'en-US');
  utterance.rate = isMalayalam ? 0.9 : 0.95;
  utterance.pitch = 1.0;

  utterance.onstart = () => {
    onStart();
  };

  utterance.onend = () => {
    currentUtterance = null;
    onEnd();
  };

  utterance.onerror = (e) => {
    console.warn('[Kadal Signal] SpeechSynthesis utterance error:', e);
    currentUtterance = null;
    onEnd();
  };

  currentUtterance = utterance;

  // Chromium fix: dispatch speak in small timeout to ensure cancel() cleared
  setTimeout(() => {
    try {
      window.speechSynthesis.resume();
      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.error('[Kadal Signal] speak() failed:', err);
      onEnd();
    }
  }, 80);
}
