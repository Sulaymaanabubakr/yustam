// ---------- Imports ----------
import {
  auth,
  provider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
} from './firebase.js';

// ---------- DOM Elements ----------
const loginForm = document.getElementById('loginForm');
const loginBtn = document.getElementById('loginBtn');
const forgotPasswordBtn = document.getElementById('forgotPasswordBtn');
const formError = document.getElementById('formError');
const googleBtn = document.getElementById('googleBtn');

// ---------- Utility Functions ----------
const setMessage = (message = '', type = 'error') => {
  formError.textContent = message;
  if (!message) {
    formError.classList.remove('success');
    return;
  }
  if (type === 'success') {
    formError.classList.add('success');
  } else {
    formError.classList.remove('success');
  }
};

const setLoading = (loading) => {
  if (!loginBtn) return;
  if (loading) {
    loginBtn.classList.add('loading');
    loginBtn.disabled = true;
  } else {
    loginBtn.classList.remove('loading');
    loginBtn.disabled = false;
  }
};

const GOOGLE_REDIRECT_FLAG = 'yustam.vendor.googleRedirect';

const finishGoogleSignIn = async (user) => {
  if (!user) return;

  const formData = new FormData();
  formData.append('email', user.email);
  formData.append('name', user.displayName || '');
  formData.append('provider', 'google');

  const response = await fetch('google-login.php', {
    method: 'POST',
    body: formData,
    credentials: 'same-origin',
  });

  const data = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(data.message || 'Unable to sign in with Google.');
  }

  sessionStorage.removeItem(GOOGLE_REDIRECT_FLAG);
  setMessage('Welcome back, redirecting.', 'success');
  window.location.href = data.redirect || 'vendor-dashboard.php';
};

const shouldUseRedirect = () => {
  const ua = navigator.userAgent || navigator.vendor || window.opera || '';
  const isTouchViewport = window.matchMedia('(max-width: 768px)').matches;
  const mobileRegex = /android|iphone|ipad|ipod|iemobile|blackberry|opera mini/i;
  const isSafari = /^((?!chrome|android).)*safari/i.test(ua);
  return mobileRegex.test(ua) || isTouchViewport || isSafari;
};

const fallbackErrorCodes = new Set([
  'auth/popup-blocked',
  'auth/popup-closed-by-user',
  'auth/cancelled-popup-request',
  'auth/operation-not-supported-in-this-environment',
]);

const handleRedirectResult = async () => {
  try {
    const pending = sessionStorage.getItem(GOOGLE_REDIRECT_FLAG);
    const result = await getRedirectResult(auth);
    if (result && result.user) {
      if (pending) {
        setMessage('Signing you in...', 'success');
      }
      await finishGoogleSignIn(result.user);
    } else if (pending) {
      sessionStorage.removeItem(GOOGLE_REDIRECT_FLAG);
    }
  } catch (error) {
    console.error('Google redirect error:', error);
    sessionStorage.removeItem(GOOGLE_REDIRECT_FLAG);
    setMessage(error.message || 'Google sign-in failed. Please try again.');
  }
};

window.addEventListener('DOMContentLoaded', handleRedirectResult);

// ---------- EMAIL & PASSWORD LOGIN ----------
loginForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  setMessage('');

  const formData = new FormData(loginForm);
  const email = (formData.get('email') || '').toString().trim().toLowerCase();
  const password = (formData.get('password') || '').toString();

  if (!email || !password) {
    setMessage('Please enter your email and password.');
    return;
  }

  try {
    setLoading(true);
    const response = await fetch('login.php', {
      method: 'POST',
      body: formData,
      credentials: 'same-origin',
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      setMessage(data.message || 'Unable to sign in. Please try again.');
      return;
    }

    setMessage('Signed in successfully. Redirecting…', 'success');
    window.location.href = data.redirect || 'vendor-dashboard.php';
  } catch (error) {
    console.error('Login error', error);
    setMessage(error.message || 'Unable to sign in. Please try again.');
  } finally {
    setLoading(false);
  }
});

// ---------- FORGOT PASSWORD ----------
forgotPasswordBtn?.addEventListener('click', async () => {
  setMessage('');
  const email = (loginForm?.email?.value || '').trim().toLowerCase();
  if (!email) {
    setMessage('Enter your email to receive a reset link.');
    loginForm?.email?.focus();
    return;
  }

  try {
    forgotPasswordBtn.disabled = true;
    forgotPasswordBtn.textContent = 'Sending link…';

    const formData = new FormData();
    formData.append('email', email);
    const response = await fetch('forgot-password.php', {
      method: 'POST',
      body: formData,
      credentials: 'same-origin',
    });

    const data = await response.json();
    if (!response.ok || !data.success) {
      setMessage(data.message || 'Unable to send reset link.');
      return;
    }

    setMessage(data.message || 'Check your inbox for the reset link.', 'success');
  } catch (error) {
    console.error('Forgot password error', error);
    setMessage(error.message || 'Unable to send reset link. Please try again.');
  } finally {
    forgotPasswordBtn.disabled = false;
    forgotPasswordBtn.textContent = 'Forgot password?';
  }
});

// ---------- GOOGLE SIGN-IN ----------
googleBtn?.addEventListener('click', async () => {
  setMessage('Connecting to Google.', 'success');

  try {
    if (shouldUseRedirect()) {
      sessionStorage.setItem(GOOGLE_REDIRECT_FLAG, '1');
      await signInWithRedirect(auth, provider);
      return;
    }

    const result = await signInWithPopup(auth, provider);
    await finishGoogleSignIn(result.user);
  } catch (error) {
    console.error('Google sign-in error:', error);
    if (fallbackErrorCodes.has(error?.code || '')) {
      try {
        sessionStorage.setItem(GOOGLE_REDIRECT_FLAG, '1');
        await signInWithRedirect(auth, provider);
        return;
      } catch (redirectError) {
        console.error('Google redirect fallback error:', redirectError);
        sessionStorage.removeItem(GOOGLE_REDIRECT_FLAG);
        setMessage(redirectError.message || 'Google sign-in failed. Please try again.');
        return;
      }
    }
    setMessage(error.message || 'Google sign-in failed. Please try again.');
  }
});
