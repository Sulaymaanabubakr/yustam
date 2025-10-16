(() => {
  const pageShell = document.getElementById('vendorChatPage');
  const listContainer = document.getElementById('vendorChatContainer');
  const searchInput = document.getElementById('vendorSearch');
  const scrollArea = document.getElementById('vendorChatScroll');
  const loader = document.getElementById('vendorChatLoader');

  if (!pageShell || !listContainer) return;

  const state = {
    userUid: pageShell.dataset.userUid || pageShell.dataset.userId || '',
    userNumericId: pageShell.dataset.userNumericId || '',
    userName: pageShell.dataset.userName || '',
    chats: [],
    filtered: [],
    loading: false,
    poller: null
  };

  const escapeHtml = (text = '') =>
    String(text ?? '').replace(/[&<>"']/g, (char) => {
      switch (char) {
        case '&':
          return '&amp;';
        case '<':
          return '&lt;';
        case '>':
          return '&gt;';
        case '"':
          return '&quot;';
        case "'":
          return '&#39;';
        default:
          return char;
      }
    });

  const formatRelativeTime = (value) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const diffMinutes = Math.floor((Date.now() - date.getTime()) / 60000);
    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffHours < 48) return 'Yesterday';
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const setLoader = (visible) => {
    if (!loader) return;
    loader.style.display = visible ? 'grid' : 'none';
  };

  const buildChatUrl = (chat) => {
    const url = new URL('chat.php', window.location.origin);
    url.searchParams.set('chatId', chat.chatId);
    if (chat.productId) url.searchParams.set('productId', chat.productId);
    if (chat.vendorUid) url.searchParams.set('vendorUid', chat.vendorUid);
    if (chat.buyerUid) url.searchParams.set('buyerUid', chat.buyerUid);
    if (chat.productTitle) url.searchParams.set('productTitle', chat.productTitle);
    if (chat.productImage) url.searchParams.set('productImage', chat.productImage);
    if (chat.counterpartyName) url.searchParams.set('participantName', chat.counterpartyName);
    return url.toString();
  };

  const createChatCard = (chat, index) => {
    const card = document.createElement('article');
    card.className = 'chat-card';
    card.tabIndex = 0;
    card.dataset.chatId = chat.chatId;
    card.style.animationDelay = `${Math.min(index, 6) * 60}ms`;

    if (chat.unreadCount > 0) {
      card.classList.add('is-unread');
    }

    card.innerHTML = `
      <div class="avatar" aria-hidden="true">${escapeHtml(
        (chat.counterpartyName || 'Y').split(' ').map((part) => part[0]).filter(Boolean).join('').slice(0, 2) || 'BY'
      )}</div>
      <div class="chat-info">
        <div class="chat-top">
          <strong class="chat-name">${escapeHtml(chat.counterpartyName || 'Marketplace Buyer')}</strong>
          <span class="chat-time">${escapeHtml(formatRelativeTime(chat.lastMessageAt || chat.createdAt))}</span>
        </div>
        <div class="chat-bottom">
          <span class="last-message">${escapeHtml(chat.lastMessagePreview || 'Tap to reply quickly')}</span>
          <span class="tick" aria-hidden="true">${chat.lastSenderUid === state.userUid ? '✅' : ''}</span>
        </div>
        <div class="chat-product">
          <i class="ri-shopping-bag-3-line" aria-hidden="true"></i>
          <span>${escapeHtml(chat.productTitle || 'Marketplace Listing')}</span>
        </div>
      </div>
    `;

    if (chat.unreadCount > 0) {
      const dot = document.createElement('span');
      dot.className = 'unread-dot';
      dot.textContent = chat.unreadCount > 9 ? '9+' : String(chat.unreadCount);
      card.appendChild(dot);
    }

    const navigate = () => {
      window.location.href = buildChatUrl(chat);
    };

    card.addEventListener('click', navigate);
    card.addEventListener('keypress', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        navigate();
      }
    });

    return card;
  };

  const renderChats = (chats) => {
    listContainer.innerHTML = '';
    if (!Array.isArray(chats) || chats.length === 0) {
      listContainer.style.display = 'none';
      return;
    }
    listContainer.style.display = 'grid';
    const fragment = document.createDocumentFragment();
    chats.forEach((chat, index) => fragment.appendChild(createChatCard(chat, index)));
    listContainer.appendChild(fragment);
  };

  const filterChats = (term) => {
    if (!term) {
      state.filtered = [...state.chats];
      return;
    }
    const query = term.toLowerCase();
    state.filtered = state.chats.filter((chat) =>
      `${chat.counterpartyName} ${chat.productTitle} ${chat.lastMessagePreview}`.toLowerCase().includes(query)
    );
  };

  const normaliseChats = (items = []) =>
    items.map((item) => ({
      chatId: item.chatId,
      buyerUid: item.buyerUid,
      vendorUid: item.vendorUid,
      productId: item.productId,
      productTitle: item.productTitle || 'Marketplace Listing',
      productImage: item.productImage,
      lastMessageAt: item.lastMessageAt,
      lastMessagePreview: item.lastMessagePreview,
      lastSenderUid: item.lastSenderUid,
      counterpartyName: item.counterpartyName || 'Marketplace Buyer',
      unreadCount: item.unreadCount || 0,
      createdAt: item.createdAt
    }));

  const fetchChats = async (showLoader = false) => {
    if (state.loading) return;
    state.loading = true;
    if (showLoader) setLoader(true);
    try {
      const url = new URL('fetch-chats.php', window.location.origin);
      url.searchParams.set('scope', 'list');
      url.searchParams.set('limit', '100');
      const response = await fetch(url.toString(), { credentials: 'same-origin' });
      const payload = await response.json();
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.message || 'Unable to load chats.');
      }
      state.chats = normaliseChats(payload.conversations || []);
      filterChats(searchInput?.value?.trim() || '');
      renderChats(state.filtered);
    } catch (error) {
      console.error('[vendor-chats] fetch failed', error);
    } finally {
      state.loading = false;
      setLoader(false);
    }
  };

  const startPolling = () => {
    if (state.poller) clearInterval(state.poller);
    state.poller = window.setInterval(() => fetchChats(false), 10000);
  };

  searchInput?.addEventListener('input', () => {
    filterChats(searchInput.value.trim());
    renderChats(state.filtered);
  });

  fetchChats(true).then(startPolling);
})();
