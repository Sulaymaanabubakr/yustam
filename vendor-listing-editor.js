const STATUS_OPTIONS = [
  { value: 'approved', label: 'Approved - Live' },
  { value: 'pending', label: 'Pending review' },
  { value: 'draft', label: 'Draft' },
  { value: 'unlisted', label: 'Temporarily unlisted' },
  { value: 'sold', label: 'Sold / Out of stock' },
  { value: 'archived', label: 'Archived' },
];

const normalisePriceInput = (value) => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value % 1 === 0 ? String(value) : value.toFixed(2);
  }
  const trimmed = String(value).trim();
  if (trimmed === '') return '';
  const cleaned = trimmed.replace(/[^0-9.\-]/g, '');
  return cleaned;
};

export const setupListingEditor = ({ modalId = 'listingEditor', onSubmitSuccess } = {}) => {
  const modal = document.getElementById(modalId);
  if (!modal) {
    console.warn('[listing-editor] modal element not found');
    return { open: () => {}, close: () => {} };
  }

  const form = modal.querySelector('form');
  if (!form) {
    console.warn('[listing-editor] form element not found');
    return { open: () => {}, close: () => {} };
  }

  const statusSelect = form.querySelector('select[name="status"]');
  if (statusSelect && statusSelect.options.length === 0) {
    STATUS_OPTIONS.forEach((option) => {
      const opt = document.createElement('option');
      opt.value = option.value;
      opt.textContent = option.label;
      statusSelect.appendChild(opt);
    });
  }

  const statusMessage = modal.querySelector('[data-editor-status]');
  const closeTriggers = modal.querySelectorAll('[data-editor-dismiss]');
  const submitButton = form.querySelector('button[type="submit"]');
  const submitLabel = submitButton ? submitButton.querySelector('.listing-editor__submit-label') : null;
  const submitSpinner = submitButton ? submitButton.querySelector('.listing-editor__spinner') : null;
  const previewContainer = modal.querySelector('[data-editor-preview-container]');
  const previewImage = modal.querySelector('[data-editor-preview]');

  let currentListing = null;

  const setStatusMessage = (message, tone = 'neutral') => {
    if (!statusMessage) return;
    statusMessage.textContent = message || '';
    statusMessage.dataset.tone = tone;
  };

  const lockForm = (locked) => {
    if (submitButton) {
      submitButton.disabled = locked;
    }
    if (submitLabel) {
      submitLabel.textContent = locked ? 'Saving...' : 'Save changes';
    }
    if (submitSpinner) {
      submitSpinner.style.display = locked ? 'inline-block' : 'none';
    }
  };

  const closeEditor = () => {
    modal.classList.remove('is-open');
    modal.setAttribute('hidden', '');
    setStatusMessage('');
    lockForm(false);
    currentListing = null;
  };

  const populateForm = (listing = {}) => {
    currentListing = { ...listing };
    const formData = new FormData(form);
    formData.set('listingId', listing.id || listing.listing_id || listing.listingId || '');
    form.elements.listingId.value = formData.get('listingId') || '';
    form.elements.title.value = listing.title || listing.productTitle || '';
    form.elements.description.value = listing.description || listing.details || '';
    form.elements.price.value = normalisePriceInput(listing.price ?? listing.amount);
    const statusValue = String(listing.status_raw || listing.status || 'pending').toLowerCase();
    if (statusSelect) {
      const optionExists = Array.from(statusSelect.options).some((opt) => opt.value === statusValue);
      statusSelect.value = optionExists ? statusValue : 'pending';
    }

    const previewSrc =
      listing.image ||
      (Array.isArray(listing.images) && listing.images.length ? listing.images[0] : '') ||
      '';
    if (previewContainer && previewImage) {
      if (previewSrc) {
        previewImage.src = previewSrc;
        previewImage.alt = listing.title ? `${listing.title} preview` : 'Listing preview';
        previewImage.removeAttribute('hidden');
        previewContainer.hidden = false;
      } else {
        previewContainer.hidden = true;
        previewImage.setAttribute('hidden', '');
      }
    }
  };

  const openEditor = (listing) => {
    populateForm(listing || {});
    setStatusMessage('');
    modal.removeAttribute('hidden');
    modal.classList.add('is-open');
    const titleInput = form.querySelector('input[name="title"]');
    if (titleInput) {
      setTimeout(() => titleInput.focus(), 50);
    }
  };

  closeTriggers.forEach((trigger) => {
    trigger.addEventListener('click', (event) => {
      event.preventDefault();
      closeEditor();
    });
  });

  modal.addEventListener('click', (event) => {
    if (event.target === modal) {
      closeEditor();
    }
  });

  modal.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      closeEditor();
    }
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!form.elements.listingId.value) {
      setStatusMessage('Listing identifier missing.', 'error');
      return;
    }

    const payload = {
      listingId: form.elements.listingId.value,
      title: form.elements.title.value.trim(),
      price: form.elements.price.value.trim(),
      status: statusSelect ? statusSelect.value : 'pending',
      description: form.elements.description.value.trim(),
    };

    if (payload.title === '') {
      setStatusMessage('Please enter a title for your listing.', 'error');
      return;
    }

    lockForm(true);
    setStatusMessage('Saving changes…', 'progress');

    try {
      const response = await fetch('vendor-listing-update.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify(payload),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Unable to save changes at the moment.');
      }

      setStatusMessage('Listing updated successfully.', 'success');
      if (typeof onSubmitSuccess === 'function') {
        onSubmitSuccess(result.listing || payload);
      }
      setTimeout(closeEditor, 400);
    } catch (error) {
      console.error('[listing-editor] update failed', error);
      setStatusMessage(error.message || 'Could not update listing. Please try again.', 'error');
      lockForm(false);
    }
  });

  return {
    open: openEditor,
    close: closeEditor,
  };
};

export const formatCurrency = (value) =>
  new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(
    Number.isFinite(Number(value)) ? Number(value) : 0,
  );

export const statusLabel = (status) => {
  const match = STATUS_OPTIONS.find((option) => option.value === String(status || '').toLowerCase());
  return match ? match.label : 'Pending review';
};
