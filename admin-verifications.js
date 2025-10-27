const container = document.getElementById('verificationsContainer');
const emptyState = document.getElementById('emptyState');
const totalBadge = document.getElementById('totalBadge');
const modal = document.getElementById('verificationModal');
const modalBody = document.getElementById('modalBody');
const modalFeedback = document.getElementById('modalFeedback');
const modalClose = document.getElementById('modalClose');
const modalApprove = document.getElementById('modalApprove');
const modalReject = document.getElementById('modalReject');
const toast = document.getElementById('toast');
const sidebar = document.getElementById('sidebar');
const menuToggle = document.getElementById('menuToggle');
const logoutBtn = document.getElementById('logoutBtn');

const state = {
  records: [],
  selectedId: null,
  trackingAvailable: true,
};
const defaultEmptyStateMarkup = emptyState ? emptyState.innerHTML : '';

const statusClass = (status = '') => {
  const value = status.toLowerCase();
  if (value === 'approved') return 'status-chip status-approved';
  if (value === 'rejected') return 'status-chip status-rejected';
  return 'status-chip status-pending';
};

const formatDate = (value) => {
  if (!value) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' });
};

const escapeHtml = (value) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

const showToast = (message, duration = 2600) => {
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => {
    toast.classList.remove('show');
  }, duration);
};

const toggleModal = (visible) => {
  if (!modal) return;
  modal.classList.toggle('active', Boolean(visible));
  if (!visible) {
    state.selectedId = null;
    modalBody.innerHTML = '';
    modalFeedback.value = '';
  }
};

const renderRecords = () => {
  if (!container) return;
  container.innerHTML = '';

  const total = state.records.length;
  totalBadge.textContent = `${total} ${total === 1 ? 'request' : 'requests'}`;

  if (!total) {
    if (emptyState && defaultEmptyStateMarkup) {
      if (!state.trackingAvailable) {
        emptyState.innerHTML = `
          <i class="ri-shield-check-line" aria-hidden="true"></i>
          <strong>Verification tracking unavailable.</strong><br>
          Update the vendors table columns to review submissions.
        `;
        emptyState.dataset.state = 'tracking-disabled';
      } else if (emptyState.dataset.state === 'tracking-disabled') {
        emptyState.innerHTML = defaultEmptyStateMarkup;
        delete emptyState.dataset.state;
      }
      emptyState.hidden = false;
    }
    return;
  }
  if (emptyState) {
    emptyState.hidden = true;
    if (emptyState.dataset.state === 'tracking-disabled') {
      emptyState.innerHTML = defaultEmptyStateMarkup;
      delete emptyState.dataset.state;
    }
  }

  state.records.forEach((record) => {
    const row = document.createElement('article');
    row.className = 'verif-row';
    row.dataset.id = record.id;
    row.innerHTML = `
      <div class="verif-meta">
        <strong>${escapeHtml(record.business_name || 'Unknown vendor')}</strong>
        <div class="meta-line"><i class="ri-mail-line"></i> ${escapeHtml(record.email || 'No email')}</div>
        <div class="meta-line"><i class="ri-phone-line"></i> ${escapeHtml(record.phone || 'No phone')}</div>
        <div class="meta-line"><i class="ri-map-pin-line"></i> ${escapeHtml(record.state || 'No state')}</div>
        <div class="meta-line">Submitted: ${escapeHtml(formatDate(record.submitted_at))}</div>
        <span class="${statusClass(record.status)}">${escapeHtml(record.status || 'pending')}</span>
      </div>
      <div class="verif-actions">
        <button class="btn btn-view" data-action="view" data-id="${record.id}"><i class="ri-eye-line"></i> View</button>
        <button class="btn btn-approve" data-action="approve" data-id="${record.id}"><i class="ri-shield-check-line"></i> Approve</button>
        <button class="btn btn-reject" data-action="reject" data-id="${record.id}"><i class="ri-close-circle-line"></i> Reject</button>
      </div>
    `;
    container.appendChild(row);
  });
};

const upsertRecord = (updated) => {
  const index = state.records.findIndex((item) => item.id === updated.id);
  if (index >= 0) {
    state.records[index] = updated;
  } else {
    state.records.unshift(updated);
  }
  renderRecords();
};

const removeRecord = (id) => {
  state.records = state.records.filter((record) => record.id !== id);
  renderRecords();
};

const fetchVerifications = async () => {
  try {
    const response = await fetch('admin-verifications.php?format=json', { credentials: 'same-origin' });
    if (!response.ok) throw new Error('Unable to load verification requests.');
    const payload = await response.json();
    if (!payload.success || !Array.isArray(payload.data)) {
      throw new Error(payload.message || 'Unable to load verification requests.');
    }
    const wasTrackingAvailable = state.trackingAvailable;
    state.trackingAvailable = !(payload?.meta && payload.meta.trackingAvailable === false);
    state.records = payload.data;
    renderRecords();
    if (wasTrackingAvailable && !state.trackingAvailable) {
      showToast('Vendor verification tracking is not configured.');
    }
  } catch (error) {
    console.error('Admin verification load error', error);
    showToast(error.message || 'Unable to load verification requests.');
  }
};

