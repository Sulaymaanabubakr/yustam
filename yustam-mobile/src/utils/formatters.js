const DEFAULT_LOCALE = 'en-NG';
const DEFAULT_CURRENCY = 'NGN';

const parseDateInput = (value) => {
  if (!value && value !== 0) {
    return null;
  }

  if (value instanceof Date) {
    return new Date(value.getTime());
  }

  if (typeof value === 'number') {
    const timestamp = value < 1e12 ? value * 1000 : value;
    return new Date(timestamp);
  }

  if (typeof value === 'string') {
    const numeric = Number(value);
    if (!Number.isNaN(numeric) && value.trim() !== '') {
      return parseDateInput(numeric);
    }

    const parsed = Date.parse(value);
    if (!Number.isNaN(parsed)) {
      return new Date(parsed);
    }
  }

  if (typeof value === 'object') {
    const seconds = value.seconds ?? value._seconds;
    const nanos = value.nanoseconds ?? value.nanos ?? value._nanoseconds ?? 0;
    if (typeof seconds === 'number') {
      return new Date(seconds * 1000 + Math.floor(nanos / 1_000_000));
    }
  }

  return null;
};

const buildNumberFormatter = (options = {}) => {
  try {
    return new Intl.NumberFormat(DEFAULT_LOCALE, options);
  } catch {
    return null;
  }
};

export const formatNumber = (value, options = {}) => {
  const amount = Number(value);
  if (!Number.isFinite(amount)) {
    return '0';
  }

  const formatter = buildNumberFormatter({
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
    ...options,
  });

  return formatter ? formatter.format(amount) : `${amount}`;
};

export const formatNaira = (value, options = {}) => {
  const amount = Number(value);
  if (!Number.isFinite(amount)) {
    return '₦0';
  }

  const formatter = buildNumberFormatter({
    style: 'currency',
    currency: DEFAULT_CURRENCY,
    currencyDisplay: 'symbol',
    minimumFractionDigits: options?.showKobo ? 2 : 0,
    maximumFractionDigits: options?.showKobo ? 2 : 0,
    ...options,
  });

  if (!formatter) {
    return `₦${amount.toLocaleString('en-US', {
      minimumFractionDigits: options?.showKobo ? 2 : 0,
      maximumFractionDigits: options?.showKobo ? 2 : 0,
    })}`;
  }

  return formatter.format(amount);
};

export const formatDate = (value, options = {}) => {
  const date = parseDateInput(value);
  if (!date) {
    return '--';
  }

  try {
    const formatter = new Intl.DateTimeFormat(DEFAULT_LOCALE, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      ...options,
    });
    return formatter.format(date);
  } catch {
    return date.toDateString();
  }
};

export const formatDateTime = (value, options = {}) => {
  const date = parseDateInput(value);
  if (!date) {
    return '--';
  }

  try {
    const formatter = new Intl.DateTimeFormat(DEFAULT_LOCALE, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      hour12: true,
      ...options,
    });
    return formatter.format(date);
  } catch {
    return `${date.toDateString()} ${date.toLocaleTimeString()}`;
  }
};

export const timeAgo = (value) => {
  const date = parseDateInput(value);
  if (!date) {
    return '';
  }

  const diffMs = Date.now() - date.getTime();

  if (diffMs < 30 * 1000) {
    return 'Just now';
  }

  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }

  const days = Math.floor(hours / 24);
  if (days === 1) {
    return 'Yesterday';
  }

  if (days < 7) {
    return `${days}d ago`;
  }

  if (days < 30) {
    return formatDate(date, { month: 'short', day: 'numeric' });
  }

  return formatDate(date);
};

export const formatCount = (value) => {
  const amount = Number(value);
  if (!Number.isFinite(amount)) {
    return '0';
  }

  if (amount < 1000) {
    return `${amount}`;
  }

  if (amount < 1000000) {
    return `${(amount / 1000).toFixed(1).replace(/\.0$/, '')}K`;
  }

  return `${(amount / 1000000).toFixed(1).replace(/\.0$/, '')}M`;
};

export const formatPercentage = (value, options = {}) => {
  const amount = Number(value);
  if (!Number.isFinite(amount)) {
    return '0%';
  }

  const formatter = buildNumberFormatter({
    style: 'percent',
    maximumFractionDigits: 1,
    ...options,
  });

  return formatter ? formatter.format(amount) : `${amount * 100}%`;
};

export const formatDuration = (secondsInput) => {
  const totalSeconds = Math.max(0, Number(secondsInput));
  if (!Number.isFinite(totalSeconds)) {
    return '0s';
  }

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
};

export default {
  formatNumber,
  formatNaira,
  formatDate,
  formatDateTime,
  timeAgo,
  formatCount,
  formatPercentage,
  formatDuration,
};

