// YUSTAM Marketplace Theme Manager
(() => {
  const STORAGE_KEY = 'yustam.theme.preference';
  const THEME_EVENT = 'yustam-theme-change';
  const root = document.documentElement;

  const LIGHT = {
    '--yustam-surface-base': 'radial-gradient(circle at top right, rgba(15, 106, 83, 0.14), transparent 58%), linear-gradient(135deg, #f3ebe0, #f9f3ea)',
    '--yustam-surface-card': 'rgba(255, 255, 255, 0.96)',
    '--yustam-surface-card-alt': 'rgba(255, 255, 255, 0.9)',
    '--yustam-surface-elevated': 'rgba(255, 255, 255, 0.86)',
    '--yustam-border': 'rgba(15, 106, 83, 0.18)',
    '--yustam-divider': 'rgba(15, 106, 83, 0.18)',
    '--yustam-text-primary': '#161616',
    '--yustam-text-muted': 'rgba(25, 25, 25, 0.65)',
    '--yustam-heading': '#0f6a53',
    '--yustam-heading-muted': 'rgba(15, 106, 83, 0.78)',
    '--yustam-header-bg': 'rgba(15, 106, 83, 0.94)',
    '--yustam-header-text': '#ffffff',
    '--yustam-price': '#f3731e',
    '--yustam-overlay': 'rgba(0, 0, 0, 0.55)',
    '--yustam-shadow': '0 24px 45px rgba(15, 106, 83, 0.18)',
    '--yustam-card-shadow': '0 24px 40px rgba(15, 106, 83, 0.12)',
    '--yustam-btn-bg': 'linear-gradient(145deg, #f3731e, #ff9e4f)',
    '--yustam-btn-text': '#ffffff',
    '--yustam-pill-bg': 'rgba(243, 115, 30, 0.12)',
    '--yustam-pill-text': '#f3731e',
    '--yustam-input-bg': 'rgba(255, 255, 255, 0.95)',
    '--yustam-input-border': 'rgba(15, 106, 83, 0.22)',
    '--yustam-link': '#0f6a53',
    '--yustam-link-hover': '#0c5441',
  };

  const DARK = {
    '--yustam-surface-base': 'radial-gradient(circle at top right, rgba(12, 84, 65, 0.28), transparent 60%), linear-gradient(135deg, #0b1c18, #122823)',
    '--yustam-surface-card': 'rgba(18, 38, 33, 0.94)',
    '--yustam-surface-card-alt': 'rgba(20, 42, 36, 0.9)',
    '--yustam-surface-elevated': 'rgba(16, 32, 29, 0.92)',
    '--yustam-border': 'rgba(60, 98, 88, 0.55)',
    '--yustam-divider': 'rgba(64, 104, 92, 0.45)',
    '--yustam-text-primary': 'rgba(235, 245, 242, 0.96)',
    '--yustam-text-muted': 'rgba(198, 215, 211, 0.74)',
    '--yustam-heading': '#f3731e',
    '--yustam-heading-muted': '#ffb877',
    '--yustam-header-bg': 'rgba(11, 49, 39, 0.95)',
    '--yustam-header-text': '#f3731e',
    '--yustam-price': '#ffffff',
    '--yustam-overlay': 'rgba(0, 0, 0, 0.7)',
    '--yustam-shadow': '0 34px 70px rgba(0, 0, 0, 0.5)',
    '--yustam-card-shadow': '0 30px 60px rgba(0, 0, 0, 0.45)',
    '--yustam-btn-bg': 'linear-gradient(145deg, #ff9e4f, #ffb877)',
    '--yustam-btn-text': '#111a16',
    '--yustam-pill-bg': 'rgba(255, 158, 89, 0.22)',
    '--yustam-pill-text': '#ffe0c0',
    '--yustam-input-bg': 'rgba(26, 44, 38, 0.94)',
    '--yustam-input-border': 'rgba(78, 122, 108, 0.65)',
    '--yustam-link': '#ffb877',
    '--yustam-link-hover': '#ffd6ae',
  };

  const APPLY_RULES = [
    {
      selectors: `
        body,
        body .page-shell,
        body main,
        body .page-wrap,
        body .layout-shell`,
      style: {
        background: 'var(--yustam-surface-base) !important',
        color: 'var(--yustam-text-primary) !important',
      },
    },
    {
      selectors: `
        body p,
        body li,
        body .body-text,
        body .text,
        body .paragraph,
        body .description-text,
        body .content-text,
        body .list-item,
        body .card-text,
        body .detail-value,
        body .stat-value,
        body .metric-value`,
      style: {
        color: 'var(--yustam-text-primary) !important',
      },
    },
    {
      selectors: `
        body .muted,
        body .text-muted,
        body .meta-text,
        body .subtitle,
        body .caption,
        body small`,
      style: {
        color: 'var(--yustam-text-muted) !important',
      },
    },
    {
      selectors: `
        [data-theme="dark"] body .price,
        [data-theme="dark"] body .plan-price,
        [data-theme="dark"] body .pricing-value,
        [data-theme="dark"] body .pricing-amount,
        [data-theme="dark"] body .listing-price,
        [data-theme="dark"] body .product-price,
        [data-theme="dark"] body .price-tag,
        [data-theme="dark"] body .price-text,
        [data-theme="dark"] body .total-display,
        [data-theme="dark"] body .summary-price,
        [data-theme="dark"] body .amount,
        [data-theme="dark"] body .currency-value`,
      style: {
        color: 'var(--yustam-price) !important',
      },
    },
    {
      selectors: `
        [data-theme="dark"] body .hero .hero-content p,
        [data-theme="dark"] body .hero p,
        [data-theme="dark"] body .hero .description`,
      style: {
        color: 'var(--yustam-heading) !important',
      },
    },
    {
      selectors: `
        body h1,
        body h2,
        body h3,
        body h4,
        body h5,
        body h6,
        body .heading,
        body .section-title,
        body .hero-title,
        body .card-title,
        body .metric-title,
        body .section-heading`,
      style: {
        color: 'var(--yustam-heading) !important',
      },
    },
    {
      selectors: `
        body .heading-muted,
        body .lead,
        body .section-description,
        body .hero-subtitle,
        body .stat-subtext`,
      style: {
        color: 'var(--yustam-heading-muted) !important',
      },
    },
    {
      selectors: `
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
        body .pricing-card,
        body .stats-card,
        body .table-card,
        body .info-card,
        body .auth-card,
        body .form-card,
        body .notification-card,
        body .hero-card,
        body .message-card,
        body .feature-card,
        body .benefit-card,
        body .listing-card,
        body .offer-card,
        body .faq-card,
        body .highlight-card,
        body .support-card,
        body .billing-card,
        body .summary-card,
        body .cta-card,
        body .section-surface,
        body .dashboard-card,
        body .content-box,
        body .surface-card`,
      style: {
        background: 'var(--yustam-surface-card) !important',
        color: 'var(--yustam-text-primary) !important',
        borderColor: 'var(--yustam-border) !important',
        boxShadow: 'var(--yustam-card-shadow) !important',
      },
    },
    {
      selectors: `
        body .hero,
        body .hero-section,
        body .hero-banner,
        body .cta-section,
        body .newsletter,
        body .feature-section,
        body .benefit-section,
        body .testimonial-section,
        body .pricing-section,
        body .partners-section,
        body .faq-section,
        body .stats-section,
        body .summary-section,
        body .promo-strip,
        body .info-section,
        body .cta-banner,
        body .upgrade-banner,
        body .footer-top`,
      style: {
        background: 'var(--yustam-surface-card-alt) !important',
        color: 'var(--yustam-text-primary) !important',
      },
    },
    {
      selectors: `
        body footer,
        body .footer,
        body .site-footer,
        body .global-footer`,
      style: {
        background: 'var(--yustam-header-bg) !important',
        color: 'var(--yustam-header-text) !important',
      },
    },
    {
      selectors: `
        body header,
        body .app-header,
        body .sticky-header,
        body .top-bar`,
      style: {
        background: 'var(--yustam-header-bg) !important',
        color: 'var(--yustam-header-text) !important',
        boxShadow: 'var(--yustam-shadow) !important',
      },
    },
    {
      selectors: `
        body .plan-chip,
        body .status-chip,
        body .plan-pill,
        body .badge,
        body .tag,
        body .pill,
        body .hero-badge`,
      style: {
        background: 'var(--yustam-pill-bg) !important',
        color: 'var(--yustam-pill-text) !important',
        borderColor: 'transparent !important',
      },
    },
    {
      selectors: `
        body .action-button:not(.ghost-button):not(.danger-button),
        body .btn,
        body .btn-primary,
        body .cta-button,
        body .save-button,
        body .payBtn,
        body .primary-btn,
        body .hero-button,
        body .submit-btn,
        body .plan-controls .payBtn,
        body .pricing-card .cta-button,
        body .floating-cta,
        body .pill-action`,
      style: {
        background: 'var(--yustam-btn-bg) !important',
        color: 'var(--yustam-btn-text) !important',
        borderColor: 'transparent !important',
        boxShadow: '0 16px 36px rgba(0,0,0,0.18) !important',
      },
    },
    {
      selectors: `
        body .ghost-button,
        body .btn-outline,
        body .secondary-btn,
        body .outline-button,
        body .action-button.ghost-button,
        body .pricing-card .cta-outline`,
      style: {
        background: 'transparent !important',
        color: 'var(--yustam-text-primary) !important',
        borderColor: 'var(--yustam-border) !important',
      },
    },
    {
      selectors: `
        body input,
        body textarea,
        body select,
        body .input-field,
        body .form-control`,
      style: {
        background: 'var(--yustam-input-bg) !important',
        color: 'var(--yustam-text-primary) !important',
        borderColor: 'var(--yustam-input-border) !important',
      },
    },
    {
      selectors: `
        body .divider,
        body hr,
        body .separator`,
      style: {
        borderColor: 'var(--yustam-divider) !important',
      },
    },
  ];

  const ensureBody = (callback) => {
    if (document.body) callback();
    else document.addEventListener('DOMContentLoaded', callback, { once: true });
  };

  const injectBaseStyles = () => {
    if (document.getElementById('yustam-theme-overrides')) return;
    const style = document.createElement('style');
    style.id = 'yustam-theme-overrides';
    style.textContent = `
:root {
  --yustam-surface-base: ${LIGHT['--yustam-surface-base']};
  --yustam-surface-card: ${LIGHT['--yustam-surface-card']};
  --yustam-surface-card-alt: ${LIGHT['--yustam-surface-card-alt']};
  --yustam-surface-elevated: ${LIGHT['--yustam-surface-elevated']};
  --yustam-border: ${LIGHT['--yustam-border']};
  --yustam-divider: ${LIGHT['--yustam-divider']};
  --yustam-text-primary: ${LIGHT['--yustam-text-primary']};
  --yustam-text-muted: ${LIGHT['--yustam-text-muted']};
  --yustam-heading: ${LIGHT['--yustam-heading']};
  --yustam-heading-muted: ${LIGHT['--yustam-heading-muted']};
  --yustam-header-bg: ${LIGHT['--yustam-header-bg']};
  --yustam-header-text: ${LIGHT['--yustam-header-text']};
  --yustam-overlay: ${LIGHT['--yustam-overlay']};
  --yustam-shadow: ${LIGHT['--yustam-shadow']};
  --yustam-card-shadow: ${LIGHT['--yustam-card-shadow']};
  --yustam-btn-bg: ${LIGHT['--yustam-btn-bg']};
  --yustam-btn-text: ${LIGHT['--yustam-btn-text']};
  --yustam-pill-bg: ${LIGHT['--yustam-pill-bg']};
  --yustam-pill-text: ${LIGHT['--yustam-pill-text']};
  --yustam-input-bg: ${LIGHT['--yustam-input-bg']};
  --yustam-input-border: ${LIGHT['--yustam-input-border']};
  --yustam-link: ${LIGHT['--yustam-link']};
  --yustam-link-hover: ${LIGHT['--yustam-link-hover']};
  --yustam-price: ${LIGHT['--yustam-price']};
}
`;
    document.head.appendChild(style);
  };

  const storedPreference = () => {
    try {
      return localStorage.getItem(STORAGE_KEY) || 'system';
    } catch {
      return 'system';
    }
  };

  const resolveTheme = (preference) => {
    if (preference === 'light' || preference === 'dark') return preference;
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    return prefersDark ? 'dark' : 'light';
  };

  const applyPalette = (palette) => {
    Object.entries(palette).forEach(([prop, value]) => {
      root.style.setProperty(prop, value);
    });
  };

  const toKebab = (prop) => prop.replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`);

  const applyRules = (enable) => {
    ensureBody(() => {
      APPLY_RULES.forEach(({ selectors, style }) => {
        document.querySelectorAll(selectors).forEach((node) => {
          Object.entries(style).forEach(([property, value]) => {
            const propertyName = toKebab(property);
            if (enable) {
              const important = typeof value === 'string' && value.includes('!important');
              const actualValue = important ? value.replace('!important', '').trim() : value;
              node.style.setProperty(propertyName, actualValue, important ? 'important' : '');
            } else {
              node.style.removeProperty(propertyName);
            }
          });
        });
      });
    });
  };

  const broadcast = (preference, resolved) => {
    window.dispatchEvent(new CustomEvent(THEME_EVENT, {
      detail: { preference, resolved },
    }));
  };

  const applyPreference = (preference, { skipSave = false } = {}) => {
    const sanitized = ['light', 'dark', 'system'].includes(preference) ? preference : 'system';
    const resolved = resolveTheme(sanitized);

    if (!skipSave) {
      try {
        localStorage.setItem(STORAGE_KEY, sanitized);
      } catch {
        /* ignore storage issues */
      }
    }

    const palette = resolved === 'dark' ? DARK : LIGHT;
    applyPalette(palette);

    root.dataset.themePreference = sanitized;
    root.dataset.theme = resolved;
    root.classList.toggle('theme-dark', resolved === 'dark');
    root.classList.toggle('theme-light', resolved !== 'dark');

    ensureBody(() => {
      document.body.dataset.themePreference = sanitized;
      document.body.dataset.theme = resolved;
      document.body.classList.toggle('theme-dark', resolved === 'dark');
      document.body.classList.toggle('theme-light', resolved !== 'dark');
    });

    applyRules(resolved === 'dark');
    broadcast(sanitized, resolved);
  };

  const init = () => {
    injectBaseStyles();
    applyPreference(storedPreference(), { skipSave: true });

    const mediaQuery = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
    if (mediaQuery) {
      const handle = () => {
        if (storedPreference() === 'system') {
          applyPreference('system', { skipSave: true });
        }
      };

      if (typeof mediaQuery.addEventListener === 'function') {
        mediaQuery.addEventListener('change', handle);
      } else if (typeof mediaQuery.addListener === 'function') {
        mediaQuery.addListener(handle);
      }
    }
  };

  init();

  window.YustamTheme = window.YustamTheme || {
    setPreference: (value) => applyPreference(value),
    getPreference: () => storedPreference(),
    getResolvedTheme: () => resolveTheme(storedPreference()),
    applyTheme: (value) => applyPreference(value, { skipSave: true }),
    subscribe: (callback) => {
      if (typeof callback !== 'function') return () => {};
      const handler = (event) => callback(event.detail);
      window.addEventListener(THEME_EVENT, handler);
      return () => window.removeEventListener(THEME_EVENT, handler);
    },
  };
})();



