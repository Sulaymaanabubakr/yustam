const iconMap = {
  bell: 'ri-notification-3-line',
  check: 'ri-checkbox-circle-line',
  'shield-check': 'ri-shield-check-line',
  shield: 'ri-shield-keyhole-line',
  alert: 'ri-error-warning-line',
};

const selectors = {
  grid: document.getElementById('notificationsGrid'),
  emptyState: document.getElementById('emptyState'),
  newCount: document.getElementById('newCount'),
  markAllButtons: [
    document.getElementById('markAllRead'),
    document.getElementById('markAllReadTop'),
  ],
  clearAll: document.getElementById('clearAll'),
  toast: document.getElementById('toast'),
};

const state = {
  notifications: [],
  loading: false,
};

const showToast = (message, isError = false) => {
  const toastEl = selectors.toast;
  if (!toastEl) return;
  toastEl.textContent = message;
  toastEl.style.background = isError ? 'rgba(216, 67, 21, 0.92)' : 'rgba(0, 77, 64, 0.92)';
  toastEl.classList.add('show');
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toastEl.classList.remove('show'), 2600);
};

const escapeHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const updateSummary = () => {
  const newCount = state.notifications.filter((notification) => notification.status === 'new').length;
  if (selectors.newCount) selectors.newCount.textContent = String(newCount);
};

const renderNotifications = () => {
  const grid = selectors.grid;
  const emptyState = selectors.emptyState;
  if (!grid || !emptyState) return;

  grid.innerHTML = '';

  if (!state.notifications.length) {
    emptyState.style.display = 'flex';
    emptyState.setAttribute('aria-hidden', 'false');
    updateSummary();
    return;
  }

  emptyState.style.display = 'none';
  emptyState.setAttribute('aria-hidden', 'true');

  const fragment = document.createDocumentFragment();

  state.notifications.forEach((notification, index) => {
    const card = document.createElement('article');
    card.className = 'notification-card';
    card.dataset.notificationId = String(notification.id);
    card.style.animationDelay = `${index * 60}ms`;

    const iconClass = iconMap[notification.type] || iconMap.bell;
    const statusClass = notification.status === 'new' ? 'status-new' : 'status-read';
    const badgeText = notification.status === 'new' ? 'New' : 'Read';
    const messageLine = notification.message || notification.detail || '';
    const detailLine = notification.detail && notification.detail.trim().length ? notification.detail : messageLine;

    card.innerHTML = `
      <div class="notification-header">
        <span class="notification-icon"><i class="${iconClass}"></i></span>
        <div class="notification-content">
          <div class="notification-title">${escapeHtml(notification.title || 'Notification')}</div>
          <div class="notification-message">${escapeHtml(messageLine)}</div>
        </div>
      </div>
      <div class="notification-meta">
        <span>${escapeHtml(notification.createdLabel || '')}</span>
        <span class="status-badge ${statusClass}">${badgeText}</span>
      </div>
      <div class="notification-detail">${escapeHtml(detailLine)}</div>
    `;

    card.addEventListener('click', (event) => {
      if (event.target.closest('button')) return;
      card.classList.toggle('open');
    });

    fragment.appendChild(card);
  });

  grid.appendChild(fragment);
  updateSummary();
};

const fetchNotifications = async () => {
  state.loading = true;
  try {
    const response = await fetch('vendor-notifications-data.php', {
      method: 'GET',
      credentials: 'same-origin',
      headers: { Accept: 'application/json' },
    });

    const payload = await response.json();
    if (!response.ok || !payload?.success) {
      throw new Error(payload?.message || 'Unable to load notifications.');
    }

    const notifications = payload.data?.notifications;
    state.notifications = Array.isArray(notifications) ? notifications : [];
    renderNotifications();
  } catch (error) {
    console.error('[vendor-notifications] load failed', error);
    showToast(error.message || 'Unable to load notifications.', true);
    state.notifications = [];
    renderNotifications();
  } finally {
    state.loading = false;
  }
};

const postNotificationAction = async (action) => {
  try {
    const response = await fetch('vendor-notifications-data.php', {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ action }),
    });

    const payload = await response.json();
    if (!response.ok || !payload?.success) {
      throw new Error(payload?.message || 'Unable to update notifications.');
    }

    showToast(payload.message || 'Notifications updated.');
    await fetchNotifications();
  } catch (error) {
    console.error('[vendor-notifications] action failed', error);
    showToast(error.message || 'Unable to update notifications.', true);
  }
};

const attachEventListeners = () => {
  selectors.markAllButtons.forEach((button) => {
    button?.addEventListener('click', (event) => {
      event.preventDefault();
      if (!state.notifications.length) {
        showToast('All caught up! No new notifications.');
        return;
      }
      postNotificationAction('markAllRead');
    });
  });

  selectors.clearAll?.addEventListener('click', (event) => {
    event.preventDefault();
    if (!state.notifications.length) {
      showToast('There are no notifications to clear.');
      return;
    }
    postNotificationAction('clearAll');
  });
};

const init = () => {
  attachEventListeners();
  fetchNotifications();
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
