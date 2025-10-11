import { auth, db } from './firebase.js';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  GoogleAuthProvider,
  signInWithPopup,
} from 'https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js';
import { doc, setDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js';

const loginForm = document.getElementById('adminLoginForm');
const loginBtn = document.getElementById('loginBtn');
const errorMessage = document.getElementById('errorMessage');
const googleLoginBtn = document.getElementById('googleLoginBtn');
const toast = document.getElementById('toast');
const loginCard = document.getElementById('loginCard');
const pageLoader = document.getElementById('pageLoader');

const PRIMARY_ADMIN_EMAIL = 'abubakrsulaymaan@gmail.com';
const ADMIN_EMAILS = new Set([PRIMARY_ADMIN_EMAIL]);

const setButtonLoading = (isLoading) => {
  const label = loginBtn.querySelector('.btn-label');
  if (isLoading) {
    loginBtn.disabled = true;
    if (!loginBtn.querySelector('.spinner')) {
      const spinner = document.createElement('span');
      spinner.className = 'spinner';
      spinner.setAttribute('aria-hidden', 'true');
      loginBtn.appendChild(spinner);
    }
    if (label) label.textContent = 'Authenticating...';
  } else {
    loginBtn.disabled = false;
    const spinner = loginBtn.querySelector('.spinner');
    if (spinner) spinner.remove();
    if (label) label.textContent = 'Login to Dashboard';
  }
};

const setGoogleButtonLoading = (isLoading) => {
  if (!googleLoginBtn) return;
  if (isLoading) {
    googleLoginBtn.disabled = true;
    googleLoginBtn.innerHTML = '<span class="spinner spinner--dark" aria-hidden="true"></span><span>Connecting...</span>';
  } else {
    googleLoginBtn.disabled = false;
    googleLoginBtn.innerHTML = '<i class="ri-google-fill" aria-hidden="true"></i><span>Sign in with Google</span>';
  }
};

const showToast = (message, tone = 'success') => {
  toast.textContent = message;
  toast.style.background = tone === 'error' ? 'rgba(216, 67, 21, 0.92)' : 'rgba(0, 77, 64, 0.92)';
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2200);
};

const triggerError = (message) => {
  errorMessage.textContent = message;
  loginCard.classList.remove('shake');
  void loginCard.offsetWidth;
  loginCard.classList.add('shake');
};

if (loginForm?.adminEmail) {
  loginForm.adminEmail.value = PRIMARY_ADMIN_EMAIL;
  loginForm.adminEmail.readOnly = true;
  loginForm.adminEmail.setAttribute('aria-readonly', 'true');
}

const ensureAuthorisedEmail = async (user, { interactive = false } = {}) => {
  const email = (user?.email || '').toLowerCase();
  const allowed = ADMIN_EMAILS.has(email);

  if (!allowed) {
    if (interactive) {
      triggerError('This account is not authorised for admin access.');
      showToast('Access denied. Redirecting...', 'error');
    }
    try {
      await signOut(auth);
    } catch (signOutError) {
      console.error('Failed to sign out unauthorised admin:', signOutError);
    }
    localStorage.removeItem('adminLoggedIn');
    setTimeout(() => {
      window.location.href = 'index.html';
    }, interactive ? 1800 : 1200);
    return false;
  }

  return true;
};

const verifyAdmin = async (user, showGrantToast = false) => {
  if (!user) return;

  pageLoader.classList.add('active');

  const authorised = await ensureAuthorisedEmail(user, { interactive: showGrantToast });
  if (!authorised) {
    pageLoader.classList.remove('active');
    return;
  }

  const now = serverTimestamp();
  let profileSaved = false;
  try {
    await setDoc(
      doc(db, 'admins', user.uid),
      {
        email: (user.email || '').toLowerCase(),
        name: user.displayName || '',
        role: 'owner',
        lastLoginAt: now,
        updatedAt: now,
      },
      { merge: true }
    );
    profileSaved = true;
  } catch (error) {
    console.error('Admin profile persistence failed:', error);
    triggerError('Signed in, but unable to update admin record. Check Firestore rules.');
    showToast('Signed in, but admin record was not updated.', 'error');
  }

  if (!profileSaved) {
    try {
      await signOut(auth);
    } catch (signOutError) {
      console.error('Sign-out after admin profile failure:', signOutError);
    }
    pageLoader.classList.remove('active');
    return;
  }

  localStorage.setItem('adminLoggedIn', 'true');
  if (showGrantToast) {
    showToast('Access granted. Redirecting...');
  }

  setTimeout(() => {
    window.location.href = 'admin.html';
  }, showGrantToast ? 1400 : 600);

  pageLoader.classList.remove('active');
};

onAuthStateChanged(auth, (user) => {
  if (user) {
    verifyAdmin(user);
  } else {
    pageLoader.classList.remove('active');
  }
});

loginForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  errorMessage.textContent = '';

  const email = loginForm.adminEmail.value.trim().toLowerCase();
  const password = loginForm.adminPassword.value.trim();

  if (!email || !password) {
    triggerError('Please enter both email and password.');
    return;
  }

  if (!ADMIN_EMAILS.has(email)) {
    triggerError('This email is not authorised for admin access.');
    showToast('Access denied for this email.', 'error');
    return;
  }

  try {
    setButtonLoading(true);
    const credential = await signInWithEmailAndPassword(auth, email, password);
    await verifyAdmin(credential.user, true);
  } catch (error) {
    setButtonLoading(false);
    localStorage.removeItem('adminLoggedIn');
    let message = 'Login failed. Please check your credentials.';
    if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password') {
      message = 'Incorrect email or password. Try again.';
    } else if (error.code === 'auth/user-not-found') {
      message = 'No admin account found with this email.';
    } else if (error.code === 'auth/too-many-requests') {
      message = 'Too many attempts. Please wait and try again later.';
    }
    triggerError(message);
    showToast(message, 'error');
  } finally {
    setButtonLoading(false);
  }
});

googleLoginBtn?.addEventListener('click', async () => {
  errorMessage.textContent = '';
  try {
    setGoogleButtonLoading(true);
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({
      prompt: 'select_account',
      login_hint: PRIMARY_ADMIN_EMAIL,
    });
    const credential = await signInWithPopup(auth, provider);
    await verifyAdmin(credential.user, true);
  } catch (error) {
    let message = 'Google sign-in failed. Please try again.';
    if (error.code === 'auth/popup-closed-by-user') {
      message = 'Google sign-in was cancelled.';
    } else if (error.code === 'auth/account-exists-with-different-credential') {
      message = 'Use your email and password for this admin account.';
    }
    triggerError(message);
    showToast(message, 'error');
  } finally {
    setGoogleButtonLoading(false);
  }
});
