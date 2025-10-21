import { appendVerificationBadge, verificationPlanLabel, normalisePlanSlug } from './verification-badge.js';

const EMPTY_MARK = '\u2014';

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
const verificationBtn = document.getElementById('verificationBtn');
const verificationNote = document.getElementById('verificationNote');
const headerVendorName = document.getElementById('headerVendorName');

const clearBadges = (host) => {
  if (!host) return;
  host.querySelectorAll('.verification-badge').forEach((badge) => badge.remove());
};

const applyBadge = (host, planValue, isVerified, roleLabel) => {
  if (!host) return;
  clearBadges(host);
  if (!isVerified) return;
  appendVerificationBadge(host, planValue, {
    verified: true,
    roleLabel: roleLabel || verificationPlanLabel(planValue),
  });
};

const safeText = (value) => {
  if (!value) return EMPTY_MARK;
  const trimmed = typeof value === 'string' ? value.trim() : value;
  return trimmed && String(trimmed).length > 0 ? String(trimmed) : EMPTY_MARK;
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

const normaliseStatus = (value) => (typeof value === 'string' ? value.trim().toLowerCase() : '');
const PENDING_STATUSES = new Set(['pending', 'submitted', 'under review', 'in_review', 'in-review', 'processing']);
const APPROVED_STATUSES = new Set(['verified', 'approved', 'active', 'complete', 'completed']);
const REJECTED_STATUSES = new Set(['rejected', 'needs_changes', 'needs update', 'needs-update', 'declined', 'failed']);

const updateVerificationCTA = (profile = {}) => {
  if (!verificationBtn) return;

  const planLabel = typeof profile.plan === 'string' ? profile.plan : '';
  const planName = planLabel.trim().toLowerCase();
  const planIsPaid = typeof profile.planIsPaid === 'boolean' ? profile.planIsPaid : !(planName === '' || planName.startsWith('free'));

  const verification = profile.verification || {};
  const status = normaliseStatus(verification.status || verification.statusDisplay);
  const feedback = typeof verification.feedback === 'string' ? verification.feedback.trim() : '';
  const submittedAt = verification.submittedAt ? String(verification.submittedAt) : '';

  let disabled = false;
  let note = '';

  if (!planIsPaid) {
    disabled = true;
    note = 'Upgrade your plan to request verification.';
  } else if (APPROVED_STATUSES.has(status)) {
    disabled = true;
    note = 'Your storefront is already verified.';
  } else if (PENDING_STATUSES.has(status) || submittedAt) {
    disabled = true;
    note = 'Your verification request is under review.';
  } else if (REJECTED_STATUSES.has(status)) {
    disabled = false;
    note = feedback || 'We found issues with your submission. Update the documents and re-submit.';
  } else {
    disabled = false;
    note = 'Earn buyer trust by completing your verification.';
  }

  verificationBtn.disabled = disabled;
  verificationBtn.classList.toggle('is-disabled', disabled);
  verificationBtn.setAttribute('aria-disabled', String(disabled));

  if (verificationNote) {
    verificationNote.textContent = note;
    verificationNote.hidden = !note;
    verificationNote.classList.toggle('note-warning', REJECTED_STATUSES.has(status));
  }
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
    planLabel: planLabelValue = '',
    planSlug: planSlugValue = '',
    verified: verifiedFlag = false,
    verification: verificationPayload = {},
  } = profile || {};

  const resolvedName = typeof name === 'string' && name.trim() ? name.trim() : 'Vendor';
  const hasBusiness = typeof businessName === 'string' && businessName.trim().length > 0;
  const resolvedBusiness = hasBusiness ? businessName.trim() : '';
  const initials = computeInitials(resolvedName, resolvedBusiness);

  if (initialsBadge) initialsBadge.textContent = initials;

  const rawPlan =
    (typeof plan === 'string' && plan.trim()) ||
    (typeof planLabelValue === 'string' && planLabelValue.trim()) ||
    'Free';
  const planSlug = planSlugValue && typeof planSlugValue === 'string' && planSlugValue.trim()
    ? planSlugValue.trim()
    : normalisePlanSlug(rawPlan);
  const normalisedPlan = rawPlan.replace(/\s+/g, ' ').trim();
  const planChipDisplay = normalisedPlan
    ? (/plan$/i.test(normalisedPlan) ? normalisedPlan : `${normalisedPlan} Plan`)
    : 'Free Plan';
  const planRoleLabel = verificationPlanLabel(rawPlan);

  const verificationData = verificationPayload || {};
  const statusValue = normaliseStatus(
    verificationData.state ||
      verificationData.status ||
      verificationData.statusDisplay ||
      (verifiedFlag ? 'verified' : ''),
  );
  const isVerified = Boolean(verifiedFlag) || APPROVED_STATUSES.has(statusValue);
  const verificationState = statusValue || (isVerified ? 'verified' : 'unverified');

  const resolvedAddress = address || businessAddress || location;
  const resolvedState = state || region || location || category;

  if (profileTitle) {
    profileTitle.textContent = resolvedName;
    applyBadge(profileTitle, rawPlan, isVerified, planRoleLabel);
  }

  if (headerVendorName) {
    headerVendorName.textContent = resolvedName;
    applyBadge(headerVendorName, rawPlan, isVerified, planRoleLabel);
  }

  if (businessNameHeading) {
    if (hasBusiness) {
      businessNameHeading.hidden = false;
      businessNameHeading.textContent = resolvedBusiness;
      applyBadge(businessNameHeading, rawPlan, isVerified, planRoleLabel);
    } else {
      businessNameHeading.textContent = EMPTY_MARK;
      businessNameHeading.hidden = true;
      clearBadges(businessNameHeading);
    }
  }

  if (planBadge) {
    planBadge.textContent = planChipDisplay;
    planBadge.dataset.plan = rawPlan || 'Free';
    planBadge.dataset.planSlug = planSlug;
    planBadge.dataset.planLabel = planRoleLabel;
  }

  if (vendorNameField) {
    vendorNameField.textContent = resolvedName;
    applyBadge(vendorNameField, rawPlan, isVerified, planRoleLabel);
  }

  if (businessField) {
    if (hasBusiness) {
      businessField.textContent = resolvedBusiness;
      applyBadge(businessField, rawPlan, isVerified, planRoleLabel);
    } else {
      businessField.textContent = EMPTY_MARK;
      clearBadges(businessField);
    }
  }

  if (emailField) emailField.textContent = safeText(email);
  if (phoneField) phoneField.textContent = safeText(phone);
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
    if (normalisedPlan.toLowerCase().startsWith('free')) {
      upgradeBanner.style.display = 'flex';
    } else {
      upgradeBanner.style.display = 'none';
    }
  }

  if (document.body) {
    document.body.dataset.vendorPlan = rawPlan || 'Free';
    document.body.dataset.vendorPlanLabel = planRoleLabel;
    document.body.dataset.vendorPlanSlug = planSlug;
    document.body.dataset.vendorVerified = verificationState || (isVerified ? 'verified' : 'unverified');
  }

  updateVerificationCTA({
    ...profile,
    plan: rawPlan || 'Free',
    verified: isVerified,
    verification: {
      ...verificationData,
      state: verificationState,
    },
  });
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

  verificationBtn?.addEventListener('click', () => {
    if (verificationBtn.disabled) return;
    window.location.href = 'vendor-verification.php';
  });
};

document.addEventListener('DOMContentLoaded', () => {
  bindActions();
  fetchProfile();
});
