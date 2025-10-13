<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Vendor Billing History | YUSTAM Marketplace</title>
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
        --glass-bg: rgba(255, 255, 255, 0.85);
        --glass-border: rgba(255, 255, 255, 0.25);
        --shadow: 0 24px 48px rgba(0, 0, 0, 0.12);
        --orange-glow: 0 16px 35px rgba(243, 115, 30, 0.35);
        --success: #0f9d58;
        --danger: #d93025;
      }

      *,
      *::before,
      *::after {
        box-sizing: border-box;
      }

      body {
        margin: 0;
        font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont,
          'Segoe UI', sans-serif;
        background: radial-gradient(circle at top left, rgba(0, 77, 64, 0.16), transparent 55%),
          linear-gradient(135deg, rgba(234, 220, 207, 0.92), rgba(255, 255, 255, 0.98));
        color: #1b1b1b;
        min-height: 100vh;
        display: flex;
        flex-direction: column;
      }

      img {
        display: block;
        max-width: 100%;
      }

      a {
        color: inherit;
        text-decoration: none;
      }

      .glass-card {
        background: var(--glass-bg);
        border: 1px solid var(--glass-border);
        border-radius: 20px;
        box-shadow: var(--shadow);
        backdrop-filter: blur(8px);
      }

      header {
        position: sticky;
        top: 0;
        z-index: 20;
        background: var(--emerald);
        color: var(--white);
        padding: 16px 20px;
        box-shadow: 0 18px 36px rgba(0, 0, 0, 0.18);
        border-bottom: 3px solid rgba(243, 115, 30, 0.7);
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
      }

      .header-left {
        display: flex;
        align-items: center;
        gap: 14px;
        cursor: pointer;
      }

      .logo-shell {
        width: 56px;
        height: 56px;
        border-radius: 16px;
        background: rgba(255, 255, 255, 0.16);
        border: 1px solid rgba(255, 255, 255, 0.35);
        display: grid;
        place-items: center;
        box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.25);
      }

      .logo-shell img {
        width: 46px;
        height: 46px;
        object-fit: cover;
        border-radius: 14px;
      }

      header h1 {
        font-family: 'Anton', sans-serif;
        font-size: clamp(1.35rem, 4vw, 1.9rem);
        letter-spacing: 0.08em;
        margin: 0;
        text-transform: uppercase;
      }

      .header-actions {
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .icon-btn {
        width: 46px;
        height: 46px;
        border-radius: 50%;
        border: 1px solid rgba(255, 255, 255, 0.22);
        background: rgba(255, 255, 255, 0.12);
        display: inline-flex;
        align-items: center;
        justify-content: center;
        color: var(--white);
        font-size: 1.2rem;
        transition: transform 200ms ease, box-shadow 200ms ease, background 200ms ease;
      }

      .icon-btn:hover,
      .icon-btn:focus-visible {
        transform: translateY(-3px);
        background: rgba(255, 255, 255, 0.3);
        box-shadow: var(--orange-glow);
      }

      main {
        flex: 1;
        width: min(1180px, 92vw);
        margin: 0 auto;
        padding: 42px 0 70px;
        display: flex;
        flex-direction: column;
        gap: 28px;
      }

      .page-intro {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      .page-intro h2 {
        font-family: 'Anton', sans-serif;
        font-size: clamp(1.45rem, 5vw, 2.1rem);
        letter-spacing: 0.05em;
        margin: 0;
        color: var(--emerald);
      }

      .page-intro p {
        margin: 0;
        font-size: 0.96rem;
        color: rgba(27, 27, 27, 0.72);
        line-height: 1.6;
      }

      .billing-wrapper {
        display: flex;
        flex-direction: column;
        gap: 18px;
      }

      .billing-card {
        padding: 24px 18px;
        display: flex;
        flex-direction: column;
        gap: 18px;
        animation: fadeInUp 600ms ease both;
      }

      .table-headings {
        display: grid;
        grid-template-columns: repeat(7, minmax(120px, 1fr));
        gap: 16px;
        font-weight: 600;
        color: rgba(27, 27, 27, 0.75);
        font-size: 0.86rem;
      }

      .records-container {
        display: flex;
        flex-direction: column;
        gap: 16px;
        max-height: clamp(340px, 60vh, 520px);
        overflow-y: auto;
        overflow-x: auto;
        padding-right: 4px;
      }

      .billing-row {
        padding: 18px 16px;
        border-radius: 16px;
        background: rgba(255, 255, 255, 0.78);
        border: 1px solid rgba(234, 220, 207, 0.65);
        box-shadow: 0 14px 32px rgba(0, 0, 0, 0.12);
        display: grid;
        grid-template-columns: repeat(7, minmax(120px, 1fr));
        gap: 16px;
        align-items: center;
      }

      .billing-row strong {
        font-weight: 600;
        color: rgba(27, 27, 27, 0.82);
      }

      .status-pill {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        border-radius: 999px;
        padding: 6px 14px;
        font-weight: 600;
        font-size: 0.85rem;
        background: rgba(15, 157, 88, 0.1);
        color: var(--success);
      }

      .status-pill.failed {
        background: rgba(217, 48, 37, 0.12);
        color: var(--danger);
      }

      .status-pill i {
        font-size: 1rem;
      }

      .amount-text {
        font-weight: 700;
        color: rgba(0, 0, 0, 0.85);
      }

      .receipt-btn {
        border: none;
        border-radius: 12px;
        padding: 10px 16px;
        font-size: 0.92rem;
        font-weight: 600;
        background: linear-gradient(135deg, rgba(243, 115, 30, 0.95), rgba(255, 138, 60, 0.9));
        color: var(--white);
        display: inline-flex;
        align-items: center;
        gap: 8px;
        cursor: pointer;
        transition: transform 200ms ease, box-shadow 200ms ease;
        box-shadow: 0 10px 22px rgba(243, 115, 30, 0.35);
        justify-self: flex-start;
      }

      .receipt-btn:hover,
      .receipt-btn:focus-visible {
        transform: translateY(-2px);
        box-shadow: 0 18px 30px rgba(243, 115, 30, 0.45);
      }

      .loader {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 12px;
        padding: 24px 0;
        color: rgba(0, 0, 0, 0.6);
        font-weight: 600;
      }

      .loader::before {
        content: '';
        width: 22px;
        height: 22px;
        border-radius: 50%;
        border: 3px solid rgba(0, 77, 64, 0.25);
        border-top-color: var(--orange);
        animation: spin 0.8s linear infinite;
      }

      .empty-state {
        padding: 36px 24px;
        text-align: center;
        color: rgba(27, 27, 27, 0.6);
        border-radius: 16px;
        background: rgba(255, 255, 255, 0.6);
        border: 1px dashed rgba(0, 77, 64, 0.25);
        font-weight: 600;
      }

      footer {
        margin-top: auto;
        background: rgba(234, 220, 207, 0.92);
        backdrop-filter: blur(6px);
        border-top: 1px solid rgba(255, 255, 255, 0.35);
        padding: 32px 18px 40px;
      }

      .footer-content {
        width: min(1180px, 92vw);
        margin: 0 auto;
        display: grid;
        gap: 22px;
      }

      .footer-links,
      .social-links {
        display: flex;
        flex-wrap: wrap;
        gap: 18px;
        font-weight: 600;
        color: rgba(0, 0, 0, 0.68);
      }

      .social-links a {
        font-size: 1.3rem;
        transition: transform 200ms ease;
      }

      .social-links a:hover,
      .social-links a:focus-visible {
        transform: translateY(-2px);
        color: var(--orange);
      }

      .copyright {
        font-size: 0.88rem;
        color: rgba(0, 0, 0, 0.55);
      }

      @keyframes fadeInUp {
        from {
          opacity: 0;
          transform: translateY(26px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      @keyframes spin {
        to {
          transform: rotate(360deg);
        }
      }

      @media (max-width: 900px) {
        .table-headings {
          display: none;
        }

        .billing-row {
          grid-template-columns: 1fr;
          gap: 12px;
          padding: 18px;
        }

        .billing-row > span,
        .billing-row > strong,
        .billing-row > button {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 0.95rem;
        }

        .billing-row > span::before,
        .billing-row > strong::before,
        .billing-row > button::before {
          content: attr(data-label);
          font-weight: 600;
          color: rgba(27, 27, 27, 0.65);
        }

        .billing-row .status-cell,
        .billing-row .receipt-cell {
          justify-content: flex-start;
        }

        .billing-row .status-cell::before,
        .billing-row .receipt-cell::before {
          margin-right: 12px;
        }
      }

      @media (max-width: 480px) {
        header {
          padding: 14px 16px;
        }

        .header-actions {
          gap: 8px;
        }

        .icon-btn {
          width: 40px;
          height: 40px;
        }

        .receipt-btn {
          width: 100%;
          justify-content: center;
        }
      }
    </style>
  </head>
  <body>
    <header>
      <div class="header-left" role="link" tabindex="0">
        <div class="logo-shell">
          <img src="logo.jpeg" alt="YUSTAM logo" />
        </div>
        <h1>Billing History</h1>
      </div>
      <nav class="header-actions" aria-label="Vendor quick actions">
        <a class="icon-btn notif-icon" href="vendor-notifications.php" aria-label="Notifications" title="Notifications">
          <i class="ri-notification-3-line"></i>
        </a>
        <a class="icon-btn settings-icon" href="vendor-settings.php" aria-label="Settings" title="Settings">
          <i class="ri-settings-3-line"></i>
        </a>
        <a class="icon-btn profile-icon" href="vendor-profile.php" aria-label="Profile" title="Profile">
          <i class="ri-user-3-line"></i>
        </a>
        <a class="icon-btn logout-icon" href="logout.php" aria-label="Log out" title="Log out">
          <i class="ri-logout-box-r-line"></i>
        </a>
      </nav>
    </header>

    <main>
      <section class="page-intro">
        <h2>Your billing history</h2>
        <p>
          Track every subscription renewal and plan upgrade. Download receipts, confirm payment
          references, and stay on top of your marketplace investment.
        </p>
      </section>

      <section class="billing-wrapper">
        <article class="glass-card billing-card">
          <div class="table-headings" aria-hidden="true">
            <span>Date Paid</span>
            <span>Plan</span>
            <span>Duration</span>
            <span>Amount (₦)</span>
            <span>Payment Ref</span>
            <span>Status</span>
            <span>Receipt</span>
          </div>
          <div class="loader" id="billingLoader" role="status" aria-live="polite">
            Fetching billing history...
          </div>
          <div class="records-container" id="billingRecords" aria-live="polite"></div>
          <div class="empty-state" id="billingEmpty" hidden>
            No billing records yet. Your payments will appear here after plan renewal or upgrade.
          </div>
        </article>
      </section>
    </main>

    <footer>
      <div class="footer-content">
        <nav class="footer-links">
          <a href="help.html">Help</a>
          <a href="privacy.html">Privacy</a>
          <a href="#">Terms</a>
          <a href="contact.html">Contact</a>
        </nav>
        <div class="social-links">
          <a href="https://wa.me/" aria-label="WhatsApp">
            <i class="ri-whatsapp-line"></i>
          </a>
          <a href="https://www.instagram.com/" aria-label="Instagram">
            <i class="ri-instagram-line"></i>
          </a>
          <a href="https://www.facebook.com/" aria-label="Facebook">
            <i class="ri-facebook-circle-line"></i>
          </a>
        </div>
        <p class="copyright">© 2025 YUSTAM Marketplace — Built for Nigeria.</p>
      </div>
    </footer>

    <script src="vendor-billing-history.js" defer></script>
  </body>
</html>
