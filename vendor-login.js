const loginForm = document.getElementById('loginForm');
const loginBtn = document.getElementById('loginBtn');
const forgotPasswordBtn = document.getElementById('forgotPasswordBtn');
const formError = document.getElementById('formError');
const googleBtn = document.getElementById('googleBtn');

const params = new URLSearchParams(window.location.search);
const statusMessage = params.get('message');
const statusType = params.get('status');
if (statusMessage) {
  formError.textContent = statusMessage;
  if (statusType === 'success') {
    formError.classList.add('success');
  }
}

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
    const response = await fetch('/login.php', {
  method: 'POST',
  body: formData,
});

    let data;
    try {
      data = await response.json();
    } catch (parseError) {
      console.error('Invalid login response', parseError);
      throw new Error('Unable to sign in. Please try again.');
    }

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
    });
    let data;
    try {
      data = await response.json();
    } catch (parseError) {
      console.error('Invalid forgot-password response', parseError);
      throw new Error('Unable to send reset link.');
    }

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

import { getAuth, GoogleAuthProvider, signInWithPopup }
  from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";

const auth = getAuth();
const provider = new GoogleAuthProvider();

if (googleBtn) {
  googleBtn.addEventListener('click', async () => {
    setMessage('');
    try {
      // Sign in with Google popup
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // Prepare data for PHP backend
      const formData = new FormData();
      formData.append('email', user.email);
      formData.append('name', user.displayName);
      formData.append('google_id', user.uid);

      const response = await fetch('/google-login.php', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (!data.success) {
        setMessage(data.message || 'Google sign-in failed.');
        return;
      }

      setMessage('Signed in successfully. Redirecting…', 'success');
      window.location.href = data.redirect || 'vendor-dashboard.php';
    } catch (error) {
      console.error('Google sign-in error', error);
      setMessage(error.message || 'Google sign-in failed.');
    }
  });
}
