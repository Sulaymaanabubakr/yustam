import { auth } from './firebase.js';
import {
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
} from 'https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js';
import {
  ADMIN_API_BASE_URL,
  storeAdminSession,
  clearAdminSession,
  adminRequest,
  getAdminToken,
} from './admin-api.js';

const loginForm = document.getElementById('adminLoginForm');
const loginBtn = document.getElementById('loginBtn');
const errorMessage = document.getElementById('errorMessage');
const toast = document.getElementById('toast');
const pageLoader = document.getElementById('pageLoader');
const loginCard = document.getElementById('loginCard');

const setButtonLoading = (loading) => {
  if (!loginBtn) return;
  const label = loginBtn.querySelector('.btn-label');
  if (loading) {
    loginBtn.disabled = true;
    if (!loginBtn.querySelector('.spinner')) {
      const spinner = document.createElement('span');
      spinner.className = 'spinner';
      spinner.setAttribute('aria-hidden', 'true');
      loginBtn.prepend(spinner);
    }
    if (label) label.textContent = 'Authenticating...';
  } else {
    loginBtn.disabled = false;
    const spinner = loginBtn.querySelector('.spinner');
    if (spinner) spinner.remove();
    if (label) label.textContent = 'Login to Dashboard';
  }
};

const showToast = (message, tone = 'success') => {
  if (!toast) return;
  toast.textContent = message;
  toast.style.background =
    tone === 'error' ? 'rgba(216, 67, 21, 0.92)' : 'rgba(0, 77, 64, 0.92)';
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2500);
};

const triggerError = (message) => {
  if (!errorMessage || !loginCard) return;
  errorMessage.textContent = message;
  loginCard.classList.remove('shake');
  void loginCard.offsetWidth;
  loginCard.classList.add('shake');
};

const redirectToDashboard = () => {
  window.location.href = 'admin-dashboard.php';
};

const establishBackendSession = async (firebaseUser) => {
  const idToken = await firebaseUser.getIdToken(true);
  const response = await fetch(`${ADMIN_API_BASE_URL}/auth/session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ idToken }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload?.token) {
    throw new Error(payload?.message || 'Unable to create admin session.');
  }
  if (payload.user?.role !== 'ADMIN') {
    throw new Error('This account is not authorised for admin access.');
  }
  storeAdminSession({ token: payload.token, user: payload.user });
  return payload.user;
};

const checkExistingSession = async () => {
  const token = getAdminToken();
  if (!token) {
    pageLoader?.classList.remove('active');
    return;
  }
  try {
    const current = await adminRequest('/auth/me');
    if (current?.user?.role === 'ADMIN') {
      redirectToDashboard();
      return;
    }
    throw new Error('not admin');
  } catch (error) {
    console.warn('Admin session invalid', error);
    clearAdminSession();
    await signOut(auth).catch(() => undefined);
    pageLoader?.classList.remove('active');
  }
};

loginForm?.addEventListener('submit', async (event) => {
  event.preventDefault();

  if (!loginForm) return;
  const formData = new FormData(loginForm);
  const email = (formData.get('adminEmail') || '').toString().trim().toLowerCase();
  const password = (formData.get('adminPassword') || '').toString();

  errorMessage.textContent = '';

  if (!email || !password) {
    triggerError('Please enter both email and password.');
    return;
  }

  try {
    setButtonLoading(true);
    const credential = await signInWithEmailAndPassword(auth, email, password);
    const firebaseUser = credential.user;
    await establishBackendSession(firebaseUser);

    showToast('Access granted. Redirecting...');
    setTimeout(() => {
      redirectToDashboard();
    }, 800);
  } catch (error) {
    console.error('Admin login failed:', error);
    const message = error?.message || 'Unable to sign in right now. Please try again.';
    triggerError(message);
    showToast(message, 'error');
  } finally {
    setButtonLoading(false);
  }
});

document.addEventListener('DOMContentLoaded', () => {
  pageLoader?.classList.add('active');
  checkExistingSession();
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      try {
        await establishBackendSession(user);
        redirectToDashboard();
      } catch (error) {
        console.warn('Firebase session present but backend session failed', error);
        await signOut(auth).catch(() => undefined);
        clearAdminSession();
        pageLoader?.classList.remove('active');
      }
    }
  });
});
