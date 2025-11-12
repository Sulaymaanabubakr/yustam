        toast.classList.remove('show');
      }, 2400);
    }

    function toggleLoader(isLoading) {
      loader.classList.toggle('hidden', !isLoading);
      listingsContainer.classList.toggle('hidden', isLoading);
    }

    function formatDate(ts) {
      if (!ts) return '—';
      const date = ts.toDate ? ts.toDate() : new Date(ts);
      return date.toLocaleString('en-NG', {
        day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
      });
    }

    function renderStatusChip(status) {
      const normalised = status ? status.toLowerCase() : 'pending';
      const classMap = {
        pending: 'status-chip status-pending',
        approved: 'status-chip status-approved',
        rejected: 'status-chip status-rejected'
      };
      const label = normalised.charAt(0).toUpperCase() + normalised.slice(1);
      return `<span class="${classMap[normalised] || classMap.pending}">${label}</span>`;
    }

    function renderActions(id, status = 'pending', vendorId = '') {
      const normalized = (status || 'pending').toLowerCase();
      const reviewed = normalized !== 'pending';
      const disabledAttr = reviewed ? 'disabled' : '';
      return `
        <div class="action-buttons" data-id="${id}" data-vendor="${vendorId}">
          <button class="btn-sm btn-approve" data-action="approve" data-id="${id}" data-vendor="${vendorId}" ${disabledAttr}><i class="ri-check-line"></i>Approve</button>
          <button class="btn-sm btn-reject" data-action="reject" data-id="${id}" data-vendor="${vendorId}" ${disabledAttr}><i class="ri-close-line"></i>Reject</button>
          <button class="btn-sm btn-delete" data-action="delete" data-id="${id}"><i class="ri-delete-bin-6-line"></i>Delete</button>
          <a class="btn-sm btn-view" href="admin-listing-detail.php?id=${id}" data-action="view"><i class="ri-external-link-line"></i>View</a>
        </div>
      `;
    }

    function applyFilters() {
      const search = searchInput.value.trim().toLowerCase();
      const category = categoryFilter.value;
      const status = statusFilter.value;

      filteredListings = allListings.filter(item => {
        const matchesSearch = !search || (item.title?.toLowerCase().includes(search) || item.vendorName?.toLowerCase().includes(search));
        const matchesCategory = category === 'all' || item.category === category;
        const matchesStatus = status === 'all' || item.status === status;
        return matchesSearch && matchesCategory && matchesStatus;
      });

      currentPage = 1;
      renderListings();
    }

    function paginateListings() {
      const total = filteredListings.length;
      const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
      currentPage = Math.min(currentPage, totalPages);
      const start = (currentPage - 1) * PAGE_SIZE;
      const end = start + PAGE_SIZE;
      const pageItems = filteredListings.slice(start, end);

      pageIndicator.textContent = `Page ${currentPage} of ${totalPages}`;
      prevPage.disabled = currentPage === 1;
      nextPage.disabled = currentPage === totalPages;
      pagination.classList.toggle('hidden', total <= PAGE_SIZE);
      return pageItems;
    }

    function renderTableRows(items) {
      tableBody.innerHTML = items.map(item => {
        const vendor = vendorsMap.get(item.vendorId) || {};
        const images = Array.isArray(item.images) && item.images.length
          ? item.images
          : Array.isArray(item.imageUrls) ? item.imageUrls : [];
        const thumb = images.length ? images[0] : 'https://placehold.co/80x80?text=YUS';
        const title = item.title || item.productTitle || item.productName || item.subcategory || 'Untitled listing';
        return `
          <tr data-id="${item.id}">
            <td>
              <div style="display:flex;align-items:center;gap:14px;">
                <img src="${thumb}" alt="${title}" class="thumb" />
                <div>
                  <strong>${title}</strong>
                  <div style="font-size:13px;color:rgba(17,17,17,0.6);">${item.subcategory || ''}</div>
                </div>
              </div>
            </td>
            <td>${item.category || '-'}</td>
            <td>
              <div style="display:flex;flex-direction:column;gap:2px;">
                <span>${item.vendorName || vendor.displayName || vendor.name || 'Unknown Vendor'}</span>
                <small style="color:rgba(17,17,17,0.6);">${vendor.email || item.vendorEmail || ''}</small>
              </div>
            </td>
            <td>${vendor.plan || item.vendorPlan || item.plan || 'Free'}</td>
            <td>${renderStatusChip(item.status)}</td>
