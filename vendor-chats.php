<?php
require_once __DIR__ . '/session-path.php';
session_start();

$vendorNumericId = isset($_SESSION['vendor_id']) ? trim((string) $_SESSION['vendor_id']) : '';
$vendorUid = isset($_SESSION['vendor_uid']) ? trim((string) $_SESSION['vendor_uid']) : '';
$vendorName = isset($_SESSION['vendor_name']) ? trim((string) $_SESSION['vendor_name']) : 'Vendor';

if ($vendorUid === '' && $vendorNumericId !== '') {
    $vendorUid = $vendorNumericId;
}

$vendorUidParam = isset($_GET['vendorUid']) ? trim((string) $_GET['vendorUid']) : '';
if ($vendorUidParam !== '') {
    $vendorUid = $vendorUidParam;
}
?>
<!DOCTYPE html>
<html lang="en" data-role="vendor">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Vendor Conversations | YUSTAM</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Anton&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <link href="https://cdn.jsdelivr.net/npm/remixicon@4.2.0/fonts/remixicon.css" rel="stylesheet">
    <style>
        :root {
            --emerald: #004D40;
            --emerald-strong: #003830;
            --orange: #F3731E;
            --orange-deep: #D95C0D;
            --glass-dark: rgba(255, 255, 255, 0.12);
            --white: #ffffff;
        }

        *, *::before, *::after {
            box-sizing: border-box;
        }

        body {
            margin: 0;
            min-height: 100vh;
            background: radial-gradient(circle at top, rgba(0, 77, 64, 0.92), rgba(0, 40, 34, 0.96));
            font-family: 'Inter', system-ui, sans-serif;
            color: rgba(255, 255, 255, 0.92);
        }

        header {
            padding: clamp(24px, 6vw, 60px) clamp(20px, 10vw, 120px) clamp(18px, 5vw, 40px);
            display: flex;
            flex-direction: column;
            gap: 28px;
        }

        .page-headline {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 16px;
        }

        h1 {
            margin: 0;
            font-family: 'Anton', sans-serif;
            font-size: clamp(2.2rem, 5vw, 3.2rem);
            letter-spacing: 0.12em;
            text-transform: uppercase;
        }

        .tagline {
            margin: 0;
            font-size: 0.9rem;
            text-transform: uppercase;
            letter-spacing: 0.12em;
            color: rgba(255, 255, 255, 0.7);
        }

        .search-bar {
            position: relative;
            display: flex;
            align-items: center;
            gap: 12px;
            height: 60px;
            padding: 0 20px;
            border-radius: 20px;
            background: rgba(255, 255, 255, 0.12);
            backdrop-filter: blur(16px);
            box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.2);
        }

        .search-bar input {
            flex: 1;
            border: none;
            background: transparent;
            font-size: 1rem;
            color: inherit;
            font-family: inherit;
            outline: none;
        }

        main {
            padding: 0 clamp(20px, 10vw, 120px) 90px;
        }

        .chat-grid {
            display: grid;
            gap: 18px;
        }

        .chat-card {
            position: relative;
            display: grid;
            grid-template-columns: auto 1fr auto;
            gap: 20px;
            align-items: center;
            padding: 22px;
            border-radius: 26px;
            background: rgba(0, 0, 0, 0.32);
            backdrop-filter: blur(18px);
            box-shadow: 0 24px 40px rgba(0, 0, 0, 0.35);
            cursor: pointer;
            transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .chat-card:hover {
            transform: translateY(-4px);
            box-shadow: 0 30px 50px rgba(0, 0, 0, 0.45);
        }

        .avatar {
            width: 68px;
            height: 68px;
            border-radius: 22px;
            background: linear-gradient(135deg, rgba(243, 115, 30, 0.96), rgba(217, 92, 13, 0.96));
            display: grid;
            place-items: center;
            font-weight: 700;
            font-size: 1.5rem;
            color: var(--white);
        }

        .chat-info {
            display: flex;
            flex-direction: column;
            gap: 8px;
        }

        .chat-info h2 {
            margin: 0;
            font-size: 1.1rem;
            font-weight: 600;
        }

        .chat-info p {
            margin: 0;
            color: rgba(255, 255, 255, 0.68);
            font-size: 0.92rem;
        }

        .chat-product {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 0.86rem;
            color: rgba(255, 255, 255, 0.72);
        }

        .chat-meta {
            text-align: right;
            display: flex;
            flex-direction: column;
            gap: 10px;
            font-size: 0.82rem;
            color: rgba(255, 255, 255, 0.6);
        }

        .badge {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            min-width: 32px;
            padding: 4px 12px;
            border-radius: 999px;
            background: rgba(243, 115, 30, 0.28);
            color: rgba(255, 255, 255, 0.92);
            font-weight: 600;
            font-size: 0.78rem;
        }

        .loader {
            display: grid;
            place-items: center;
            padding: 60px 0;
        }

        .loader span {
            width: 34px;
            height: 34px;
            border-radius: 50%;
            border: 3px solid rgba(255, 255, 255, 0.16);
            border-top-color: rgba(243, 115, 30, 0.9);
            animation: spin 1s linear infinite;
        }

        .empty-state {
            padding: 90px 24px;
            text-align: center;
            background: rgba(0, 0, 0, 0.32);
            backdrop-filter: blur(16px);
            border-radius: 30px;
            box-shadow: 0 26px 50px rgba(0, 0, 0, 0.4);
        }

        .empty-state h2 {
            margin: 0 0 12px;
            font-family: 'Anton', sans-serif;
            font-size: 2rem;
            letter-spacing: 0.1em;
        }

        @keyframes spin {
            from { transform: rotate(0); }
            to { transform: rotate(360deg); }
        }

        @media (max-width: 768px) {
            header {
                padding-inline: 20px;
            }

            main {
                padding-inline: 20px;
            }

            .chat-card {
                grid-template-columns: auto 1fr;
            }

            .chat-meta {
                grid-column: 1 / -1;
                flex-direction: row;
                justify-content: space-between;
            }
        }
    </style>
</head>
<body data-vendor-uid="<?= htmlspecialchars($vendorUid, ENT_QUOTES, 'UTF-8'); ?>" data-vendor-name="<?= htmlspecialchars($vendorName, ENT_QUOTES, 'UTF-8'); ?>">
    <header>
        <div class="page-headline">
            <div>
                <h1>Inbox</h1>
                <p class="tagline">Chat with your buyers in real-time</p>
            </div>
            <a href="vendor-dashboard.php" class="tagline" style="text-decoration:none;">Back to dashboard</a>
        </div>
        <div class="search-bar">
            <i class="ri-search-line" aria-hidden="true"></i>
            <input id="chatSearch" type="search" placeholder="Search buyers or listings">
        </div>
    </header>
    <main>
        <div id="chatLoader" class="loader" hidden>
            <span></span>
        </div>
        <section id="chatList" class="chat-grid" aria-live="polite"></section>
        <div id="chatEmpty" class="empty-state" hidden>
            <h2>No buyers yet</h2>
            <p>Share your listings and respond quickly to enquiries. Conversations appear here instantly.</p>
        </div>
    </main>

    <script type="module" src="vendor-chats.js"></script>
</body>
</html>
