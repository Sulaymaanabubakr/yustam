<?php
require_once __DIR__ . '/session-path.php';

$vendorParam = isset($_GET['vendorId']) ? $_GET['vendorId'] : ($_GET['id'] ?? '');
$vendorId = trim((string) $vendorParam);
if ($vendorId !== '') {
    $vendorId = preg_replace('/[^A-Za-z0-9_\-]/', '', $vendorId);
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Vendor Storefront | YUSTAM Marketplace</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Anton&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/remixicon@3.5.0/fonts/remixicon.css">
  <style>
    :root {
      --emerald: #004d40;
      --emerald-dark: #00352d;
      --emerald-soft: rgba(0, 77, 64, 0.12);
      --orange: #f3731e;
      --orange-soft: rgba(243, 115, 30, 0.14);
      --beige: #eadccf;
      --ink: #111111;
      --muted: rgba(17, 17, 17, 0.68);
      --white: #ffffff;
      --radius-lg: 24px;
      --radius-md: 18px;
      --shadow-soft: 0 18px 48px rgba(15, 106, 83, 0.18);
      --transition: 0.25s cubic-bezier(0.2, 0.8, 0.2, 1);
    }

    *, *::before, *::after {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      font-family: 'Inter', sans-serif;
      background:
        radial-gradient(circle at top right, rgba(243, 115, 30, 0.18), transparent 55%),
        radial-gradient(circle at bottom left, rgba(0, 77, 64, 0.16), transparent 60%),
        linear-gradient(150deg, rgba(234, 220, 207, 0.96), rgba(255, 255, 255, 0.92));
      min-height: 100vh;
      color: var(--ink);
      padding-bottom: 80px;
    }

    a {
      text-decoration: none;
      color: inherit;
    }

    header {
      position: sticky;
      top: 0;
      z-index: 100;
      backdrop-filter: blur(14px);
      background: rgba(255, 255, 255, 0.86);
      border-bottom: 1px solid rgba(0, 77, 64, 0.16);
    }

    .storefront-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      width: min(1080px, 92vw);
      margin: 0 auto;
      padding: 18px 0;
    }

    .storefront-logo {
      font-family: 'Anton', sans-serif;
      font-size: clamp(22px, 4vw, 28px);
      letter-spacing: 0.08em;
      color: var(--emerald);
    }

    .storefront-header nav {
      display: flex;
      gap: 18px;
      font-size: 0.95rem;
    }

    main {
      width: min(1080px, 92vw);
      margin: 40px auto;
      display: grid;
      gap: 36px;
    }

    .storefront-hero {
      background: rgba(255, 255, 255, 0.9);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-soft);
      padding: clamp(24px, 5vw, 36px);
      display: grid;
      grid-template-columns: auto 1fr auto;
      gap: clamp(18px, 3vw, 32px);
      align-items: center;
    }

    .storefront-avatar {
      width: clamp(78px, 12vw, 110px);
      aspect-ratio: 1;
      border-radius: 26px;
      background: var(--emerald-soft);
      color: var(--emerald);
      display: grid;
      place-items: center;
      font-family: 'Anton', sans-serif;
      font-size: clamp(28px, 5vw, 40px);
      letter-spacing: 0.06em;
      overflow: hidden;
      border: 1px solid rgba(0, 77, 64, 0.22);
    }

    .storefront-avatar img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .storefront-meta h1 {
      margin: 0;
      font-family: 'Anton', sans-serif;
      font-size: clamp(26px, 4.6vw, 36px);
      letter-spacing: 0.05em;
    }

    .storefront-meta p {
      margin: 6px 0 0;
      color: var(--muted);
      font-size: 1rem;
    }

    .storefront-badges {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin-top: 14px;
    }

    .badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      border-radius: 999px;
      padding: 7px 14px;
      font-size: 0.8rem;
      font-weight: 600;
      text-transform: capitalize;
    }

    .badge.plan {
      background: rgba(0, 77, 64, 0.12);
      color: var(--emerald);
    }

    .badge.verification-verified {
      background: rgba(0, 150, 136, 0.16);
      color: #00796b;
    }

    .badge.verification-pending {
      background: rgba(243, 115, 30, 0.16);
      color: var(--orange);
    }

    .badge.verification-rejected,
    .badge.verification-unverified {
      background: rgba(216, 67, 21, 0.16);
      color: #d84315;
    }

    .storefront-cta {
      display: flex;
      flex-direction: column;
      gap: 12px;
      justify-content: center;
      align-items: flex-end;
    }

    .primary-link {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 12px 20px;
      border-radius: 14px;
      background: linear-gradient(135deg, var(--emerald), var(--emerald-dark));
      color: var(--white);
      font-weight: 600;
      transition: var(--transition);
    }

    .primary-link:hover {
      transform: translateY(-2px);
      box-shadow: 0 18px 32px rgba(0, 77, 64, 0.32);
    }

    .storefront-about {
      background: rgba(255, 255, 255, 0.92);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-soft);
      padding: clamp(24px, 5vw, 32px);
      display: grid;
      gap: 18px;
    }

    .storefront-about h2,
    .storefront-listings h2 {
      margin: 0;
      font-family: 'Anton', sans-serif;
      font-size: clamp(22px, 4vw, 28px);
      letter-spacing: 0.08em;
      color: var(--emerald);
    }

    .storefront-about p {
      margin: 0;
      color: var(--muted);
      line-height: 1.6;
    }

    .storefront-contact-grid {
      display: grid;
      gap: 12px;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    }

    .storefront-contact-grid span {
      display: block;
      font-size: 0.78rem;
      text-transform: uppercase;
      letter-spacing: 0.18em;
      color: rgba(17, 17, 17, 0.52);
      margin-bottom: 4px;
    }

    .storefront-contact-grid a {
      font-weight: 600;
      color: var(--emerald);
      word-break: break-word;
    }

    .storefront-listings {
      background: rgba(255, 255, 255, 0.92);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-soft);
      padding: clamp(24px, 5vw, 32px);
      display: grid;
      gap: 22px;
    }

    .listings-header {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      gap: 16px;
    }

    .listings-header span {
      color: var(--muted);
      font-weight: 600;
    }

    .listing-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 20px;
    }

    .listing-card {
      background: rgba(255, 255, 255, 0.96);
      border-radius: var(--radius-md);
      overflow: hidden;
      box-shadow: 0 16px 32px -24px rgba(0, 0, 0, 0.35);
      border: 1px solid rgba(0, 77, 64, 0.08);
      display: flex;
      flex-direction: column;
      transition: var(--transition);
    }

    .listing-card:hover {
      transform: translateY(-6px);
      box-shadow: 0 24px 44px -22px rgba(0, 0, 0, 0.35);
    }

    .listing-card img {
      width: 100%;
      height: 180px;
      object-fit: cover;
    }

    .listing-body {
      padding: 16px;
      display: grid;
      gap: 10px;
    }

    .listing-title {
      font-weight: 600;
      line-height: 1.4;
      min-height: 44px;
    }

    .listing-price {
      font-size: 1.1rem;
      font-weight: 700;
      color: var(--orange);
    }

    .listing-meta {
      display: flex;
      justify-content: space-between;
      font-size: 0.85rem;
      color: var(--muted);
    }

    .listing-cta {
      margin-top: 8px;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-weight: 600;
      color: var(--emerald);
    }

    .empty-state {
      text-align: center;
      padding: 40px 16px;
      background: var(--emerald-soft);
      border-radius: var(--radius-md);
      color: var(--muted);
      display: grid;
      gap: 10px;
      place-items: center;
      font-weight: 600;
    }

    .page-loader {
      position: fixed;
      inset: 0;
      background: rgba(234, 220, 207, 0.65);
      backdrop-filter: blur(10px);
      display: none;
      align-items: center;
      justify-content: center;
      z-index: 1500;
      font-weight: 600;
      color: var(--emerald);
    }

    .page-loader.show {
      display: flex;
    }

    footer {
      text-align: center;
      padding: 32px 16px;
      color: rgba(17, 17, 17, 0.6);
    }

    @media (max-width: 768px) {
      .storefront-hero {
        grid-template-columns: 1fr;
        text-align: center;
      }

      .storefront-cta {
        align-items: center;
      }

      .storefront-avatar {
        margin: 0 auto;
      }
    }
  </style>
