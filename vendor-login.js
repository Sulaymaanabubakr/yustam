// ---------- Imports ----------
import { auth, provider, signInWithPopup } from './firebase.js';

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
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      setMessage(data.message || 'Unable to sign in. Please try again.');
      return;
    }

    setMessage('Signed in successfully. Redirecting.', 'success');
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
    forgotPasswordBtn.textContent = 'Sending link.';

    const formData = new FormData();
    formData.append('email', email);
    const response = await fetch('forgot-password.php', {
      method: 'POST',
      body: formData,
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
    const result = await signInWithPopup(auth, provider);
    const user = result.user;

    // Send Google user data to backend PHP
    const formData = new FormData();
    formData.append('email', user.email);
    formData.append('name', user.displayName || '');
    formData.append('provider', 'google');

    const response = await fetch('google-login.php', {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();

    if (data.success) {
      setMessage('Welcome back, redirecting.', 'success');
      window.location.href = data.redirect || 'vendor-dashboard.php';
    } else {
      setMessage(data.message || 'Unable to sign in with Google.');
    }
  } catch (error) {
    console.error('Google sign-in error:', error);
    setMessage('Google sign-in failed. Please try again.');
  }
});
*** End Patch
