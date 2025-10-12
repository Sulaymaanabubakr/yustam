<?php
ini_set('session.save_path', '/home2/yustamco/tmp'); // your working session path
session_start();
require_once __DIR__ . '/db.php'; // adjust if needed

// 🔒 Redirect if vendor not logged in
if (!isset($_SESSION['vendor_id'])) {
  header('Location: vendor-login.html');
  exit;
}

$vendor_id = $_SESSION['vendor_id'];

// 🔍 Fetch vendor's current plan from database
$stmt = $pdo->prepare("SELECT plan_type, plan_expiry FROM vendors WHERE id = ?");
$stmt->execute([$vendor_id]);
$vendor = $stmt->fetch(PDO::FETCH_ASSOC);

$currentPlan = $vendor['plan_type'] ?? 'Free';
$expiresAt = $vendor['plan_expiry'] ?? null;
?>

<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Vendor Plans | YUSTAM Marketplace</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=Anton&family=Inter:wght@400;500;600;700&display=swap"
      rel="stylesheet"
    />
    <link
      rel="stylesheet"
      href="https://cdn.jsdelivr.net/npm/remixicon@4.2.0/fonts/remixicon.css"
    />
    <style>
      :root {
        --emerald: #004d40;
        --orange: #f3731e;
        --beige: #eadccf;
        --white: #ffffff;
        --ink: #111111;
        --shadow-soft: 0 18px 40px rgba(0, 0, 0, 0.08);
        --card-glass: rgba(255, 255, 255, 0.92);
        --border-glass: rgba(255, 255, 255, 0.35);
      }

      *,
      *::before,
      *::after {
        box-sizing: border-box;
      }

      body {
        margin: 0;
        font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI',
          sans-serif;
        background: linear-gradient(135deg, rgba(234, 220, 207, 0.72), rgba(255, 255, 255, 0.95));
        color: var(--ink);
        min-height: 100vh;
        display: flex;
        flex-direction: column;
      }

      a {
        color: inherit;
        text-decoration: none;
      }

      header {
        position: sticky;
        top: 0;
        z-index: 20;
        background: var(--emerald);
        color: var(--white);
        padding: 14px 20px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.12);
      }

      header h1 {
        margin: 0;
        font-family: 'Anton', sans-serif;
        font-size: clamp(1.35rem, 4vw, 1.9rem);
        letter-spacing: 0.04em;
      }

      .header-actions {
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .icon-btn {
        width: 42px;
        height: 42px;
        border-radius: 50%;
        border: 1px solid rgba(255, 255, 255, 0.25);
        background: rgba(255, 255, 255, 0.08);
        display: inline-flex;
        align-items: center;
        justify-content: center;
        color: var(--white);
        transition: transform 180ms ease, background 180ms ease, box-shadow 200ms ease;
        cursor: pointer;
      }

      .icon-btn:hover,
      .icon-btn:focus-visible {
        transform: translateY(-2px);
        background: rgba(255, 255, 255, 0.2);
        box-shadow: 0 10px 22px rgba(0, 0, 0, 0.16);
      }

      main {
        flex: 1;
        padding: 32px 18px 80px;
        display: flex;
        flex-direction: column;
        gap: 40px;
      }

      .loader {
        position: fixed;
        inset: 0;
        background: rgba(234, 220, 207, 0.9);
        display: flex;
        align-items: center;
        justify-content: center;
        flex-direction: column;
        gap: 16px;
        z-index: 50;
        font-weight: 600;
        color: rgba(17, 17, 17, 0.7);
        transition: opacity 250ms ease;
      }

      .loader.hidden {
        opacity: 0;
        pointer-events: none;
      }

      .spinner {
        width: 48px;
        height: 48px;
        border-radius: 50%;
        border: 4px solid rgba(0, 77, 64, 0.2);
        border-top-color: var(--emerald);
        animation: spin 1s linear infinite;
      }

      @keyframes spin {
        to {
          transform: rotate(360deg);
        }
      }

      h2 {
        margin: 0 0 16px;
        font-family: 'Anton', sans-serif;
        font-size: clamp(1.3rem, 4vw, 1.75rem);
        letter-spacing: 0.02em;
        color: var(--emerald);
      }

      h3 {
        margin: 0 0 12px;
        font-family: 'Anton', sans-serif;
        font-size: clamp(1.1rem, 3vw, 1.4rem);
        letter-spacing: 0.015em;
      }

      p {
        margin: 0;
        line-height: 1.6;
        color: rgba(17, 17, 17, 0.75);
      }

      .section-card {
        background: rgba(255, 255, 255, 0.92);
        border-radius: 20px;
        padding: 28px 24px;
        box-shadow: var(--shadow-soft);
        position: relative;
        overflow: hidden;
        isolation: isolate;
      }

      .section-card::before {
        content: '';
        position: absolute;
        inset: auto -40px -80px auto;
        width: 180px;
        height: 180px;
        background: radial-gradient(circle at center, rgba(243, 115, 30, 0.16), transparent 70%);
        z-index: -1;
      }

      .current-plan {
        background: var(--beige);
        padding: 20px 16px;
        border-radius: 24px;
        display: flex;
        justify-content: center;
      }

      .current-plan-card {
        width: min(640px, 100%);
        background: var(--card-glass);
        border-radius: 24px;
        padding: 28px 24px;
        box-shadow: var(--shadow-soft);
        border: 1px solid var(--border-glass);
        display: grid;
        gap: 18px;
        text-align: center;
        animation: fadeSlide 420ms ease;
      }

      .plan-chip {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 6px 14px;
        border-radius: 999px;
        font-size: 0.85rem;
        font-weight: 600;
        background: rgba(0, 77, 64, 0.12);
        color: var(--emerald);
      }

      .plan-chip.expired {
        background: rgba(243, 115, 30, 0.14);
        color: var(--orange);
      }

      .plan-description {
        font-size: 0.98rem;
        color: rgba(17, 17, 17, 0.7);
      }

      .plan-meta {
        font-size: 0.9rem;
        color: rgba(17, 17, 17, 0.55);
      }

      .plans-grid {
        display: grid;
        gap: 24px;
      }

      .plans-grid .plan-card {
        background: var(--card-glass);
        border-radius: 22px;
        padding: 28px 24px;
        box-shadow: var(--shadow-soft);
        border: 1px solid rgba(0, 77, 64, 0.08);
        position: relative;
        overflow: hidden;
        transition: transform 220ms ease, box-shadow 220ms ease, border-color 220ms ease;
      }

      .plans-grid .plan-card::after {
        content: '';
        position: absolute;
        inset: auto auto -120px -80px;
        width: 200px;
        height: 200px;
        background: radial-gradient(circle at center, rgba(0, 77, 64, 0.14), transparent 72%);
        z-index: -1;
        transition: transform 320ms ease;
      }

      .plans-grid .plan-card:hover,
      .plans-grid .plan-card:focus-within {
        transform: translateY(-8px);
        box-shadow: 0 24px 45px rgba(0, 0, 0, 0.14);
        border-color: rgba(0, 77, 64, 0.18);
      }

      .plans-grid .plan-card:hover::after,
      .plans-grid .plan-card:focus-within::after {
        transform: translateY(-12px);
      }

      .plan-price {
        font-size: clamp(1.4rem, 4vw, 1.8rem);
        font-weight: 700;
        color: var(--emerald);
      }

      .plan-features {
        margin: 18px 0 24px;
        padding: 0;
        list-style: none;
        display: grid;
        gap: 12px;
        text-align: left;
      }

      .plan-features li {
        display: flex;
        align-items: flex-start;
        gap: 10px;
        font-size: 0.95rem;
        color: rgba(17, 17, 17, 0.75);
      }

      .plan-features i {
        color: var(--emerald);
        margin-top: 2px;
      }

      .plan-card.current {
        border: 2px solid rgba(243, 115, 30, 0.4);
        box-shadow: 0 28px 60px rgba(243, 115, 30, 0.18);
      }

      .plan-card.current::after {
        background: radial-gradient(circle at center, rgba(243, 115, 30, 0.22), transparent 72%);
      }

      .plan-card.current .plan-price {
        color: var(--orange);
      }

      .btn {
        border: none;
        border-radius: 14px;
        padding: 14px 20px;
        font-size: 1rem;
        font-weight: 600;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 10px;
        transition: transform 180ms ease, box-shadow 220ms ease, background 220ms ease, color 220ms ease;
      }

      .btn:disabled {
        opacity: 0.65;
        cursor: not-allowed;
        transform: none;
        box-shadow: none;
      }

      .btn-outline {
        background: transparent;
        border: 1.8px solid var(--emerald);
        color: var(--emerald);
      }

      .btn-outline:hover:not(:disabled),
      .btn-outline:focus-visible:not(:disabled) {
        background: rgba(0, 77, 64, 0.08);
        transform: translateY(-2px);
      }

      .btn-orange {
        background: var(--orange);
        color: var(--white);
        box-shadow: 0 16px 32px rgba(243, 115, 30, 0.25);
      }

      .btn-orange:hover:not(:disabled),
      .btn-orange:focus-visible:not(:disabled) {
        transform: translateY(-2px) scale(1.01);
        box-shadow: 0 20px 36px rgba(243, 115, 30, 0.32);
      }

      .btn-emerald {
        background: var(--emerald);
        color: var(--white);
        box-shadow: 0 18px 40px rgba(0, 77, 64, 0.25);
      }

      .btn-emerald:hover:not(:disabled),
      .btn-emerald:focus-visible:not(:disabled) {
        transform: translateY(-2px) scale(1.01);
        box-shadow: 0 22px 48px rgba(0, 77, 64, 0.32);
      }

      .btn-gradient {
        background: linear-gradient(135deg, var(--emerald), var(--orange));
        color: var(--white);
        box-shadow: 0 24px 52px rgba(243, 115, 30, 0.28);
      }

      .btn-gradient:hover:not(:disabled),
      .btn-gradient:focus-visible:not(:disabled) {
        transform: translateY(-2px) scale(1.015);
        box-shadow: 0 28px 60px rgba(243, 115, 30, 0.35);
      }

      .badge-current {
        position: absolute;
        top: 18px;
        right: 18px;
        padding: 6px 12px;
        border-radius: 999px;
        background: rgba(243, 115, 30, 0.16);
        color: var(--orange);
        font-size: 0.8rem;
        font-weight: 600;
      }

      .modal-backdrop {
        position: fixed;
        inset: 0;
        background: rgba(17, 17, 17, 0.4);
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 24px;
        opacity: 0;
        pointer-events: none;
        transition: opacity 220ms ease;
        z-index: 100;
      }

      .modal-backdrop.active {
        opacity: 1;
        pointer-events: auto;
      }

      .modal {
        width: min(420px, 100%);
        background: var(--card-glass);
        border-radius: 22px;
        padding: 28px;
        box-shadow: var(--shadow-soft);
        transform: translateY(18px);
        transition: transform 220ms ease;
      }

      .modal-backdrop.active .modal {
        transform: translateY(0);
      }

      .modal-actions {
        margin-top: 24px;
        display: flex;
        gap: 12px;
        flex-wrap: wrap;
      }

      .toast {
        position: fixed;
        left: 50%;
        bottom: 32px;
        transform: translateX(-50%) translateY(40px);
        background: var(--emerald);
        color: var(--white);
        padding: 14px 20px;
        border-radius: 999px;
        box-shadow: 0 20px 45px rgba(0, 0, 0, 0.18);
        opacity: 0;
        pointer-events: none;
        transition: opacity 220ms ease, transform 220ms ease;
        font-weight: 600;
        z-index: 120;
      }

      .toast.show {
        opacity: 1;
        transform: translateX(-50%) translateY(0);
      }

      footer {
        margin-top: auto;
        padding: 24px 16px;
        background: rgba(234, 220, 207, 0.9);
        text-align: center;
        font-size: 0.9rem;
        color: rgba(17, 17, 17, 0.65);
      }

      footer a {
        color: var(--emerald);
        font-weight: 600;
      }

      @keyframes fadeSlide {
        from {
          opacity: 0;
          transform: translateY(16px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      @media (min-width: 600px) {
        main {
          padding: 48px 36px 100px;
          gap: 48px;
        }

        .plans-grid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
      }

      @media (min-width: 1024px) {
        main {
          padding: 56px clamp(60px, 8vw, 120px) 120px;
        }

        .plans-grid {
          grid-template-columns: repeat(4, minmax(0, 1fr));
        }
      }
    </style>
  </head>
  <body>
    <div class="loader" id="loadingState" role="status" aria-live="polite">
      <div class="spinner" aria-hidden="true"></div>
      Preparing your plans...
    </div>

    <!-- Header -->
    <header>
      <button class="icon-btn" id="backBtn" aria-label="Go back to dashboard">
        <i class="ri-arrow-left-line" aria-hidden="true"></i>
      </button>
      <h1>Subscription Plans</h1>
      <div class="header-actions">
        <button class="icon-btn" id="logoutBtn" aria-label="Logout">
          <i class="ri-logout-box-r-line" aria-hidden="true"></i>
        </button>
      </div>
    </header>

    <main id="plansContent" hidden>
      <!-- Current Plan -->
      <section class="current-plan" aria-labelledby="currentPlanHeading">
        <div class="current-plan-card" id="currentPlanCard">
          <div>
            <p class="plan-chip" id="planStatusChip">
              <i class="ri-shield-check-line" aria-hidden="true"></i>
              Active Plan
            </p>
          </div>
          <div>
            <h2 id="currentPlanHeading">Your Current Plan</h2>
            <h3 id="currentPlanName">Free Plan</h3>
          </div>
          <p class="plan-description" id="currentPlanDescription">
            Get started with essential tools to sell confidently on YUSTAM Marketplace.
          </p>
          <p class="plan-meta" id="currentPlanMeta">Unlimited access · No expiry set</p>
        </div>
      </section>

      <!-- Plans Grid -->
      <section aria-labelledby="plansGridHeading">
        <h2 id="plansGridHeading">Choose or Upgrade Your Plan</h2>
        <div class="plans-grid" id="plansGrid" role="list"></div>
      </section>
    </main>

    <!-- Upgrade Modal -->
    <div class="modal-backdrop" id="upgradeModal" role="dialog" aria-modal="true" aria-hidden="true">
      <div class="modal">
        <h3 id="modalTitle">Confirm Upgrade</h3>
        <p id="modalDescription">You're about to upgrade.</p>
        <div class="modal-actions">
          <button class="btn btn-outline" id="cancelUpgradeBtn">Cancel</button>
          <button class="btn btn-orange" id="confirmUpgradeBtn">Proceed</button>
        </div>
      </div>
    </div>

    <div class="toast" id="toast" role="status" aria-live="assertive">Upgrade successful.</div>

    <footer>
      © 2025 YUSTAM - All Rights Reserved. ·
      <a href="contact.html">Contact Support</a>
    </footer>

    <!-- Firebase Logic -->
    <script type="module" src="firebase.js"></script>
    <script type="module" src="vendor-plans.js"></script>
  </body>
</html>

