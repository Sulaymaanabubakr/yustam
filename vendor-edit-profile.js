import { uploadToCloudinary } from './cloudinary.js';

const loader = document.getElementById('pageLoader');
const backBtn = document.getElementById('backBtn');
const logoutBtn = document.getElementById('logoutBtn');
const notificationsBtn = document.getElementById('notificationsBtn');
const settingsBtn = document.getElementById('settingsBtn');
const changePhotoBtn = document.getElementById('changePhotoBtn');
const photoInput = document.getElementById('photoInput');
const photoPreview = document.getElementById('photoPreview');
const uploadProgress = document.getElementById('uploadProgress');
const progressBar = document.getElementById('progressBar');
const saveBtn = document.getElementById('saveBtn');
const saveSpinner = saveBtn?.querySelector('.save-spinner');
const saveText = saveBtn?.querySelector('.save-text');
const toastContainer = document.getElementById('toastContainer');

const fullNameInput = document.getElementById('fullName');
const emailInput = document.getElementById('email');
const phoneInput = document.getElementById('phone');
const stateInput = document.getElementById('state');
const businessNameInput = document.getElementById('businessName');
const businessAddressInput = document.getElementById('businessAddress');
const planNameBadge = document.getElementById('planName');
const planStatusBadge = document.getElementById('planStatus');
const planExpiryInput = document.getElementById('planExpiry');

const fallbackAvatar = window.__PROFILE_AVATAR_FALLBACK__ || '';
const profileEndpoint = window.__PROFILE_ENDPOINT__;
const vendorId = window.__VENDOR_ID__ || '';

let currentProfile = window.__INITIAL_PROFILE__ || {};
let pendingPhotoFile = null;

const toggleLoader = (show) => {
  if (!loader) return;
  loader.classList.toggle('active', Boolean(show));
};

