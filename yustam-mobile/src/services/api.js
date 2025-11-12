import axios from 'axios';
import { API_BASE_URL } from '../config/constants';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
});

export const setApiAuthToken = (token) => {
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common.Authorization;
  }
};

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      const message = error.response.data?.message || error.response.data?.error || 'An error occurred';
      return Promise.reject(new Error(message));
    }
    if (error.request) {
      return Promise.reject(new Error('Network error. Please check your connection.'));
    }
    return Promise.reject(new Error(error.message || 'An unexpected error occurred'));
  }
);

const normaliseList = (payload) => payload?.items || payload?.products || payload?.listings || payload || [];
const normaliseProduct = (payload) => payload?.product || payload;

const buildFormData = (payload = {}) => {
  const formData = new FormData();
  Object.entries(payload).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      formData.append(key, value);
    }
  });
  return formData;
};

const normalisePlanSlug = (name, fallback) =>
  (name || fallback || '')
    .toLowerCase()
    .replace(/plan$/i, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || fallback || 'plan';

const formatDurationLabel = (months) => {
  const numeric = Number(months);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return 'Custom';
  }
  if (numeric === 1) return 'Monthly';
  if (numeric === 3) return 'Quarterly';
  if (numeric === 6) return 'Biannual';
  if (numeric === 12) return 'Annual';
  return `${numeric}-Month`;
};

const buildPlanCatalog = (planArray = []) => {
  const catalog = {};
  planArray.forEach((plan, index) => {
    const slug = plan?.slug || normalisePlanSlug(plan?.name ?? '', `plan-${index + 1}`);
    const durationSource = plan?.durations ?? plan?.durationOptions ?? {};
    const durationMap = {};

    if (Array.isArray(durationSource)) {
      durationSource.forEach((entry) => {
        const months = Number(entry?.months ?? entry?.interval ?? entry?.durationMonths);
        if (!Number.isFinite(months) || months <= 0) {
          return;
        }
        durationMap[months] = {
          months,
          amount: Number(entry?.amount ?? entry?.price ?? 0),
          intervalLabel: entry?.intervalLabel || formatDurationLabel(months),
          planCode: entry?.planCode ?? entry?.code ?? null,
        };
      });
    } else if (durationSource && typeof durationSource === 'object') {
      Object.entries(durationSource).forEach(([monthsKey, entry]) => {
        const months = Number(monthsKey);
        if (!Number.isFinite(months) || months <= 0) {
          return;
        }
        durationMap[months] = {
          months,
          amount: Number(entry?.amount ?? entry?.price ?? 0),
          intervalLabel: entry?.intervalLabel || formatDurationLabel(months),
          planCode: entry?.planCode ?? entry?.code ?? null,
        };
      });
    }

    if (!Object.keys(durationMap).length) {
      durationMap[1] = {
        months: 1,
        amount: Number(plan?.price ?? plan?.monthlyPrice ?? 0),
        intervalLabel: 'Monthly',
        planCode: plan?.id ?? null,
      };
    }

    catalog[slug] = {
      slug,
      name: plan?.displayName ?? plan?.name ?? 'Plan',
      displayName: plan?.displayName ?? plan?.name ?? 'Plan',
      price: Number(plan?.price ?? plan?.monthlyPrice) || 0,
      listings: plan?.listingLimit ?? plan?.listings ?? 0,
      features: Array.isArray(plan?.features) ? plan.features : [],
      color: plan?.color || (plan?.popular ? '#F3731E' : '#004D40'),
      popular: Boolean(plan?.popular || plan?.isPopular),
      durations: durationMap,
    };
  });
  return catalog;
};

const LONG_TERM_DISCOUNTS = {
  3: 0.07,
  6: 0.12,
  12: 0.17,
};

const fetchPlanCatalog = async () => {
  const response = await api.get('/plans');
  const planArray = Array.isArray(response.data?.plans) ? response.data.plans : [];
  return buildPlanCatalog(planArray);
};

