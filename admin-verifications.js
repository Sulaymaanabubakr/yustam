const container = document.getElementById('verificationsContainer');
const emptyState = document.getElementById('emptyState');
const totalBadge = document.getElementById('totalBadge');
const detailView = document.getElementById('detailView');
const detailBody = document.getElementById('detailBody');
const detailFiles = document.getElementById('detailFiles');
const detailFeedback = document.getElementById('detailFeedback');
const detailBack = document.getElementById('detailBack');
const detailApprove = document.getElementById('detailApprove');
const detailReject = document.getElementById('detailReject');
const detailStatus = document.getElementById('detailStatus');
const detailTitle = document.getElementById('detailTitle');
const detailMeta = document.getElementById('detailMeta');
const toast = document.getElementById('toast');
const sidebar = document.getElementById('sidebar');
const menuToggle = document.getElementById('menuToggle');
const logoutBtn = document.getElementById('logoutBtn');

const state = {
  records: [],
  selectedId: null,
  selectedRequestId: null,
  trackingAvailable: true,
  requestTracking: false,
};
const defaultEmptyStateMarkup = emptyState ? emptyState.innerHTML : '';
const findRecordById = (id) => state.records.find((item) => item.id === id);
const ACTION_LOCKED_STATUSES = new Set(['verified', 'approved', 'active', 'complete', 'completed', 'rejected', 'declined', 'failed']);
const formatStatusLabel = (value = '') => {
  const normalised = String(value || '').trim();
  if (!normalised) return 'Pending';
  return normalised
    .replace(/[_-]+/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};
const parseTimestamp = (value) => {
  if (!value) return 0;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime();
};
const getRecordOrderValue = (record = {}) => {
  const submitted = parseTimestamp(record.submitted_at || record.created_at);
  if (submitted) return submitted;
  const reviewed = parseTimestamp(record.reviewed_at);
  if (reviewed) return reviewed;
  return (record.request_id && Number(record.request_id)) || (record.id && Number(record.id)) || 0;
};
const sortRecords = (records = []) => records
  .slice()
  .sort((a, b) => {
    const diff = getRecordOrderValue(b) - getRecordOrderValue(a);
    if (diff !== 0) return diff;
    return (Number(b.request_id || b.id || 0)) - (Number(a.request_id || a.id || 0));
  });

const statusClass = (status = '') => {
  const value = status.toLowerCase();
  if (['approved', 'verified', 'active', 'complete', 'completed'].includes(value)) {
    return 'status-chip status-approved';
  }
  if (['rejected', 'declined', 'failed'].includes(value)) {
    return 'status-chip status-rejected';
  }
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

const toggleDetail = (visible) => {
  if (!detailView) return;
  const isVisible = Boolean(visible);
  detailView.classList.toggle('active', isVisible);
  detailView.hidden = !isVisible;
  detailView.setAttribute('aria-hidden', String(!isVisible));
  document.body.style.overflow = isVisible ? 'hidden' : '';
  if (isVisible) {
    setTimeout(() => {
      detailBack?.focus();
    }, 0);
  }

  if (!isVisible) {
    state.selectedId = null;
    state.selectedRequestId = null;
    if (detailBody) detailBody.innerHTML = '';
    if (detailFiles) detailFiles.innerHTML = '';
    if (detailMeta) detailMeta.innerHTML = '';
    if (detailStatus) detailStatus.className = 'status-chip';
    if (detailStatus) detailStatus.textContent = '';
    if (detailTitle) detailTitle.textContent = 'Verification Request';
    if (detailFeedback) detailFeedback.value = '';
    if (detailFeedback) detailFeedback.readOnly = false;
    if (detailFeedback) detailFeedback.classList.remove('is-readonly');
    if (detailApprove) detailApprove.disabled = false;
    if (detailReject) detailReject.disabled = false;
  }
};

const renderRecords = () => {
  if (!container) return;
  container.innerHTML = '';

  const total = state.records.length;
  totalBadge.textContent = `${total} ${total === 1 ? 'request' : 'requests'}`;

  if (!total) {
    if (emptyState && defaultEmptyStateMarkup) {
      if (!state.trackingAvailable && !state.requestTracking) {
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
    const rawStatus = record.status || record.status_normalised || 'pending';
    const statusNormalised = (record.status_normalised || rawStatus || '').toLowerCase();
    const actionsDisabled = ACTION_LOCKED_STATUSES.has(statusNormalised);
    row.dataset.status = statusNormalised;
    if (record.request_id) {
      row.dataset.requestId = record.request_id;
    } else {
      delete row.dataset.requestId;
    }
    const approveDisabledAttr = actionsDisabled ? ' disabled' : '';
    const rejectDisabledAttr = actionsDisabled ? ' disabled' : '';
    const statusLabel = formatStatusLabel(rawStatus);
    row.innerHTML = `
      <div class="verif-meta">
        <strong>${escapeHtml(record.business_name || 'Unknown vendor')}</strong>
        <div class="meta-line"><i class="ri-mail-line"></i> ${escapeHtml(record.email || 'No email')}</div>
        <div class="meta-line"><i class="ri-phone-line"></i> ${escapeHtml(record.phone || 'No phone')}</div>
        <div class="meta-line"><i class="ri-map-pin-line"></i> ${escapeHtml(record.state || 'No state')}</div>
        <div class="meta-line">Submitted: ${escapeHtml(formatDate(record.submitted_at))}</div>
        <span class="${statusClass(rawStatus)}">${escapeHtml(statusLabel)}</span>
      </div>
      <div class="verif-actions">
        <button class="btn btn-view" data-action="view" data-id="${record.id}"><i class="ri-eye-line"></i> View</button>
        <button class="btn btn-approve" data-action="approve" data-id="${record.id}"${approveDisabledAttr}><i class="ri-shield-check-line"></i> Approve</button>
        <button class="btn btn-reject" data-action="reject" data-id="${record.id}"${rejectDisabledAttr}><i class="ri-close-circle-line"></i> Reject</button>
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
    state.records.push(updated);
  }
  state.records = sortRecords(state.records);
  renderRecords();
};

const removeRecord = (id) => {
  state.records = state.records.filter((record) => record.id !== id);
  state.records = sortRecords(state.records);
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
    const meta = payload?.meta || {};
    const wasTrackingAvailable = state.trackingAvailable;
    state.trackingAvailable = meta.trackingAvailable !== false;
    state.requestTracking = Boolean(meta.requestTracking);
    state.records = sortRecords(payload.data);
    renderRecords();
    if (wasTrackingAvailable && !state.trackingAvailable && !state.requestTracking) {
      showToast('Vendor verification tracking is not configured.');
    }
  } catch (error) {
    console.error('Admin verification load error', error);
    showToast(error.message || 'Unable to load verification requests.');
  }
};

const fetchDetail = async (id) => {
  const params = new URLSearchParams({ format: 'json', detail: id });
  const currentRecord = findRecordById(id);
  if (currentRecord?.request_id) {
    params.append('request_id', currentRecord.request_id);
  }
  const response = await fetch(`admin-verifications.php?${params.toString()}`, { credentials: 'same-origin' });
  if (!response.ok) throw new Error('Unable to load verification details.');
  const payload = await response.json();
  if (!payload.success || !payload.data) throw new Error(payload.message || 'Verification details unavailable.');
  return payload.data;
};

const submitAction = async (id, action, feedback = '') => {
  const record = findRecordById(id);
  const requestPayload = { id, action, feedback };
  if (record?.request_id) {
    requestPayload.request_id = record.request_id;
  } else if (state.selectedRequestId) {
    requestPayload.request_id = state.selectedRequestId;
  }
  const response = await fetch('admin-verifications.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify(requestPayload),
  });
  const payload = await response.json();
  if (!response.ok || !payload.success) {
    throw new Error(payload.message || 'Unable to update verification.');
  }
  return payload.data;
};

const renderDetail = (record) => {
  if (!detailView || !record) return;

  const rawStatus = record.status || record.status_normalised || 'pending';
  const statusNormalised = (record.status_normalised || rawStatus || '').toLowerCase();
  const actionsLocked = ACTION_LOCKED_STATUSES.has(statusNormalised);
  const statusLabel = formatStatusLabel(rawStatus);
  state.selectedId = record.id;
  state.selectedRequestId = record.request_id || null;

  if (detailTitle) {
    detailTitle.textContent = record.business_name || 'Verification Request';
  }

  if (detailStatus) {
    detailStatus.className = statusClass(rawStatus);
    detailStatus.textContent = statusLabel;
  }

  if (detailMeta) {
    detailMeta.innerHTML = `
      <span><i class="ri-mail-line"></i> ${escapeHtml(record.email || '-')}</span>
      <span><i class="ri-phone-line"></i> ${escapeHtml(record.phone || '-')}</span>
      <span><i class="ri-map-pin-line"></i> ${escapeHtml(record.state || '-')}</span>
    `;
  }

  if (detailApprove) detailApprove.disabled = actionsLocked;
  if (detailReject) detailReject.disabled = actionsLocked;

  const cards = [
    { label: 'Current Status', value: statusLabel },
    { label: 'Submitted', value: formatDate(record.submitted_at) },
    { label: 'Reviewed', value: record.reviewed_at ? formatDate(record.reviewed_at) : '-' },
    { label: 'Plan Level', value: record.plan_level || '-' },
    { label: 'Reviewer', value: record.reviewer_id ? `#${record.reviewer_id}` : '-' },
    { label: 'Request ID', value: record.request_id ? `#${record.request_id}` : '-' },
  ];

  if (record.history) {
    cards.push({ label: 'History', value: record.history });
  }

  if (detailBody) {
    const cardMarkup = cards
      .filter((card) => card.value && card.value !== '-')
      .map((card) => {
        const value = escapeHtml(String(card.value)).replace(/\n/g, '<br>');
        return `<div class="detail-card"><label>${escapeHtml(card.label)}</label><strong>${value}</strong></div>`;
      })
      .join('');
    detailBody.innerHTML = cardMarkup || '<div class="detail-card"><strong>No extra details available.</strong></div>';
  }

  const files = Array.isArray(record.files) ? record.files : [];
  if (detailFiles) {
    if (!files.length) {
      detailFiles.innerHTML = `
        <div class="detail-section-title">Supporting Documents</div>
        <div class="detail-card"><label>Documents</label><strong>No supporting documents supplied.</strong></div>
      `;
    } else {
      const fileItems = files.map((file, index) => {
        const name = typeof file.name === 'string' && file.name.trim() ? file.name.trim() : `File ${index + 1}`;
        const url = typeof file.url === 'string' ? file.url : '';
        const safeUrl = escapeHtml(url);
        const safeName = escapeHtml(name);
        const baseUrl = url.split('?')[0].toLowerCase();
        const isImage = /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(baseUrl);
        const isPdf = baseUrl.endsWith('.pdf');
        if (isImage) {
          return `
            <article class="detail-file">
              <img src="${safeUrl}" alt="${safeName}">
              <a href="${safeUrl}" target="_blank" rel="noopener"><i class="ri-external-link-line"></i> Open ${safeName}</a>
            </article>
          `;
        }
        if (isPdf) {
          return `
            <article class="detail-file">
              <embed src="${safeUrl}" type="application/pdf">
              <a href="${safeUrl}" target="_blank" rel="noopener"><i class="ri-download-line"></i> Download ${safeName}</a>
            </article>
          `;
        }
        return `
          <article class="detail-file">
            <a href="${safeUrl}" target="_blank" rel="noopener"><i class="ri-attachment-line"></i> ${safeName}</a>
          </article>
        `;
      }).join('');
      detailFiles.innerHTML = `
        <div class="detail-section-title">Supporting Documents</div>
        <div class="detail-files-grid">
          ${fileItems}
        </div>
      `;
    }
  }

  if (detailFeedback) {
    detailFeedback.value = record.feedback || '';
    detailFeedback.readOnly = actionsLocked;
    detailFeedback.classList.toggle('is-readonly', actionsLocked);
  }
};

const handleCardAction = async (action, id) => {
  const record = findRecordById(id);
  if (action === 'view') {
    try {
      const detail = await fetchDetail(id);
      if (detail) {
        upsertRecord(detail);
      }
      renderDetail(detail);
      toggleDetail(true);
    } catch (error) {
      console.error('Admin verification detail error', error);
      showToast(error.message || 'Unable to open verification.');
    }
    return;
  }

  if (record && ACTION_LOCKED_STATUSES.has((record.status_normalised || record.status || '').toLowerCase())) {
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

  detailBack?.addEventListener('click', () => toggleDetail(false));
  detailView?.addEventListener('click', (event) => {
    if (event.target === detailView) {
      toggleDetail(false);
    }
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !detailView?.hidden) {
      toggleDetail(false);
    }
  });

  detailApprove?.addEventListener('click', async () => {
    if (!state.selectedId) return;
    const feedback = detailFeedback?.value.trim() || '';
    try {
      const updated = await submitAction(state.selectedId, 'approve', feedback);
      upsertRecord(updated);
      toggleDetail(false);
      showToast('Verification approved.');
    } catch (error) {
      console.error('Approve verification error', error);
      showToast(error.message || 'Unable to approve verification.');
    }
  });

  detailReject?.addEventListener('click', async () => {
    if (!state.selectedId) return;
    const feedback = detailFeedback?.value.trim() || '';
    try {
      const updated = await submitAction(state.selectedId, 'reject', feedback);
      upsertRecord(updated);
      toggleDetail(false);
      showToast('Verification rejected.');
    } catch (error) {
      console.error('Reject verification error', error);
      showToast(error.message || 'Unable to reject verification.');
    }
  });
};

initializeEvents();
fetchVerifications();
