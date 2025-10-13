import { db } from './firebase.js';
import { collection, onSnapshot, deleteDoc, doc, orderBy, query } from 'https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js';

const buyerId = document.body?.dataset?.buyerId || '';
const grid = document.getElementById('savedGrid');
const empty = document.getElementById('emptyState');

function renderEmptyState() {
  if (!empty) return;
  empty.hidden = false;
}

if (buyerId && grid) {
  const savedItemsRef = query(collection(db, `saved/${buyerId}/items`), orderBy('timestamp', 'desc'));
  onSnapshot(savedItemsRef, (snapshot) => {
    grid.innerHTML = '';
    if (snapshot.empty) {
      renderEmptyState();
      return;
    }
    if (empty) empty.hidden = true;
    snapshot.forEach((docSnap) => {
      const data = docSnap.data() || {};
      const name = data.name || data.title || 'Saved listing';
      const productKey = data.productId || docSnap.id;
      const card = document.createElement('div');
      card.className = 'saved-card';
      const imageUrl = data.image || 'https://images.unsplash.com/photo-1545239351-1141bd82e8a6?auto=format&fit=crop&w=420&q=80';
      card.innerHTML = `
        <img src="${imageUrl}" alt="${name}">
        <h3>${name}</h3>
        <p class="price">${data.price || 'Tap to view price'}</p>
        <div class="actions">
          <a href="product.php?id=${productKey}" class="btn">View</a>
          <button class="remove-btn" data-id="${productKey}"><i class="ri-delete-bin-line"></i> Remove</button>
        </div>
      `;
      grid.appendChild(card);
    });

    grid.querySelectorAll('.remove-btn').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const productKey = btn.dataset.id;
        if (!productKey) return;
        try {
          await deleteDoc(doc(db, `saved/${buyerId}/items/${productKey}`));
        } catch (error) {
          console.error('[buyer-saved] remove failed', error);
        }
      });
    });
  });
} else if (empty) {
  renderEmptyState();
}
