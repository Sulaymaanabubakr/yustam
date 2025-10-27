<?php
require_once __DIR__ . '/session-path.php';
session_start();
require_once __DIR__ . '/db.php';

// Only allow admin
if (!isset($_SESSION['admin_id'])) {
    header('Location: admin-login.php');
    exit;
}

$db = get_db_connection();
$verifications = [];
$sql = "SELECT v.id, v.vendor_id, v.status, v.submitted_at, v.feedback, v.files, vd.business_name, vd.email, vd.phone, vd.state FROM vendor_verifications v JOIN vendors vd ON v.vendor_id = vd.id ORDER BY v.submitted_at DESC";
$result = $db->query($sql);
while ($row = $result->fetch_assoc()) {
    $row['files'] = json_decode($row['files'] ?? '[]', true);
    $verifications[] = $row;
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Admin | Vendor Verifications</title>
    <link rel="stylesheet" href="admin.css">
    <style>
        .verif-list { margin: 2rem auto; max-width: 900px; }
        .verif-row { background: #fff; border-radius: 8px; box-shadow: 0 2px 8px #eee; margin-bottom: 1.2rem; padding: 1.2rem; display: flex; justify-content: space-between; align-items: center; }
        .verif-info { flex: 1; }
        .verif-actions { display: flex; gap: 1rem; }
        .verif-btn { padding: 0.5rem 1.2rem; border-radius: 6px; border: none; cursor: pointer; font-weight: 600; }
        .approve { background: #2ecc71; color: #fff; }
        .reject { background: #e74c3c; color: #fff; }
        .view { background: #3498db; color: #fff; }
        .popup { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.35); display: flex; align-items: center; justify-content: center; z-index: 9999; }
        .popup-content { background: #fff; border-radius: 10px; padding: 2rem; max-width: 600px; width: 100%; box-shadow: 0 8px 32px #aaa; }
        .popup-close { float: right; font-size: 1.5rem; cursor: pointer; color: #888; }
        .file-list { margin: 1rem 0; }
        .file-list a { display: block; margin-bottom: 0.5rem; color: #3498db; }
    </style>
</head>
<body>
    <!-- Sidebar is included directly below. Remove this line if you have sidebar HTML in this file. -->
    <main>
        <h1>Vendor Verification Requests</h1>
        <div class="verif-list">
            <?php if (empty($verifications)): ?>
                <div style="text-align:center; color:#888; padding:2rem; font-size:1.1rem; background:#fff; border-radius:8px; box-shadow:0 2px 8px #eee;">
                    <i class="ri-shield-check-line" style="font-size:2.2rem; color:#F3731E;"></i><br>
                    No vendor verification requests yet.<br>
                    New submissions will appear here for review.
                </div>
            <?php else: ?>
                <?php foreach ($verifications as $verif): ?>
                    <div class="verif-row" data-id="<?= $verif['id'] ?>">
                        <div class="verif-info">
                            <strong><?= htmlspecialchars($verif['business_name']) ?></strong> (<?= htmlspecialchars($verif['email']) ?>)<br>
                            <span>Status: <?= htmlspecialchars($verif['status']) ?></span> | <span>Submitted: <?= htmlspecialchars($verif['submitted_at']) ?></span>
                        </div>
                        <div class="verif-actions">
                            <button class="verif-btn view" data-id="<?= $verif['id'] ?>">View</button>
                            <form method="post" action="admin-verification-action.php" style="display:inline;">
                                <input type="hidden" name="id" value="<?= $verif['id'] ?>">
                                <button class="verif-btn approve" name="action" value="approve" type="submit">Approve</button>
                                <button class="verif-btn reject" name="action" value="reject" type="submit">Reject</button>
                            </form>
                        </div>
                    </div>
                <?php endforeach; ?>
            <?php endif; ?>
        </div>
    </main>
    <div id="popup" class="popup" style="display:none;">
        <div class="popup-content">
            <span class="popup-close" onclick="closePopup()">&times;</span>
            <div id="popupDetails"></div>
        </div>
    </div>
    <script>
        function closePopup() {
            document.getElementById('popup').style.display = 'none';
        }
        document.querySelectorAll('.verif-btn.view').forEach(btn => {
            btn.addEventListener('click', function() {
                const row = btn.closest('.verif-row');
                const id = row.getAttribute('data-id');
                fetch('admin-verification-detail.php?id=' + id)
                    .then(res => res.json())
                    .then(data => {
                        let html = `<h2>Vendor: ${data.business_name}</h2>`;
                        html += `<p>Email: ${data.email}<br>Phone: ${data.phone}<br>State: ${data.state}</p>`;
                        html += `<p>Status: ${data.status}<br>Submitted: ${data.submitted_at}</p>`;
                        html += `<div class='file-list'><strong>Files:</strong>`;
                        if (Array.isArray(data.files)) {
                            data.files.forEach(f => {
                                html += `<a href='${f.url}' target='_blank'>${f.name}</a>`;
                            });
                        }
                        html += `</div>`;
                        if (data.feedback) html += `<p><strong>Feedback:</strong> ${data.feedback}</p>`;
                        document.getElementById('popupDetails').innerHTML = html;
                        document.getElementById('popup').style.display = 'flex';
                    });
            });
        });
    </script>
</body>
</html>
