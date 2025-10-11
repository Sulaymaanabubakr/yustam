import { auth, db } from './firebase.js';
    import { uploadToCloudinary } from './cloudinary.js';
    import {
      onAuthStateChanged,
      signOut
    } from 'https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js';
    import {
      doc,
      getDoc,
      updateDoc,
      serverTimestamp
    } from 'https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js';

    const loader = document.getElementById('pageLoader');
    const backBtn = document.getElementById('backBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const changePhotoBtn = document.getElementById('changePhotoBtn');
    const photoInput = document.getElementById('photoInput');
    const photoPreview = document.getElementById('photoPreview');
    const uploadProgress = document.getElementById('uploadProgress');
    const progressBar = document.getElementById('progressBar');
    const saveBtn = document.getElementById('saveBtn');
    const saveSpinner = saveBtn.querySelector('.save-spinner');
    const saveText = saveBtn.querySelector('.save-text');

    const toastContainer = document.getElementById('toastContainer');

    const fields = {
      fullName: document.getElementById('fullName'),
      email: document.getElementById('email'),
      phone: document.getElementById('phone'),
      location: document.getElementById('location'),
      businessName: document.getElementById('businessName'),
      businessDescription: document.getElementById('businessDescription'),
      businessCategory: document.getElementById('businessCategory'),
      whatsapp: document.getElementById('whatsapp'),
      website: document.getElementById('website'),
      instagram: document.getElementById('instagram'),
      facebook: document.getElementById('facebook'),
      tiktok: document.getElementById('tiktok'),
      twitter: document.getElementById('twitter'),
      planName: document.getElementById('planName'),
      planStatus: document.getElementById('planStatus'),
      planExpiry: document.getElementById('planExpiry')
    };

    let currentUserId = null;
    let vendorSnapshot = null;
    let pendingPhotoFile = null;

    const showToast = (message, type = 'info') => {
      const toast = document.createElement('div');
      toast.className = `toast ${type}`;
      toast.innerHTML = `<i class="ri-information-line"></i><span>${message}</span>`;
      toastContainer.appendChild(toast);
      setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translate(-50%, 12px)';
        setTimeout(() => toast.remove(), 300);
      }, 3200);
    };

    const toggleLoader = (show) => {
      loader.style.display = show ? 'flex' : 'none';
    };

    const toggleSaveState = (saving) => {
      saveBtn.disabled = saving;
      if (saving) {
        saveSpinner.hidden = false;
        saveText.textContent = 'Saving…';
      } else {
        saveSpinner.hidden = true;
        saveText.textContent = 'Save Profile Changes';
      }
    };

    const renderPhoto = (url) => {
      photoPreview.innerHTML = '';
      if (url) {
        const img = document.createElement('img');
        img.src = url;
        img.alt = 'Profile photo preview';
        photoPreview.appendChild(img);
      } else {
        const placeholder = document.createElement('div');
        placeholder.className = 'placeholder-icon';
        placeholder.innerHTML = '<i class="ri-user-line"></i>';
        photoPreview.appendChild(placeholder);
      }
    };

    const populateForm = (data) => {
      fields.fullName.value = data.fullName || data.displayName || '';
      fields.email.value = data.email || '';
      fields.phone.value = data.phone || '';
      fields.location.value = data.location || '';
      fields.businessName.value = data.businessName || '';
      fields.businessDescription.value = data.businessDescription || '';
      fields.businessCategory.value = data.businessCategory || '';
      fields.whatsapp.value = data.whatsapp || '';
      fields.website.value = data.website || '';
      fields.instagram.value = data.socials?.instagram || '';
      fields.facebook.value = data.socials?.facebook || '';
      fields.tiktok.value = data.socials?.tiktok || '';
      fields.twitter.value = data.socials?.twitter || '';
      fields.planName.textContent = (data.plan || 'free');
      const planStatus = (data.planStatus || 'active').toLowerCase();
      fields.planStatus.textContent = planStatus;
      fields.planStatus.classList.toggle('expired', planStatus !== 'active');
      fields.planExpiry.value = data.planExpiry ? new Date(data.planExpiry.toDate ? data.planExpiry.toDate() : data.planExpiry).toLocaleDateString() : '—';
      renderPhoto(data.profilePhotoURL);
    };

    const validateForm = () => {
      if (!fields.fullName.value.trim()) {
        showToast('Full name is required.', 'error');
        return false;
      }
      if (!fields.phone.value.trim()) {
        showToast('Phone number is required.', 'error');
        return false;
      }
      if (!fields.businessDescription.value.trim()) {
        showToast('Please add a short business description.', 'error');
        return false;
      }
      return true;
    };

    const getFormData = () => ({
      fullName: fields.fullName.value.trim(),
      phone: fields.phone.value.trim(),
      location: fields.location.value.trim(),
      businessName: fields.businessName.value.trim(),
      businessDescription: fields.businessDescription.value.trim(),
      businessCategory: fields.businessCategory.value,
      whatsapp: fields.whatsapp.value.trim(),
      website: fields.website.value.trim(),
      socials: {
        instagram: fields.instagram.value.trim(),
        facebook: fields.facebook.value.trim(),
        tiktok: fields.tiktok.value.trim(),
        twitter: fields.twitter.value.trim()
      },
      updatedAt: serverTimestamp()
    });

    const uploadProfilePhoto = async (file) => {
      if (!file || !currentUserId) return null;
      uploadProgress.hidden = false;
      progressBar.style.width = '0%';
      try {
        const result = await uploadToCloudinary(file, {
          folder: `vendors/${currentUserId}`,
          tags: ['vendor', currentUserId, 'profile'],
          onProgress: (progress) => {
            progressBar.style.width = `${Math.round(progress * 100)}%`;
          },
        });
        progressBar.style.width = '100%';
        setTimeout(() => {
          uploadProgress.hidden = true;
        }, 250);
        return result.url;
      } catch (error) {
        uploadProgress.hidden = true;
        throw error;
      }
    };

    /* Save Logic */
    const handleSave = async () => {
      if (!validateForm() || !currentUserId) return;
      toggleSaveState(true);
      try {
        const vendorRef = doc(db, 'vendors', currentUserId);
        const payload = getFormData();
        if (pendingPhotoFile) {
          const url = await uploadProfilePhoto(pendingPhotoFile);
          if (url) {
            payload.profilePhotoURL = url;
            renderPhoto(url);
            pendingPhotoFile = null;
          }
        }
        await updateDoc(vendorRef, payload);
        showToast('Profile updated successfully!', 'success');
      } catch (error) {
        console.error(error);
        showToast('Failed to save profile. Please try again.', 'error');
      } finally {
        toggleSaveState(false);
      }
    };

    changePhotoBtn.addEventListener('click', () => photoInput.click());

    photoInput.addEventListener('change', (event) => {
      const file = event.target.files?.[0];
      if (!file) return;
      if (!file.type.startsWith('image/')) {
        showToast('Please select a valid image file.', 'error');
        photoInput.value = '';
        return;
      }
      pendingPhotoFile = file;
      const reader = new FileReader();
      reader.onload = (e) => {
        renderPhoto(e.target?.result);
      };
      reader.readAsDataURL(file);
      showToast('Photo ready to upload. Remember to save!', 'info');
    });

    saveBtn.addEventListener('click', handleSave);

    backBtn.addEventListener('click', () => {
      window.location.href = 'vendor-profile.html';
    });

    logoutBtn.addEventListener('click', async () => {
      try {
        await signOut(auth);
        window.location.href = 'vendor-login.html';
      } catch (error) {
        showToast('Unable to sign out. Please try again.', 'error');
      }
    });

    // <!-- Auth Guard -->
    onAuthStateChanged(auth, async (user) => {
      if (!user) {
        window.location.href = 'vendor-login.html';
        return;
      }
      currentUserId = user.uid;
      try {
        const vendorRef = doc(db, 'vendors', user.uid);
        const vendorDoc = await getDoc(vendorRef);
        if (!vendorDoc.exists()) {
          await signOut(auth);
          window.location.href = 'index.html';
          return;
        }
        vendorSnapshot = vendorDoc;
        populateForm(vendorDoc.data());
      } catch (error) {
        console.error(error);
        showToast('Unable to load profile data.', 'error');
      } finally {
        toggleLoader(false);
      }
    });
