// vendor-plans.js  (PHP-only, no Firebase)

const loadingState = document.getElementById('loadingState');
const plansContent = document.getElementById('plansContent');

const backBtn = document.getElementById('backBtn');
const logoutBtn = document.getElementById('logoutBtn');

const plansGrid = document.getElementById('plansGrid');

const toast = document.getElementById('toast');

const upgradeModal = document.getElementById('upgradeModal');
const modalTitle = document.getElementById('modalTitle');
const modalDescription = document.getElementById('modalDescription');
const cancelUpgradeBtn = document.getElementById('cancelUpgradeBtn');
const confirmUpgradeBtn = document.getElementById('confirmUpgradeBtn');

const currentPlanName = document.getElementById('currentPlanName');
const currentPlanDescription = document.getElementById('currentPlanDescription');
const currentPlanMeta = document.getElementById('currentPlanMeta');
const planStatusChip = document.getElementById('planStatusChip');
const currentPlanCard = document.getElementById('currentPlanCard');

let selectedPlan = null;

// ---------- Helpers ----------
const showToast = (message) => {
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2600);
};

const toggleLoader = (show) => {
  if (!loadingState) return;
  loadingState.classList.toggle('hidden', !show);
};

const toggleContent = (show) => {
  if (!plansContent) return;
  plansContent.hidden = !show;
};

const toggleModal = (open = false) => {
  if (!upgradeModal) return;
  upgradeModal.classList.toggle('active', open);
  upgradeModal.setAttribute('aria-hidden', open ? 'false' : 'true');
};

const naira = (n) =>
  `₦${Number(n || 0).toLocaleString('en-NG', { maximumFractionDigits: 0 })}`;

// ---------- UI Builders ----------
const buildFeatureList = (features = []) =>
  features
    .map(
      (f) => `
      <li>
        <i class="ri-checkbox-circle-line" aria-hidden="true"></i>
        <span>${f}</span>
      </li>`
    )
    .join('');

const renderPlans = (activePlanName, availablePlans = []) => {
  plansGrid.innerHTML = '';

  // Fallback demo plans if backend didn't provide any
  const fallbackPlans = [
    { name: 'Free', price: 0, features: ['Basic listing', 'Unlimited access'] },
    { name: 'Boosted', price: 3000, features: ['Homepage placement', 'Extra visibility'] },
    { name: 'Premium', price: 8000, features: ['Featured spots', 'Priority support'] },
  ];

  const plans = Array.isArray(availablePlans) && availablePlans.length ? availablePlans : fallbackPlans;

  plans.forEach((p) => {
    const isCurrent = (p.name || '').toLowerCase() === (activePlanName || 'Free').toLowerCase();

    const card = document.createElement('article');
    card.className = `plan-card ${isCurrent ? 'current' : ''}`;
    card.setAttribute('role', 'listitem');
    card.dataset.plan = p.name;

    const priceLabel = `${naira(p.price)} / month`;

    card.innerHTML = `
      ${isCurrent ? '<span class="badge-current">Current Plan</span>' : ''}
      <h3>${p.name}</h3>
      <p class="plan-price">${priceLabel}</p>
      <ul class="plan-features">${buildFeatureList(p.features || [])}</ul>
      <button class="btn ${isCurrent ? 'btn-outline' : 'btn-orange'}"
              data-plan="${p.name}" data-amount="${p.price}"
              ${isCurrent ? 'disabled' : ''}>
        ${isCurrent ? 'Current Plan' : `Upgrade to ${p.name}`}
      </button>
    `;

    plansGrid.appendChild(card);
  });

  // Attach button listeners
  plansGrid.querySelectorAll('button[data-plan]').forEach((btn) => {
    btn.addEventListener('click', () => {
      selectedPlan = btn.dataset.plan;
      prepareUpgradeModal(selectedPlan, btn.dataset.amount);
      toggleModal(true);
    });
  });
};

