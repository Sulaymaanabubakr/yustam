// YUSTAM | Vendor Settings Page Interactions

document.addEventListener('DOMContentLoaded', () => {
    const settings = {
        notifApproved: true,
        notifPlanExpiry: true,
        notifBuyerMsg: false,
        notifUpdates: true,
        twoFactor: false,
        loginAlert: true,
        theme: "light"
    };

    const body = document.body;
    const toggleIds = {
        notifApproved: document.getElementById('notifApproved'),
        notifPlanExpiry: document.getElementById('notifPlanExpiry'),
        notifBuyerMsg: document.getElementById('notifBuyerMsg'),
        notifUpdates: document.getElementById('notifUpdates'),
        twoFactor: document.getElementById('twoFactorToggle'),
        loginAlert: document.getElementById('loginAlertToggle')
    };
    const themeRadios = Array.from(document.querySelectorAll('input[name="theme"]'));
    const themeOptions = Array.from(document.querySelectorAll('.theme-option'));
    const saveButton = document.getElementById('saveSettingsBtn');

    const changePasswordBtn = document.getElementById('changePasswordBtn');
    const changePasswordModal = document.getElementById('changePasswordModal');
    const updatePasswordBtn = document.getElementById('updatePasswordBtn');
    const cancelPasswordBtn = document.getElementById('cancelPasswordBtn');
    const passwordInputs = {
        current: document.getElementById('currentPassword'),
        next: document.getElementById('newPassword'),
        confirm: document.getElementById('confirmPassword')
    };

    const deleteAccountBtn = document.getElementById('deleteAccountBtn');
    const deleteAccountModal = document.getElementById('deleteAccountModal');
    const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
    const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');

    const toastContainer = document.getElementById('toastContainer');

    function showToast(message, type = 'info') {
        if (!toastContainer) return;
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        toastContainer.appendChild(toast);

        requestAnimationFrame(() => {
            toast.classList.add('show');
        });

        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                toast.remove();
            }, 220);
        }, 3000);
    }

    function prefersDarkMode() {
        return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    }

    function applyTheme(theme) {
        body.classList.remove('theme-light', 'theme-dark');
        switch (theme) {
            case 'dark':
                body.classList.add('theme-dark');
                break;
            case 'system':
                body.classList.add(prefersDarkMode() ? 'theme-dark' : 'theme-light');
                break;
            case 'light':
            default:
                body.classList.add('theme-light');
                break;
        }
    }

    function syncThemeOptions(selectedValue) {
        themeOptions.forEach(option => option.classList.remove('active'));
        themeRadios.forEach(radio => {
            radio.checked = radio.value === selectedValue;
            if (radio.checked) {
                const parent = radio.closest('.theme-option');
                if (parent) parent.classList.add('active');
            }
        });
    }

    function updateBodyScrollLock() {
        const activeModal = document.querySelector('.modal-backdrop.active');
        body.style.overflow = activeModal ? 'hidden' : '';
    }

    function toggleModal(modal, open) {
        if (!modal) return;
        if (open) {
            modal.classList.add('active');
            modal.setAttribute('aria-hidden', 'false');
        } else {
            modal.classList.remove('active');
            modal.setAttribute('aria-hidden', 'true');
        }
        updateBodyScrollLock();
    }

    function resetPasswordFields() {
        passwordInputs.current.value = '';
        passwordInputs.next.value = '';
        passwordInputs.confirm.value = '';
    }

    // Populate mock settings
    Object.entries(toggleIds).forEach(([key, checkbox]) => {
        if (checkbox && Object.prototype.hasOwnProperty.call(settings, key)) {
            checkbox.checked = Boolean(settings[key]);
        }
    });
    const initialTheme = settings.theme || 'light';
    syncThemeOptions(initialTheme);
    applyTheme(initialTheme);

    if (window.matchMedia) {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const handleThemeChange = () => {
            const selected = themeRadios.find(radio => radio.checked);
            if (selected && selected.value === 'system') {
                applyTheme('system');
            }
        };

        if (typeof mediaQuery.addEventListener === 'function') {
            mediaQuery.addEventListener('change', handleThemeChange);
        } else if (typeof mediaQuery.addListener === 'function') {
            mediaQuery.addListener(handleThemeChange);
        }
    }

    // Theme change listeners
    themeRadios.forEach(radio => {
        radio.addEventListener('change', event => {
            const value = event.target.value;
            syncThemeOptions(value);
            applyTheme(value);
        });
    });

    // Save button handler
    saveButton?.addEventListener('click', () => {
        const updatedSettings = {
            notifApproved: !!toggleIds.notifApproved?.checked,
            notifPlanExpiry: !!toggleIds.notifPlanExpiry?.checked,
            notifBuyerMsg: !!toggleIds.notifBuyerMsg?.checked,
            notifUpdates: !!toggleIds.notifUpdates?.checked,
            twoFactor: !!toggleIds.twoFactor?.checked,
            loginAlert: !!toggleIds.loginAlert?.checked,
            theme: (themeRadios.find(radio => radio.checked)?.value) || 'light'
        };

        console.log('Saved settings:', updatedSettings);
        showToast('Settings saved successfully.', 'success');
    });

    // Password modal interactions
    changePasswordBtn?.addEventListener('click', () => {
        toggleModal(changePasswordModal, true);
    });

    cancelPasswordBtn?.addEventListener('click', () => {
        toggleModal(changePasswordModal, false);
        resetPasswordFields();
    });

    changePasswordModal?.addEventListener('click', event => {
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

    // Delete account interactions
    deleteAccountBtn?.addEventListener('click', () => {
        toggleModal(deleteAccountModal, true);
    });

    cancelDeleteBtn?.addEventListener('click', () => {
        toggleModal(deleteAccountModal, false);
    });

    deleteAccountModal?.addEventListener('click', event => {
        if (event.target === deleteAccountModal) {
            toggleModal(deleteAccountModal, false);
        }
    });

    confirmDeleteBtn?.addEventListener('click', () => {
        console.log('Account deletion requested');
        showToast('Your account has been scheduled for deletion.', 'error');
        toggleModal(deleteAccountModal, false);
    });
});
