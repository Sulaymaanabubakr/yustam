// YUSTAM | Vendor Plans Interactions

document.addEventListener('DOMContentLoaded', () => {
  const planCards = Array.from(document.querySelectorAll('.plan-card'));
  const durationSelects = document.querySelectorAll('.planDuration');
  const payButtons = document.querySelectorAll('.payBtn');
  const currentPlanName = document.getElementById('currentPlanName');
  const currentPlanStatus = document.getElementById('currentPlanStatus');
  const currentPlanExpiry = document.getElementById('currentPlanExpiry');

  const pageData = window.YUSTAM_VENDOR_PLAN || {};
  const vendorProfile = pageData.vendor || {};
  const currentPlanSource = pageData.currentPlan || {};
  const currentPlan = {
    name: currentPlanSource.name || 'Free',
    status: currentPlanSource.status || 'Active',
    expiryIso: currentPlanSource.expiryIso || '',
    expiryDisplay: currentPlanSource.expiryDisplay || '',
  };

  const logoArea = document.querySelector('.logo-area');
  if (logoArea) {
    logoArea.addEventListener('click', () => {
      window.location.href = '/index.html';
    });
  }

  const notifIcon = document.querySelector('.notif-icon');
  if (notifIcon) {
    notifIcon.addEventListener('click', (event) => {
      event.preventDefault();
      window.location.href = 'vendor-notifications.php';
    });
  }

  const rawDiscounts = pageData.discounts || {};
  const discounts = {
    1: Number(rawDiscounts['1'] ?? 0),
    3: Number(rawDiscounts['3'] ?? 0.07),
    6: Number(rawDiscounts['6'] ?? 0.12),
    12: Number(rawDiscounts['12'] ?? 0.17),
  };

  const paystackKey = pageData.paystackKey || '';

  const formatCurrency = (value) => `₦${Number(value || 0).toLocaleString('en-NG')}`;

  const resolveExpiryLabel = () => {
    if (currentPlan.expiryDisplay) return currentPlan.expiryDisplay;
    if (!currentPlan.expiryIso) return '--';
    const parsedDate = new Date(currentPlan.expiryIso);
    if (Number.isNaN(parsedDate.getTime())) return '--';
    return parsedDate.toLocaleDateString('en-NG', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const updateCurrentPlanCard = () => {
    if (currentPlanName) currentPlanName.textContent = currentPlan.name || 'Free';
    if (currentPlanStatus) currentPlanStatus.textContent = currentPlan.status || 'Active';
    if (currentPlanExpiry) currentPlanExpiry.textContent = resolveExpiryLabel();
  };

  const initiatePaystack = (planName, amount, duration) => {
    if (!paystackKey) {
      console.error('Missing Paystack public key. Cannot continue with checkout.');
      alert('Payments are temporarily unavailable. Please try again shortly.');
      return;
    }
    if (typeof amount !== 'number' || amount <= 0) {
      console.warn('Invalid amount for Paystack checkout:', amount);
      alert('Select a plan duration to continue with your upgrade.');
      return;
    }
    if (!window.PaystackPop || typeof window.PaystackPop.setup !== 'function') {
      console.warn('Paystack library is not ready yet.');
      alert('Unable to connect to Paystack. Please refresh this page and try again.');
      return;
    }
    const email = vendorProfile.email || 'vendor@yustam.test';
    const vendorName = vendorProfile.businessName || vendorProfile.name || 'YUSTAM Vendor';

    const handler = window.PaystackPop.setup({
      key: paystackKey,
      email,
      amount: Math.round(amount) * 100,
      currency: 'NGN',
      ref: `YUSTAM-${Date.now()}`,
      metadata: {
        custom_fields: [
          { display_name: 'Vendor', variable_name: 'vendor_name', value: vendorName },
          { display_name: 'Plan', variable_name: 'plan_name', value: planName },
          { display_name: 'Duration', variable_name: 'duration_months', value: duration },
        ],
      },
      callback: (response) => {
        const params = new URLSearchParams({
          reference: response.reference,
          plan: planName,
          amount: amount.toString(),
          duration: duration.toString(),
        });
        window.location.href = `plan-success.php?${params.toString()}`;
      },
      onClose: () => {
        window.location.href = 'plan-failed.php';
      },
    });

    handler.openIframe();
  };

  const calculateTotal = (monthlyPrice, duration) => {
    const pricePerMonth = Number(monthlyPrice) || 0;
    const months = Number(duration) || 1;
    const discountRate = discounts[months] || 0;
    const gross = pricePerMonth * months;
    const net = gross - gross * discountRate;
    return Math.round(net);
  };

  const highlightCard = (selectedCard) => {
    planCards.forEach((card) => {
      card.classList.toggle('selected', card === selectedCard);
    });
  };

  const updateTotalDisplay = (card) => {
    const durationSelect = card.querySelector('.planDuration');
    const totalDisplay = card.querySelector('.total-display');
    const price = card.dataset.price || 0;
    const duration = durationSelect ? Number(durationSelect.value) : 1;
    const total = calculateTotal(price, duration);
    if (totalDisplay) {
      const discountRate = discounts[duration] || 0;
      const discountSuffix = discountRate > 0 ? ` after ${Math.round(discountRate * 100)}% discount` : '';
      totalDisplay.textContent = `Total: ${formatCurrency(total)}${discountSuffix}`;
    }
    return { total, duration };
  };

  durationSelects.forEach((select) => {
    select.addEventListener('change', (event) => {
      const parentCard = event.target.closest('.plan-card');
      if (!parentCard) return;
      updateTotalDisplay(parentCard);
    });
  });

  payButtons.forEach((button) => {
    button.addEventListener('click', (event) => {
      const card = event.currentTarget.closest('.plan-card');
      if (!card) return;
      highlightCard(card);
      const { total, duration } = updateTotalDisplay(card);
      const planName = card.dataset.plan || 'Plan';
      initiatePaystack(planName, total, duration);
    });
  });

  planCards.forEach((card) => updateTotalDisplay(card));
  updateCurrentPlanCard();
});
