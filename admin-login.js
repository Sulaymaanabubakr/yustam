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

const checkExistingSession = async () => {
  try {
    const response = await fetch('admin-session-status.php', {
      method: 'GET',
      credentials: 'same-origin',
    });
    if (response.ok) {
      redirectToDashboard();
    } else if (pageLoader) {
      pageLoader.classList.remove('active');
    }
  } catch (error) {
    console.error('Session check failed:', error);
    if (pageLoader) {
      pageLoader.classList.remove('active');
    }
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
    const response = await fetch('admin-login-action.php', {
      method: 'POST',
      credentials: 'same-origin',
      body: new URLSearchParams({
        email,
        password,
      }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok || !data.success) {
      const message = data.message || 'Login failed. Please try again.';
      triggerError(message);
      showToast(message, 'error');
      return;
    }

    showToast('Access granted. Redirecting...');
    setTimeout(() => {
      window.location.href = data.redirect || 'admin-dashboard.php';
    }, 800);
  } catch (error) {
    console.error('Admin login failed:', error);
    const message = 'Unable to sign in right now. Please try again.';
    triggerError(message);
    showToast(message, 'error');
  } finally {
    setButtonLoading(false);
  }
});

document.addEventListener('DOMContentLoaded', () => {
  if (pageLoader) {
    pageLoader.classList.add('active');
  }
  checkExistingSession();
});