</head>
<body data-vendor-id="<?= htmlspecialchars($vendorId, ENT_QUOTES, 'UTF-8'); ?>">
  <header>
    <div class="storefront-header">
      <a class="storefront-logo" href="index.html">YUSTAM</a>
      <nav>
        <a href="shop.html">Shop</a>
        <a href="help.html#faq-heading">Help</a>
        <a href="contact.html#support-form">Contact</a>
      </nav>
    </div>
  </header>

  <main>
    <section class="storefront-hero" id="storefrontHero">
      <div class="storefront-avatar" id="storefrontAvatar"><span>VN</span></div>
      <div class="storefront-meta">
        <h1 id="storefrontName">Vendor</h1>
        <p id="storefrontBusiness">Business Name</p>
        <div class="storefront-badges">
          <span class="badge plan" id="storefrontPlan">Free Plan</span>
          <span class="badge verification-unverified" id="storefrontVerification">Not Verified</span>
        </div>
        <p class="storefront-location" id="storefrontLocation"></p>
      </div>
      <div class="storefront-cta">
        <a class="primary-link" id="storefrontPrimaryAction" href="shop.html">
          <i class="ri-store-2-line"></i>
          Browse Marketplace
        </a>
      </div>
    </section>

    <section class="storefront-about" id="storefrontAbout" hidden>
      <h2>About This Vendor</h2>
      <p id="storefrontBio">We are curating trusted sellers so you can shop confidently on YUSTAM.</p>
      <div class="storefront-contact-grid">
        <div>
          <span>Email</span>
          <a id="storefrontEmail" href="#" target="_blank" rel="noopener">Unavailable</a>
        </div>
        <div>
          <span>Phone</span>
          <a id="storefrontPhone" href="#" target="_blank" rel="noopener">Unavailable</a>
        </div>
        <div>
          <span>Website</span>
          <a id="storefrontWebsite" href="#" target="_blank" rel="noopener">Unavailable</a>
        </div>
      </div>
    </section>

    <section class="storefront-listings" aria-live="polite">
      <div class="listings-header">
        <h2>Listings</h2>
        <span id="listingsCount">Loading listings...</span>
      </div>
      <div id="listingsGrid" class="listing-grid" role="list"></div>
      <div id="listingsEmpty" class="empty-state" hidden>
        <i class="ri-shopping-bag-line" aria-hidden="true"></i>
        <p>This vendor has not published any listings yet. Check back soon!</p>
      </div>
    </section>
  </main>

  <footer>c <?= date('Y'); ?> YUSTAM Marketplace · Trusted Vendors Nationwide</footer>

  <div class="page-loader" id="storefrontLoader">Loading vendor storefront...</div>

  <script src="theme-manager.js" defer></script>
  <script type="module" src="vendor-storefront.js"></script>
</body>
</html>
