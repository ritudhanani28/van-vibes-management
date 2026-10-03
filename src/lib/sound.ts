export type AlertSound = "chime" | "bell" | "silent";

export const ALERT_SOUND_STORAGE_KEY = "kds_alert_sound";
export const KDS_INTERVAL_STORAGE_KEY = "kds_refresh_interval";

export function getSavedAlertSound(): AlertSound {
  if (typeof window === "undefined") return "chime";
  try {
    const val = localStorage.getItem(ALERT_SOUND_STORAGE_KEY);
    if (val === "bell" || val === "silent" || val === "chime") {
      return val;
    }
  } catch {
    // fallback if storage access restricted
  }
  return "chime";
}

export function saveAlertSound(sound: AlertSound): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(ALERT_SOUND_STORAGE_KEY, sound);
    window.dispatchEvent(new CustomEvent("kds_alert_sound_change", { detail: sound }));
  } catch (err) {
    console.error("Failed to save alert sound preference:", err);
  }
}

export function getSavedKdsInterval(): number {
  if (typeof window === "undefined") return 5;
  try {
    const val = localStorage.getItem(KDS_INTERVAL_STORAGE_KEY);
    const parsed = Number(val);
    if (parsed && [5, 10, 15].includes(parsed)) {
      return parsed;
    }
  } catch {
    // fallback
  }
  return 5;
}

export function saveKdsInterval(seconds: string | number): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KDS_INTERVAL_STORAGE_KEY, String(seconds));
    window.dispatchEvent(new CustomEvent("kds_interval_change", { detail: Number(seconds) }));
  } catch (err) {
    console.error("Failed to save KDS interval:", err);
  }
}

export function playAlertSound(type?: AlertSound): void {
  if (typeof window === "undefined") return;
  const soundType = type || getSavedAlertSound();
  if (soundType === "silent") {
    console.log("[Audio Alert] Sound mode is Silent. No audio played.");
    return;
  }

  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) {
      console.warn("[Audio Alert] Web Audio API is not supported by this browser.");
      return;
    }

    const ctx = new AudioCtx();

    const executeSound = () => {
      const now = ctx.currentTime;

      if (soundType === "chime") {
        console.log("[Audio Alert] 🔔 Playing: Subtle Dining Chime (D5 -> A5)");
        // Subtle Dining Chime: warm harmonic chime glide (587.33Hz -> 880Hz)
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(587.33, now);
        osc.frequency.exponentialRampToValueAtTime(880.0, now + 0.15);
        gain.gain.setValueAtTime(0.35, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.7);
      } else if (soundType === "bell") {
        console.log("[Audio Alert] 🛎️ Playing: Kitchen Bell (1760Hz + 2640Hz metallic ring)");
        // Kitchen Bell: crisp metallic service counter bell (dual-harmonic ping)
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();

        osc1.type = "sine";
        osc1.frequency.setValueAtTime(1760, now); // Fundamental A6

        osc2.type = "sine";
        osc2.frequency.setValueAtTime(2640, now); // Metallic overtone (approx 1.5x)

        gain.gain.setValueAtTime(0.38, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.9);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);

        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 0.9);
        osc2.stop(now + 0.9);
      }
    };

    if (ctx.state === "suspended") {
      ctx.resume().then(executeSound).catch(executeSound);
    } else {
      executeSound();
    }
  } catch (err) {
    console.warn("[Audio Alert] Audio playback restricted or failed:", err);
  }
}
