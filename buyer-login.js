import { auth, provider, signInWithPopup } from './firebase.js';

const googleBtn = document.getElementById('googleBtn');
const toast = document.getElementById('authToast');

const syncYustamUid = (uid) => {
  const value = typeof uid === 'string' ? uid.trim() : '';
  if (!value) return;
  try {
    sessionStorage.setItem('yustam_uid', value);
  } catch (error) {
    console.warn('Unable to persist session uid', error);
  }
  try {
    localStorage.setItem('yustam_uid', value);
  } catch (error) {
    console.warn('Unable to persist uid', error);
  }
};

const showToast = (message, timeout = 2800) => {
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('is-visible');
  if (timeout) {
    setTimeout(() => {
      toast.classList.remove('is-visible');
    }, timeout);
  }
};

const hideToast = () => toast?.classList.remove('is-visible');

const setGoogleLoading = (loading) => {
  if (!googleBtn) return;
  googleBtn.disabled = loading;
  googleBtn.classList.toggle('loading', loading);
  const label = googleBtn.querySelector('.google-label');
  if (label) {
    label.textContent = loading ? 'Connecting.' : 'Sign in with Google';
  }
};

googleBtn?.addEventListener('click', async () => {
  hideToast();
  setGoogleLoading(true);
  try {
    const result = await signInWithPopup(auth, provider);
    const user = result.user;

    const formData = new FormData();
    formData.append('email', user.email);
    formData.append('name', user.displayName || '');
    formData.append('provider', 'google');

    const response = await fetch('buyer-google-login.php', {
      method: 'POST',
      body: formData,
    });

    const data = await response.json().catch(() => null);

    if (!response.ok || !data || !data.success) {
      throw new Error(data?.message || 'Unable to sign in with Google.');
    }

    if (data && data.uid) {
      syncYustamUid(data.uid);
    }

    showToast(data.message || 'Signed in successfully. Redirecting.');
    window.location.href = data.redirect || 'buyer-dashboard.php';
  } catch (error) {
    console.error('Buyer Google sign-in error:', error);
    showToast(error.message || 'Google sign-in failed. Please try again.');
  } finally {
    setGoogleLoading(false);
  }
});

const initialError = window.__BUYER_AUTH_ERROR__ || '';
if (initialError) {
  showToast(initialError);
  window.__BUYER_AUTH_ERROR__ = '';
}
