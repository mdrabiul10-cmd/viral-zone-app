/**
 * Web Audio API synthesized sound effects and Telegram haptics
 */

// Window Telegram WebApp declaration
declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        ready: () => void;
        expand: () => void;
        setHeaderColor?: (color: string) => void;
        setBackgroundColor?: (color: string) => void;
        openLink?: (url: string, options?: { try_instant_view?: boolean }) => void;
        openTelegramLink?: (url: string) => void;
        BackButton?: {
          show: () => void;
          hide: () => void;
          onClick: (callback: () => void) => void;
        };
        HapticFeedback?: {
          impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
          notificationOccurred: (type: 'error' | 'success' | 'warning') => void;
        };
        initDataUnsafe?: {
          user?: {
            id: number;
            first_name: string;
            last_name?: string;
            username?: string;
            photo_url?: string;
          };
          start_param?: string;
        };
        platform?: string;
        version?: string;
      };
    };
    confetti?: (options?: unknown) => void;
  }
}

export function triggerHaptic(type: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' = 'light') {
  try {
    const tg = window.Telegram?.WebApp;
    if (tg?.HapticFeedback) {
      if (type === 'light' || type === 'medium' || type === 'heavy') {
        tg.HapticFeedback.impactOccurred(type);
      } else {
        tg.HapticFeedback.notificationOccurred(type);
      }
    }
  } catch (e) {
    // Ignore in non-telegram web environments
  }
}

export function playAudioSound(type: 'click' | 'tick' | 'round' | 'unlocked') {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'click') {
      osc.frequency.setValueAtTime(580, ctx.currentTime);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    } else if (type === 'tick') {
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      gain.gain.setValueAtTime(0.04, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
      osc.start();
      osc.stop(ctx.currentTime + 0.05);
    } else if (type === 'round') {
      osc.frequency.setValueAtTime(523.25, ctx.currentTime);
      osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.09);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    } else if (type === 'unlocked') {
      [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
        const noteOsc = ctx.createOscillator();
        const noteGain = ctx.createGain();
        noteOsc.connect(noteGain);
        noteGain.connect(ctx.destination);
        noteOsc.frequency.value = freq;
        const start = ctx.currentTime + idx * 0.1;
        noteGain.gain.setValueAtTime(0.15, start);
        noteGain.gain.exponentialRampToValueAtTime(0.001, start + 0.35);
        noteOsc.start(start);
        noteOsc.stop(start + 0.35);
      });
    }
  } catch (e) {
    // Audio context may require user interaction first
  }
}

export function openInTelegramInAppBrowser(url: string) {
  if (!url) return;
  const cleanUrl = url.trim();
  const tg = window.Telegram?.WebApp;
  if (tg && typeof tg.openLink === 'function') {
    try {
      tg.openLink(cleanUrl, { try_instant_view: false });
      return;
    } catch {
      try {
        tg.openLink(cleanUrl);
        return;
      } catch (err) {
        console.warn('Telegram openLink error:', err);
      }
    }
  }

  // Fallback to window.open (Never redirect current window to avoid unloading mini app)
  try {
    window.open(cleanUrl, '_blank', 'noopener,noreferrer');
  } catch (err) {
    console.warn('Could not open external link:', err);
  }
}

export function openTelegramChatOrChannel(url: string) {
  if (!url) return;
  const cleanUrl = url.trim();
  const tg = window.Telegram?.WebApp;
  if (tg?.openTelegramLink && cleanUrl.includes('t.me')) {
    try {
      tg.openTelegramLink(cleanUrl);
      return;
    } catch (e) {
      console.warn('Error opening telegram link via SDK:', e);
    }
  }
  window.open(cleanUrl, '_blank', 'noopener,noreferrer');
}
