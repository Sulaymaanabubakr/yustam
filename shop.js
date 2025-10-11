// Mock listings data for demo purposes
    const productsData = [
      {
        id: "lst-001",
        title: "iPhone 13 Pro Max - 256GB",
        price: 640000,
        category: "Phones & Tablets",
        location: "Lagos",
        vendor: "Tech Plug NG",
        image: "https://images.unsplash.com/photo-1617084321550-47e6e9983b74?auto=format&fit=crop&w=800&q=80",
        dateAdded: "2024-03-12"
      },
      {
        id: "lst-002",
        title: "Samsung 65\" Neo QLED Smart TV",
        price: 820000,
        category: "Electronics",
        location: "Abuja FCT",
        vendor: "Pixel Home Store",
        image: "https://images.unsplash.com/photo-1583225200690-1c7d1dd96d54?auto=format&fit=crop&w=800&q=80",
        dateAdded: "2024-04-18"
      },
      {
        id: "lst-003",
        title: "3 Bedroom Terrace Duplex - Lekki",
        price: 98000000,
        category: "Property",
        location: "Lagos",
        vendor: "Prime Realty",
        image: "https://images.unsplash.com/photo-1617099391444-7d45cc0c2f03?auto=format&fit=crop&w=1200&q=80",
        dateAdded: "2024-01-22"
      },
      {
        id: "lst-004",
        title: "Infinix Hot 40i - 8GB/256GB",
        price: 148000,
        category: "Phones & Tablets",
        location: "Kano",
        vendor: "Northern Gadgets",
        image: "https://images.unsplash.com/photo-1606741965437-1c187c0183e0?auto=format&fit=crop&w=800&q=80",
        dateAdded: "2024-05-06"
      },
      {
        id: "lst-005",
        title: "Hisense 5KG Washing Machine",
        price: 185000,
        category: "Home & Kitchen",
        location: "Port Harcourt",
        vendor: "CleanSpin Stores",
        image: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=800&q=80",
        dateAdded: "2024-02-01"
      },
      {
        id: "lst-006",
        title: "Men's Tailored Agbada Set",
        price: 120000,
        category: "Fashion",
        location: "Abuja FCT",
        vendor: "Royal Threads",
        image: "https://images.unsplash.com/photo-1612423284934-b43b77f22945?auto=format&fit=crop&w=800&q=80",
        dateAdded: "2024-03-30"
      },
      {
        id: "lst-007",
        title: "MacBook Air M2 13",
        price: 860000,
        category: "Computing",
        location: "Lagos",
        vendor: "ByteWorld NG",
        image: "https://images.unsplash.com/photo-1517059224940-d4af9eec41e5?auto=format&fit=crop&w=800&q=80",
        dateAdded: "2024-04-08"
      },
      {
        id: "lst-008",
        title: "Toyota Camry 2018 XLE",
        price: 15500000,
        category: "Vehicles",
        location: "Oyo",
        vendor: "Highway Autos",
        image: "https://images.unsplash.com/photo-1503736334956-4c8f8e92946d?auto=format&fit=crop&w=1200&q=80",
        dateAdded: "2024-03-15"
      },
      {
        id: "lst-009",
        title: "Solar Hybrid Inverter 5kVA",
        price: 480000,
        category: "Power Solutions",
        location: "Anambra",
        vendor: "BrightGrid Energy",
        image: "https://images.unsplash.com/photo-1509395176047-4a66953fd231?auto=format&fit=crop&w=800&q=80",
        dateAdded: "2024-03-03"
      },
      {
        id: "lst-010",
        title: "Organic Shea Butter Bundle",
        price: 22000,
        category: "Beauty & Self-Care",
        location: "Kaduna",
        vendor: "GlowNaturals",
        image: "https://images.unsplash.com/photo-1574302733348-22ad3f20e5c1?auto=format&fit=crop&w=800&q=80",
        dateAdded: "2024-02-17"
      },
      {
        id: "lst-011",
        title: "Premium Leather Sectional Sofa",
        price: 650000,
        category: "Furniture",
        location: "Rivers",
        vendor: "The Living Room Co.",
        image: "https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=1200&q=80",
        dateAdded: "2024-04-26"
      },
      {
        id: "lst-012",
        title: "Professional Event Catering Service",
        price: 350000,
        category: "Services",
        location: "Lagos",
        vendor: "Flavors Catering NG",
        image: "https://images.unsplash.com/photo-1541544181015-4e5e697c15c3?auto=format&fit=crop&w=800&q=80",
        dateAdded: "2024-03-20"
      },
      {
        id: "lst-013",
        title: "Generator - 10kVA Perkins",
        price: 1250000,
        category: "Power Solutions",
        location: "Delta",
        vendor: "PowerHouse Supplies",
        image: "https://images.unsplash.com/photo-1574680096145-d05b474e2155?auto=format&fit=crop&w=800&q=80",
        dateAdded: "2024-01-30"
      },
      {
        id: "lst-014",
        title: "Luxury Ankara Gown",
        price: 88000,
        category: "Fashion",
        location: "Enugu",
        vendor: "Adire & Beyond",
        image: "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=800&q=80",
        dateAdded: "2024-05-02"
      },
      {
        id: "lst-015",
        title: "Fresh Organic Fruit Basket",
        price: 18500,
        category: "Food & Groceries",
        location: "Ogun",
        vendor: "Farm2Table NG",
        image: "https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&w=800&q=80",
        dateAdded: "2024-03-09"
      },
      {
        id: "lst-016",
        title: "Luxury Shortlet Apartment - VI",
        price: 185000,
        category: "Property",
        location: "Lagos",
        vendor: "Cityscape Living",
        image: "https://images.unsplash.com/photo-1554995207-c18c203602cb?auto=format&fit=crop&w=1200&q=80",
        dateAdded: "2024-04-12"
      }
    ];

    const productGrid = document.getElementById("productGrid");
    const emptyState = document.getElementById("emptyState");
    const resultsCount = document.getElementById("resultsCount");
    const loadMoreBtn = document.getElementById("loadMoreBtn");
    const showingText = document.getElementById("showingText");

    const searchInput = document.getElementById("searchInput");
    const categoryFilter = document.getElementById("categoryFilter");
    const locationFilter = document.getElementById("locationFilter");
    const priceFilter = document.getElementById("priceFilter");
    const sortFilter = document.getElementById("sortFilter");
    const filterBtn = document.getElementById("filterBtn");
    const resetBtn = document.getElementById("resetBtn");

    const ITEMS_PER_PAGE = 8;
    let currentPage = 1;
    let filteredProducts = [...productsData];

    const formatCurrency = (value) =>
      new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(value);

    const priceInRange = (price, rangeValue) => {
      if (rangeValue === "all") return true;
      if (rangeValue.endsWith("+")) {
        const min = Number(rangeValue.replace("+", ""));
        return price >= min;
      }
      const [min, max] = rangeValue.split("-").map(Number);
      return price >= min && price <= max;
    };

    const applyFilters = () => {
      const query = searchInput.value.trim().toLowerCase();
      const selectedCategory = categoryFilter.value;
      const selectedLocation = locationFilter.value;
      const selectedPrice = priceFilter.value;

      filteredProducts = productsData.filter((item) => {
        const matchesSearch =
          !query ||
          item.title.toLowerCase().includes(query) ||
          item.vendor.toLowerCase().includes(query) ||
          item.category.toLowerCase().includes(query);

        const matchesCategory = selectedCategory === "all" || item.category === selectedCategory;
        const matchesLocation = selectedLocation === "all" || item.location === selectedLocation;
        const matchesPrice = priceInRange(item.price, selectedPrice);

        return matchesSearch && matchesCategory && matchesLocation && matchesPrice;
      });

      const sortValue = sortFilter.value;
      filteredProducts.sort((a, b) => {
        if (sortValue === "priceLowHigh") return a.price - b.price;
        if (sortValue === "priceHighLow") return b.price - a.price;
        return new Date(b.dateAdded) - new Date(a.dateAdded);
      });

      currentPage = 1;
      renderProducts();
    };

    const renderProducts = () => {
      productGrid.innerHTML = "";
      const start = 0;
      const end = currentPage * ITEMS_PER_PAGE;
      const itemsToRender = filteredProducts.slice(start, end);

      if (!itemsToRender.length) {
        emptyState.style.display = "block";
        showingText.textContent = "Showing 0 items";
        resultsCount.textContent = "No listings match your filters";
        loadMoreBtn.style.display = "none";
        return;
      }

      emptyState.style.display = "none";

      itemsToRender.forEach((item, index) => {
        const card = document.createElement("article");
        card.className = "product-card";
        card.style.animationDelay = `${index * 0.06}s`;
        card.dataset.category = item.category;
        card.dataset.price = item.price;
        card.dataset.location = item.location;

        card.innerHTML = `
          <img src="${item.image}" alt="${item.title}" loading="lazy" />
          <div class="product-body">
            <div class="product-title">${item.title}</div>
            <div class="product-price">${formatCurrency(item.price)}</div>
            <div class="product-meta">
              <span>${item.category}</span>
              <span><i class="ri-map-pin-line"></i> ${item.location}</span>
            </div>
            <div class="product-meta" style="justify-content:flex-start; gap:8px;">
              <i class="ri-user-3-line" style="color: var(--emerald);"></i>
              <span>${item.vendor}</span>
            </div>
            <div class="product-actions">
              <a class="btn btn-outline" href="product.html?id=${item.id}" aria-label="View details of ${item.title}">View Details</a>
              <button class="btn" type="button">Add to Cart</button>
            </div>
          </div>
        `;

        productGrid.appendChild(card);
      });

      const showingEnd = Math.min(end, filteredProducts.length);
      showingText.textContent = `Showing ${showingEnd} of ${filteredProducts.length} items`;
      resultsCount.textContent = `${filteredProducts.length} listings found`;

      loadMoreBtn.style.display = showingEnd >= filteredProducts.length ? "none" : "inline-flex";
    };

    const resetFilters = () => {
      searchInput.value = "";
      categoryFilter.value = "all";
      locationFilter.value = "all";
      priceFilter.value = "all";
      sortFilter.value = "newest";
      filteredProducts = [...productsData];
      currentPage = 1;
      renderProducts();
    };

    filterBtn.addEventListener("click", applyFilters);
    resetBtn.addEventListener("click", resetFilters);
    loadMoreBtn.addEventListener("click", () => {
      currentPage += 1;
      renderProducts();
    });

    searchInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        applyFilters();
      }
    });

    document.addEventListener("DOMContentLoaded", () => {
      const params = new URLSearchParams(window.location.search);
      const categoryParam = params.get("category");
      const searchParam = params.get("search");
      const locationParam = params.get("location");
      const priceParam = params.get("price");
      let shouldFilter = false;

      if (categoryParam) {
        const match = Array.from(categoryFilter.options).find(
          (option) => option.value.toLowerCase() === categoryParam.toLowerCase()
        );
        if (match) {
          categoryFilter.value = match.value;
          shouldFilter = true;
        }
      }

      if (searchParam) {
        searchInput.value = searchParam;
        shouldFilter = true;
      }

      if (locationParam) {
        const match = Array.from(locationFilter.options).find(
          (option) => option.value.toLowerCase() === locationParam.toLowerCase()
        );
        if (match) {
          locationFilter.value = match.value;
          shouldFilter = true;
        }
      }

      if (priceParam) {
        const match = Array.from(priceFilter.options).find(
          (option) => option.value.toLowerCase() === priceParam.toLowerCase()
        );
        if (match) {
          priceFilter.value = match.value;
          shouldFilter = true;
        }
      }

      if (shouldFilter) {
        applyFilters();
      } else {
        renderProducts();
      }
    });
