// YUSTAM | Vendor Verification Page Interactions

document.addEventListener('DOMContentLoaded', () => {
  const statusBadge = document.getElementById('verificationStatus');
  const statusMessage = document.getElementById('statusMessage');
  const toast = document.getElementById('verificationToast');
  const toastText = toast ? toast.querySelector('span') : null;
  const submitButton = document.getElementById('submitVerificationBtn');
  const defaultSubmitLabel = submitButton ? submitButton.textContent.trim() : 'Submit for Verification';
  const statusEndpoint = 'vendor-verification-status.php';

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

  const inputIds = ['uploadCAC', 'uploadIDFront', 'uploadIDBack', 'uploadAddress', 'uploadLogo'];

  const normaliseStatus = (value) => (typeof value === 'string' ? value.trim().toLowerCase() : '');
  const STATUS_CLASS_MAP = {
    pending: 'badge-pending',
    verified: 'badge-verified',
    approved: 'badge-verified',
    rejected: 'badge-rejected',
    active: 'badge-active',
  };
  const STATUS_CLASS_LIST = ['badge-pending', 'badge-verified', 'badge-rejected', 'badge-active'];
  const PENDING_STATUSES = new Set(['pending', 'submitted', 'under review', 'in_review', 'in-review', 'processing']);
  const APPROVED_STATUSES = new Set(['verified', 'approved', 'active', 'complete', 'completed']);
  const REJECTED_STATUSES = new Set(['rejected', 'needs_changes', 'needs update', 'needs-update', 'declined', 'failed']);

  let latestStatusPayload = null;

  const showToast = (message, type = 'info') => {
    if (!toast || !toastText) return;
    toastText.textContent = message;
    toast.classList.toggle('error', type === 'error');
    toast.classList.add('show');
    setTimeout(() => {
      toast.classList.remove('show');
      toast.classList.remove('error');
    }, 3000);
  };

  const handlePreview = (input) => {
    const file = input.files && input.files[0] ? input.files[0] : null;
    const infoRow = document.querySelector(`.file-info[data-target="${input.id}"]`);
    const infoText = infoRow ? infoRow.querySelector('span') : null;
    const previewContainer = document.getElementById(`preview-${input.id}`);

    if (!file) {
      if (infoText) infoText.textContent = 'No file chosen yet.';
      if (infoRow) infoRow.classList.remove('active');
      if (previewContainer) {
        previewContainer.innerHTML = '';
        previewContainer.style.display = 'none';
      }
      return;
    }

    if (infoText) infoText.textContent = file.name;
    if (infoRow) infoRow.classList.add('active');

    if (!previewContainer) return;

    if (file.type && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        previewContainer.innerHTML = `<img src="${(event.target && event.target.result) || ''}" alt="Preview of ${file.name}">`;
        previewContainer.style.display = 'block';
      };
      reader.readAsDataURL(file);
    } else if (file.type === 'application/pdf') {
      const pdfUrl = URL.createObjectURL(file);
      previewContainer.innerHTML = `<embed src="${pdfUrl}" type="application/pdf">`;
      previewContainer.style.display = 'block';
      setTimeout(() => URL.revokeObjectURL(pdfUrl), 5000);
    } else {
      previewContainer.innerHTML = '';
      previewContainer.style.display = 'none';
    }
  };

  inputIds.forEach((id) => {
    const input = document.getElementById(id);
    if (!input) return;
    input.addEventListener('change', () => handlePreview(input));
  });

  const applyStatus = (payload = {}) => {
    latestStatusPayload = payload;

    const rawStatus = payload.statusDisplay || payload.status || '';
    const status = normaliseStatus(rawStatus);
    const feedback = typeof payload.feedback === 'string' ? payload.feedback.trim() : '';
    const planIsPaid = typeof payload.planIsPaid === 'boolean' ? payload.planIsPaid : true;

    let displayStatus = rawStatus || 'Pending';
    let message = 'Your documents are under review.';
    let badgeClass = STATUS_CLASS_MAP[status] || 'badge-pending';
    let canSubmit = true;

    if (!planIsPaid) {
      displayStatus = 'Unavailable';
      badgeClass = 'badge-pending';
      message = 'Upgrade your plan to request verification.';
      canSubmit = false;
    } else if (APPROVED_STATUSES.has(status)) {
      displayStatus = 'Verified';
      badgeClass = 'badge-verified';
      message = 'Your storefront is verified across YUSTAM.';
      canSubmit = false;
    } else if (PENDING_STATUSES.has(status)) {
      displayStatus = 'Pending';
      badgeClass = 'badge-pending';
      message = 'Your verification request is under review.';
      canSubmit = false;
    } else if (REJECTED_STATUSES.has(status)) {
      displayStatus = 'Changes required';
      badgeClass = 'badge-rejected';
      message = feedback || 'We found issues with your submission. Please review the feedback and re-submit.';
      canSubmit = true;
    } else {
      displayStatus = 'Not submitted';
      badgeClass = 'badge-active';
      message = 'Submit your documents to unlock the verification badge.';
      canSubmit = true;
    }

    if (statusBadge) {
      STATUS_CLASS_LIST.forEach((cls) => statusBadge.classList.remove(cls));
      statusBadge.classList.add(badgeClass);
      statusBadge.innerHTML = `<i class="ri-shield-check-line"></i> ${displayStatus}`;
    }

    if (statusMessage) {
      statusMessage.textContent = message;
    }

    if (submitButton) {
      submitButton.disabled = !canSubmit;
      submitButton.textContent = defaultSubmitLabel;
    }
  };

  const fetchStatus = async () => {
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = defaultSubmitLabel;
    }

    try {
      const response = await fetch(statusEndpoint, {
        credentials: 'same-origin',
        headers: { Accept: 'application/json' },
      });

      const payload = await response.json();
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.message || 'Unable to load verification status.');
      }

      applyStatus(payload.data || {});
    } catch (error) {
      console.error('Verification status fetch failed:', error);
      showToast(error.message || 'Unable to load verification status.', 'error');
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = defaultSubmitLabel;
      }
    }
  };

  const submitVerification = async () => {
    if (!submitButton || submitButton.disabled) return;

    const submittedFiles = inputIds.reduce((acc, id) => {
      const input = document.getElementById(id);
      if (input && input.files && input.files[0]) {
        acc[id] = input.files[0].name;
      }
      return acc;
    }, {});

    console.group('Vendor verification submission');
    console.log('Files submitted:', submittedFiles);
    console.groupEnd();

    submitButton.disabled = true;
    submitButton.textContent = 'Submitting...';

    try {
      const body = new FormData();
      body.append('action', 'submit');

      const response = await fetch(statusEndpoint, {
        method: 'POST',
        body,
        credentials: 'same-origin',
      });

      const result = await response.json();
      if (!response.ok || !result?.success) {
        throw new Error(result?.message || 'Unable to submit verification.');
      }

      showToast(result.message || 'Documents submitted for review.');
      applyStatus(result.data || {});
    } catch (error) {
      console.error('Verification submission failed:', error);
      showToast(error.message || 'Unable to submit verification.', 'error');
      if (submitButton) {
        submitButton.disabled = false;
      }
    } finally {
      if (submitButton) {
        submitButton.textContent = defaultSubmitLabel;
      }
    }
  };

  if (submitButton) {
    submitButton.addEventListener('click', () => submitVerification());
  }

  if (statusMessage) {
    statusMessage.textContent = \"Loading verification status...\";
  }
  fetchStatus();
});