export const authAPI = {
  createSession: (idToken) => api.post('/auth/session', { idToken }),
  getCurrentUser: () => api.get('/auth/me'),
  updateProfile: (payload) => api.patch('/auth/me', payload),
};

export const listingsAPI = {
  getAll: async (params = {}) => {
    const response = await api.get('/products', { params });
    return {
      items: normaliseList(response.data),
      pagination: response.data?.pagination,
    };
  },
  getById: async (id) => {
    const response = await api.get(`/products/${id}`);
    return normaliseProduct(response.data);
  },
  create: async (payload = {}) => {
    const formData = payload instanceof FormData ? payload : buildFormData(payload);
    const response = await api.post('/products', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return normaliseProduct(response.data);
  },
  update: async (id, payload = {}) => {
    const formData = payload instanceof FormData ? payload : buildFormData(payload);
    const response = await api.patch(`/products/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return normaliseProduct(response.data);
  },
  delete: (id) => api.delete(`/products/${id}`),
};

export const vendorAPI = {
  activate: (payload = {}) => api.post('/vendor/activate', payload),
  getDashboard: async () => {
    const response = await api.get('/vendor/me/dashboard');
    const dashboard = response.data ?? {};
    const listings = dashboard.listings ?? {};
    const plan = dashboard.plan ?? {};
    const stats = {
      total_listings: listings.total ?? 0,
      active_listings: listings.active ?? 0,
      pending_listings: Math.max(0, (listings.total ?? 0) - (listings.active ?? 0)),
      draft_listings: listings.drafts ?? 0,
      archived_listings: listings.archived ?? 0,
    };
    const subscription = plan?.plan
      ? {
          displayName: plan.plan.name,
          status: plan.status ?? 'ACTIVE',
          statusLabel: plan.status ?? 'ACTIVE',
          nextBillingDisplay: plan.endsAt ?? null,
        }
      : {};
    const profile = {
      ...(dashboard.profile ?? {}),
      plan: subscription.displayName,
      planStatus: subscription.statusLabel,
      planRenewal: subscription.nextBillingDisplay,
    };
    return {
      data: {
        success: true,
        data: {
          stats,
          subscription,
          profile,
          verification: dashboard.verificationStatus,
        },
      },
    };
  },
  getAnalytics: async () => {
    const response = await api.get('/vendor/me/analytics');
    return {
      data: {
        success: true,
        data: response.data ?? {},
      },
    };
  },
  getProfile: async () => {
    const response = await api.get('/vendor/me');
    return response.data?.profile ?? response.data;
  },
  updateProfile: async (payload = {}) => {
    const response = await api.patch('/vendor/me', payload);
    return response.data?.profile ?? response.data;
  },
  getVerificationStatus: async () => {
    const response = await api.get('/verification');
    const request = response.data?.request ?? null;
    return {
      data: {
        success: true,
        data: request
          ? {
              status: request.status,
              statusDisplay: request.status?.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
              submittedAt: request.submittedAt,
              reviewedAt: request.reviewedAt,
              notes: request.notes,
              documents: request.documents ?? [],
            }
          : null,
      },
    };
  },
  submitVerification: async (payload) => {
    const formData = payload instanceof FormData ? payload : buildFormData(payload);
    const response = await api.post('/verification', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return {
      data: {
        success: true,
        data: response.data?.request ?? response.data,
      },
    };
  },
  getStorefront: async (identifier) => {
    if (!identifier) {
      throw new Error('Storefront identifier is required');
    }
    const response = await api.get(`/vendor/storefront/${identifier}`);
    return response.data;
  },
  getListings: async (params = {}) => {
    const result = await listingsAPI.getAll({ includeDrafts: true, ...params });
    const mapped = Array.isArray(result.items)
      ? result.items.map((listing) => ({
          id: listing.id,
          title: listing.name ?? listing.title ?? 'Untitled',
          description: listing.description ?? '',
          price: Number(listing.price) || 0,
          status: listing.status ?? 'PENDING',
          status_raw: (listing.status ?? 'pending').toLowerCase(),
          listing_id: listing.id,
          listing_title: listing.name ?? listing.title,
          listing_image:
            Array.isArray(listing.media) && listing.media.length
              ? listing.media.find((media) => media.isPrimary)?.url ?? listing.media[0].url
              : null,
          image:
            Array.isArray(listing.media) && listing.media.length
              ? listing.media.find((media) => media.isPrimary)?.url ?? listing.media[0].url
              : null,
          images: Array.isArray(listing.media) ? listing.media.map((media) => media.url) : [],
          category: listing.category?.name ?? '',
          location: listing.locationState ?? listing.locationCity ?? '',
          added_on: listing.createdAt,
          views: listing.viewCount ?? 0,
        }))
      : [];
    return {
      data: {
        success: true,
        data: {
          listings: mapped,
          pagination: result.pagination,
        },
      },
    };
  },
  deleteListing: (id) => api.delete(`/products/${id}`),
  getChats: async () => {
    const response = await api.get('/chats');
    const chats = Array.isArray(response.data?.threads)
      ? response.data.threads
      : Array.isArray(response.data)
        ? response.data
        : [];
    const mapped = chats.map((chat) => ({
      chat_id: chat.id,
      id: chat.id,
      buyer_name: chat.user?.displayName ?? chat.user?.email ?? 'Buyer',
      buyer_avatar: chat.user?.photoUrl,
      last_text: chat.lastMessage ?? chat.lastMessagePreview ?? '',
      last_message: chat.lastMessage ?? '',
      last_ts: chat.updatedAt ?? chat.createdAt,
      unread_for_vendor: 0,
      buyer_uid: chat.userId,
      listing_id: chat.listingId ?? '',
      listing_title: chat.listingTitle ?? '',
      listing_image: chat.listingImage ?? '',
    }));
    return {
      data: {
        success: true,
        chats: mapped,
      },
    };
  },
  getNotifications: async () => {
    const response = await api.get('/notifications');
    const notifications = response.data?.notifications ?? response.data ?? [];
    return {
      data: {
        success: true,
        data: {
          notifications,
        },
      },
    };
  },
  updateNotifications: async (action) => {
    if (action === 'markAllRead') {
      await api.post('/notifications/read-all');
    } else if (action === 'clearAll') {
      await api.post('/notifications/read', { ids: [] });
    }
    return {
      data: {
        success: true,
      },
    };
  },
  getPlans: async () => {
    const catalog = await fetchPlanCatalog();
    return {
      data: {
        success: true,
        data: {
          plans: catalog,
          currency: 'NGN',
          currencySymbol: '₦',
          paystackKey: 'redirect',
          discounts: LONG_TERM_DISCOUNTS,
        },
      },
    };
  },
  getRenewPlan: async (slug) => {
    const catalog = await fetchPlanCatalog();
    const plan =
      catalog[slug] ||
      Object.values(catalog).find((definition) => definition.slug === slug || definition.name?.toLowerCase() === slug?.toLowerCase());
    if (!plan) {
      throw new Error('Plan not found');
    }
    return {
      data: {
        success: true,
        data: plan,
      },
    };
  },
  getSubscriptionDetails: async () => {
    const response = await api.get('/plans/subscriptions/me');
    const subscription = Array.isArray(response.data?.subscriptions)
      ? response.data.subscriptions[0]
      : null;
    if (!subscription) {
      return {
        data: {
          success: true,
          data: null,
        },
      };
    }
    const data = {
      planName: subscription.plan?.name ?? 'Free Plan',
      status: subscription.status ?? 'ACTIVE',
      expiryDisplay: subscription.endsAt,
      autoRenew: false,
      usage: {
        allowed: subscription.plan?.listingLimit ?? 0,
        used: subscription.listingsUsed ?? 0,
        pending: 0,
      },
      features: subscription.plan?.features ?? [],
      slug: subscription.plan?.name?.toLowerCase().replace(/[^a-z0-9]+/g, '-') ?? subscription.planId,
    };
    return {
      data: {
        success: true,
        data,
      },
    };
  },
  subscriptionAction: async () => {
    console.warn('Subscription actions are not implemented on the backend yet.');
    return {
      data: {
        success: true,
      },
    };
  },
  getBillingHistory: async () => {
    const response = await api.get('/plans/subscriptions/me');
    const subscriptions = Array.isArray(response.data?.subscriptions) ? response.data.subscriptions : [];
    const transactions = subscriptions.map((subscription) => ({
      id: subscription.id,
      plan: subscription.plan?.name ?? 'Plan',
      amount: Number(subscription.plan?.price) || 0,
      date: subscription.startsAt ?? subscription.createdAt,
      status: (subscription.status ?? 'completed').toLowerCase(),
      paymentMethod: 'Card',
      reference: subscription.id.slice(0, 10),
    }));
    return {
      data: {
        success: true,
        data: {
          transactions,
        },
      },
    };
  },
  getListingsForOwner: (ownerId, params = {}) =>
    listingsAPI.getAll({ ownerId, includeDrafts: true, ...params }),
  createPlanCheckout: (slug, months = 1) =>
    api.post(`/plans/${slug}/checkout`, { months }),
  submitPaystackCallback: (vendorRef, reference) =>
    api.post(`/plans/${vendorRef}/callback`, { reference }),
};

export const planAPI = {
  listPlans: async () => {
    const response = await api.get('/plans');
    return response.data?.plans ?? [];
  },
  getSubscriptions: async () => {
    const response = await api.get('/plans/subscriptions/me');
    return response.data?.subscriptions ?? [];
  },
  subscribe: (planId) => api.post(`/plans/${planId}/subscribe`),
};

export const chatAPI = {
  openChat: async (payload = {}) => {
    const response = await api.post('/chats', payload);
    return response.data?.thread ?? response.data;
  },
  listThreads: async () => {
    const response = await api.get('/chats');
    return response.data?.threads ?? response.data ?? [];
  },
  createThread: (payload = {}) => api.post('/chats', payload),
  assignThread: (threadId) => api.post(`/chats/${threadId}/assign`),
  recordMessage: (threadId, payload = {}) => api.post(`/chats/${threadId}/messages`, payload),
  sendMessage: (payload = {}) => {
    const chatId = payload.chat_id || payload.chatId;
    if (!chatId) {
      throw new Error('chat_id is required.');
    }
    return api.post(`/chats/${chatId}/messages`, payload);
  },
  listMessages: (threadId) => api.get(`/chats/${threadId}/messages`),
  markAsRead: (threadId, role) => api.post(`/chats/${threadId}/read`, { role }),
};

export const notificationsAPI = {
  list: async (filters = {}) => {
    const response = await api.get('/notifications', { params: filters });
    return response.data?.notifications ?? [];
  },
  markMany: (ids = []) => api.post('/notifications/read', { ids }),
  markAll: () => api.post('/notifications/read-all'),
  create: (payload) => api.post('/notifications', payload),
  getAll: function getAll(filters) {
    return this.list(filters);
  },
  markAllRead: function markAllRead() {
    return this.markAll();
  },
  clearAll: function clearAll() {
    return api.post('/notifications/read', { ids: [] });
  },
};

export const favoritesAPI = {
  list: async () => {
    const response = await api.get('/favorites');
    return response.data?.items ?? response.data ?? [];
  },
  add: (productId) => api.post('/favorites', { productId }),
  remove: (productId) => api.delete(`/favorites/${productId}`),
};

export const savedAPI = {
  getAll: () => favoritesAPI.list(),
  add: (productId) => favoritesAPI.add(productId),
  remove: (productId) => favoritesAPI.remove(productId),
};

export const homeAPI = {
  getFeed: async () => {
    const response = await api.get('/home');
    return response.data;
  },
  listCategories: async () => {
    const response = await api.get('/categories');
    return response.data?.categories ?? [];
  },
};

export const supportAPI = {
  listTickets: (query = {}) => api.get('/support', { params: query }),
  createTicket: (payload) => api.post('/support', payload),
  addMessage: (ticketId, payload) => api.post(`/support/${ticketId}/messages`, payload),
};

export default api;

