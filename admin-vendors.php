<?php
require_once __DIR__ . '/admin-session.php';
require_admin_auth();
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>YUSTAM Admin • Vendor Management</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Anton&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
  <link href="https://cdn.jsdelivr.net/npm/remixicon@3.5.0/fonts/remixicon.css" rel="stylesheet" />
  <style>
    :root {
      --emerald: #004d40;
      --emerald-light: #0c6b5a;
      --orange: #f3731e;
      --orange-dark: #e05e0e;
      --beige: #eadccf;
      --white: #ffffff;
      --ink: #111111;
      --radius-lg: 20px;
      --radius-md: 16px;
      --shadow-soft: 0 18px 48px rgba(0, 0, 0, 0.12);
      --shadow-card: 0 12px 32px rgba(0, 0, 0, 0.08);
      --transition: 0.25s cubic-bezier(0.2, 0.8, 0.2, 1);
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: 'Inter', sans-serif;
      background: linear-gradient(180deg, rgba(234, 220, 207, 0.65), rgba(255, 255, 255, 0.85));
      color: var(--ink);
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }

    header {
      position: sticky;
      top: 0;
      z-index: 999;
      backdrop-filter: blur(14px);
      background: linear-gradient(135deg, #004d40, #016c5a);
      color: var(--white);
      box-shadow: 0 12px 30px rgba(0, 0, 0, 0.18);
    }

    .topbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px clamp(16px, 4vw, 40px);
    }

    .topbar .brand {
      font-family: 'Anton', sans-serif;
      font-size: clamp(22px, 3vw, 28px);
      letter-spacing: 0.04em;
    }

    .topbar-actions {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .icon-btn {
      width: 44px;
      height: 44px;
      border-radius: 50%;
      display: grid;
      place-items: center;
      background: rgba(255, 255, 255, 0.12);
      color: var(--white);
      border: 1px solid rgba(255, 255, 255, 0.15);
      cursor: pointer;
      transition: var(--transition);
      position: relative;
    }

    .icon-btn:hover {
      background: rgba(255, 255, 255, 0.2);
      transform: translateY(-2px);
    }

    .icon-btn .badge {
      position: absolute;
      top: -6px;
      right: -6px;
      background: var(--orange);
      color: var(--white);
      border-radius: 999px;
      padding: 2px 6px;
      font-size: 10px;
      font-weight: 700;
      display: none;
    }

    .accent-strip {
      height: 4px;
      background: var(--orange);
      width: 100%;
    }

    main {
      flex: 1;
      width: min(1200px, 100%);
      margin: 0 auto;
      padding: clamp(24px, 5vw, 40px) clamp(16px, 4vw, 32px) 80px;
      display: flex;
      flex-direction: column;
      gap: clamp(24px, 5vw, 40px);
      opacity: 0;
      transform: translateY(30px);
      transition: 0.5s ease;
    }

    main.ready {
      opacity: 1;
      transform: translateY(0);
    }

    .page-heading {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .page-heading h1 {
      font-family: 'Anton', sans-serif;
      font-size: clamp(26px, 5vw, 36px);
      color: var(--emerald);
      letter-spacing: 0.02em;
      position: relative;
      width: fit-content;
    }

    .page-heading h1::after {
      content: '';
      position: absolute;
      left: 0;
      bottom: -6px;
      width: 60%;
      height: 4px;
      border-radius: 999px;
      background: var(--orange);
    }

    .page-heading p {
      color: rgba(17, 17, 17, 0.72);
      font-size: clamp(14px, 2.4vw, 16px);
    }

    .control-panel {
      background: rgba(255, 255, 255, 0.7);
      border-radius: var(--radius-lg);
      padding: clamp(16px, 4vw, 24px);
      box-shadow: var(--shadow-card);
      display: grid;
      gap: 16px;
      backdrop-filter: blur(18px);
    }

    .control-panel .controls-row {
      display: grid;
      gap: 12px;
    }

    @media (min-width: 680px) {
      .control-panel .controls-row {
        grid-template-columns: repeat(4, minmax(0, 1fr));
      }
    }

    .control-panel .controls-row .wide {
      grid-column: span 2;
    }

    .control-panel input,
    .control-panel select {
      width: 100%;
      border-radius: 14px;
      border: 1px solid rgba(0, 77, 64, 0.2);
      background: rgba(255, 255, 255, 0.9);
      padding: 12px 14px;
      font-size: 0.95rem;
      color: var(--ink);
      transition: var(--transition);
    }

    .control-panel input:focus,
    .control-panel select:focus {
      outline: none;
      border-color: var(--orange);
      box-shadow: 0 0 0 3px rgba(243, 115, 30, 0.18);
    }

    .control-panel .actions {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
    }

    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      border-radius: 999px;
      padding: 12px 20px;
      font-weight: 600;
      font-size: 0.95rem;
      border: none;
      cursor: pointer;
      transition: var(--transition);
      text-decoration: none;
    }

    .btn-primary {
      background: var(--emerald);
      color: var(--white);
    }

    .btn-primary:hover {
      background: var(--emerald-light);
      transform: translateY(-1px);
    }

    .btn-outline {
      background: transparent;
      border: 1.5px solid var(--orange);
      color: var(--orange);
    }

    .btn-outline:hover {
      background: rgba(243, 115, 30, 0.08);
      transform: translateY(-1px);
    }

    .btn-ghost {
      background: rgba(255, 255, 255, 0.12);
      border: 1px solid rgba(255, 255, 255, 0.2);
      color: var(--white);
    }

    .stats-grid {
      display: grid;
      gap: 16px;
    }

    @media (min-width: 768px) {
      .stats-grid {
        grid-template-columns: repeat(4, minmax(0, 1fr));
      }
    }

    .stat-card {
      background: rgba(255, 255, 255, 0.8);
      border-radius: var(--radius-md);
      padding: 20px;
      box-shadow: var(--shadow-card);
      border: 1px solid rgba(0, 77, 64, 0.08);
      display: flex;
      flex-direction: column;
      gap: 8px;
      position: relative;
      overflow: hidden;
    }

    .stat-card::after {
      content: '';
      position: absolute;
      inset: 0;
      background: linear-gradient(135deg, rgba(243, 115, 30, 0.12), rgba(255, 255, 255, 0));
      opacity: 0;
      transition: var(--transition);
    }

    .stat-card:hover::after {
      opacity: 1;
    }

    .stat-card .label {
      font-size: 0.9rem;
      color: rgba(17, 17, 17, 0.72);
    }

    .stat-card .value {
      font-family: 'Anton', sans-serif;
      font-size: clamp(22px, 4vw, 28px);
      color: var(--emerald);
      letter-spacing: 0.02em;
    }

    .plan-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
    }

    .chip {
      padding: 6px 12px;
      border-radius: 999px;
      font-size: 0.8rem;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-weight: 600;
    }

    .chip.free { background: rgba(17, 17, 17, 0.08); color: var(--ink); }
    .chip.plus { border: 1px solid var(--orange); color: var(--orange); background: rgba(243, 115, 30, 0.08); }
    .chip.pro { border: 1px solid var(--emerald); color: var(--emerald); background: rgba(0, 77, 64, 0.08); }
    .chip.premium { background: var(--orange); color: var(--white); }

    .vendor-section {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .table-wrapper {
      background: rgba(255, 255, 255, 0.85);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-card);
      overflow: hidden;
      backdrop-filter: blur(18px);
    }

    table {
      width: 100%;
      border-collapse: collapse;
      min-width: 700px;
    }

    thead {
      background: rgba(0, 77, 64, 0.08);
      color: var(--emerald);
      text-transform: uppercase;
      letter-spacing: 0.04em;
      font-size: 0.75rem;
    }

    th, td {
      padding: 14px 16px;
      text-align: left;
      border-bottom: 1px solid rgba(0, 0, 0, 0.04);
    }

    tbody tr {
      transition: var(--transition);
    }

    tbody tr:hover {
      background: rgba(243, 115, 30, 0.05);
    }

    .vendor-info {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .vendor-info img {
      width: 44px;
      height: 44px;
      border-radius: 50%;
      object-fit: cover;
      border: 2px solid rgba(0, 77, 64, 0.2);
    }

    .status-badge {
      padding: 6px 12px;
      border-radius: 999px;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: capitalize;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }

    .status-active { background: rgba(0, 77, 64, 0.12); color: var(--emerald); }
    .status-suspended { background: rgba(216, 67, 21, 0.15); color: #d84315; }

    .actions {
      display: inline-flex;
      flex-wrap: wrap;
      gap: 10px;
      align-items: center;
    }

    .actions button,
    .actions a {
      position: relative;
      padding: 10px 16px;
      border-radius: 999px;
      border: 1px solid transparent;
      font-size: 0.82rem;
      font-weight: 600;
      letter-spacing: 0.01em;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      line-height: 1.1;
      background: rgba(255, 255, 255, 0.92);
      box-shadow: 0 8px 20px rgba(17, 17, 17, 0.08);
      transition: transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease, border-color 0.2s ease;
    }

    .actions button:focus-visible,
    .actions a:focus-visible {
      outline: none;
      box-shadow: 0 0 0 4px rgba(0, 77, 64, 0.15), 0 8px 20px rgba(17, 17, 17, 0.08);
      transform: translateY(-1px);
    }

    .actions button:hover,
    .actions a:hover {
      transform: translateY(-2px);
      box-shadow: 0 12px 24px rgba(17, 17, 17, 0.12);
    }

    .view-btn {
      background: linear-gradient(135deg, rgba(0, 77, 64, 0.1), rgba(0, 77, 64, 0.18));
      color: var(--emerald);
      border-color: rgba(0, 77, 64, 0.22);
    }

    .view-btn:hover {
      background: linear-gradient(135deg, rgba(0, 77, 64, 0.18), rgba(0, 77, 64, 0.26));
    }

    .notify-btn {
      background: linear-gradient(135deg, rgba(1, 108, 90, 0.12), rgba(1, 108, 90, 0.2));
      color: var(--emerald);
      border-color: rgba(1, 108, 90, 0.32);
    }

    .notify-btn:hover {
      background: linear-gradient(135deg, rgba(1, 108, 90, 0.2), rgba(1, 108, 90, 0.3));
    }

    .suspend-btn {
      background: linear-gradient(135deg, var(--orange), #ffa05b);
      color: var(--white);
      border-color: rgba(255, 255, 255, 0.2);
      box-shadow: 0 12px 26px rgba(243, 115, 30, 0.28);
    }

    .suspend-btn:hover {
      background: linear-gradient(135deg, var(--orange-dark), #f98f3e);
      box-shadow: 0 14px 30px rgba(243, 115, 30, 0.36);
    }

    .delete-btn {
      background: linear-gradient(135deg, rgba(216, 67, 21, 0.16), rgba(216, 67, 21, 0.28));
      color: #d84315;
      border-color: rgba(216, 67, 21, 0.4);
      box-shadow: 0 12px 26px rgba(216, 67, 21, 0.18);
    }

    .delete-btn:hover {
      background: linear-gradient(135deg, rgba(216, 67, 21, 0.26), rgba(216, 67, 21, 0.36));
    }

    .actions i {
      font-size: 1rem;
    }

    .empty-state {
      padding: 40px 24px;
      text-align: center;
      color: rgba(17, 17, 17, 0.6);
    }

    .empty-state a {
      color: var(--orange);
      font-weight: 600;
      text-decoration: none;
    }

    .pagination {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 12px;
      padding: 20px 0;
    }

    .pagination button {
      padding: 10px 18px;
      border-radius: 999px;
      border: none;
      background: rgba(0, 77, 64, 0.12);
      color: var(--emerald);
      font-weight: 600;
      cursor: pointer;
      transition: var(--transition);
    }

    .pagination button:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }

    .pagination button:not(:disabled):hover {
      background: rgba(243, 115, 30, 0.18);
      color: var(--orange);
    }

    .pagination span {
      font-weight: 600;
      color: var(--ink);
    }

    .loader-overlay {
      position: fixed;
      inset: 0;
      display: grid;
      place-items: center;
      background: rgba(255, 255, 255, 0.85);
      backdrop-filter: blur(10px);
      z-index: 2000;
      transition: opacity 0.3s ease;
    }

    .loader-overlay.hidden {
      opacity: 0;
      visibility: hidden;
    }

    .spinner {
      width: 48px;
      height: 48px;
      border: 4px solid rgba(0, 77, 64, 0.15);
      border-top-color: var(--orange);
      border-radius: 50%;
      animation: spin 0.9s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .toast {
      position: fixed;
      bottom: 32px;
      left: 50%;
      transform: translateX(-50%) translateY(30px);
      background: var(--emerald);
      color: var(--white);
      padding: 14px 20px;
      border-radius: 999px;
      box-shadow: var(--shadow-soft);
      opacity: 0;
      visibility: hidden;
      transition: 0.4s ease;
      display: flex;
      align-items: center;
      gap: 10px;
      z-index: 2500;
      font-weight: 600;
    }

    .toast.show {
      opacity: 1;
      visibility: visible;
      transform: translateX(-50%) translateY(0);
    }

    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(17, 17, 17, 0.45);
      backdrop-filter: blur(6px);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
      z-index: 3000;
      opacity: 0;
      pointer-events: none;
      transition: 0.3s ease;
    }

    .modal-backdrop.show {
      opacity: 1;
      pointer-events: all;
    }

    .modal {
      background: rgba(255, 255, 255, 0.95);
      border-radius: var(--radius-lg);
      padding: clamp(20px, 4vw, 28px);
      width: min(420px, 100%);
      box-shadow: var(--shadow-soft);
      transform: translateY(20px) scale(0.98);
      transition: 0.3s ease;
      position: relative;
    }

    .modal-backdrop.show .modal {
      transform: translateY(0) scale(1);
    }

    .modal h3 {
      font-family: 'Anton', sans-serif;
      font-size: clamp(20px, 4vw, 26px);
      color: var(--emerald);
      margin-bottom: 12px;
    }

    .modal p {
      font-size: 0.95rem;
      color: rgba(17, 17, 17, 0.78);
      margin-bottom: 20px;
    }

    .modal textarea {
      width: 100%;
      min-height: 120px;
      border-radius: 16px;
      border: 1px solid rgba(0, 77, 64, 0.2);
      padding: 12px 14px;
      resize: vertical;
      font-family: inherit;
      font-size: 0.95rem;
      transition: var(--transition);
    }

    .modal textarea:focus {
      outline: none;
      border-color: var(--orange);
      box-shadow: 0 0 0 3px rgba(243, 115, 30, 0.18);
    }

    .modal .modal-actions {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
    }

    .modal .modal-actions button {
      padding: 10px 18px;
      border-radius: 12px;
      font-weight: 600;
      border: none;
      cursor: pointer;
      transition: var(--transition);
    }

    .modal .modal-actions .cancel {
      background: rgba(0, 77, 64, 0.12);
      color: var(--emerald);
    }

    .modal .modal-actions .confirm {
      background: var(--orange);
      color: var(--white);
    }

    .modal .modal-actions .danger {
      background: #d84315;
      color: var(--white);
    }

    .modal .cascade {
      display: flex;
      gap: 10px;
      align-items: center;
      margin-bottom: 18px;
      font-size: 0.9rem;
    }

    .modal .cascade input {
      width: 18px;
      height: 18px;
    }

    footer {
      margin-top: auto;
      background: var(--beige);
      text-align: center;
      padding: 18px;
      font-size: 0.9rem;
      color: rgba(17, 17, 17, 0.72);
    }

    /* Responsive Cards */
    @media (max-width: 768px) {
      .table-wrapper {
        overflow-x: auto;
      }

      table {
        display: none;
      }

      .card-list {
        display: grid;
        gap: 16px;
      }

      .vendor-card {
        background: rgba(255, 255, 255, 0.88);
        border-radius: var(--radius-lg);
        padding: 18px;
        box-shadow: var(--shadow-card);
        display: grid;
        gap: 14px;
      }

      .vendor-card-header {
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .vendor-card-header img {
        width: 54px;
        height: 54px;
        border-radius: 50%;
        object-fit: cover;
        border: 2px solid rgba(0, 77, 64, 0.18);
      }

      .vendor-card-info {
        display: grid;
        gap: 8px;
        font-size: 0.9rem;
      }

      .card-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
      }

      .card-actions button,
      .card-actions a {
        flex: 1 1 calc(50% - 10px);
        justify-content: center;
      }
    }

    @media (min-width: 769px) {
      .card-list { display: none; }
    }
  </style>
</head>
<body>
  <!-- Auth Guard -->
  <!-- Loader -->
  <div class="loader-overlay" id="authLoader">
    <div class="spinner"></div>
    <p style="margin-top: 16px; font-weight: 600; color: var(--emerald);">Authorising admin…</p>
  </div>

  <!-- Toast -->
  <div class="toast" id="toast"><i class="ri-checkbox-circle-line"></i><span id="toastMessage"></span></div>

  <!-- Modals -->
  <!-- Suspend Modal -->
  <div class="modal-backdrop" id="suspendModal">
    <div class="modal">
      <h3 id="suspendTitle">Suspend Vendor</h3>
      <p id="suspendText">Are you sure you want to change this vendor's status?</p>
      <div class="modal-actions">
        <button class="cancel" data-close="suspendModal">Cancel</button>
        <button class="confirm" id="confirmSuspend">Confirm</button>
      </div>
    </div>
  </div>

  <!-- Delete Modal -->
  <div class="modal-backdrop" id="deleteModal">
    <div class="modal">
      <h3>Delete Vendor</h3>
      <p>This will remove the vendor account. Also delete all their listings?</p>
      <label class="cascade"><input type="checkbox" id="cascadeDelete" />Also delete listings</label>
      <div class="modal-actions">
        <button class="cancel" data-close="deleteModal">Cancel</button>
        <button class="danger" id="confirmDelete">Delete</button>
      </div>
    </div>
  </div>

  <!-- Notification Modal -->
  <div class="modal-backdrop" id="notifyModal">
    <div class="modal">
      <h3>Send Notification</h3>
      <p>Share a quick update or reminder. Vendors receive this inside their dashboard.</p>
      <textarea id="notifyMessage" placeholder="Message to vendor" maxlength="280"></textarea>
      <div class="modal-actions">
        <button class="cancel" data-close="notifyModal">Cancel</button>
        <button class="confirm" id="confirmNotify">Send</button>
      </div>
    </div>
  </div>

  <header>
    <div class="topbar">
      <div class="brand">YUSTAM Admin</div>
      <div class="topbar-actions">
        <button class="icon-btn" id="backBtn" title="Back to Dashboard"><i class="ri-arrow-left-line"></i></button>
        <button class="icon-btn" id="notifyBell" title="Notifications"><i class="ri-notification-3-line"></i><span id="notifyBadge" class="badge">0</span></button>
        <button class="icon-btn" id="logoutBtn" title="Logout"><i class="ri-logout-box-r-line"></i></button>
      </div>
    </div>
    <div class="accent-strip"></div>
  </header>

  <main id="mainContent">
    <section class="page-heading">
      <h1>All Vendors</h1>
      <p>Manage vendor accounts, plans, and status across the YUSTAM marketplace.</p>
    </section>

    <!-- Controls -->
    <section class="control-panel" aria-label="Vendor filters and search">
      <div class="controls-row">
        <input id="searchInput" type="search" placeholder="Search by name, email, or phone…" class="wide" />
        <select id="planFilter">
          <option value="">All Plans</option>
          <option value="free">Free</option>
          <option value="plus">Plus</option>
          <option value="pro">Pro</option>
          <option value="premium">Premium</option>
        </select>
        <select id="statusFilter">
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
        </select>
        <select id="sortOrder">
          <option value="desc">Newest First</option>
          <option value="asc">Oldest First</option>
        </select>
      </div>
      <div class="actions">
        <button class="btn btn-outline" id="clearFilters"><i class="ri-filter-off-line"></i>Clear Filters</button>
        <button class="btn btn-primary" id="refreshBtn"><i class="ri-refresh-line"></i>Refresh</button>
      </div>
    </section>

    <!-- Summary Stats -->
    <section class="stats-grid" aria-label="Vendor statistics">
      <article class="stat-card" id="totalVendorsCard">
        <span class="label">Total Vendors</span>
        <span class="value" id="totalVendors">0</span>
      </article>
      <article class="stat-card">
        <span class="label">Plan Distribution</span>
        <div class="plan-chips">
          <span class="chip free">Free <span id="freeCount">0</span></span>
          <span class="chip plus">Plus <span id="plusCount">0</span></span>
          <span class="chip pro">Pro <span id="proCount">0</span></span>
          <span class="chip premium">Premium <span id="premiumCount">0</span></span>
        </div>
      </article>
      <article class="stat-card">
        <span class="label">Suspended Vendors</span>
        <span class="value" id="suspendedCount">0</span>
      </article>
      <article class="stat-card">
        <span class="label">Active this week</span>
        <span class="value" id="activeWeek">0</span>
      </article>
    </section>

    <!-- Vendors Table/Cards -->
    <section class="vendor-section">
      <div class="table-wrapper">
        <table aria-label="Vendor table">
          <thead>
            <tr>
              <th>Vendor</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Plan</th>
              <th>Status</th>
              <th>Join Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody id="vendorTableBody"></tbody>
        </table>
        <div class="card-list" id="vendorCardList"></div>
        <div class="empty-state" id="emptyState" hidden>
          <p>No vendors found for the current filters. <a href="admin-dashboard.php">Back to dashboard</a></p>
        </div>
      </div>
      <div class="pagination" id="pagination" hidden>
        <button id="prevPage">Previous</button>
        <span id="pageIndicator">Page 1</span>
        <button id="nextPage">Next</button>
      </div>
    </section>
  </main>

  <footer>© 2025 YUSTAM - All Rights Reserved.</footer>

  <script src="theme-manager.js" defer></script>
  <script src="admin-vendors.js" defer></script>
</body>
</html>






