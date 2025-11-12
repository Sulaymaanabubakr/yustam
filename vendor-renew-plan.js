// YUSTAM Marketplace | Vendor Renew Plan Interactions

document.addEventListener('DOMContentLoaded', () => {
  const planEndpoint = 'vendor-renew-plan.php?format=json';
  const planNameEl = document.getElementById('currentPlanName');
  const planBadgeEl = document.getElementById('currentPlanBadge');
  const planExpiryEl = document.getElementById('currentPlanExpiry');
  const planListingsEl = document.getElementById('currentPlanListings');
  const planPriceEl = document.getElementById('currentPlanPrice');
  const planCountdownEl = document.getElementById('currentPlanCountdown');
  const planExpiryTextEl = document.getElementById('planExpiryText');
  const durationOptions = Array.from(document.querySelectorAll('.duration-option'));
  const priceBadges = Array.from(document.querySelectorAll('.duration-price'));
  const summaryEl = document.getElementById('renewalSummary');
  const renewButton = document.getElementById('renewButton');
  const logoArea = document.querySelector('.logo-area');

  const PAYSTACK_PUBLIC_KEY = 'pk_test_xxxxxxxxxxxxx';
  const discounts = {
    1: 0,
    3: 0.1,
    6: 0.2,
    12: 0.3,
  };

  let planData = {
    planName: 'Current Plan',
    planBadge: 'starter',
    monthlyPrice: 0,
    currency: 'NGN',
    expiresOn: new Date().toISOString().slice(0, 10),
    remainingListings: 0,
    contactEmail: 'vendor@yustam.test',
    vendorName: 'YUSTAM Vendor',
  };

  const formatCurrency = (value, currency = 'NGN') => {
    const numeric = Number(value) || 0;
    const formatter = new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
    return formatter.format(numeric);
  };

  const computeDiscountedTotal = (monthlyPrice, months) => {
    const price = Number(monthlyPrice) || 0;
    const duration = Number(months) || 1;
    const discountRate = discounts[duration] || 0;
    const gross = price * duration;
    const net = gross - gross * discountRate;
    return Math.round(net);
  };

  const updatePlanSummary = (data) => {
    const { planName, planBadge, monthlyPrice, currency, expiresOn, remainingListings } = data;

    if (planNameEl) planNameEl.textContent = planName || 'Current Plan';
    if (planBadgeEl) {
      planBadgeEl.textContent = `${planName || 'Current Plan'} plan`;
      planBadgeEl.className = `plan-badge ${planBadge || ''}`.trim();
    }
    if (planPriceEl) planPriceEl.textContent = monthlyPrice ? `${formatCurrency(monthlyPrice, currency)}/month` : '—';

    if (planListingsEl) planListingsEl.textContent = typeof remainingListings === 'number' ? `${remainingListings} listings` : remainingListings || '—';

    if (planExpiryEl || planCountdownEl || planExpiryTextEl) {
      const expiryDate = expiresOn ? new Date(expiresOn) : null;
      if (expiryDate && !Number.isNaN(expiryDate.getTime())) {
        const now = new Date();
        const diffTime = expiryDate.getTime() - now.setHours(0, 0, 0, 0);
        const diffDays = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
        if (planExpiryEl) planExpiryEl.textContent = expiryDate.toLocaleDateString('en-NG', { year: 'numeric', month: 'short', day: 'numeric' });
        if (planCountdownEl) planCountdownEl.textContent = `${diffDays} day${diffDays === 1 ? '' : 's'}`;
        if (planExpiryTextEl) planExpiryTextEl.textContent = diffDays > 0
          ? `Your plan expires in ${diffDays} day${diffDays === 1 ? '' : 's'}.`
          : 'Your plan has expired. Renew now to reactivate your listings.';
      } else {
        if (planExpiryEl) planExpiryEl.textContent = '—';
        if (planCountdownEl) planCountdownEl.textContent = '—';
        if (planExpiryTextEl) planExpiryTextEl.textContent = 'We could not determine your plan expiry.';
      }
    }
  };

  const updateDurationPrices = () => {
    priceBadges.forEach((badge) => {
      const months = Number(badge.dataset.months);
      const total = computeDiscountedTotal(planData.monthlyPrice, months);
      badge.textContent = planData.monthlyPrice ? `${formatCurrency(total, planData.currency)} total` : '—';
    });
  };

  const setActiveOption = (targetLabel) => {
    durationOptions.forEach((option) => {
      option.classList.toggle('active', option === targetLabel);
    });
  };

  const updateSummary = () => {
    const checkedRadio = document.querySelector('input[name="renewDuration"]:checked');
    if (!checkedRadio) {
      summaryEl.textContent = 'Select a duration to see your total.';
      return null;
    }
    const months = Number(checkedRadio.value);
    const discount = (discounts[months] || 0) * 100;
    const total = computeDiscountedTotal(planData.monthlyPrice, months);
    const discountNote = discount > 0 ? `after ${discount}% discount` : 'at standard rate';
    summaryEl.textContent = `${months} month${months === 1 ? '' : 's'} • ${formatCurrency(total, planData.currency)} ${discountNote}`;
    return { months, total };
  };

  const toggleButtonLoading = (isLoading) => {
    if (!renewButton) return;
    renewButton.disabled = isLoading;
    renewButton.textContent = isLoading ? 'Processing…' : 'Renew Now';
  };

  const handlePaystack = ({ amount, duration }) => {
    if (typeof amount !== 'number' || amount <= 0) {
      window.location.href = 'plan-failed.php';
      return;
    }

    const email = planData.contactEmail || 'vendor@yustam.test';
    const vendorName = planData.vendorName || planData.planName || 'YUSTAM Vendor';

    if (window.PaystackPop && typeof window.PaystackPop.setup === 'function') {
      const handler = window.PaystackPop.setup({
        key: PAYSTACK_PUBLIC_KEY,
        email,
        amount: amount * 100,
        currency: planData.currency || 'NGN',
        ref: `YUSTAM-${Date.now()}`,
        metadata: {
          custom_fields: [
            { display_name: 'Vendor', variable_name: 'vendor_name', value: vendorName },
            { display_name: 'Plan', variable_name: 'plan_name', value: planData.planName },
            { display_name: 'Duration', variable_name: 'duration_months', value: duration },
          ],
        },
        callback: (response) => {
          console.log('Paystack callback', response);
          window.location.href = `plan-success.php?reference=${encodeURIComponent(response.reference)}`;
        },
        onClose: () => {
          window.location.href = 'plan-failed.php';
        },
      });
      handler.openIframe();
    } else {
      console.warn('Paystack library not available, simulating success.');
      setTimeout(() => {
        window.location.href = 'plan-success.php';
      }, 600);
    }
  };

  durationOptions.forEach((option) => {
    option.addEventListener('click', (event) => {
      const label = event.currentTarget;
      const radio = label.querySelector('input[type="radio"]');
      if (radio) {
        radio.checked = true;
        setActiveOption(label);
        updateSummary();
      }
    });
  });

  durationOptions.forEach((option) => {
    const radio = option.querySelector('input[type="radio"]');
    if (!radio) return;
    radio.addEventListener('change', (event) => {
      if (event.target.checked) {
        setActiveOption(option);
        updateSummary();
      }
    });
  });

  if (renewButton) {
    renewButton.addEventListener('click', () => {
      const details = updateSummary();
      if (!details) {
        summaryEl.textContent = 'Please select a renewal duration before continuing.';
        return;
      }
      toggleButtonLoading(true);
      handlePaystack({ amount: details.total, duration: details.months });
      setTimeout(() => toggleButtonLoading(false), 1200);
    });
  }

  if (logoArea) {
    logoArea.addEventListener('click', () => {
      window.location.href = '/index.html';
    });
    logoArea.addEventListener('keypress', (event) => {
      if (event.key === 'Enter') {
        window.location.href = '/index.html';
      }
    });
  }

  fetch(planEndpoint, { headers: { Accept: 'application/json' } })
    .then((response) => {
      if (!response.ok) throw new Error('Failed to load plan details');
      return response.json();
    })
    .then((payload) => {
      if (!payload || !payload.success || !payload.data) throw new Error('Invalid plan payload');
      planData = { ...planData, ...payload.data };
      updatePlanSummary(planData);
      updateDurationPrices();
      updateSummary();
    })
    .catch((error) => {
      console.error(error);
      if (planExpiryTextEl) {
        planExpiryTextEl.textContent = 'We could not load your current plan. Try refreshing the page.';
      }
      updateDurationPrices();
      updateSummary();
    });
});
