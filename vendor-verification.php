<?php
ini_set('session.save_path', '/home2/yustamco/tmp');
session_start();

if (!isset($_SESSION['vendor_id'])) {
    header('Location: vendor-login.html');
    exit;
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>YUSTAM Vendor Verification</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Anton&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <link href="https://cdn.jsdelivr.net/npm/remixicon@4.2.0/fonts/remixicon.css" rel="stylesheet">
    <style>
        :root {
            --emerald: #004D40;
            --orange: #F3731E;
            --beige: #EADCCF;
            --white: #FFFFFF;
            --glass-bg: rgba(255, 255, 255, 0.85);
            --glass-border: rgba(255, 255, 255, 0.25);
            --radius-large: 20px;
            --radius-medium: 18px;
            --shadow-soft: 0 18px 40px rgba(0, 0, 0, 0.12);
        }

        * {
            box-sizing: border-box;
        }

        body {
            margin: 0;
            font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            background: radial-gradient(circle at top, rgba(234, 220, 207, 0.9) 0%, rgba(255, 255, 255, 0.95) 55%, rgba(234, 220, 207, 0.88) 100%);
            color: #1A1A1A;
            min-height: 100vh;
            display: flex;
            flex-direction: column;
        }

        h1, h2, h3 {
            font-family: 'Anton', sans-serif;
            letter-spacing: 0.05em;
            color: var(--emerald);
        }

        p {
            margin: 0;
            line-height: 1.6;
        }

        a {
            color: inherit;
            text-decoration: none;
        }

        /* Header */
        header {
            background: linear-gradient(135deg, rgba(0, 77, 64, 0.95), rgba(0, 77, 64, 0.88));
            color: var(--white);
            padding: 1rem clamp(1.5rem, 5vw, 3rem);
            display: flex;
            align-items: center;
            justify-content: space-between;
            position: sticky;
            top: 0;
            z-index: 20;
            backdrop-filter: blur(10px);
            box-shadow: 0 14px 34px rgba(0, 0, 0, 0.18);
        }

        .header-left {
            display: flex;
            align-items: center;
            gap: 0.85rem;
        }

        .header-left img {
            width: 48px;
            height: 48px;
            border-radius: 14px;
            object-fit: cover;
            box-shadow: 0 10px 24px rgba(0, 0, 0, 0.25);
        }

        .header-left span {
            font-size: clamp(1.4rem, 3.8vw, 1.9rem);
            font-family: 'Anton', sans-serif;
            font-weight: 600;
            letter-spacing: 0.14em;
        }

        .header-actions {
            display: flex;
            align-items: center;
            gap: 0.9rem;
        }

        .icon-button {
            width: 46px;
            height: 46px;
            border-radius: 50%;
            border: 1px solid rgba(255, 255, 255, 0.35);
            background: rgba(255, 255, 255, 0.12);
            display: inline-flex;
            align-items: center;
            justify-content: center;
            color: var(--white);
            box-shadow: 0 10px 22px rgba(0, 0, 0, 0.18);
            transition: transform 0.3s ease, box-shadow 0.3s ease, background 0.3s ease;
        }

        .icon-button:hover {
            transform: translateY(-3px) scale(1.05);
            background: rgba(243, 115, 30, 0.28);
            box-shadow: 0 14px 32px rgba(243, 115, 30, 0.45);
        }

        .underline-accent {
            position: absolute;
            left: clamp(1.5rem, 5vw, 3rem);
            right: clamp(1.5rem, 5vw, 3rem);
            top: 100%;
            height: 4px;
            background: linear-gradient(90deg, rgba(243, 115, 30, 0.95), rgba(255, 138, 60, 0.6));
            border-radius: 999px;
        }

        main {
            width: min(1180px, calc(100% - clamp(2rem, 6vw, 6rem)));
            margin: clamp(1.8rem, 4vw, 3rem) auto clamp(3rem, 6vw, 4rem);
            display: flex;
            flex-direction: column;
            gap: clamp(1.6rem, 3vw, 2.5rem);
            padding-bottom: 2rem;
        }

        .page-title {
            display: flex;
            flex-direction: column;
            gap: 0.6rem;
        }

        .page-title h1 {
            margin: 0;
            font-size: clamp(2rem, 5vw, 2.8rem);
        }

        .page-title p {
            color: rgba(0, 0, 0, 0.65);
            max-width: 520px;
        }

        /* Verification Status */
        .status-card {
            position: relative;
            background: var(--glass-bg);
            border: 1px solid var(--glass-border);
            border-radius: var(--radius-large);
            padding: clamp(1.4rem, 3vw, 2rem);
            box-shadow: var(--shadow-soft);
            display: grid;
            gap: 0.75rem;
            backdrop-filter: blur(12px);
            animation: fadeInUp 620ms ease forwards;
        }

        .status-badge {
            width: fit-content;
            padding: 0.35rem 1.15rem;
            border-radius: 999px;
            font-weight: 600;
            font-size: 0.92rem;
            letter-spacing: 0.06em;
            background: linear-gradient(135deg, rgba(243, 115, 30, 0.12), rgba(243, 115, 30, 0.28));
            color: var(--emerald);
            display: inline-flex;
            align-items: center;
            gap: 0.45rem;
            transition: background 0.3s ease, color 0.3s ease, box-shadow 0.3s ease;
        }

        .status-badge i {
            color: var(--orange);
        }

        .status-badge.badge-pending {
            background: linear-gradient(135deg, rgba(243, 115, 30, 0.12), rgba(243, 115, 30, 0.28));
            color: var(--emerald);
        }

        .status-badge.badge-verified {
            background: linear-gradient(135deg, rgba(0, 77, 64, 0.15), rgba(0, 77, 64, 0.4));
            color: var(--emerald);
            box-shadow: 0 12px 28px rgba(0, 77, 64, 0.25);
        }

        .status-badge.badge-rejected {
            background: linear-gradient(135deg, rgba(214, 55, 55, 0.12), rgba(214, 55, 55, 0.32));
            color: #7A1C1C;
            box-shadow: 0 12px 28px rgba(214, 55, 55, 0.25);
        }

        .status-badge.badge-active {
            background: linear-gradient(135deg, rgba(0, 77, 64, 0.25), rgba(243, 115, 30, 0.35));
            color: var(--emerald);
            box-shadow: 0 12px 28px rgba(243, 115, 30, 0.25);
        }

        /* Document Uploads */
        .verification-grid {
            display: grid;
            grid-template-columns: 1fr;
            gap: clamp(1.4rem, 3vw, 2rem);
        }

        @media (min-width: 768px) {
            .verification-grid {
                grid-template-columns: repeat(2, minmax(0, 1fr));
            }
        }

        .verify-card {
            background: var(--glass-bg);
            border: 1px solid var(--glass-border);
            border-radius: var(--radius-large);
            padding: clamp(1.4rem, 2.8vw, 1.9rem);
            box-shadow: var(--shadow-soft);
            display: flex;
            flex-direction: column;
            gap: 1rem;
            backdrop-filter: blur(10px);
            animation: fadeInUp 680ms ease forwards;
        }

        .verify-card h2 {
            margin: 0;
            font-size: clamp(1.1rem, 3.2vw, 1.35rem);
        }

        .verify-card p.description {
            color: rgba(0, 0, 0, 0.65);
            font-size: 0.96rem;
        }

        .upload-field {
            display: flex;
            flex-direction: column;
            gap: 0.75rem;
        }

        label.upload-label {
            font-weight: 600;
            color: var(--emerald);
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }

        label.upload-label i {
            color: var(--orange);
        }

        input[type="file"] {
            border: 1px dashed rgba(0, 77, 64, 0.35);
            border-radius: var(--radius-medium);
            padding: 0.85rem 1rem;
            background: rgba(255, 255, 255, 0.72);
            color: rgba(0, 0, 0, 0.7);
            font-size: 0.95rem;
            transition: border-color 0.3s ease, box-shadow 0.3s ease;
            width: 100%;
        }

        input[type="file"]:hover {
            border-color: rgba(243, 115, 30, 0.65);
            box-shadow: 0 10px 24px rgba(243, 115, 30, 0.18);
        }

        .file-info {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            color: rgba(0, 0, 0, 0.7);
            font-size: 0.9rem;
            min-height: 42px;
        }

        .file-info i {
            color: var(--orange);
            font-size: 1.1rem;
            opacity: 0;
            transition: opacity 0.3s ease;
        }

        .file-info.active i {
            opacity: 1;
        }

        .preview-thumb {
            width: 100%;
            max-width: 220px;
            border-radius: 16px;
            overflow: hidden;
            border: 1px solid rgba(0, 77, 64, 0.18);
            background: rgba(255, 255, 255, 0.58);
            display: none;
            box-shadow: 0 16px 32px rgba(0, 0, 0, 0.12);
        }

        .preview-thumb img,
        .preview-thumb embed {
            width: 100%;
            display: block;
            height: auto;
        }

        .submit-area {
            display: flex;
            flex-direction: column;
            gap: 0.75rem;
            align-items: flex-start;
            margin-top: clamp(1.5rem, 4vw, 2.5rem);
            animation: fadeInUp 740ms ease forwards;
        }

        #submitVerificationBtn {
            border: none;
            border-radius: 14px;
            padding: 0.95rem clamp(1.8rem, 4vw, 2.8rem);
            background: linear-gradient(135deg, #F3731E, #FF8A3C);
            color: var(--white);
            font-weight: 700;
            font-size: 1rem;
            letter-spacing: 0.08em;
            cursor: pointer;
            box-shadow: 0 18px 38px rgba(243, 115, 30, 0.35);
            transition: transform 0.3s ease, box-shadow 0.3s ease;
        }

        #submitVerificationBtn:hover {
            transform: translateY(-2px) scale(1.02);
            box-shadow: 0 20px 44px rgba(243, 115, 30, 0.45);
        }

        .submit-area span {
            color: rgba(0, 0, 0, 0.6);
            font-size: 0.95rem;
        }

        /* Footer */
        footer {
            margin-top: auto;
            background: rgba(234, 220, 207, 0.85);
            backdrop-filter: blur(14px);
            border-top: 1px solid rgba(255, 255, 255, 0.35);
            padding: clamp(1.8rem, 4vw, 2.6rem) clamp(1.6rem, 4vw, 3rem);
            display: grid;
            gap: 1.2rem;
            color: rgba(0, 0, 0, 0.7);
        }

        .footer-links,
        .footer-social {
            display: flex;
            flex-wrap: wrap;
            gap: 1rem;
            font-weight: 600;
        }

        .footer-social a {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 42px;
            height: 42px;
            border-radius: 50%;
            background: rgba(243, 115, 30, 0.18);
            color: var(--emerald);
            transition: transform 0.3s ease, box-shadow 0.3s ease;
        }

        .footer-social a:hover {
            transform: translateY(-3px) scale(1.05);
            box-shadow: 0 12px 28px rgba(243, 115, 30, 0.35);
        }

        .footer-meta {
            font-size: 0.9rem;
        }

        .toast {
            position: fixed;
            bottom: 24px;
            left: 50%;
            transform: translate(-50%, 30px);
            background: rgba(243, 115, 30, 0.92);
            color: var(--white);
            padding: 0.95rem 1.6rem;
            border-radius: 16px;
            box-shadow: 0 16px 36px rgba(243, 115, 30, 0.4);
            opacity: 0;
            pointer-events: none;
            transition: opacity 0.4s ease, transform 0.4s ease;
            display: flex;
            align-items: center;
            gap: 0.6rem;
            z-index: 99;
        }

        .toast.show {
            opacity: 1;
            transform: translate(-50%, 0);
        }

        @keyframes fadeInUp {
            from {
                opacity: 0;
                transform: translateY(18px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
    </style>
</head>
<body>
    <!-- Header -->
    <header>
        <div class="header-left">
            <img src="logo.jpeg" alt="YUSTAM Logo">
            <span>YUSTAM Vendors</span>
        </div>
        <div class="header-actions">
            <a class="icon-button" href="vendor-dashboard.php" title="Dashboard"><i class="ri-home-4-line"></i></a>
            <a class="icon-button" href="vendor-plans.php" title="Plans"><i class="ri-vip-crown-line"></i></a>
            <a class="icon-button" href="logout.php" title="Logout"><i class="ri-logout-box-r-line"></i></a>
        </div>
        <div class="underline-accent"></div>
    </header>

    <main>
        <div class="page-title">
            <h1>Vendor Verification</h1>
            <p>Upload your required documents to get verified and unlock premium trust badges across the YUSTAM Marketplace.</p>
        </div>

        <!-- Verification Status -->
        <section class="status-card">
            <h2>Vendor Verification Status</h2>
            <span class="status-badge" id="verificationStatus"><i class="ri-shield-check-line"></i> Pending</span>
            <p id="statusMessage">Your documents are under review.</p>
        </section>

        <!-- Document Uploads -->
        <section class="verification-grid">
            <section class="verify-card">
                <h2>Business Registration (CAC Document)</h2>
                <p class="description">Provide your Corporate Affairs Commission certificate or proof of business registration for validation.</p>
                <div class="upload-field">
                    <label class="upload-label" for="uploadCAC"><i class="ri-file-upload-line"></i> Upload CAC Certificate or Business Registration</label>
                    <input type="file" id="uploadCAC" accept=".jpg,.jpeg,.png,.pdf">
                    <div class="file-info" data-target="uploadCAC"><i class="ri-check-double-line"></i><span>No file chosen yet.</span></div>
                    <div class="preview-thumb" id="preview-uploadCAC"></div>
                </div>
            </section>

            <section class="verify-card">
                <h2>Government ID (Front &amp; Back)</h2>
                <p class="description">Upload a valid government-issued ID such as Driver's Licence, National ID or International Passport.</p>
                <div class="upload-field">
                    <label class="upload-label" for="uploadIDFront"><i class="ri-file-upload-line"></i> Upload your valid government-issued ID (Front)</label>
                    <input type="file" id="uploadIDFront" accept=".jpg,.jpeg,.png,.pdf">
                    <div class="file-info" data-target="uploadIDFront"><i class="ri-check-double-line"></i><span>No file chosen yet.</span></div>
                    <div class="preview-thumb" id="preview-uploadIDFront"></div>
                </div>
                <div class="upload-field">
                    <label class="upload-label" for="uploadIDBack"><i class="ri-file-upload-line"></i> Upload your valid government-issued ID (Back)</label>
                    <input type="file" id="uploadIDBack" accept=".jpg,.jpeg,.png,.pdf">
                    <div class="file-info" data-target="uploadIDBack"><i class="ri-check-double-line"></i><span>No file chosen yet.</span></div>
                    <div class="preview-thumb" id="preview-uploadIDBack"></div>
                </div>
            </section>

            <section class="verify-card">
                <h2>Proof of Address</h2>
                <p class="description">Submit a recent utility bill or any document that confirms your business address.</p>
                <div class="upload-field">
                    <label class="upload-label" for="uploadAddress"><i class="ri-file-upload-line"></i> Upload Utility Bill or Proof of Address</label>
                    <input type="file" id="uploadAddress" accept=".jpg,.jpeg,.png,.pdf">
                    <div class="file-info" data-target="uploadAddress"><i class="ri-check-double-line"></i><span>No file chosen yet.</span></div>
                    <div class="preview-thumb" id="preview-uploadAddress"></div>
                </div>
            </section>

            <section class="verify-card">
                <h2>Business Logo</h2>
                <p class="description">Share your brand logo to personalize your store profile across the marketplace.</p>
                <div class="upload-field">
                    <label class="upload-label" for="uploadLogo"><i class="ri-file-upload-line"></i> Upload your business logo (optional)</label>
                    <input type="file" id="uploadLogo" accept=".jpg,.jpeg,.png,.pdf">
                    <div class="file-info" data-target="uploadLogo"><i class="ri-check-double-line"></i><span>No file chosen yet.</span></div>
                    <div class="preview-thumb" id="preview-uploadLogo"></div>
                </div>
            </section>
        </section>

        <div class="submit-area">
            <button id="submitVerificationBtn">Submit for Verification</button>
            <span>Your account will be reviewed within 24–48 hours.</span>
        </div>
    </main>

    <!-- Footer -->
    <footer>
        <div class="footer-links">
            <a href="help.html">Help</a>
            <a href="privacy.html">Privacy</a>
            <a href="#">Terms</a>
            <a href="contact.html">Contact</a>
        </div>
        <div class="footer-social">
            <a href="https://wa.me" aria-label="WhatsApp"><i class="ri-whatsapp-line"></i></a>
            <a href="https://instagram.com" aria-label="Instagram"><i class="ri-instagram-line"></i></a>
            <a href="https://facebook.com" aria-label="Facebook"><i class="ri-facebook-circle-line"></i></a>
        </div>
        <div class="footer-meta">© 2025 YUSTAM Marketplace — Built for Nigeria.</div>
    </footer>

    <div class="toast" id="verificationToast"><i class="ri-notification-3-line"></i><span></span></div>
    <script src="vendor-verification.js" defer></script>
</body>
</html>
