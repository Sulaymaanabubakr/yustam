export const normalizeAutoRenewFlag = (value, fallback = true) => {
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'number') {
    return value === 1;
  }
  if (typeof value === 'string') {
    const lowered = value.trim().toLowerCase();
    if (['1', 'true', 'on', 'auto', 'enabled', 'active', 'yes'].includes(lowered)) {
      return true;
    }
    if (['0', 'false', 'off', 'manual', 'disabled', 'cancelled', 'inactive', 'no'].includes(lowered)) {
      return false;
    }
  }
  if (value === null || value === undefined) {
    return fallback;
  }
  return Boolean(value);
};

export const deriveSubscriptionStatusMeta = (status, autoRenew, cancelled = false) => {
  const cleanedStatus = (status || '').trim();
  const statusLower = cleanedStatus.toLowerCase();
  const autoRenewEnabled = normalizeAutoRenewFlag(autoRenew, true);
  const cancellationScheduled = Boolean(
    cancelled ||
      !autoRenewEnabled ||
      statusLower.includes('cancel')
  );
  const primaryStatus = cancellationScheduled ? 'Active' : cleanedStatus || 'Active';
  const secondaryStatus = cancellationScheduled ? 'Renews off' : null;
  const renewalLabel = cancellationScheduled ? 'Expires on' : 'Next billing';
  return {
    autoRenewEnabled,
    cancellationScheduled,
    primaryStatus,
    secondaryStatus,
    renewalLabel,
  };
};

export const cleanPlanDisplayName = (value = '') => {
  const base = String(value || '').trim();
  if (!base) {
    return '';
  }
  const cleaned = base.replace(/\s*-\s*(\d+\s*)?(month|months|quarter|quarterly|week|weeks|year|years|annual|annually)\b.*$/i, '');
  return cleaned.trim();
};