const fetchDetail = async (id) => {
  const response = await fetch(`admin-verifications.php?format=json&detail=${id}`, { credentials: 'same-origin' });
  if (!response.ok) throw new Error('Unable to load verification details.');
  const payload = await response.json();
  if (!payload.success || !payload.data) throw new Error(payload.message || 'Verification details unavailable.');
  return payload.data;
};

const submitAction = async (id, action, feedback = '') => {
  const response = await fetch('admin-verifications.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify({ id, action, feedback }),
  });
  const payload = await response.json();
  if (!response.ok || !payload.success) {
    throw new Error(payload.message || 'Unable to update verification.');
  }
  return payload.data;
};

const renderDetail = (record) => {
  const filesMarkup = Array.isArray(record.files) && record.files.length
    ? record.files.map((file, index) => {
        const name = typeof file.name === 'string' && file.name.trim() ? file.name.trim() : `File ${index + 1}`;
        const url = typeof file.url === 'string' ? file.url : '#';
        return `<a class="file-link" href="${escapeHtml(url)}" target="_blank" rel="noopener">${escapeHtml(name)}</a>`;
      }).join('')
    : '<span>No supporting documents supplied.</span>';

  modalBody.innerHTML = `
    <div><strong>Business:</strong> ${escapeHtml(record.business_name || 'Unknown')}</div>
    <div><strong>Email:</strong> ${escapeHtml(record.email || '—')}</div>
    <div><strong>Phone:</strong> ${escapeHtml(record.phone || '—')}</div>
    <div><strong>State:</strong> ${escapeHtml(record.state || '—')}</div>
    <div><strong>Status:</strong> ${escapeHtml(record.status || 'pending')}</div>
    <div><strong>Submitted:</strong> ${escapeHtml(formatDate(record.submitted_at))}</div>
    <div><strong>Reviewed:</strong> ${escapeHtml(formatDate(record.reviewed_at))}</div>
    <div><strong>Reviewer ID:</strong> ${record.reviewer_id ? escapeHtml(String(record.reviewer_id)) : '—'}</div>
    <div><strong>Plan Level:</strong> ${escapeHtml(record.plan_level || '—')}</div>
    <div><strong>Documents:</strong><div class="file-list">${filesMarkup}</div></div>
    <div><strong>Admin Feedback:</strong> ${escapeHtml(record.feedback || '—')}</div>
  `;
  modalFeedback.value = record.feedback || '';
};

const handleCardAction = async (action, id) => {
  if (action === 'view') {
    try {
      const detail = await fetchDetail(id);
      state.selectedId = id;
      renderDetail(detail);
      toggleModal(true);
    } catch (error) {
      console.error('Admin verification detail error', error);
      showToast(error.message || 'Unable to open verification.');
    }
    return;
  }

  try {
    const updated = await submitAction(id, action);
    upsertRecord(updated);
    showToast(action === 'approve' ? 'Verification approved.' : 'Verification rejected.');
  } catch (error) {
    console.error('Admin verification action error', error);
    showToast(error.message || 'Unable to update verification.');
  }
};

const initializeEvents = () => {
  if (menuToggle) {
    menuToggle.addEventListener('click', () => {
      sidebar?.classList.toggle('active');
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      window.location.href = 'admin-logout.php';
    });
  }

  container?.addEventListener('click', (event) => {
    const target = event.target.closest('button[data-action]');
    if (!target) return;
    const action = target.dataset.action;
    const id = Number(target.dataset.id);
    if (!id) return;
    handleCardAction(action, id);
  });

  modalClose?.addEventListener('click', () => toggleModal(false));
  modal?.addEventListener('click', (event) => {
    if (event.target === modal) {
      toggleModal(false);
    }
  });

  modalApprove?.addEventListener('click', async () => {
    if (!state.selectedId) return;
    try {
      const updated = await submitAction(state.selectedId, 'approve', modalFeedback.value.trim());
      upsertRecord(updated);
      toggleModal(false);
      showToast('Verification approved.');
    } catch (error) {
      console.error('Approve verification error', error);
      showToast(error.message || 'Unable to approve verification.');
    }
  });

  modalReject?.addEventListener('click', async () => {
    if (!state.selectedId) return;
    try {
      const updated = await submitAction(state.selectedId, 'reject', modalFeedback.value.trim());
      upsertRecord(updated);
      toggleModal(false);
      showToast('Verification rejected.');
    } catch (error) {
      console.error('Reject verification error', error);
      showToast(error.message || 'Unable to reject verification.');
    }
  });
};

initializeEvents();
fetchVerifications();
