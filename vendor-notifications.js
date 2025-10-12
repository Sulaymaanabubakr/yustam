const notificationData = [
  {
    id: "notif-1",
    title: "Vendor verification approved",
    message: "Your vendor verification has been approved.",
    detail: "Your vendor verification has been approved. You can now access all marketplace tools without restrictions.",
    timestamp: "Today, 9:24 AM",
    type: "shield-check",
    status: "new"
  },
  {
    id: "notif-2",
    title: "Listing published",
    message: "Your listing ‘iPhone 12 Pro’ was successfully published.",
    detail: "Your listing ‘iPhone 12 Pro’ was successfully published and is now live for shoppers across Nigeria.",
    timestamp: "Yesterday, 7:10 PM",
    type: "check",
    status: "new"
  },
  {
    id: "notif-3",
    title: "Plan expiring soon",
    message: "Your plan will expire in 2 days.",
    detail: "Heads up! Your current plan will expire in 2 days. Renew now to keep your listings active without interruptions.",
    timestamp: "Yesterday, 12:35 PM",
    type: "alert",
    status: "new"
  },
  {
    id: "notif-4",
    title: "Listing performance update",
    message: "You received 5 new listing views today.",
    detail: "Great news! You received 5 new listing views today. Keep your inventory fresh to convert more shoppers.",
    timestamp: "2 days ago",
    type: "bell",
    status: "read"
  },
  {
    id: "notif-5",
    title: "Password changed",
    message: "Your password was changed successfully.",
    detail: "Your password was changed successfully. If you did not make this change, contact support immediately.",
    timestamp: "2 days ago",
    type: "shield",
    status: "read"
  }
];

const iconMap = {
  bell: "ri-notification-3-line",
  check: "ri-checkbox-circle-line",
  "shield-check": "ri-shield-check-line",
  shield: "ri-shield-keyhole-line",
  alert: "ri-error-warning-line"
};

const state = {
  notifications: [...notificationData]
};

const selectors = {
  grid: document.getElementById("notificationsGrid"),
  emptyState: document.getElementById("emptyState"),
  newCount: document.getElementById("newCount"),
  markAllButtons: [
    document.getElementById("markAllRead"),
    document.getElementById("markAllReadTop")
  ],
  clearAll: document.getElementById("clearAll"),
  toast: document.getElementById("toast")
};

const renderNotifications = () => {
  const { notifications } = state;
  const grid = selectors.grid;

  if (!grid) return;

  grid.innerHTML = "";

  if (!notifications.length) {
    selectors.emptyState.style.display = "flex";
    selectors.emptyState.setAttribute("aria-hidden", "false");
    updateSummary();
    return;
  }

  selectors.emptyState.style.display = "none";
  selectors.emptyState.setAttribute("aria-hidden", "true");

  const fragment = document.createDocumentFragment();

  notifications.forEach((notification, index) => {
    const card = document.createElement("article");
    card.className = "notification-card";
    card.dataset.notificationId = notification.id;
    card.style.animationDelay = `${index * 60}ms`;

    const iconClass = iconMap[notification.type] || iconMap.bell;
    const statusClass = notification.status === "new" ? "status-new" : "status-read";
    const badgeText = notification.status === "new" ? "New" : "Read";

    card.innerHTML = `
      <div class="notification-header">
        <span class="notification-icon"><i class="${iconClass}"></i></span>
        <div class="notification-content">
          <div class="notification-title">${notification.title}</div>
          <div class="notification-message">${notification.message}</div>
        </div>
      </div>
      <div class="notification-meta">
        <span>${notification.timestamp}</span>
        <span class="status-badge ${statusClass}">${badgeText}</span>
      </div>
      <div class="notification-detail">${notification.detail || notification.message}</div>
    `;

    card.addEventListener("click", (event) => {
      // Avoid toggling when clicking on action buttons if added later
      if (event.target.closest("button")) return;
      card.classList.toggle("open");
    });

    fragment.appendChild(card);
  });

  grid.appendChild(fragment);
  updateSummary();
};

const updateSummary = () => {
  const newCount = state.notifications.filter((n) => n.status === "new").length;
  if (selectors.newCount) {
    selectors.newCount.textContent = newCount;
  }
};

const markAllAsRead = () => {
  let changed = false;
  state.notifications = state.notifications.map((notification) => {
    if (notification.status === "new") {
      changed = true;
      return { ...notification, status: "read" };
    }
    return notification;
  });

  if (!changed) {
    showToast("All caught up! No new notifications.");
    return;
  }

  renderNotifications();
  showToast("All notifications marked as read.");
};

const clearAllNotifications = () => {
  if (!state.notifications.length) {
    showToast("There are no notifications to clear.");
    return;
  }

  state.notifications = [];
  renderNotifications();
  showToast("All notifications cleared.");
};

const showToast = (message) => {
  const toast = selectors.toast;
  if (!toast) return;

  toast.textContent = message;
  toast.classList.add("show");

  clearTimeout(showToast.timeoutId);
  showToast.timeoutId = setTimeout(() => {
    toast.classList.remove("show");
  }, 2600);
};

const simulateNewNotification = () => {
  const sample = {
    id: `notif-${Date.now()}`,
    title: "Fresh leads incoming",
    message: "You have 2 fresh buyer leads waiting.",
    detail: "You gained 2 new interested buyers. Reach out quickly to close the sale!",
    timestamp: "Just now",
    type: "bell",
    status: "new"
  };

  state.notifications = [sample, ...state.notifications];
  renderNotifications();
  showToast("New notification received.");
};

const attachEventListeners = () => {
  selectors.markAllButtons.forEach((button) => {
    if (!button) return;
    button.addEventListener("click", (event) => {
      event.preventDefault();
      markAllAsRead();
    });
  });

  if (selectors.clearAll) {
    selectors.clearAll.addEventListener("click", (event) => {
      event.preventDefault();
      clearAllNotifications();
    });
  }
};

const init = () => {
  renderNotifications();
  attachEventListeners();
  setInterval(simulateNewNotification, 30000);
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
