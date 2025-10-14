import { app, auth, db } from './firebase.js';
    import {
      onAuthStateChanged,
      signOut,
      getIdTokenResult
    } from 'https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js';
    import {
      doc,
      getDoc,
      onSnapshot,
      updateDoc,
      deleteDoc,
      serverTimestamp,
      collection,
      addDoc,
      arrayUnion
    } from 'https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js';

    const authLoader = document.getElementById('authLoader');
    const logoutBtn = document.getElementById('logoutBtn');
    const listingTitle = document.getElementById('listingTitle');
    const listingPrice = document.getElementById('listingPrice');
    const listingCategory = document.getElementById('listingCategory');
    const listingCondition = document.getElementById('listingCondition');
    const listingDate = document.getElementById('listingDate');
    const listingStatus = document.getElementById('listingStatus');
    const listingDescription = document.getElementById('listingDescription');
    const feedbackBlock = document.getElementById('feedbackBlock');
    const feedbackChip = document.getElementById('feedbackChip');
    const feedbackTimeline = document.getElementById('feedbackTimeline');
    const feedbackEmpty = document.getElementById('feedbackEmpty');
    const vendorName = document.getElementById('vendorName');
    const vendorBusiness = document.getElementById('vendorBusiness');
    const vendorEmail = document.getElementById('vendorEmail');
    const vendorPhone = document.getElementById('vendorPhone');
    const vendorPlan = document.getElementById('vendorPlan');
    const vendorStatus = document.getElementById('vendorStatus');
    const vendorJoin = document.getElementById('vendorJoin');
    const viewVendorBtn = document.getElementById('viewVendorBtn');
    const approveBtn = document.getElementById('approveBtn');
    const rejectBtn = document.getElementById('rejectBtn');
    const deleteBtn = document.getElementById('deleteBtn');
    const feedbackModal = document.getElementById('feedbackModal');
    const deleteModal = document.getElementById('deleteModal');
    const sendFeedbackBtn = document.getElementById('sendFeedbackBtn');
    const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
    const feedbackReason = document.getElementById('feedbackReason');
    const toast = document.getElementById('toast');
    const galleryPlaceholder = document.getElementById('galleryPlaceholder');
    const mainImage = document.getElementById('mainImage');
    const thumbnailRow = document.getElementById('thumbnailRow');

    const ensureSession = async () => {
      try {
        const response = await fetch('admin-session-status.php', {
          method: 'GET',
          credentials: 'same-origin',
        });
        if (!response.ok) throw new Error('Session invalid');
        return await response.json();
      } catch (error) {
        console.error('Admin session validation failed:', error);
        window.location.href = 'admin-login.php';
        return null;
      }
    };

    let currentListingRef = null;
    let currentListingData = null;
    let currentVendorId = null;
    let unsubscribeListing = null;

    const listingId = new URLSearchParams(window.location.search).get('id');
    if (!listingId) {
      showToast('Listing ID missing from URL.', true);
    }

    const statusClassMap = {
      pending: 'status-pending',
      approved: 'status-approved',
      rejected: 'status-rejected'
    };

    logoutBtn.addEventListener('click', async () => {
      try {
        await signOut(auth);
        await fetch('admin-logout.php', { method: 'GET', credentials: 'same-origin' });
        window.location.href = 'admin-login.php';
      } catch (error) {
        console.error(error);
        showToast('Unable to logout.', true);
      }
    });

    document.querySelectorAll('[data-close="feedback"]').forEach((btn) => {
      btn.addEventListener('click', () => closeModal(feedbackModal));
    });
    document.querySelectorAll('[data-close="delete"]').forEach((btn) => {
      btn.addEventListener('click', () => closeModal(deleteModal));
    });

    approveBtn.addEventListener('click', async () => {
      if (!currentListingRef) return;
      toggleProcessing(true);
      try {
        await updateDoc(currentListingRef, {
          status: 'approved',
          approvedAt: serverTimestamp()
        });
        await addDoc(collection(db, 'notifications'), {
          vendorId: currentVendorId,
          type: 'listing_approved',
          message: `Your listing "${currentListingData?.title ?? ''}" has been approved!`,
          listingId,
          createdAt: serverTimestamp()
        });
        showToast('Listing approved successfully.');
      } catch (error) {
        showToast(error.message, true);
      } finally {
        toggleProcessing(false);
      }
    });

    rejectBtn.addEventListener('click', () => {
      feedbackReason.value = '';
      feedbackModal.querySelectorAll('input[type="checkbox"]').forEach((checkbox) => (checkbox.checked = false));
      openModal(feedbackModal);
    });

    deleteBtn.addEventListener('click', () => {
      openModal(deleteModal);
    });

    [feedbackModal, deleteModal].forEach((modalEl) => {
      modalEl.addEventListener('click', (event) => {
        if (event.target === modalEl) {
          closeModal(modalEl);
        }
      });
    });

    sendFeedbackBtn.addEventListener('click', async () => {
      const reasonText = feedbackReason.value.trim();
      if (!reasonText) {
        showToast('Please provide a feedback reason.', true);
        return;
      }
      const selectedReasons = Array.from(feedbackModal.querySelectorAll('input[type="checkbox"]:checked')).map((el) => el.value);
      toggleProcessing(true);
      try {
        const rejectionRecord = {
          reasonText,
          selectedReasons,
          adminUid: auth.currentUser?.uid ?? null,
          rejectedAt: serverTimestamp()
        };
        await updateDoc(currentListingRef, {
          status: 'rejected',
          feedback: rejectionRecord,
          feedbackHistory: arrayUnion(rejectionRecord)
        });
        await addDoc(collection(db, 'notifications'), {
          vendorId: currentVendorId,
          type: 'listing_rejected',
          message: reasonText,
          listingId,
          createdAt: serverTimestamp()
        });
        closeModal(feedbackModal);
        showToast('Feedback sent to vendor.');
      } catch (error) {
        showToast(error.message, true);
      } finally {
        toggleProcessing(false);
      }
    });

    confirmDeleteBtn.addEventListener('click', async () => {
      if (!currentListingRef) return;
      toggleProcessing(true);
      try {
        await deleteDoc(currentListingRef);
        closeModal(deleteModal);
        showToast('Listing deleted.');
        setTimeout(() => {
          window.location.href = 'admin-listings.php';
        }, 1000);
      } catch (error) {
        showToast(error.message, true);
      } finally {
        toggleProcessing(false);
      }
    });

    function renderStatus(status = 'pending') {
      listingStatus.textContent = status.charAt(0).toUpperCase() + status.slice(1);
      listingStatus.className = `status-chip ${statusClassMap[status] ?? 'status-pending'}`;
    }

    function renderGallery(images = []) {
      if (!images.length) {
        galleryPlaceholder.classList.remove('hidden');
        mainImage.classList.add('hidden');
        thumbnailRow.classList.add('hidden');
        thumbnailRow.innerHTML = '';
        return;
      }
      galleryPlaceholder.classList.add('hidden');
      mainImage.classList.remove('hidden');
      thumbnailRow.classList.remove('hidden');
      mainImage.src = images[0];
      mainImage.alt = `Listing image 1`;
      thumbnailRow.innerHTML = '';
      images.forEach((url, index) => {
        const img = document.createElement('img');
        img.src = url;
        img.alt = `Listing thumbnail ${index + 1}`;
        img.className = 'thumbnail' + (index === 0 ? ' active' : '');
        img.addEventListener('click', () => {
          mainImage.src = url;
          mainImage.alt = `Listing image ${index + 1}`;
          thumbnailRow.querySelectorAll('.thumbnail').forEach((thumb) => thumb.classList.remove('active'));
          img.classList.add('active');
        });
        thumbnailRow.appendChild(img);
      });
    }

    function renderListing(data) {
      listingTitle.textContent = data.title || 'Untitled Listing';
      listingPrice.textContent = data.price ? new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 0 }).format(data.price) : '—';
      listingCategory.textContent = data.category ? `${data.category}${data.subcategory ? ' ▸ ' + data.subcategory : ''}` : '—';
      listingCondition.textContent = data.condition || '—';
      listingDate.textContent = data.createdAt?.toDate ? data.createdAt.toDate().toLocaleString() : '—';
      listingDescription.textContent = data.description || 'No description provided.';
      renderStatus(data.status || 'pending');
      if (data.feedback?.reasonText) {
        feedbackBlock.classList.remove('hidden');
        feedbackChip.textContent = data.feedback.reasonText;
      } else {
        feedbackBlock.classList.add('hidden');
      }
      renderGallery(Array.isArray(data.images) ? data.images : []);
    }

    function renderVendor(data) {
      vendorName.textContent = data.displayName || data.name || '—';
      vendorBusiness.textContent = data.businessName || '—';
      vendorEmail.textContent = data.email || '—';
      vendorPhone.textContent = data.phone || '—';
      vendorJoin.textContent = data.createdAt?.toDate ? data.createdAt.toDate().toLocaleDateString() : '—';
      vendorPlan.textContent = data.plan ? data.plan.charAt(0).toUpperCase() + data.plan.slice(1) : 'Free';
      vendorPlan.className = `chip plan-${data.plan ?? 'free'}`;
      vendorStatus.textContent = data.status ? data.status.charAt(0).toUpperCase() + data.status.slice(1) : 'Active';
      vendorStatus.className = `chip status-${(data.status || 'active')}`;
      viewVendorBtn.onclick = () => {
        window.location.href = `vendor-profile.php?id=${currentVendorId}`;
      };
    }

    function renderFeedbackHistory(listingData) {
      feedbackTimeline.innerHTML = '';
      const historySource = Array.isArray(listingData.feedbackHistory) && listingData.feedbackHistory.length
        ? listingData.feedbackHistory
        : (listingData.feedback?.reasonText ? [listingData.feedback] : []);

      if (!historySource.length) {
        feedbackEmpty.classList.remove('hidden');
        return;
      }

      feedbackEmpty.classList.add('hidden');
      historySource
        .sort((a, b) => (b.rejectedAt?.seconds || 0) - (a.rejectedAt?.seconds || 0))
        .forEach((entry) => {
          const item = document.createElement('div');
          item.className = 'timeline-item';
          item.innerHTML = `
            <strong>${entry.reasonText || 'No reason provided'}</strong>
            <div class="timeline-meta">
              ${entry.selectedReasons?.length ? `<span>Tags: ${entry.selectedReasons.join(', ')}</span><br />` : ''}
              <span>${entry.rejectedAt?.toDate ? entry.rejectedAt.toDate().toLocaleString() : ''}</span>
            </div>
          `;
          feedbackTimeline.appendChild(item);
        });
    }

    function toggleProcessing(isProcessing) {
      [approveBtn, rejectBtn, deleteBtn, sendFeedbackBtn, confirmDeleteBtn].forEach((btn) => {
        btn.disabled = isProcessing;
        btn.style.opacity = isProcessing ? 0.6 : 1;
      });
    }

    function openModal(modalEl) {
      modalEl.classList.add('active');
    }

    function closeModal(modalEl) {
      modalEl.classList.remove('active');
    }

    function showToast(message, isError = false) {
      toast.textContent = message;
      toast.classList.toggle('error', isError);
      toast.classList.add('show');
      setTimeout(() => {
        toast.classList.remove('show');
      }, 2600);
    }

    function setupListingListener(listingRef) {
      if (unsubscribeListing) unsubscribeListing();
      unsubscribeListing = onSnapshot(listingRef, (snapshot) => {
        if (!snapshot.exists()) {
          showToast('Listing no longer exists.', true);
          return;
        }
        currentListingData = snapshot.data();
        renderListing(currentListingData);
        renderFeedbackHistory(currentListingData);
      });
    }

    async function loadVendorData(vendorId) {
      if (!vendorId) return;
      currentVendorId = vendorId;
      const vendorSnap = await getDoc(doc(db, 'vendors', vendorId));
      if (vendorSnap.exists()) {
        renderVendor(vendorSnap.data());
      }
    }

    async function loadListingDetails() {
      if (!listingId) return;
      try {
        const listingRef = doc(db, 'listings', listingId);
        currentListingRef = listingRef;
        const listingSnap = await getDoc(listingRef);
        if (!listingSnap.exists()) {
          showToast('Listing not found.', true);
          setTimeout(() => {
            window.location.href = 'admin-listings.php';
          }, 1400);
          return;
        }
        currentListingData = listingSnap.data();
        renderListing(currentListingData);
        renderFeedbackHistory(currentListingData);
        await loadVendorData(currentListingData.vendorId || currentListingData.vendorID);
        setupListingListener(listingRef);
      } catch (error) {
        showToast(error.message, true);
      } finally {
        authLoader.classList.add('hidden');
      }
    }

    onAuthStateChanged(auth, async (user) => {
      const session = await ensureSession();
      if (!session) {
        return;
      }
      try {
        if (user) {
          const adminDoc = await getDoc(doc(db, 'admins', user.uid));
          const token = await getIdTokenResult(user);
          const isAdmin = adminDoc.exists() || token.claims.isAdmin === true;
          if (!isAdmin) {
            await signOut(auth);
            await fetch('admin-logout.php', { method: 'GET', credentials: 'same-origin' });
            window.location.href = 'index.html';
            return;
          }
        } else {
          console.warn('Firebase admin user not available; continuing with PHP session only.');
        }
        await loadListingDetails();
      } catch (error) {
        showToast('Unable to verify admin access.', true);
        authLoader.classList.add('hidden');
      }
    });