const updateCurrentPlanSection = ({ currentPlan = 'Free', expiresAt = null, status = 'Active' }) => {
  const descriptionMap = {
    Free: 'Get started with essential tools to sell confidently on YUSTAM Marketplace.',
    Boosted: 'Gain more visibility with homepage placement and extra promotion.',
    Premium: 'Unlock featured spots and priority support to maximise sales.',
  };

  const normalized = descriptionMap[currentPlan] ? currentPlan : 'Free';

  currentPlanName.textContent = `${normalized} Plan`;
  currentPlanDescription.textContent = descriptionMap[normalized];

  if (expiresAt) {
    const dt = new Date(expiresAt);
    currentPlanMeta.textContent = `Renews on ${dt.toLocaleDateString('en-NG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })}`;
  } else {
    currentPlanMeta.textContent = normalized === 'Free' ? 'Unlimited access · No expiry set' : 'Active · Monthly renewal';
  }

  const isExpired = (status || '').toLowerCase() === 'expired';
  planStatusChip.innerHTML = `
    <i class="${isExpired ? 'ri-alarm-warning-line' : 'ri-shield-check-line'}" aria-hidden="true"></i>
    ${isExpired ? 'Expired Plan' : 'Active Plan'}
  `;
  planStatusChip.classList.toggle('expired', isExpired);

  currentPlanCard.dataset.plan = normalized;
};

const prepareUpgradeModal = (planName, amount) => {
  const label = `${naira(amount)} / month`;
  modalTitle.textContent = 'Confirm Upgrade';
  modalDescription.textContent = `You’re about to upgrade to the ${planName} plan for ${label}.`;
  confirmUpgradeBtn.textContent = `Proceed · ${label}`;
};

// ---------- Data Flow ----------
const fetchPlans = async () => {
  const res = await fetch('vendor-plans.php?format=json', {
    headers: { Accept: 'application/json' },
    credentials: 'same-origin',
  });

  if (res.status === 401) {
    // not signed in
    window.location.href = 'vendor-login.html';
    return null;
  }

  let data;
  try {
    data = await res.json();
  } catch {
    throw new Error('Invalid response while loading plans.');
  }

  if (!res.ok || data.success !== true) {
    throw new Error(data.message || 'Unable to load plans.');
  }

  return data.data || {};
};

const startPayment = async (planName) => {
  const form = new FormData();
  form.append('plan', planName);

  const res = await fetch('create-payment.php', {
    method: 'POST',
    body: form,
    credentials: 'same-origin',
  });

  let data;
  try {
    data = await res.json();
  } catch {
    throw new Error('Unable to start payment.');
  }

  if (!res.ok || data.success !== true || !data.auth_url) {
    throw new Error(data.message || 'Unable to start payment.');
  }

  window.location.href = data.auth_url;
};

// ---------- Event wiring ----------
backBtn?.addEventListener('click', () => {
  window.location.href = 'vendor-dashboard.php';
});

logoutBtn?.addEventListener('click', () => {
  window.location.href = 'logout.php';
});

cancelUpgradeBtn?.addEventListener('click', () => {
  selectedPlan = null;
  toggleModal(false);
});

upgradeModal?.addEventListener('click', (e) => {
  if (e.target === upgradeModal) {
    selectedPlan = null;
    toggleModal(false);
  }
});

confirmUpgradeBtn?.addEventListener('click', async () => {
  if (!selectedPlan) return;
  confirmUpgradeBtn.disabled = true;
  confirmUpgradeBtn.innerHTML = '<i class="ri-loader-4-line" aria-hidden="true"></i> Redirecting…';

  try {
    await startPayment(selectedPlan);
  } catch (err) {
    console.error(err);
    showToast(err.message || 'Something went wrong. Try again.');
    confirmUpgradeBtn.disabled = false;
    confirmUpgradeBtn.textContent = 'Proceed';
    toggleModal(false);
  }
});

// ---------- Init ----------
(async function init() {
  // Handle return from Paystack
  const qp = new URLSearchParams(window.location.search);
  const status = qp.get('status');
  const plan = qp.get('plan');

  if (status === 'success') {
    showToast(`Payment successful! You’ve upgraded to ${plan || 'your new'} plan.`);
  } else if (status === 'failed') {
    showToast('Payment failed or was cancelled.');
  }

  try {
    toggleLoader(true);
    toggleContent(false);

    const data = await fetchPlans();
    if (!data) return; // redirected

    // data format expected from vendor-plans.php:
    // {
    //   currentPlan: "Free",
    //   expiresAt: null,
    //   availablePlans: [{name, price, features: []}]
    // }

    updateCurrentPlanSection({
      currentPlan: data.currentPlan || 'Free',
      expiresAt: data.expiresAt || null,
      status: data.status || 'Active',
    });

    renderPlans(data.currentPlan || 'Free', data.availablePlans || []);
    toggleContent(true);
  } catch (err) {
    console.error(err);
    showToast(err.message || 'Unable to load plans.');
  } finally {
    toggleLoader(false);
  }
})();
