const loadingState = document.getElementById('loadingState');
const viewMode = document.getElementById('viewMode');
const editMode = document.getElementById('editMode');
const editBtn = document.getElementById('editBtn');
const cancelBtn = document.getElementById('cancelBtn');
const logoutBtn = document.getElementById('logoutBtn');
const toast = document.getElementById('toast');

const viewAvatar = document.getElementById('viewAvatar');
const viewVendorName = document.getElementById('viewVendorName');
const viewBusinessName = document.getElementById('viewBusinessName');
const viewEmail = document.getElementById('viewEmail');
const viewPhone = document.getElementById('viewPhone');
const viewAddress = document.getElementById('viewAddress');
const viewState = document.getElementById('viewState');
const viewJoinDate = document.getElementById('viewJoinDate');
const planBadge = document.getElementById('planBadge');
const planTypeText = document.getElementById('planTypeText');

const profileForm = document.getElementById('profileForm');
const vendorNameInput = document.getElementById('vendorNameInput');
const businessNameInput = document.getElementById('businessNameInput');
const emailInput = document.getElementById('emailInput');
const phoneInput = document.getElementById('phoneInput');
const addressInput = document.getElementById('addressInput');
const stateSelect = document.getElementById('stateSelect');
const saveBtn = document.getElementById('saveBtn');

const uploadTrigger = document.getElementById('uploadTrigger');
const avatarInput = document.getElementById('avatarInput');
const editAvatarPreview = document.getElementById('editAvatarPreview');

const defaultAvatar = 'https://ui-avatars.com/api/?background=004d40&color=fff&name=YUSTAM';
let currentProfile = {};
let newAvatarFile = null;

const showToast = (message) => {
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2200);
};

const toggleLoading = (show) => {
  if (!loadingState) return;
  loadingState.style.display = show ? 'flex' : 'none';
};

const toggleModes = (mode = 'view') => {
  if (!viewMode || !editMode) return;
  if (mode === 'edit') {
    editMode.classList.remove('hidden');
    viewMode.classList.add('hidden');
  } else {
    viewMode.classList.remove('hidden');
    editMode.classList.add('hidden');
  }
};

const hydrateView = () => {
  const profile = currentProfile;
  if (viewAvatar) viewAvatar.src = profile.profilePhoto || defaultAvatar;
  if (editAvatarPreview) editAvatarPreview.src = profile.profilePhoto || defaultAvatar;
  if (viewVendorName) viewVendorName.textContent = profile.name || '—';
  if (viewBusinessName) viewBusinessName.textContent = profile.businessName || '—';
  if (viewEmail) viewEmail.textContent = profile.email || '—';
  if (viewPhone) viewPhone.textContent = profile.phone || '—';
  if (viewAddress) viewAddress.textContent = profile.address || '—';
  if (viewState) viewState.textContent = profile.state || '—';
  if (viewJoinDate) viewJoinDate.textContent = profile.joined || '—';
  if (planTypeText) planTypeText.textContent = `${profile.plan || 'Free'} Plan`;
};

const hydrateEdit = () => {
  vendorNameInput.value = currentProfile.name || '';
  businessNameInput.value = currentProfile.businessName || '';
  emailInput.value = currentProfile.email || '';
  phoneInput.value = currentProfile.phone || '';
  addressInput.value = currentProfile.address || '';
  stateSelect.value = currentProfile.state || '';
};

const resetAvatarSelection = () => {
  newAvatarFile = null;
  if (avatarInput) avatarInput.value = '';
  if (editAvatarPreview) editAvatarPreview.src = currentProfile.profilePhoto || defaultAvatar;
};

const handleAvatarSelect = (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  if (!file.type.startsWith('image/')) {
    showToast('Please choose an image file.');
    resetAvatarSelection();
    return;
  }
  if (file.size > 2 * 1024 * 1024) {
    showToast('Image must be under 2MB.');
    resetAvatarSelection();
    return;
  }
  newAvatarFile = file;
  const reader = new FileReader();
  reader.onload = (e) => {
    if (editAvatarPreview) {
      editAvatarPreview.src = e.target?.result || editAvatarPreview.src;
    }
  };
  reader.readAsDataURL(file);
};

const updateProfile = async (formData) => {
  const response = await fetch('update-profile.php', {
    method: 'POST',
    body: formData,
  });
  let data;
  try {
    data = await response.json();
  } catch (parseError) {
    console.error('Invalid update-profile response', parseError);
    throw new Error('Unable to update profile. Please try again.');
  }
  if (!response.ok || !data.success) {
    throw new Error(data.message || 'Unable to update profile.');
  }
  return data;
};

const fetchProfile = async () => {
  try {
    toggleLoading(true);
    const response = await fetch('vendor-profile.php?format=json', {
      headers: { 'Accept': 'application/json' },
      credentials: 'same-origin',
    });

    if (response.status === 401) {
      window.location.href = 'vendor-login.html';
      return;
    }

    let payload;
    try {
      payload = await response.json();
    } catch (parseError) {
      console.error('Invalid profile response', parseError);
      throw new Error('We could not load your profile details.');
    }

    if (!response.ok || !payload.success) {
      throw new Error((payload && payload.message) || 'We could not load your profile details.');
    }

    currentProfile = payload.profile || {};
    hydrateView();
    hydrateEdit();
    toggleModes('view');
  } catch (error) {
    console.error('Profile load error', error);
    showToast(error.message || 'Unable to load your profile.');
  } finally {
    toggleLoading(false);
  }
};

const bindEvents = () => {
  editBtn?.addEventListener('click', () => {
    hydrateEdit();
    toggleModes('edit');
  });

  cancelBtn?.addEventListener('click', () => {
    resetAvatarSelection();
    hydrateEdit();
    toggleModes('view');
  });

  logoutBtn?.addEventListener('click', () => {
    window.location.href = 'logout.php';
  });

  uploadTrigger?.addEventListener('click', () => avatarInput?.click());
  avatarInput?.addEventListener('change', handleAvatarSelect);

  profileForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!vendorNameInput.value.trim() || !businessNameInput.value.trim() || !addressInput.value.trim() || !stateSelect.value) {
      showToast('Please complete all required fields.');
      return;
    }

    saveBtn.disabled = true;
    saveBtn.innerHTML = '<i class="ri-loader-4-line" aria-hidden="true"></i> Saving…';

    try {
      const formData = new FormData();
      formData.append('name', vendorNameInput.value.trim());
      formData.append('business_name', businessNameInput.value.trim());
      formData.append('phone', phoneInput.value.trim());
      formData.append('address', addressInput.value.trim());
      formData.append('state', stateSelect.value);
      if (newAvatarFile) {
        formData.append('avatar', newAvatarFile);
      }

      const result = await updateProfile(formData);
      currentProfile = { ...currentProfile, ...(result.profile || {}) };
      hydrateView();
      hydrateEdit();
      toggleModes('view');
      resetAvatarSelection();
      showToast(result.message || 'Profile updated successfully.');
    } catch (error) {
      console.error('Profile update error', error);
      showToast(error.message || 'Could not update profile.');
    } finally {
      saveBtn.disabled = false;
      saveBtn.innerHTML = '<i class="ri-save-3-line" aria-hidden="true"></i> Save Changes';
    }
  });
};

const initialise = () => {
  bindEvents();
  fetchProfile();
};

window.addEventListener('DOMContentLoaded', initialise);
