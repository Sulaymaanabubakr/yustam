// YUSTAM | Vendor Plans Interactions

document.addEventListener('DOMContentLoaded', () => {
  const planCards = Array.from(document.querySelectorAll('.plan-card'));
  const durationSelects = document.querySelectorAll('.planDuration');
  const payButtons = document.querySelectorAll('.payBtn');
  const currentPlanName = document.getElementById('currentPlanName');
  const currentPlanStatus = document.getElementById('currentPlanStatus');
  const currentPlanExpiry = document.getElementById('currentPlanExpiry');

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

  const currentPlan = { name: 'Starter', status: 'Active', expiry: '2026-01-10' };
  const discounts = {
    1: 0,
    3: 0.05,
    6: 0.1,
    12: 0.15,
  };

  const paystackKey = 'pk_test_xxxxxxxxxxxxxx';

  const initiatePaystack = (planName, amount, duration) => {
    console.log('Initialising Paystack with key', paystackKey);
    console.log(`Proceeding to pay ₦${amount.toLocaleString('en-NG')} for ${planName} (${duration} month plan)`);
  };

  const formatCurrency = (value) => `₦${Number(value).toLocaleString('en-NG')}`;

  const updateCurrentPlanCard = () => {
    if (currentPlanName) currentPlanName.textContent = currentPlan.name;
    if (currentPlanStatus) currentPlanStatus.textContent = currentPlan.status;
    if (currentPlanExpiry) currentPlanExpiry.textContent = currentPlan.expiry;
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
    const duration = durationSelect ? durationSelect.value : 1;
    const total = calculateTotal(price, duration);
    if (totalDisplay) {
      totalDisplay.textContent = `Total: ${formatCurrency(total)}${Number(duration) > 1 ? ' after discount' : ''}`;
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

  planCards.forEach((card) => {
    const upgradeButton = card.querySelector('.cta-button');
    if (upgradeButton) {
      upgradeButton.addEventListener('click', () => {
        highlightCard(card);
        updateTotalDisplay(card);
      });
    }
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
