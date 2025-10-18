// ---------- Imports ----------
import { auth, provider, signInWithPopup } from './firebase.js';

const formSelectors = {
  form: 'loginForm',
  submit: 'loginBtn',
  message: 'formError',
  google: 'googleBtn',
};

const getElement = (id) => document.getElementById(id);

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

const setMessage = (message, type = 'error') => {
  const messageBox = getElement(formSelectors.message);
  if (!messageBox) return;
  messageBox.textContent = message || '';
  if (!message) {
    messageBox.classList.remove('success');
    return;
  }
  if (type === 'success') {
    messageBox.classList.add('success');
  } else {
    messageBox.classList.remove('success');
  }
};

const setLoading = (loading) => {
  const submitBtn = getElement(formSelectors.submit);
  if (!submitBtn) return;
  if (loading) {
    submitBtn.classList.add('loading');
    submitBtn.disabled = true;
  } else {
    submitBtn.classList.remove('loading');
    submitBtn.disabled = false;
  }
};

const handleEmailLogin = async (event) => {
  event.preventDefault();
  const form = event.currentTarget;

  const emailField = form ? form.querySelector('[name=\"email\"]') : null;
  const passwordField = form ? form.querySelector('[name=\"password\"]') : null;

  const email = emailField ? String(emailField.value || '').trim().toLowerCase() : '';
  const password = passwordField ? String(passwordField.value || '') : '';

  setMessage('');

  if (!email || !password) {
    setMessage('Please enter your email and password.');
    return;
  }

  try {
    setLoading(true);
    const response = await fetch('login.php', {
      method: 'POST',
      body: new FormData(form),
      credentials: 'same-origin',
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok || !data.success) {
      const errorMessage = data && data.message ? data.message : 'Unable to sign in. Please try again.';
      setMessage(errorMessage);
      return;
    }

    if (data && data.uid) {
      syncYustamUid(data.uid);
    }

    setMessage('Signed in successfully. Redirecting.', 'success');
    window.location.href = data.redirect || 'vendor-dashboard.php';
  } catch (error) {
    console.error('Login error', error);
    setMessage(error && error.message ? error.message : 'Unable to sign in. Please try again.');
  } finally {
    setLoading(false);
  }
};

const handleForgotPassword = async (event) => {
  const form = getElement(formSelectors.form);
  const emailField = form ? form.querySelector('[name=\"email\"]') : null;
  const email = emailField ? String(emailField.value || '').trim().toLowerCase() : '';

  setMessage('');

  if (!email) {
    setMessage('Enter your email to receive a reset link.');
    if (emailField) emailField.focus();
    event.preventDefault();
    return;
  }

  try {
    const trigger = event.currentTarget;
    if (trigger) {
      trigger.setAttribute('aria-busy', 'true');
    }
    const payload = new FormData();
    payload.append('email', email);

    const response = await fetch('forgot-password.php', {
      method: 'POST',
      body: payload,
      credentials: 'same-origin',
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok || !data.success) {
      setMessage((data && data.message) || 'Unable to send reset link.');
      event.preventDefault();
      return;
    }

    setMessage((data && data.message) || 'Check your inbox for the reset link.', 'success');
    event.preventDefault();
  } catch (error) {
    console.error('Forgot password error', error);
    setMessage((error && error.message) || 'Unable to send reset link. Please try again.');
    event.preventDefault();
  } finally {
    const trigger = event.currentTarget;
    if (trigger) {
      trigger.removeAttribute('aria-busy');
    }
  }
};

const handleGoogleLogin = async () => {
  setMessage('Connecting to Google.', 'success');

  try {
    const result = await signInWithPopup(auth, provider);
    const user = result && result.user ? result.user : null;
    if (!user || !user.email) {
      throw new Error('We could not complete Google sign-in. Please try again.');
    }

    const payload = new FormData();
    payload.append('email', user.email);
    payload.append('name', user.displayName || '');
    payload.append('provider', 'google');

    const response = await fetch('google-login.php', {
      method: 'POST',
      body: payload,
      credentials: 'same-origin',
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok || !data.success) {
      setMessage((data && data.message) || 'Unable to sign in with Google.');
      return;
    }

    if (data && data.uid) {
      syncYustamUid(data.uid);
    }

    setMessage('Welcome back, redirecting.', 'success');
    window.location.href = data.redirect || 'vendor-dashboard.php';
  } catch (error) {
    console.error('Google sign-in error:', error);
    setMessage((error && error.message) || 'Google sign-in failed. Please try again.');
  }
};

const initLogin = () => {
  const form = getElement(formSelectors.form);
  if (form) {
    form.addEventListener('submit', handleEmailLogin);
  }

  // Optional forgot password trigger (if rendered as a button)
  const forgotPasswordBtn = getElement('forgotPasswordBtn');
  if (forgotPasswordBtn) {
    forgotPasswordBtn.addEventListener('click', handleForgotPassword);
  }

  const googleBtn = getElement(formSelectors.google);
  if (googleBtn) {
    googleBtn.addEventListener('click', (event) => {
      event.preventDefault();
      handleGoogleLogin();
    });
  }

  console.info('Vendor login script ready');
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initLogin);
} else {
  initLogin();
}
