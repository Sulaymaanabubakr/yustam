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
        --glass-bg: rgba(255, 255, 255, 0.85);
        --glass-border: rgba(255, 255, 255, 0.25);
        --shadow: 0 24px 48px rgba(0, 0, 0, 0.12);
        --orange-glow: 0 16px 35px rgba(243, 115, 30, 0.35);
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

      .section-title {
        font-family: 'Anton', sans-serif;
        font-size: clamp(1.4rem, 4vw, 2rem);
        letter-spacing: 0.03em;
        margin: 0 0 18px;
        color: var(--emerald);
      }

      /* Header */
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
        gap: 42px;
      }

      .intro-text {
        font-size: 0.95rem;
        color: rgba(27, 27, 27, 0.7);
        line-height: 1.6;
        margin: 0 0 28px;
      }

      /* Current Plan */
      .current-plan-card {
        padding: 28px;
        position: relative;
        overflow: hidden;
        animation: fadeInUp 600ms ease both;
      }

      .current-plan-card::after {
        content: '';
        position: absolute;
        top: -30px;
        right: -30px;
        width: 120px;
        height: 120px;
        background: radial-gradient(circle, rgba(243, 115, 30, 0.45), transparent 60%);
        filter: blur(6px);
        opacity: 0.8;
      }

      .plan-meta {
        display: flex;
        flex-wrap: wrap;
        gap: 16px;
        margin: 18px 0 0;
        font-size: 0.96rem;
      }

      .plan-pill {
        padding: 8px 18px;
        border-radius: 999px;
        background: rgba(0, 77, 64, 0.12);
        border: 1px solid rgba(0, 77, 64, 0.25);
        color: var(--emerald);
        font-weight: 600;
      }

      .plan-description {
        margin-top: 18px;
        color: rgba(27, 27, 27, 0.7);
        line-height: 1.6;
      }

      /* Plans Grid */
      .plans-grid {
        display: grid;
        grid-template-columns: 1fr;
        gap: 18px;
      }

      .plan-card {
        padding: 28px 24px 32px;
        position: relative;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        gap: 18px;
        transition: transform 220ms ease, box-shadow 220ms ease, border 200ms ease;
        animation: fadeInUp 600ms ease both;
      }

      .plan-card:nth-child(1) {
        animation-delay: 80ms;
      }

      .plan-card:nth-child(2) {
        animation-delay: 160ms;
      }

      .plan-card:nth-child(3) {
        animation-delay: 240ms;
      }

      .plan-card:nth-child(4) {
        animation-delay: 320ms;
      }

      .plan-card:nth-child(5) {
        animation-delay: 400ms;
      }

      .plan-card.selected {
        transform: translateY(-6px);
        box-shadow: var(--orange-glow);
        border: 1px solid rgba(243, 115, 30, 0.65);
      }

      .plan-card::before {
        content: '';
        position: absolute;
        inset: -30% -50% auto auto;
        height: 140px;
        width: 140px;
        background: radial-gradient(circle, rgba(243, 115, 30, 0.28), transparent 68%);
        transform: rotate(18deg);
      }

      .plan-heading {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
      }

      .plan-name {
        font-family: 'Anton', sans-serif;
        font-size: clamp(1.4rem, 4vw, 1.9rem);
        color: var(--emerald);
        letter-spacing: 0.06em;
        margin: 0;
      }

      .plan-price {
        font-weight: 700;
        font-size: 1.05rem;
        color: rgba(27, 27, 27, 0.9);
      }

      .plan-limit {
        font-weight: 600;
        color: rgba(27, 27, 27, 0.65);
      }

      .plan-features {
        margin: 0;
        padding: 0 0 0 18px;
        display: grid;
        gap: 8px;
        color: rgba(27, 27, 27, 0.75);
      }

      .plan-features li::marker {
        color: var(--orange);
      }

      .plan-controls {
        display: flex;
        flex-direction: column;
        gap: 14px;
        margin-top: auto;
      }

      .duration-group {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .duration-group label {
        font-weight: 600;
        color: rgba(27, 27, 27, 0.7);
      }

      .planDuration {
        appearance: none;
        border: 1px solid rgba(0, 77, 64, 0.2);
        border-radius: 14px;
        padding: 12px 14px;
        font-size: 0.95rem;
        font-weight: 600;
        background: rgba(255, 255, 255, 0.92);
        color: rgba(0, 0, 0, 0.78);
        box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.05);
      }

      .save-text {
        font-size: 0.86rem;
        color: rgba(243, 115, 30, 0.8);
        font-weight: 600;
      }

      .cta-button,
      .payBtn {
        border: none;
        border-radius: 14px;
        padding: 14px 18px;
        font-size: 1rem;
        font-weight: 700;
        letter-spacing: 0.02em;
        color: var(--white);
        background: linear-gradient(135deg, #f3731e, #ff8a3c);
        box-shadow: 0 10px 24px rgba(243, 115, 30, 0.35);
        cursor: pointer;
        transition: transform 200ms ease, box-shadow 220ms ease;
      }

      .cta-button:hover,
      .payBtn:hover,
      .cta-button:focus-visible,
      .payBtn:focus-visible {
        transform: translateY(-3px);
        box-shadow: 0 18px 34px rgba(243, 115, 30, 0.45);
      }

      .cta-button {
        background: linear-gradient(135deg, rgba(0, 77, 64, 0.92), rgba(0, 77, 64, 0.78));
        box-shadow: 0 10px 24px rgba(0, 77, 64, 0.35);
      }

      .cta-button:hover,
      .cta-button:focus-visible {
        box-shadow: 0 18px 34px rgba(0, 77, 64, 0.45);
      }

      .total-display {
        font-weight: 600;
        color: rgba(0, 0, 0, 0.75);
      }

      /* Footer */
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
          transform: translateY(30px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      @media (min-width: 640px) {
        main {
          gap: 48px;
        }

        .plans-grid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 22px;
        }
      }

      @media (min-width: 1024px) {
        header {
          padding: 18px 48px;
        }

        main {
          width: min(1180px, 86vw);
        }

        .plans-grid {
          grid-template-columns: repeat(4, minmax(0, 1fr));
        }

        .plan-card:nth-child(5) {
          grid-column: span 2;
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

        .cta-button,
        .payBtn {
          width: 100%;
        }
      }
    </style>
  </head>
  <body>
    <!-- Header -->
    <header>
      <div class="header-left logo-area">
        <div class="logo-shell">
          <img src="logo.jpeg" alt="YUSTAM logo" />
        </div>
        <h1 role="link" tabindex="0">Vendor</h1>
      </div>
      <nav class="header-actions">
        <a class="icon-btn notif-icon" href="vendor-notifications.php" aria-label="Notifications" title="Notifications">
          <i class="ri-notification-3-line"></i>
        </a>
        <a class="icon-btn" href="vendor-dashboard.php" aria-label="Vendor dashboard">
          <i class="ri-home-4-line"></i>
        </a>
        <a class="icon-btn" href="post.html" aria-label="Create listing">
          <i class="ri-add-box-line"></i>
        </a>
        <a class="icon-btn" href="logout.php" aria-label="Log out">
          <i class="ri-logout-box-r-line"></i>
        </a>
      </nav>
    </header>

    <main>
      <section>
        <h2 class="section-title">Choose the perfect plan for your YUSTAM success</h2>
        <p class="intro-text">
          Invest in growth with transparent pricing tailored for Nigerian vendors. Select a plan,
          pick your duration, and we will guide you to a secure Paystack checkout.
        </p>
        <!-- Current Plan -->
        <article class="glass-card current-plan-card">
          <h3 class="section-title" style="margin-bottom: 12px; color: var(--emerald);">
            Your Current Plan
          </h3>
          <div class="plan-meta">
            <span class="plan-pill" id="currentPlanName">Free</span>
            <span class="plan-pill" id="currentPlanStatus">Active</span>
            <span class="plan-pill" id="currentPlanExpiry">--</span>
          </div>
          <p class="plan-description">
            Enjoy dependable tools crafted for thriving merchants. Upgrade anytime for more
            exposure, advanced analytics, and premium support.
          </p>
        </article>
      </section>

      <!-- Plans Grid -->
      <section>
        <h2 class="section-title">Upgrade to unlock more reach</h2>
        <div class="plans-grid">
          <article class="glass-card plan-card" data-plan="Free Plan" data-price="0">
            <div class="plan-heading">
              <h3 class="plan-name">Free Plan</h3>
              <span class="plan-price">₦0<span style="font-size:0.82rem; font-weight:500;">/month</span></span>
            </div>
            <p class="plan-limit">Up to 3 active listings</p>
            <ul class="plan-features">
              <li>Basic support</li>
              <li>No featured listings</li>
              <li>Limited analytics</li>
              <li>Access to community tips</li>
              <li>Start selling instantly</li>
            </ul>
          </article>

          <article class="glass-card plan-card" data-plan="Starter Plan" data-price="2000">
            <div class="plan-heading">
              <h3 class="plan-name">Starter Plan</h3>
              <span class="plan-price">₦2,000<span style="font-size:0.82rem; font-weight:500;">/month</span></span>
            </div>
            <p class="plan-limit">Up to 10 active listings</p>
            <ul class="plan-features">
              <li>Access to listing stats</li>
              <li>Normal visibility</li>
              <li>Standard support</li>
              <li>Discount on multi-month payments</li>
              <li>Weekly growth insights</li>
            </ul>
            <div class="plan-controls">
              <div class="duration-group">
                <label for="duration-starter">Duration</label>
                <select id="duration-starter" class="planDuration">
                  <option value="1">1 month</option>
                  <option value="3">3 months — 5% off</option>
                  <option value="6">6 months — 10% off</option>
                  <option value="12">12 months — 15% off</option>
                </select>
              </div>
              <span class="save-text">Save up to 15% when you subscribe for a year!</span>
              <button class="payBtn" type="button">Upgrade</button>
              <div class="total-display">Total: ₦2,000</div>
            </div>
          </article>

          <article class="glass-card plan-card" data-plan="Pro Seller Plan" data-price="5000">
            <div class="plan-heading">
              <h3 class="plan-name">Pro Seller Plan</h3>
              <span class="plan-price">₦5,000<span style="font-size:0.82rem; font-weight:500;">/month</span></span>
            </div>
            <p class="plan-limit">Up to 25 active listings</p>
            <ul class="plan-features">
              <li>Verified vendor badge</li>
              <li>Priority placement</li>
              <li>Access to analytics</li>
              <li>Discount on multi-month payments</li>
              <li>Curated marketing tips</li>
            </ul>
            <div class="plan-controls">
              <div class="duration-group">
                <label for="duration-pro">Duration</label>
                <select id="duration-pro" class="planDuration">
                  <option value="1">1 month</option>
                  <option value="3">3 months — 5% off</option>
                  <option value="6">6 months — 10% off</option>
                  <option value="12">12 months — 15% off</option>
                </select>
              </div>
              <span class="save-text">Save up to 15% when you subscribe for a year!</span>
              <button class="payBtn" type="button">Upgrade</button>
              <div class="total-display">Total: ₦5,000</div>
            </div>
          </article>

          <article class="glass-card plan-card" data-plan="Elite Seller Plan" data-price="8000">
            <div class="plan-heading">
              <h3 class="plan-name">Elite Seller Plan</h3>
              <span class="plan-price">₦8,000<span style="font-size:0.82rem; font-weight:500;">/month</span></span>
            </div>
            <p class="plan-limit">Up to 50 active listings</p>
            <ul class="plan-features">
              <li>Homepage exposure</li>
              <li>Featured vendor badge</li>
              <li>Dedicated support</li>
              <li>Advanced analytics</li>
              <li>Discount on multi-month payments</li>
            </ul>
            <div class="plan-controls">
              <div class="duration-group">
                <label for="duration-elite">Duration</label>
                <select id="duration-elite" class="planDuration">
                  <option value="1">1 month</option>
                  <option value="3">3 months — 5% off</option>
                  <option value="6">6 months — 10% off</option>
                  <option value="12">12 months — 15% off</option>
                </select>
              </div>
              <span class="save-text">Save up to 15% when you subscribe for a year!</span>
              <button class="payBtn" type="button">Upgrade</button>
              <div class="total-display">Total: ₦8,000</div>
            </div>
          </article>

          <article class="glass-card plan-card" data-plan="Power Vendor Plan" data-price="15000">
            <div class="plan-heading">
              <h3 class="plan-name">Power Vendor Plan</h3>
              <span class="plan-price">₦15,000<span style="font-size:0.82rem; font-weight:500;">/month</span></span>
            </div>
            <p class="plan-limit">Up to 100 active listings</p>
            <ul class="plan-features">
              <li>Homepage spotlight</li>
              <li>Custom featured placement</li>
              <li>Personal success manager</li>
              <li>Advanced reporting</li>
              <li>Highest priority support</li>
              <li>Discount on multi-month payments</li>
            </ul>
            <div class="plan-controls">
              <div class="duration-group">
                <label for="duration-power">Duration</label>
                <select id="duration-power" class="planDuration">
                  <option value="1">1 month</option>
                  <option value="3">3 months — 5% off</option>
                  <option value="6">6 months — 10% off</option>
                  <option value="12">12 months — 15% off</option>
                </select>
              </div>
              <span class="save-text">Save up to 15% when you subscribe for a year!</span>
              <button class="payBtn" type="button">Upgrade</button>
              <div class="total-display">Total: ₦15,000</div>
            </div>
          </article>
        </div>
      </section>
    </main>

    <!-- Footer -->
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

    <script src="vendor-plans.js" defer></script>
  </body>
</html>
