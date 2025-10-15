// YUSTAM Marketplace Theme Manager
(() => {
  const STORAGE_KEY = 'yustam.theme.preference';
  const THEME_CHANGE_EVENT = 'yustam-theme-change';
  const root = document.documentElement;

  const LIGHT_PALETTE = {
    '--yustam-surface-base': 'radial-gradient(circle at top right, rgba(15, 106, 83, 0.14), transparent 55%), linear-gradient(135deg, #f3ebe0, #f7f1e8)',
    '--yustam-surface-card': 'rgba(255, 255, 255, 0.92)',
    '--yustam-surface-card-alt': 'rgba(255, 255, 255, 0.85)',
    '--yustam-border': 'rgba(255, 255, 255, 0.45)',
    '--yustam-text-primary': '#161616',
    '--yustam-text-muted': 'rgba(22, 22, 22, 0.65)',
    '--yustam-header-bg': 'rgba(15, 106, 83, 0.94)',
    '--yustam-header-text': '#ffffff',
    '--yustam-overlay': 'rgba(0, 0, 0, 0.55)',
    '--yustam-shadow': '0 24px 45px rgba(15, 106, 83, 0.16)',
    '--yustam-card-shadow': '0 26px 48px rgba(15, 106, 83, 0.14)',
    '--yustam-btn-bg': 'linear-gradient(145deg, #f3731e, #ff9448)',
    '--yustam-btn-text': '#ffffff',
    '--yustam-input-bg': 'rgba(255, 255, 255, 0.96)',
    '--yustam-input-border': 'rgba(15, 106, 83, 0.22)',
  };

  const DARK_PALETTE = {
    '--yustam-surface-base': 'radial-gradient(circle at top right, rgba(12, 84, 65, 0.25), transparent 55%), linear-gradient(135deg, #0b1c18, #122823)',
    '--yustam-surface-card': 'rgba(16, 32, 29, 0.92)',
    '--yustam-surface-card-alt': 'rgba(18, 36, 32, 0.88)',
    '--yustam-border': 'rgba(34, 64, 56, 0.55)',
    '--yustam-text-primary': 'rgba(235, 245, 242, 0.96)',
    '--yustam-text-muted': 'rgba(198, 215, 211, 0.72)',
    '--yustam-header-bg': 'rgba(11, 49, 39, 0.95)',
    '--yustam-header-text': 'rgba(235, 245, 242, 0.98)',
    '--yustam-overlay': 'rgba(0, 0, 0, 0.7)',
    '--yustam-shadow': '0 30px 58px rgba(0, 0, 0, 0.45)',
    '--yustam-card-shadow': '0 34px 62px rgba(0, 0, 0, 0.55)',
    '--yustam-btn-bg': 'linear-gradient(145deg, #ff9448, #ffb071)',
    '--yustam-btn-text': '#111a16',
    '--yustam-input-bg': 'rgba(23, 41, 37, 0.92)',
    '--yustam-input-border': 'rgba(54, 90, 80, 0.65)',
  };

  const ensureBodyReady = (callback) => {
    if (document.body) {
      callback();
    } else {
      document.addEventListener('DOMContentLoaded', callback, { once: true });
    }
  };

  const injectStyles = () => {
    if (document.getElementById('yustam-theme-overrides')) return;

    const style = document.createElement('style');
    style.id = 'yustam-theme-overrides';
    style.textContent = `
:root {
  --yustam-surface-base: ${LIGHT_PALETTE['--yustam-surface-base']};
  --yustam-surface-card: ${LIGHT_PALETTE['--yustam-surface-card']};
  --yustam-surface-card-alt: ${LIGHT_PALETTE['--yustam-surface-card-alt']};
  --yustam-border: ${LIGHT_PALETTE['--yustam-border']};
  --yustam-text-primary: ${LIGHT_PALETTE['--yustam-text-primary']};
  --yustam-text-muted: ${LIGHT_PALETTE['--yustam-text-muted']};
  --yustam-header-bg: ${LIGHT_PALETTE['--yustam-header-bg']};
  --yustam-header-text: ${LIGHT_PALETTE['--yustam-header-text']};
  --yustam-overlay: ${LIGHT_PALETTE['--yustam-overlay']};
  --yustam-shadow: ${LIGHT_PALETTE['--yustam-shadow']};
  --yustam-card-shadow: ${LIGHT_PALETTE['--yustam-card-shadow']};
  --yustam-btn-bg: ${LIGHT_PALETTE['--yustam-btn-bg']};
  --yustam-btn-text: ${LIGHT_PALETTE['--yustam-btn-text']};
  --yustam-input-bg: ${LIGHT_PALETTE['--yustam-input-bg']};
  --yustam-input-border: ${LIGHT_PALETTE['--yustam-input-border']};
}

body {
  background: var(--yustam-surface-base) !important;
  color: var(--yustam-text-primary) !important;
}

body, body * {
  transition: color 0.28s ease, background 0.28s ease, background-color 0.28s ease, border-color 0.28s ease;
}

body .glass-card,
body .profile-card,
body .plan-card,
body .upgrade-card,
body .card,
body .modal-card,
body .current-plan-card,
body .details-card,
body section.glass-card,
body .action-card,
body .save-bar,
body .pricing-card {
  background: var(--yustam-surface-card) !important;
  color: var(--yustam-text-primary) !important;
  box-shadow: var(--yustam-card-shadow) !important;
  border-color: var(--yustam-border) !important;
}

body .glass-card .description,
body .description,
body .detail-label,
body .plan-summary,
body .plan-description,
body .plan-limit,
body .plan-features li,
body .text-muted {
  color: var(--yustam-text-muted) !important;
}

body header,
body .app-header {
  background: var(--yustam-header-bg) !important;
  color: var(--yustam-header-text) !important;
  box-shadow: var(--yustam-shadow) !important;
}

body .action-button:not(.ghost-button):not(.danger-button),
body .btn,
body .btn-primary,
body .cta-button,
body .save-button,
body .payBtn,
body .primary-btn,
body .hero-button,
body .submit-btn {
  background: var(--yustam-btn-bg) !important;
  color: var(--yustam-btn-text) !important;
  border-color: transparent !important;
}

body .ghost-button,
body .btn-outline,
body .secondary-btn,
body .outline-button,
body .action-button.ghost-button {
  background: transparent !important;
  border: 1px solid var(--yustam-border) !important;
  color: var(--yustam-text-primary) !important;
}

body input,
body textarea,
body select {
  background: var(--yustam-input-bg) !important;
  color: var(--yustam-text-primary) !important;
  border-color: var(--yustam-input-border) !important;
}

body input::placeholder,
body textarea::placeholder {
  color: var(--yustam-text-muted) !important;
}

[data-theme="dark"] .modal-backdrop {
  background: var(--yustam-overlay) !important;
}

[data-theme="dark"] .plan-chip,
[data-theme="dark"] .status-chip,
[data-theme="dark"] .plan-pill,
[data-theme="dark"] .badge,
[data-theme="dark"] .tag {
  background: rgba(34, 64, 56, 0.55) !important;
  color: var(--yustam-text-primary) !important;
}

[data-theme="dark"] .upgrade-banner,
[data-theme="dark"] .alert-info {
  background: rgba(255, 148, 72, 0.12) !important;
  color: var(--yustam-text-primary) !important;
  border-color: rgba(255, 148, 72, 0.35) !important;
}

[data-theme="dark"] .danger-card,
[data-theme="dark"] .danger-button,
[data-theme="dark"] .alert-danger {
  background: rgba(170, 50, 50, 0.22) !important;
  color: #ffe4db !important;
  border-color: rgba(255, 120, 120, 0.45) !important;
}

[data-theme="dark"] .save-bar,
[data-theme="dark"] .modal-card,
[data-theme="dark"] .notification-card {
  background: var(--yustam-surface-card-alt) !important;
  box-shadow: var(--yustam-card-shadow) !important;
}
`;

    document.head.appendChild(style);
  };

  const getStoredPreference = () => {
    try {
      return localStorage.getItem(STORAGE_KEY) || 'system';
    } catch (error) {
      return 'system';
    }
  };

  const resolveTheme = (preference) => {
    if (preference === 'dark' || preference === 'light') return preference;
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    return prefersDark ? 'dark' : 'light';
  };

  const applyPalette = (resolvedTheme) => {
    const palette = resolvedTheme === 'dark' ? DARK_PALETTE : LIGHT_PALETTE;
    Object.entries(palette).forEach(([property, value]) => {
      root.style.setProperty(property, value);
    });
  };

  const dispatchThemeEvent = (preference, resolved) => {
    window.dispatchEvent(new CustomEvent(THEME_CHANGE_EVENT, {
      detail: { preference, resolved },
    }));
  };

  const applyThemePreference = (preference, { skipStorage } = {}) => {
    const sanitizedPreference = ['light', 'dark', 'system'].includes(preference) ? preference : 'system';
    const resolved = resolveTheme(sanitizedPreference);

    if (!skipStorage) {
      try {
        localStorage.setItem(STORAGE_KEY, sanitizedPreference);
      } catch (error) {
        // ignore storage issues (likely private mode)
      }
    }

    root.dataset.themePreference = sanitizedPreference;
    root.dataset.theme = resolved;
    root.classList.toggle('theme-dark', resolved === 'dark');
    root.classList.toggle('theme-light', resolved !== 'dark');
    applyPalette(resolved);

    ensureBodyReady(() => {
      document.body.dataset.themePreference = sanitizedPreference;
      document.body.dataset.theme = resolved;
      document.body.classList.toggle('theme-dark', resolved === 'dark');
      document.body.classList.toggle('theme-light', resolved !== 'dark');
    });

    dispatchThemeEvent(sanitizedPreference, resolved);
  };

  const setPreference = (preference) => applyThemePreference(preference, { skipStorage: false });
  const getPreference = () => getStoredPreference();
  const getResolvedTheme = () => resolveTheme(getStoredPreference());

  const subscribe = (callback) => {
    if (typeof callback !== 'function') return () => {};

    const handler = (event) => callback(event.detail);
    window.addEventListener(THEME_CHANGE_EVENT, handler);
    return () => window.removeEventListener(THEME_CHANGE_EVENT, handler);
  };

  injectStyles();
  applyThemePreference(getStoredPreference(), { skipStorage: true });

  const mediaQuery = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
  if (mediaQuery) {
    const handleMediaChange = () => {
      if (getStoredPreference() === 'system') {
        applyThemePreference('system', { skipStorage: true });
      }
    };

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', handleMediaChange);
    } else if (typeof mediaQuery.addListener === 'function') {
      mediaQuery.addListener(handleMediaChange);
    }
  }

  window.YustamTheme = window.YustamTheme || {
    setPreference,
    getPreference,
    getResolvedTheme,
    applyTheme: (preference) => applyThemePreference(preference, { skipStorage: true }),
    subscribe,
  };
})();