const showToast = (message, type = 'info') => {
  if (!toastContainer) return;
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<i class="ri-information-line" aria-hidden="true"></i><span>${message}</span>`;
  toastContainer.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translate(-50%, 16px)';
    setTimeout(() => toast.remove(), 280);
  }, 3200);
};

const renderPhoto = (src) => {
  if (!photoPreview) return;
  photoPreview.innerHTML = '';
  if (src) {
    const img = document.createElement('img');
    img.src = src;
    img.alt = 'Profile photo preview';
    photoPreview.appendChild(img);
  } else {
    const placeholder = document.createElement('div');
    placeholder.className = 'placeholder-icon';
    placeholder.innerHTML = '<i class="ri-user-line"></i>';
    photoPreview.appendChild(placeholder);
  }
};

const applyPlanStatusState = (status) => {
  if (!planStatusBadge) return;
  const normalized = (status || '').toLowerCase();
  planStatusBadge.classList.toggle('expired', normalized && normalized !== 'active');
};

const populateForm = (profile) => {
  if (!profile) return;
  fullNameInput && (fullNameInput.value = profile.name || '');
  emailInput && (emailInput.value = profile.email || '');
  phoneInput && (phoneInput.value = profile.phone || '');
  stateInput && (stateInput.value = profile.state || '');
  businessNameInput && (businessNameInput.value = profile.businessName || '');
  businessAddressInput && (businessAddressInput.value = profile.businessAddress || '');
  if (planNameBadge) planNameBadge.textContent = profile.plan || 'Free';
  if (planStatusBadge) planStatusBadge.textContent = profile.planStatus || 'Active';
  if (planExpiryInput) planExpiryInput.value = profile.planExpiry || '';
  applyPlanStatusState(profile.planStatus);
  renderPhoto(profile.profilePhoto || fallbackAvatar);
};

const validateForm = () => {
  if (!fullNameInput?.value.trim()) {
    showToast('Full name is required.', 'error');
    fullNameInput?.focus();
    return false;
  }
  if (!phoneInput?.value.trim()) {
    showToast('Phone number is required.', 'error');
    phoneInput?.focus();
    return false;
  }
  if (!businessNameInput?.value.trim()) {
    showToast('Business name is required.', 'error');
    businessNameInput?.focus();
    return false;
  }
  if (!businessAddressInput?.value.trim()) {
    showToast('Business address is required.', 'error');
    businessAddressInput?.focus();
    return false;
  }
  if (!stateInput?.value.trim()) {
    showToast('Please provide the state or region you operate from.', 'error');
    stateInput?.focus();
    return false;
  }
  return true;
};

const collectFormValues = () => ({
  name: fullNameInput?.value.trim() || '',
  business_name: businessNameInput?.value.trim() || '',
  phone: phoneInput?.value.trim() || '',
  state: stateInput?.value.trim() || '',
  address: businessAddressInput?.value.trim() || '',
});

const toggleSaveState = (saving) => {
  if (!saveBtn) return;
  saveBtn.disabled = Boolean(saving);
  if (saveSpinner) saveSpinner.hidden = !saving;
  if (saveText) saveText.textContent = saving ? 'Saving…' : 'Save Profile Changes';
};

const resetUploadProgress = () => {
  if (uploadProgress) uploadProgress.hidden = true;
  if (progressBar) progressBar.style.transform = 'scaleX(0)';
};

const uploadProfilePhoto = async () => {
  if (!pendingPhotoFile) return currentProfile.profilePhoto || '';
  if (uploadProgress) uploadProgress.hidden = false;
  if (progressBar) progressBar.style.transform = 'scaleX(0.05)';

  const folderPath = vendorId ? `vendors/${vendorId}` : 'vendors';

  try {
    const result = await uploadToCloudinary(pendingPhotoFile, {
      folder: folderPath,
      tags: ['vendor', vendorId ? String(vendorId) : 'profile'],
      onProgress: (progress) => {
        if (progressBar) {
          const value = Math.max(progress, 0.05);
          progressBar.style.transform = `scaleX(${value})`;
        }
      },
    });
    if (progressBar) progressBar.style.transform = 'scaleX(1)';
    pendingPhotoFile = null;
    showToast('Photo uploaded successfully. Saving profile…', 'success');
    return result.url;
  } catch (error) {
    console.error('Cloudinary upload failed', error);
    showToast('Failed to upload profile photo. Please try again.', 'error');
    throw error;
  } finally {
    setTimeout(resetUploadProgress, 350);
  }
};

const submitProfile = async () => {
  if (!validateForm()) return;
  toggleSaveState(true);

  try {
    const uploadedPhotoUrl = await uploadProfilePhoto();
    const formValues = collectFormValues();
    const payload = new FormData();

    payload.append('name', formValues.name);
    payload.append('business_name', formValues.business_name);
    payload.append('phone', formValues.phone);
    payload.append('state', formValues.state);
    payload.append('address', formValues.address);

    if (uploadedPhotoUrl) {
      payload.append('profile_photo_url', uploadedPhotoUrl);
    }

    const response = await fetch('update-profile.php', {
      method: 'POST',
      body: payload,
      credentials: 'same-origin',
    });

    const data = await response.json().catch(() => null);
    if (!response.ok || !data || !data.success) {
      throw new Error(data?.message || 'Unable to save profile changes right now.');
    }

    currentProfile = data.profile || { ...currentProfile, ...formValues, profilePhoto: uploadedPhotoUrl };
    populateForm(currentProfile);
    showToast(data.message || 'Profile updated successfully!', 'success');
  } catch (error) {
    console.error('Profile update failed', error);
    showToast(error.message || 'Could not update profile. Please retry.', 'error');
  } finally {
    toggleSaveState(false);
  }
};

const fetchLatestProfile = async () => {
  if (!profileEndpoint) {
    toggleLoader(false);
    return;
  }

  try {
    const response = await fetch(profileEndpoint, {
      credentials: 'same-origin',
      headers: { Accept: 'application/json' },
    });
    const payload = await response.json().catch(() => null);
    if (payload?.success && payload.profile) {
      currentProfile = payload.profile;
      populateForm(currentProfile);
    }
  } catch (error) {
    console.error('Unable to refresh profile', error);
  } finally {
    toggleLoader(false);
  }
};

const handlePhotoSelection = (event) => {
  const file = event.target?.files?.[0];
  if (!file) return;

  if (!file.type.startsWith('image/')) {
    showToast('Please choose a valid image file.', 'error');
    photoInput.value = '';
    return;
  }

  if (file.size > 3 * 1024 * 1024) {
    showToast('Image size must be under 3MB.', 'error');
    photoInput.value = '';
    return;
  }

  pendingPhotoFile = file;
  const reader = new FileReader();
  reader.onload = (e) => {
    renderPhoto(e.target?.result);
  };
  reader.readAsDataURL(file);
  showToast('Photo ready. Save to apply changes.', 'info');
};

const bindNavigation = () => {
  backBtn?.addEventListener('click', () => {
    window.location.href = 'vendor-profile.php';
  });
  logoutBtn?.addEventListener('click', () => {
    window.location.href = 'logout.php';
  });
  notificationsBtn?.addEventListener('click', () => {
    window.location.href = 'vendor-notifications.php';
  });
  settingsBtn?.addEventListener('click', () => {
    window.location.href = 'vendor-settings.php';
  });
};

const init = () => {
  bindNavigation();
  populateForm(currentProfile);
  toggleLoader(false);
  fetchLatestProfile();

  changePhotoBtn?.addEventListener('click', () => photoInput?.click());
  photoInput?.addEventListener('change', handlePhotoSelection);
  saveBtn?.addEventListener('click', submitProfile);
};

document.addEventListener('DOMContentLoaded', init);
