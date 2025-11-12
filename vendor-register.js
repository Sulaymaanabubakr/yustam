// vendor-register.js  (updated for PHP backend)

// We keep all your UI validation and toast logic
const passwordInput = document.getElementById('passwordInput');
const confirmPasswordInput = document.getElementById('confirmPasswordInput');
const tipLength = document.getElementById('tipLength');
const tipMatch = document.getElementById('tipMatch');
const registerBtn = document.getElementById('registerBtn');
const termsCheckbox = document.getElementById('termsCheckbox');
const toastContainer = document.querySelector('.toast-container');

const toggleTipState = (element, isValid) => {
  element.classList.toggle('valid', isValid);
};

const evaluatePasswordTips = () => {
  const passwordValue = passwordInput.value.trim();
  const confirmValue = confirmPasswordInput.value.trim();
  const lengthValid = passwordValue.length >= 6;
  const matchValid = passwordValue.length > 0 && passwordValue === confirmValue;

  toggleTipState(tipLength, lengthValid);
  toggleTipState(tipMatch, matchValid);

  confirmPasswordInput.setCustomValidity(matchValid || confirmValue.length === 0 ? '' : 'Passwords do not match');
};

const updateButtonState = () => {
  registerBtn.disabled = !termsCheckbox.checked;
};

const showToast = (message, type = 'success') => {
  if (!toastContainer) return;
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  const icon = document.createElement('i');
  icon.className = type === 'success' ? 'ri-check-line' : 'ri-error-warning-line';
  const text = document.createElement('span');
  text.textContent = message;
  toast.append(icon, text);
  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = 'toastOut 0.35s forwards';
    toast.addEventListener('animationend', () => toast.remove(), { once: true });
  }, 2600);
};

passwordInput.addEventListener('input', evaluatePasswordTips);
confirmPasswordInput.addEventListener('input', evaluatePasswordTips);
termsCheckbox.addEventListener('change', updateButtonState);

window.addEventListener('DOMContentLoaded', () => {
  evaluatePasswordTips();
  updateButtonState();
});

// Helpers
const registerForm = document.getElementById('vendorRegisterForm');
const getFieldValue = (form, fieldName) => (form.elements[fieldName]?.value || '').trim();

registerForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  event.stopPropagation();

  if (!registerForm.checkValidity()) {
    registerForm.reportValidity();
    return;
  }

  if (!termsCheckbox.checked) {
    showToast('Please accept the marketplace policies to continue.', 'error');
    return;
  }

  const fullName = getFieldValue(registerForm, 'fullName');
  const email = getFieldValue(registerForm, 'email').toLowerCase();
  const phone = getFieldValue(registerForm, 'phone');
  const password = getFieldValue(registerForm, 'password');
  const confirmPassword = getFieldValue(registerForm, 'confirmPassword');
  const businessName = getFieldValue(registerForm, 'businessName');
  const category = registerForm.elements.category?.value || '';

  if (password !== confirmPassword) {
    showToast('Passwords do not match. Please try again.', 'error');
    return;
  }

  registerBtn.disabled = true;
  registerBtn.classList.add('is-loading');

  let registrationComplete = false;

  try {
    // Send data to PHP backend instead of Firebase
    const formData = new FormData();
    formData.append('name', fullName);
    formData.append('email', email);
    formData.append('phone', phone);
    formData.append('password', password);
    formData.append('confirm', confirmPassword);
    formData.append('business_name', businessName);
    formData.append('category', category);

    const response = await fetch('signup.php', {
      method: 'POST',
      body: formData,
    });

    let data;
    try {
      data = await response.json();
    } catch (parseError) {
      console.error('Invalid signup response', parseError);
      throw new Error('We could not create your account. Please try again.');
    }

    if (!response.ok || !data.success) {
      showToast((data && data.message) || 'We could not create your account. Please try again.', 'error');
      return;
    }

    showToast(data.message || 'Account created successfully! Check your email to verify.', 'success');
    registerForm.reset();
    termsCheckbox.checked = false;
    registerBtn.disabled = true;

    setTimeout(() => {
      window.location.href = 'vendor-login.html';
    }, 2500);

    registrationComplete = true;
  } catch (err) {
    console.error('Registration failed:', err);
    showToast(err.message || 'Something went wrong. Please try again.', 'error');
  } finally {
    registerBtn.classList.remove('is-loading');
    registerBtn.disabled = registrationComplete ? true : false;
  }
});
