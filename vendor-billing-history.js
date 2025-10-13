// YUSTAM | Vendor Billing History Interactions

document.addEventListener('DOMContentLoaded', () => {
  const loader = document.getElementById('billingLoader');
  const recordsContainer = document.getElementById('billingRecords');
  const emptyState = document.getElementById('billingEmpty');
  const logoArea = document.querySelector('.header-left');

  const navigateHome = () => {
    window.location.href = 'index.html';
  };

  if (logoArea) {
    logoArea.addEventListener('click', navigateHome);
    logoArea.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        navigateHome();
      }
    });
  }

  const formatCurrency = (amount) => {
    if (!Number.isFinite(Number(amount))) {
      return '₦0';
    }
    return `₦${Number(amount).toLocaleString('en-NG')}`;
  };

  const createCell = (tagName, value, label) => {
    const element = document.createElement(tagName);
    element.textContent = value ?? '—';
    element.dataset.label = label;
    return element;
  };

  const createStatusPill = (status) => {
    const pill = document.createElement('span');
    pill.className = 'status-pill';
    pill.dataset.label = 'Status';
    const icon = document.createElement('i');
    const normalised = String(status).toLowerCase();
    const isSuccess = normalised === 'success' || normalised === 'completed';
    const statusText = isSuccess
      ? 'Success'
      : status
      ? `${status}`.charAt(0).toUpperCase() + `${status}`.slice(1).toLowerCase()
      : 'Failed';

    if (isSuccess) {
      icon.className = 'ri-checkbox-circle-line';
      pill.append(icon, document.createTextNode(` ${statusText}`));
    } else {
      pill.classList.add('failed');
      icon.className = 'ri-close-circle-line';
      pill.append(icon, document.createTextNode(` ${statusText}`));
    }
    return pill;
  };

  const createReceiptButton = (reference) => {
    const button = document.createElement('button');
    button.className = 'receipt-btn receipt-cell';
    button.type = 'button';
    button.dataset.label = 'Receipt';
    button.innerHTML = '<i class="ri-file-list-3-line"></i> View Receipt';
    button.addEventListener('click', () => {
      window.alert(`Receipt viewer coming soon. Payment reference: ${reference}`);
    });
    return button;
  };

  const renderRecords = (records) => {
    recordsContainer.innerHTML = '';
    records.forEach((record) => {
      const row = document.createElement('div');
      row.className = 'billing-row';

      const dateCell = createCell('span', record.datePaid, 'Date Paid');
      const planCell = createCell('span', record.plan, 'Plan');
      const durationCell = createCell('span', record.duration, 'Duration');
      const amountCell = createCell('span', formatCurrency(record.amount), 'Amount (₦)');
      amountCell.classList.add('amount-text');
      const refCell = createCell('span', record.paymentRef, 'Payment Ref');
      const statusCell = createStatusPill(record.status);
      statusCell.classList.add('status-cell');
      const receiptButton = createReceiptButton(record.paymentRef);

      row.append(dateCell, planCell, durationCell, amountCell, refCell, statusCell, receiptButton);
      recordsContainer.appendChild(row);
    });
  };

  const showLoader = (isVisible) => {
    if (!loader) return;
    loader.style.display = isVisible ? 'flex' : 'none';
  };

  const fetchBillingHistory = async () => {
    showLoader(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 850));

      const response = await Promise.resolve({
        ok: true,
        json: async () => [
          {
            datePaid: '2025-02-14',
            plan: 'Power Vendor Plan',
            duration: '12 months',
            amount: 150000,
            paymentRef: 'YTM-POW-991245',
            status: 'Success',
          },
          {
            datePaid: '2024-11-02',
            plan: 'Elite Seller Plan',
            duration: '6 months',
            amount: 48000,
            paymentRef: 'YTM-ELT-882341',
            status: 'Success',
          },
          {
            datePaid: '2024-08-01',
            plan: 'Pro Seller Plan',
            duration: '3 months',
            amount: 15000,
            paymentRef: 'YTM-PRO-771562',
            status: 'Failed',
          },
          {
            datePaid: '2024-04-14',
            plan: 'Pro Seller Plan',
            duration: '3 months',
            amount: 15000,
            paymentRef: 'YTM-PRO-663002',
            status: 'Success',
          },
        ],
      });

      if (!response.ok) {
        throw new Error('Unable to load billing history.');
      }

      const data = await response.json();

      const sortedData = Array.isArray(data)
        ? data.sort((a, b) => new Date(b.datePaid) - new Date(a.datePaid))
        : [];

      if (sortedData.length === 0) {
        emptyState.hidden = false;
        recordsContainer.innerHTML = '';
      } else {
        emptyState.hidden = true;
        renderRecords(sortedData);
      }
    } catch (error) {
      emptyState.hidden = false;
      emptyState.textContent = error.message || 'Could not load billing history right now.';
      recordsContainer.innerHTML = '';
    } finally {
      showLoader(false);
    }
  };

  fetchBillingHistory();
});
