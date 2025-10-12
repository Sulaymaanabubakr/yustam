// YUSTAM | Vendor Verification Page Interactions

document.addEventListener('DOMContentLoaded', () => {
    const statusBadge = document.getElementById('verificationStatus');
    const statusMessage = document.getElementById('statusMessage');
    const toast = document.getElementById('verificationToast');
    const toastText = toast ? toast.querySelector('span') : null;

    const logoArea = document.querySelector('.logo-area');
    if (logoArea) {
        logoArea.addEventListener('click', () => {
            window.location.href = '/index.html';
        });
    }

    const notifIcon = document.querySelector('.notif-icon');
    if (notifIcon) {
        notifIcon.addEventListener('click', (event) => {
            event.preventDefault();
            window.location.href = 'vendor-notifications.php';
        });
    }

    const verification = {
        status: 'Pending',
        message: 'Your documents are under review.'
    };

    const statusClassList = ['badge-pending', 'badge-verified', 'badge-rejected', 'badge-active'];

    const updateStatus = (status, message) => {
        const normalizedStatus = typeof status === 'string' ? status.toLowerCase() : '';
        const classMap = {
            pending: 'badge-pending',
            verified: 'badge-verified',
            rejected: 'badge-rejected',
            active: 'badge-active'
        };

        if (statusBadge) {
            statusClassList.forEach((cls) => statusBadge.classList.remove(cls));
            const appliedClass = classMap[normalizedStatus] || 'badge-pending';
            statusBadge.classList.add(appliedClass);
            statusBadge.innerHTML = `<i class="ri-shield-check-line"></i> ${status}`;
        }
        if (statusMessage) {
            statusMessage.textContent = message;
        }
    };

    updateStatus(verification.status, verification.message);

    const inputIds = ['uploadCAC', 'uploadIDFront', 'uploadIDBack', 'uploadAddress', 'uploadLogo'];

    const handlePreview = (input) => {
        const files = input.files;
        const file = files && files[0] ? files[0] : null;
        const infoRow = document.querySelector(`.file-info[data-target="${input.id}"]`);
        const infoText = infoRow ? infoRow.querySelector('span') : null;
        const previewContainer = document.getElementById(`preview-${input.id}`);

        if (!file) {
            if (infoText) {
                infoText.textContent = 'No file chosen yet.';
            }
            if (infoRow) {
                infoRow.classList.remove('active');
            }
            if (previewContainer) {
                previewContainer.innerHTML = '';
                previewContainer.style.display = 'none';
            }
            return;
        }

        const fileName = file.name;
        const fileType = file.type;
        const fileSizeKb = Math.round(file.size / 1024);

        console.group(`Vendor verification upload: ${input.id}`);
        console.log('Name:', fileName);
        console.log('Type:', fileType || 'Unknown');
        console.log('Size (KB):', fileSizeKb);
        console.groupEnd();

        if (infoText) {
            infoText.textContent = fileName;
        }
        if (infoRow) {
            infoRow.classList.add('active');
        }

        if (!previewContainer) {
            return;
        }

        const isImage = fileType && fileType.startsWith('image/');

        if (isImage) {
            const reader = new FileReader();
            reader.onload = (event) => {
                previewContainer.innerHTML = `<img src="${(event.target && event.target.result) || ''}" alt="Preview of ${fileName}">`;
                previewContainer.style.display = 'block';
            };
            reader.readAsDataURL(file);
        } else if (fileType === 'application/pdf') {
            const pdfUrl = URL.createObjectURL(file);
            previewContainer.innerHTML = `<embed src="${pdfUrl}" type="application/pdf">`;
            previewContainer.style.display = 'block';
            setTimeout(() => URL.revokeObjectURL(pdfUrl), 5000);
        } else {
            previewContainer.innerHTML = '';
            previewContainer.style.display = 'none';
        }
    };

    inputIds.forEach((id) => {
        const input = document.getElementById(id);
        if (!input) return;
        input.addEventListener('change', () => handlePreview(input));
    });

    const showToast = (message) => {
        if (!toast || !toastText) return;
        toastText.textContent = message;
        toast.classList.add('show');
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    };

    const submitButton = document.getElementById('submitVerificationBtn');
    if (submitButton) {
        submitButton.addEventListener('click', () => {
            const submittedFiles = inputIds.reduce((acc, id) => {
                const input = document.getElementById(id);
                if (input && input.files && input.files[0]) {
                    acc[id] = input.files[0].name;
                }
                return acc;
            }, {});

            console.group('Vendor verification submission');
            console.log('Files submitted:', submittedFiles);
            console.groupEnd();

            updateStatus('Pending', 'Your documents are under review.');
            showToast('Documents submitted for review.');
        });
    }
});
