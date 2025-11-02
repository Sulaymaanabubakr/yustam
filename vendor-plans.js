// YUSTAM Vendor Plans – Paystack recurring billing integration

document.addEventListener('DOMContentLoaded', () => {
  const pageData = window.YUSTAM_VENDOR_PLAN || {};
  const vendorProfile = pageData.vendor || {};
  const redirects = pageData.redirects || {};
  const paystackKey = String(pageData.paystackKey || '').trim();
  const planCatalog = buildCatalog(pageData.plans || {});
  const endpoints = normaliseEndpoints(pageData.endpoints || {});
  const successRedirect = redirects.success || endpoints.success || 'plan-success.php';
  const failureRedirect = redirects.failure || endpoints.failure || 'plan-failed.php';

  let currentSubscription = normaliseSubscription(pageData.subscription || pageData.currentPlan || {});

  const planCards = Array.from(document.querySelectorAll('.plan-card'));
  const currentPlanNameEl = document.getElementById('currentPlanName');
  const currentPlanStatusEl = document.getElementById('currentPlanStatus');
  const currentPlanRenewalEl = document.getElementById('currentPlanRenewal');
  const planNoticeEl = document.getElementById('planNotice');
  const planMessageEl = document.getElementById('planMessage');
  const cancelBtn = document.getElementById('cancelPlanBtn');

  const cardStates = new Map();
  const currencyFormatter = new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  });

  planCards.forEach((card) => {
    const slug = resolvePlanSlug(card);
    if (!slug || slug === 'free') {
      return;
    }

    card.dataset.planSlug = slug;
    const durationSelect = card.querySelector('.planDuration');
    const button = card.querySelector('.payBtn');
    const totalEl = card.querySelector('.total-display');

    if (!durationSelect || !button || !totalEl) {
      return;
    }

    const state = {
      card,
      slug,
      durationSelect,
      button,
      totalEl,
      originalButtonLabel: button.textContent,
    };
    cardStates.set(card, state);

    durationSelect.addEventListener('change', () => updateCardPricing(state));
    button.addEventListener('click', () => handleUpgrade(state));
  });

  cardStates.forEach((state) => updateCardPricing(state));
  hydrateCurrentPlan(currentSubscription);

  if (cancelBtn) {
    cancelBtn.addEventListener('click', handleCancel);
    cancelBtn.hidden = !currentSubscription.canCancel;
  }

  highlightCurrentPlanCard();

  const renewPlanBtn = document.getElementById('renewPlan');
  if (renewPlanBtn) {
    renewPlanBtn.addEventListener('click', () => {
      const slug = currentSubscription.slug;
      if (!slug || slug === 'free') {
        window.location.href = 'vendor-plans.php';
        return;
      }
      const match = findCardBySlug(slug);
      if (match) {
        match.card.scrollIntoView({ behavior: 'smooth', block: 'center' });
        match.card.classList.add('plan-card--pulse');
        setTimeout(() => match.card.classList.remove('plan-card--pulse'), 1600);
      }
    });
  }

  function normaliseEndpoints(raw = {}) {
    if (typeof raw !== 'object' || raw === null) {
      return {
        activate: 'vendor-subscription-action.php',
        cancel: 'vendor-subscription-action.php',
        success: '',
        failure: '',
      };
    }
    return {
      activate: raw.activate || raw.upgrade || 'vendor-subscription-action.php',
      cancel: raw.cancel || raw.deactivate || 'vendor-subscription-action.php',
      success: raw.success || '',
      failure: raw.failure || '',
    };
  }

  function buildCatalog(raw) {
    const catalog = {};
    Object.entries(raw || {}).forEach(([key, value]) => {
      const plan = value || {};
      const slug = normalisePlanSlug(plan.slug || key);
      if (!slug) {
        return;
      }
      const durations = {};
      const options = plan.durations || plan.options || {};
      Object.entries(options).forEach(([durationKey, optionValue]) => {
        const months = Number(durationKey);
        if (!Number.isFinite(months) || months <= 0) {
          return;
        }
        const option = optionValue || {};
        const planCode = option.planCode || option.code || '';
        if (!planCode) {
          return;
        }
        const amount = Number(option.amount ?? option.price ?? plan.amount ?? 0);
        durations[months] = {
          slug,
          planCode,
          months,
          amount,
          intervalLabel: option.intervalLabel || option.label || plan.intervalLabel || '',
          name: plan.name || plan.title || plan.planName || toTitleCase(slug),
        };
      });

      if (Object.keys(durations).length === 0) {
        return;
      }

      catalog[slug] = {
        slug,
        name: plan.name || plan.title || plan.planName || toTitleCase(slug),
        monthlyPrice: Number(plan.monthlyPrice ?? plan.monthlyFee ?? 0),
        durations,
      };
    });
    return catalog;
  }

  function resolvePlanSlug(card) {
    const attrValue = card.dataset.planSlug || card.dataset.plan || '';
    if (attrValue) {
      const slug = normalisePlanSlug(attrValue);
      if (slug) {
        return slug;
      }
    }
    const heading = card.querySelector('.plan-name');
    if (heading) {
      return normalisePlanSlug(heading.textContent);
    }
    return '';
  }

  function normalisePlanSlug(value) {
    const raw = String(value || '').trim().toLowerCase();
    if (!raw) {
      return '';
    }
    const trimmed = raw.replace(/plan$/, '');
    return trimmed.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  }

  function toTitleCase(value) {
    return String(value || '')
      .split(/[\s_-]+/)
      .filter(Boolean)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  function getPlanOption(slug, months) {
    const plan = planCatalog[slug];
    if (!plan) {
      return null;
    }
    const option = plan.durations[months];
    if (!option) {
      return null;
    }
    return {
      slug,
      planCode: option.planCode,
      months: option.months,
      amount: option.amount,
      name: plan.name,
    };
  }

  function formatCurrency(amount) {
    const numeric = Number(amount || 0);
    if (!Number.isFinite(numeric) || numeric <= 0) {
      return currencyFormatter.format(0);
    }
    return currencyFormatter.format(numeric);
  }

  function formatDurationLabel(months) {
    const numeric = Number(months || 0);
    if (!Number.isFinite(numeric) || numeric <= 0) {
      return '';
    }
    return numeric === 1 ? '1 month' : `${numeric} months`;
  }

  function formatDateLabel(value) {
    if (!value) {
      return '';
    }
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return String(value);
    }
    return parsed.toLocaleDateString('en-NG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  function buildRedirectUrl(base, params = {}) {
    try {
      const url = new URL(base, window.location.origin);
      Object.entries(params).forEach(([key, val]) => {
        if (val !== undefined && val !== null && val !== '') {
          url.searchParams.set(key, val);
        }
      });
      return url.toString();
    } catch {
      return base;
    }
  }

  function setMessage(type, text) {
    if (!planMessageEl) {
      return;
    }
    if (!text) {
      planMessageEl.textContent = '';
      planMessageEl.className = 'plan-message';
      planMessageEl.hidden = true;
      return;
    }
    const kind = ['success', 'error', 'info', 'warning'].includes(type) ? type : 'info';
    planMessageEl.textContent = text;
    planMessageEl.className = `plan-message plan-message--${kind}`;
    planMessageEl.hidden = false;
  }

  function disableCard(state, loading) {
    state.durationSelect.disabled = loading;
    state.button.disabled = loading;
    state.card.classList.toggle('plan-card--loading', loading);
    if (loading) {
      state.button.textContent = 'Processing...';
    } else {
      state.button.textContent = state.originalButtonLabel;
    }
  }

  function updateCardPricing(state) {
    const months = parseInt(state.durationSelect.value, 10) || 1;
    const option = getPlanOption(state.slug, months);
    if (!option) {
      state.totalEl.textContent = 'Unavailable for the selected duration.';
      state.button.disabled = true;
      return;
    }
    state.button.disabled = false;
    state.totalEl.textContent = `Total: ${formatCurrency(option.amount)} (${formatDurationLabel(option.months)})`;
    state.button.dataset.planCode = option.planCode;
    state.button.dataset.duration = String(option.months);
  }

  function highlightCurrentPlanCard() {
    planCards.forEach((card) => {
      const slug = card.dataset.planSlug || '';
      const isCurrent = slug && currentSubscription.slug && slug === currentSubscription.slug;
      card.classList.toggle('plan-card--current', Boolean(isCurrent));
    });
  }

  function findCardBySlug(slug) {
    for (const state of cardStates.values()) {
      if (state.slug === slug) {
        return state;
      }
    }
    return null;
  }

  function normaliseSubscription(raw) {
    const data = raw || {};
    const slug = normalisePlanSlug(data.slug || data.planSlug || data.name || data.plan || '');
    const statusRaw = String(data.status || data.statusLabel || data.planStatus || 'Active').trim() || 'Active';
    const nextBillingIso = data.nextBillingIso || data.nextBillingDate || data.expiryIso || data.planExpiryIso || '';
    const nextBillingDisplay =
      data.nextBillingDisplay ||
      data.expiryDisplay ||
      (nextBillingIso ? formatDateLabel(nextBillingIso) : '');

    return {
      slug,
      planName: data.planName || data.name || toTitleCase(slug || 'Free Plan'),
      displayName: data.displayName || data.planDisplay || data.planName || data.name || toTitleCase(slug || 'Free Plan'),
      status: statusRaw,
      statusLabel: data.statusLabel || toTitleCase(statusRaw),
      nextBillingIso,
      nextBillingDisplay,
      subscriptionCode: data.subscriptionCode || data.paystackSubscriptionCode || '',
      planCode: data.planCode || data.paystackPlanCode || '',
      durationMonths: Number(data.durationMonths || data.months || 0) || 0,
      canCancel: Boolean(
        data.canCancel ??
          (slug && slug !== 'free' && (data.subscriptionCode || data.paystackSubscriptionCode))
      ),
      cancelled: Boolean(data.cancelled || data.isCancelled || statusRaw.toLowerCase().includes('cancel')),
      notice: data.notice || '',
    };
  }

  function hydrateCurrentPlan(subscription) {
    const name = subscription.displayName || subscription.planName || 'Free Plan';
    if (currentPlanNameEl) {
      currentPlanNameEl.textContent = name;
    }
    if (currentPlanStatusEl) {
      currentPlanStatusEl.textContent = subscription.statusLabel || toTitleCase(subscription.status || 'Active');
    }
    if (currentPlanRenewalEl) {
      currentPlanRenewalEl.textContent = subscription.nextBillingDisplay || '--';
    }
    if (planNoticeEl) {
      if (subscription.notice) {
        planNoticeEl.textContent = subscription.notice;
        planNoticeEl.hidden = false;
      } else if (subscription.nextBillingDisplay) {
        planNoticeEl.textContent = subscription.cancelled
          ? `Auto-renewal is off. Benefits remain until ${subscription.nextBillingDisplay}.`
          : `Next billing date: ${subscription.nextBillingDisplay}.`;
        planNoticeEl.hidden = false;
      } else {
        planNoticeEl.hidden = true;
      }
    }
  }

  function openPaystack(option, onSuccess, onClose, onError) {
    if (!window.PaystackPop || typeof window.PaystackPop.setup !== 'function') {
      throw new Error('Paystack could not be initialised. Refresh the page and try again.');
    }

    const email = vendorProfile.email || vendorProfile.contactEmail || 'support@yustam.com';
    const reference = `YUSTAM-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const setupConfig = {
      key: paystackKey,
      email,
      plan: option.planCode,
      reference,
      metadata: {
        custom_fields: [
          {
            display_name: 'Vendor ID',
            variable_name: 'vendor_id',
            value: String(vendorProfile.id || ''),
          },
          {
            display_name: 'Plan',
            variable_name: 'plan_slug',
            value: option.slug,
          },
          {
            display_name: 'Duration',
            variable_name: 'duration_months',
            value: option.months,
          },
        ],
        plan_slug: option.slug,
        plan_name: option.name,
        duration_months: option.months,
      },
      callback: (response) => {
        if (response && response.reference) {
          if (typeof onSuccess === 'function') {
            onSuccess(response.reference, response);
          }
        } else if (typeof onError === 'function') {
          onError(new Error('We could not confirm your Paystack reference. Contact support if you were charged.'));
        }
      },
      onClose: () => {
        if (typeof onClose === 'function') {
          onClose();
        }
      },
    };

    const amountKobo = option.amount > 0 ? Math.round(option.amount * 100) : 0;
    if (amountKobo > 0) {
      setupConfig.amount = amountKobo;
    }

    const handler = window.PaystackPop.setup(setupConfig);
    handler.openIframe();
  }

  async function confirmSubscription(reference, option) {
    let response;
    try {
      response = await fetch(endpoints.activate, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
        credentials: 'same-origin',
        body: JSON.stringify({
          action: 'activate',
          reference,
          planSlug: option.slug,
          planCode: option.planCode,
          durationMonths: option.months,
        }),
      });
    } catch (networkError) {
      throw new Error('Network error while confirming your subscription. Please try again.');
    }

    let payload;
    try {
      payload = await response.json();
    } catch (parseError) {
      throw new Error('Unexpected response while confirming your subscription.');
    }

    if (!response.ok || !payload || !payload.success) {
      throw new Error(
        (payload && payload.message) ||
          'We could not activate your subscription. Contact support with your payment reference.'
      );
    }

    const subscriptionState = normaliseSubscription(payload.subscription || payload.data || {});
    currentSubscription = subscriptionState;
    hydrateCurrentPlan(subscriptionState);
    if (cancelBtn) {
      cancelBtn.hidden = !subscriptionState.canCancel;
    }

    highlightCurrentPlanCard();

    const redirectTarget = payload.redirectTo || successRedirect;
    if (redirectTarget) {
      const redirectUrl = buildRedirectUrl(redirectTarget, { reference });
      setTimeout(() => {
        window.location.href = redirectUrl;
      }, 900);
    } else {
      setMessage('success', payload.message || 'Subscription activated successfully.');
    }
  }

  async function handleCancel() {
    if (!currentSubscription || !currentSubscription.canCancel) {
      setMessage('info', 'You do not have an active paid subscription to cancel.');
      return;
    }

    const nextLabel = currentSubscription.nextBillingDisplay;
    const confirmMessage = nextLabel
      ? `Turn off auto-renewal for the ${currentSubscription.displayName}? You will keep your plan benefits until ${nextLabel}.`
      : `Turn off auto-renewal for the ${currentSubscription.displayName}?`;

    if (!window.confirm(confirmMessage)) {
      return;
    }

    cancelBtn.disabled = true;
    setMessage('info', 'Cancelling auto-renewal...');

    let response;
    try {
      response = await fetch(endpoints.cancel, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
        credentials: 'same-origin',
        body: JSON.stringify({
          action: 'cancel',
          planSlug: currentSubscription.slug,
          subscriptionCode: currentSubscription.subscriptionCode,
          planCode: currentSubscription.planCode,
        }),
      });
    } catch (networkError) {
      cancelBtn.disabled = false;
      setMessage('error', 'Network error while cancelling your plan. Please try again.');
      return;
    }

    let payload;
    try {
      payload = await response.json();
    } catch (parseError) {
      cancelBtn.disabled = false;
      setMessage('error', 'Unexpected response while cancelling your plan.');
      return;
    }

    cancelBtn.disabled = false;

    if (!response.ok || !payload || !payload.success) {
      setMessage('error', (payload && payload.message) || 'We could not cancel your plan at this time.');
      return;
    }

    const updated = normaliseSubscription(payload.subscription || payload.data || {});
    currentSubscription = updated;
    hydrateCurrentPlan(updated);
    setMessage(
      'success',
      payload.message ||
        'Auto-renewal has been turned off. You stay on your current plan until the billing cycle ends.'
    );
    if (cancelBtn) {
      cancelBtn.hidden = !updated.canCancel;
    }
    highlightCurrentPlanCard();
  }

  function handleUpgrade(state) {
    const months = parseInt(state.durationSelect.value, 10) || 1;
    const option = getPlanOption(state.slug, months);
    if (!option) {
      setMessage('error', 'Please choose a valid duration for this plan.');
      return;
    }
    if (!paystackKey) {
      setMessage('error', 'Paystack is not configured yet. Please contact support.');
      return;
    }

    disableCard(state, true);
    setMessage('info', 'Opening Paystack checkout...');

    try {
      openPaystack(
        option,
        (reference) => {
          setMessage('info', 'Confirming your payment...');
          confirmSubscription(reference, option)
            .catch((error) => {
              setMessage('error', error.message);
              if (failureRedirect) {
                window.location.href = buildRedirectUrl(failureRedirect, { reference });
              }
            })
            .finally(() => disableCard(state, false));
        },
        () => {
          setMessage('info', 'Checkout was closed. Your plan was not changed.');
          disableCard(state, false);
        },
        (error) => {
          setMessage('error', error.message);
          disableCard(state, false);
        }
      );
    } catch (error) {
      disableCard(state, false);
      setMessage('error', error.message);
    }
  }
});
