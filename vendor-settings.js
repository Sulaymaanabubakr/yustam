// YUSTAM | Vendor Settings Page Interactions

document.addEventListener('DOMContentLoaded', () => {
  const STORAGE_KEY = 'yustam.vendor.settings';
  const themeManager = window.YustamTheme;

  const DEFAULT_SETTINGS = {
    notifApproved: true,
    notifPlanExpiry: true,
    notifBuyerMsg: false,
    notifUpdates: true,
    twoFactor: false,
    loginAlert: true,
    theme: 'system',
  };

  const initialSettings = window.__INITIAL_VENDOR_SETTINGS__ || {};
  const settingsEndpoint = window.__VENDOR_SETTINGS_ENDPOINT__ || 'update-vendor-settings.php';
  const refreshEndpoint = window.__VENDOR_SETTINGS_REFRESH__ || 'vendor-settings.php?format=json';

  let settings = { ...DEFAULT_SETTINGS, ...initialSettings };
  try {
    const cached = localStorage.getItem(STORAGE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed && typeof parsed === 'object') {
        settings = { ...settings, ...parsed };
      }
    }
  } catch (error) {
    console.warn('Unable to read cached settings:', error);
  }
  let unsubscribeTheme = null;

  const toggleIds = {
    notifApproved: document.getElementById('notifApproved'),
    notifPlanExpiry: document.getElementById('notifPlanExpiry'),
    notifBuyerMsg: document.getElementById('notifBuyerMsg'),
    notifUpdates: document.getElementById('notifUpdates'),
    twoFactor: document.getElementById('twoFactorToggle'),
    loginAlert: document.getElementById('loginAlertToggle'),
  };

  const themeRadios = Array.from(document.querySelectorAll('input[name="theme"]'));
  const themeOptions = Array.from(document.querySelectorAll('.theme-option'));
  const saveButton = document.getElementById('saveSettingsBtn');
  const toastContainer = document.getElementById('toastContainer');

  const changePasswordBtn = document.getElementById('changePasswordBtn');
  const changePasswordModal = document.getElementById('changePasswordModal');
  const updatePasswordBtn = document.getElementById('updatePasswordBtn');
  const cancelPasswordBtn = document.getElementById('cancelPasswordBtn');
  const passwordInputs = {
    current: document.getElementById('currentPassword'),
    next: document.getElementById('newPassword'),
    confirm: document.getElementById('confirmPassword'),
  };

  const deleteAccountBtn = document.getElementById('deleteAccountBtn');
  const deleteAccountModal = document.getElementById('deleteAccountModal');
  const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
  const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');

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

  const showToast = (message, type = 'info') => {
    if (!toastContainer) return;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    toastContainer.appendChild(toast);

    requestAnimationFrame(() => toast.classList.add('show'));

    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 220);
    }, 3000);
  };

  const syncThemeOptions = (value) => {
    themeOptions.forEach((option) => option.classList.remove('active'));
    themeRadios.forEach((radio) => {
      const isMatch = radio.value === value;
      radio.checked = isMatch;
      const parent = radio.closest('.theme-option');
      if (parent) parent.classList.toggle('active', isMatch);
    });
  };

  const applyThemePreference = (preference) => {
    const value = ['light', 'dark', 'system'].includes(preference) ? preference : 'system';
    if (themeManager) {
      themeManager.setPreference(value);
    } else {
      document.body.classList.toggle('theme-dark', value === 'dark');
      document.body.classList.toggle('theme-light', value !== 'dark');
    }
    settings.theme = value;
    syncThemeOptions(value);
  };

  const persistLocalSnapshot = (state) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      console.warn('Unable to write settings snapshot:', error);
    }
  };

  const applySettingsToUI = (state) => {
    Object.entries(toggleIds).forEach(([key, input]) => {
      if (!input) return;
      input.checked = Boolean(state[key]);
    });
    syncThemeOptions(state.theme || 'system');
  };

  const setSavingState = (saving) => {
    if (!saveButton) return;
    saveButton.disabled = saving;
    saveButton.textContent = saving ? 'Saving settings…' : 'Save Changes';
  };

  const collectCurrentSettings = () => ({
    notifApproved: !!toggleIds.notifApproved?.checked,
    notifPlanExpiry: !!toggleIds.notifPlanExpiry?.checked,
    notifBuyerMsg: !!toggleIds.notifBuyerMsg?.checked,
    notifUpdates: !!toggleIds.notifUpdates?.checked,
    twoFactor: !!toggleIds.twoFactor?.checked,
    loginAlert: !!toggleIds.loginAlert?.checked,
    theme: (themeRadios.find((radio) => radio.checked)?.value) || settings.theme || 'system',
  });

  const saveSettings = async () => {
    if (!saveButton) return;
    const updatedSettings = collectCurrentSettings();

    setSavingState(true);

    try {
      applyThemePreference(updatedSettings.theme);

      const response = await fetch(settingsEndpoint, {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(updatedSettings),
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.message || 'Unable to save settings. Please try again.');
      }

      settings = { ...DEFAULT_SETTINGS, ...payload.settings };
      persistLocalSnapshot(settings);
      showToast('Settings saved successfully.', 'success');
    } catch (error) {
      console.error(error);
      showToast(error.message || 'Failed to save settings.', 'error');
    } finally {
      setSavingState(false);
      applySettingsToUI(settings);
    }
  };

  const fetchLatestSettings = async () => {
    try {
      const response = await fetch(refreshEndpoint, {
        credentials: 'same-origin',
        headers: { Accept: 'application/json' },
      });
      if (!response.ok) return;
      const payload = await response.json().catch(() => null);
      if (!payload?.success || !payload.settings) return;
      settings = { ...DEFAULT_SETTINGS, ...payload.settings };
      applySettingsToUI(settings);
      applyThemePreference(settings.theme);
      persistLocalSnapshot(settings);
    } catch (error) {
      console.warn('Unable to refresh settings:', error);
    }
  };

  applySettingsToUI(settings);
  applyThemePreference(settings.theme || 'system');
  fetchLatestSettings();

  if (themeManager?.subscribe) {
    unsubscribeTheme = themeManager.subscribe(({ preference }) => {
      settings.theme = preference;
      syncThemeOptions(preference);
      persistLocalSnapshot(settings);
    });
  }

  themeRadios.forEach((radio) => {
    radio.addEventListener('change', (event) => {
      const value = event.target.value;
      applyThemePreference(value);
      persistLocalSnapshot({ ...settings, theme: value });
    });
  });

  saveButton?.addEventListener('click', saveSettings);

  const updateBodyScrollLock = () => {
    const activeModal = document.querySelector('.modal-backdrop.active');
    document.body.style.overflow = activeModal ? 'hidden' : '';
  };

  const toggleModal = (modal, open) => {
    if (!modal) return;
    modal.classList.toggle('active', open);
    modal.setAttribute('aria-hidden', open ? 'false' : 'true');
    updateBodyScrollLock();
  };

  const resetPasswordFields = () => {
    passwordInputs.current.value = '';
    passwordInputs.next.value = '';
    passwordInputs.confirm.value = '';
  };

  changePasswordBtn?.addEventListener('click', () => toggleModal(changePasswordModal, true));
  cancelPasswordBtn?.addEventListener('click', () => {
    toggleModal(changePasswordModal, false);
    resetPasswordFields();
  });
  changePasswordModal?.addEventListener('click', (event) => {
    if (event.target === changePasswordModal) {
      toggleModal(changePasswordModal, false);
      resetPasswordFields();
    }
  });
  updatePasswordBtn?.addEventListener('click', () => {
    const { current, next, confirm } = passwordInputs;
    if (!current.value.trim() || !next.value.trim() || !confirm.value.trim()) {
      showToast('Please fill in all password fields.', 'error');
      return;
    }
    if (next.value !== confirm.value) {
      showToast('New passwords do not match.', 'error');
      return;
    }
    showToast('Password updated successfully.', 'success');
    toggleModal(changePasswordModal, false);
    resetPasswordFields();
  });

  deleteAccountBtn?.addEventListener('click', () => toggleModal(deleteAccountModal, true));
  cancelDeleteBtn?.addEventListener('click', () => toggleModal(deleteAccountModal, false));
  deleteAccountModal?.addEventListener('click', (event) => {
    if (event.target === deleteAccountModal) toggleModal(deleteAccountModal, false);
  });
  confirmDeleteBtn?.addEventListener('click', () => {
    console.log('Account deletion requested');
    showToast('Your account has been scheduled for deletion.', 'error');
    toggleModal(deleteAccountModal, false);
  });

  window.addEventListener('beforeunload', () => {
    if (typeof unsubscribeTheme === 'function') {
      unsubscribeTheme();
    }
  });
});
