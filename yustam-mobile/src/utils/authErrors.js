const AUTH_ERROR_MESSAGES = {
  'auth/email-already-in-use': 'This email is already registered. Please login instead.',
  'auth/invalid-email': 'Invalid email address. Please check and try again.',
  'auth/user-not-found': 'No account found with this email. Please register first.',
  'auth/invalid-credential': 'Incorrect email or password. Please try again.',
  'auth/wrong-password': 'Incorrect password. Please try again.',
  'auth/missing-password': 'Password is required. Please enter your password.',
  'auth/weak-password': 'Password is too weak. Use at least 6 characters.',
  'auth/missing-email': 'Email address is required. Please enter your email.',
  'auth/network-request-failed': 'Network error. Please check your connection.',
  'auth/too-many-requests': 'Too many attempts. Please try again later.',
  'auth/user-disabled': 'This account has been disabled. Contact support for help.',
};

export const getAuthErrorMessage = (errorCode) => {
  if (!errorCode) {
    return 'Authentication failed. Please try again.';
  }
  return AUTH_ERROR_MESSAGES[errorCode] || 'Authentication failed. Please try again.';
};

const isFirebaseErrorMessage = (message = '') => /auth\/[a-z-]+/i.test(message);

export const resolveAuthErrorMessage = (
  error,
  fallbackMessage = 'Authentication failed. Please try again.'
) => {
  if (!error) {
    return fallbackMessage;
  }

  const code = typeof error === 'object' && error !== null ? error.code : undefined;
  if (code) {
    return getAuthErrorMessage(code);
  }

  if (error instanceof Error) {
    const trimmed = (error.message || '').trim();
    if (trimmed && !/^firebase:/i.test(trimmed) && !isFirebaseErrorMessage(trimmed)) {
      return trimmed;
    }
  } else if (typeof error === 'string') {
    const trimmed = error.trim();
    if (trimmed && !/^firebase:/i.test(trimmed) && !isFirebaseErrorMessage(trimmed)) {
      return trimmed;
    }
  }

  return fallbackMessage;
};

export default resolveAuthErrorMessage;
