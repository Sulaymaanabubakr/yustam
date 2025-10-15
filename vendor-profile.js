const loader = document.getElementById('profileLoader');
const initialsBadge = document.getElementById('vendorInitials');
const avatarImg = document.getElementById('vendorAvatar');
const profileTitle = document.getElementById('profileTitle');
const businessNameHeading = document.getElementById('businessName');
const planBadge = document.getElementById('planBadge');
const upgradeBanner = document.getElementById('upgradeBanner');
const vendorNameField = document.getElementById('vendorName');
const businessField = document.getElementById('vendorBusiness');
const emailField = document.getElementById('vendorEmail');
const phoneField = document.getElementById('vendorPhone');
const addressField = document.getElementById('vendorAddress');
const stateField = document.getElementById('vendorState');
const joinedField = document.getElementById('vendorJoined');
const editProfileBtn = document.getElementById('editProfileBtn');
const upgradePlanBtn = document.getElementById('upgradePlanBtn');
const viewPricingBtn = document.getElementById('viewPricingBtn');
const headerProfileImage = document.getElementById('headerProfileImage');
const headerFallbackImage =
  headerProfileImage?.dataset?.fallback || headerProfileImage?.getAttribute('src') || 'logo.jpeg';

const safeText = (value) => {
  if (!value) return '—';
  const trimmed = typeof value === 'string' ? value.trim() : value;
  return trimmed && String(trimmed).length > 0 ? String(trimmed) : '—';
};

const toggleLoader = (show) => {
  if (!loader) return;
  loader.classList.toggle('active', Boolean(show));
};

const sanitizeImageUrl = (value) => {
  if (!value || typeof value !== 'string') return '';
  const trimmed = value.trim();
  if (!trimmed || /^javascript:/i.test(trimmed)) return '';
  return trimmed;
};

const computeInitials = (name, business) => {
  const fallback = 'Vendor';
  const source = (name || business || fallback).trim();
  if (!source) return fallback.slice(0, 2).toUpperCase();
  const words = source.split(/\s+/).filter(Boolean).slice(0, 2);
  const initials = words.map((word) => word.charAt(0)).join('');
  return initials.toUpperCase() || fallback.slice(0, 2).toUpperCase();
};

const applyProfile = (profile) => {
  const {
    name = '',
    businessName = '',
    email = '',
    phone = '',
    address = '',
    state = '',
    plan = 'Free',
    joined = '-',
    profilePhoto = '',
    businessAddress = '',
    location = '',
    region = '',
    category = '',
  } = profile || {};

  const initials = computeInitials(name, businessName);
  if (initialsBadge) initialsBadge.textContent = initials;
  if (profileTitle) profileTitle.textContent = safeText(name);
  if (businessNameHeading) businessNameHeading.textContent = safeText(businessName);

  const planLabel = safeText(plan);
  if (planBadge) {
    planBadge.textContent = `${planLabel} Plan`;
    planBadge.dataset.plan = planLabel;
  }

  if (vendorNameField) vendorNameField.textContent = safeText(name);
  if (businessField) businessField.textContent = safeText(businessName);
  if (emailField) emailField.textContent = safeText(email);
  if (phoneField) phoneField.textContent = safeText(phone);
  const resolvedAddress = address || businessAddress || location;
  const resolvedState = state || region || location || category;

  if (addressField) addressField.textContent = safeText(resolvedAddress);
  if (stateField) stateField.textContent = safeText(resolvedState);
  if (joinedField) joinedField.textContent = safeText(joined);

  const photoUrl = sanitizeImageUrl(profilePhoto);
  if (avatarImg) {
    if (photoUrl) {
      avatarImg.src = photoUrl;
      avatarImg.hidden = false;
      if (initialsBadge) initialsBadge.hidden = true;
    } else {
      avatarImg.hidden = true;
      if (initialsBadge) initialsBadge.hidden = false;
    }
  }

  if (headerProfileImage) {
    headerProfileImage.src = photoUrl || headerFallbackImage;
  }

  if (upgradeBanner) {
    if (planLabel.toLowerCase() === 'free') {
      upgradeBanner.style.display = 'flex';
    } else {
      upgradeBanner.style.display = 'none';
    }
  }
};

const fetchProfile = async () => {
  try {
    toggleLoader(true);
    const response = await fetch('vendor-profile.php?format=json', {
      credentials: 'same-origin',
      headers: { Accept: 'application/json' },
    });

    if (response.status === 401) {
      window.location.href = 'vendor-login.html';
      return;
    }

    const payload = await response.json().catch(() => null);
    if (!payload || !payload.success) {
      throw new Error(payload?.message || 'Unable to load vendor profile.');
    }

    applyProfile(payload.profile);
  } catch (error) {
    console.error('Profile load error:', error);
    if (profileTitle) profileTitle.textContent = 'Unable to load profile';
  } finally {
    toggleLoader(false);
  }
};

const bindActions = () => {
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

  editProfileBtn?.addEventListener('click', () => {
    window.location.href = 'vendor-edit-profile.php';
  });

  upgradePlanBtn?.addEventListener('click', () => {
    window.location.href = 'vendor-plans.php';
  });

  viewPricingBtn?.addEventListener('click', () => {
    window.location.href = 'vendor-plans.php#pricing';
  });
};

document.addEventListener('DOMContentLoaded', () => {
  bindActions();
  fetchProfile();
});
