
import axios from 'axios';
import { API_BASE_URL } from '../config/constants';
import { deriveSubscriptionStatusMeta, normalizeAutoRenewFlag, cleanPlanDisplayName } from '../utils/subscription';

// Verify plan payment by calling backend callback endpoint
// (moved below into vendorAPI)
// ...existing code...

// Add this function to vendorAPI below, not here

// ...existing code...

// (Removed duplicate vendorAPI export. Only keep the main one below.)

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
      const enhancedError = new Error(message);
      enhancedError.response = error.response;
      enhancedError.status = error.response.status;
      return Promise.reject(enhancedError);
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

const normalisePlanSlug = (name, fallback) => {
  const source =
    typeof name === 'string' && name.trim() !== ''
      ? name
      : typeof fallback === 'string'
        ? fallback
        : 'plan';
  return (
    source
      .toLowerCase()
      .replace(/\b(plan|seller|vendor)\b/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'plan'
  );
};

const findPlanInCatalogByCode = (planCode, catalog = {}) => {
  const code = String(planCode || '').toLowerCase();
  if (!code) {
    return null;
  }
  return (
    Object.values(catalog).find((plan) => {
      const durations = Array.isArray(plan?.durations)
        ? plan.durations
        : Object.values(plan?.durations || {});
      return durations.some((option) => String(option?.planCode || '').toLowerCase() === code);
    }) || null
  );
};

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

const fetchCurrentSubscription = async () => {
  try {
    const response = await api.get('/subscription/status');
    const payload = response.data?.subscription || response.data?.data || null;
    if (!payload) {
      return null;
    }
    const expires =
      payload.expires ||
      payload.next_payment_date ||
      payload.nextBillingDate ||
      null;
    const rawAutoRenew =
      payload.auto_renew ?? payload.autoRenew ?? payload.renewalStatus ?? payload.autoRenewal;
    const autoRenew = normalizeAutoRenewFlag(rawAutoRenew, true);
    const statusMeta = deriveSubscriptionStatusMeta(
      payload.status || payload.plan_status || payload.subscription_status,
      autoRenew,
      Boolean(payload.cancelled)
    );
    const planName = payload.plan_name || payload.planName || 'Free Plan';
    const subscriptionCode = payload.subscription_code || payload.subscriptionCode || '';
    return {
      id: subscriptionCode || 'vendor-' + String(payload.vendor_id || Date.now()),
      plan: planName,
      planName,
      displayName: planName,
      name: planName,
      subscriptionCode,
      planCode: payload.plan_code || payload.planCode || null,
      status: statusMeta.primaryStatus,
      statusLabel: statusMeta.primaryStatus,
      statusNote: statusMeta.secondaryStatus,
      nextBillingDisplay: expires,
      expiryDisplay: expires,
      renewalLabel: statusMeta.renewalLabel,
      autoRenew,
      renewalStatus: autoRenew ? 'auto' : 'manual',
      externalSubscription: Boolean(payload.externalSubscription || payload.manageExternally),
      canCancel: Boolean(subscriptionCode),
      cancelled: Boolean(payload.cancelled),
      cancellationScheduled: statusMeta.cancellationScheduled,
      notice: payload.notice || '',
      planAmount: payload.plan_amount || payload.planAmount || 0,
      planInterval: payload.plan_interval || payload.planInterval || 'monthly',
      metadata: payload,
      statusMeta,
    };
  } catch (error) {
    console.warn('Unable to fetch subscription state', error);
    return null;
  }
};

const mapPlanDurationOptions = (definition = {}) => {
  const durations = definition?.durations || {};
  const rawOptions = Array.isArray(durations)
    ? durations
    : Object.entries(durations).map(([monthsKey, option]) => ({
        months: Number(option?.months ?? monthsKey),
        ...option,
      }));
  return rawOptions
    .map((option) => {
      const months =
        Number(option?.months ?? option?.durationMonths ?? option?.interval ?? option?.period ?? 0) || 0;
      if (!Number.isFinite(months) || months <= 0) {
        return null;
      }
      const amount = Number(
        option?.amount ?? option?.price ?? option?.total ?? option?.value ?? 0
      );
      const planCode = option?.planCode || option?.code || option?.plan || null;
      const intervalLabel =
        option?.intervalLabel ||
        option?.label ||
        (months === 1
          ? 'Monthly'
          : months === 3
            ? 'Quarterly'
            : months === 6
              ? 'Biannual'
              : `${months} Month${months === 1 ? '' : 's'}`);
      return {
        months,
        amount,
        intervalLabel,
        planCode,
      };
    })
    .filter((entry) => entry && entry.planCode && entry.amount > 0)
    .sort((a, b) => a.months - b.months);
};

const enrichSubscriptionWithPlan = (subscription, catalog = {}) => {
  if (!subscription) {
    return null;
  }
  const slugSourceValue =
    subscription.slug ||
    subscription.planSlug ||
    subscription.planName ||
    subscription.name ||
    subscription.displayName ||
    subscription.plan?.slug ||
    subscription.plan?.name ||
    subscription.plan ||
    'free';
  const slugSource =
    typeof slugSourceValue === 'string'
      ? slugSourceValue
      : slugSourceValue?.slug || slugSourceValue?.name || '';
  const slug = normalisePlanSlug(slugSource, 'free');
  const planCodeHint =
    subscription.planCode ||
    subscription.plan_code ||
    subscription.plan?.plan_code ||
    subscription.plan?.code ||
    subscription.metadata?.planCode ||
    subscription.metadata?.plan_code ||
    null;
  const planByCode = findPlanInCatalogByCode(planCodeHint, catalog);
  const planDefinition =
    catalog[slug] ||
    catalog[`${slug}-plan`] ||
    catalog[slugSource] ||
    planByCode ||
    null;
  const rawDisplayName =
    subscription.displayName ||
    planDefinition?.displayName ||
    planDefinition?.name ||
    subscription.name ||
    subscription.planName ||
    'Free Plan';
  const displayName = cleanPlanDisplayName(rawDisplayName);

  return {
    ...subscription,
    slug,
    planSlug: slug,
    displayName,
    name: displayName,
    price: planDefinition?.price ?? subscription.price ?? subscription.amount ?? 0,
    currency: planDefinition?.currency ?? subscription.currency ?? 'NGN',
    listings: planDefinition?.listings ?? subscription.listings ?? null,
    features: planDefinition?.features ?? subscription.features ?? [],
    durationLabel: planDefinition?.duration ?? subscription.durationLabel ?? 'Monthly',
  };
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
    const response = await api.post('/products', payload);
    return normaliseProduct(response.data);
  },
  update: async (id, payload = {}) => {
    const response = await api.patch(`/products/${id}`, payload);
    return normaliseProduct(response.data);
  },
  delete: (id) => api.delete(`/products/${id}`),
};

export const vendorAPI = {
  register: (payload = {}) => api.post('/vendor/register', payload),
  resendVerification: (payload = {}) => api.post('/vendor/resend-verification', payload),
  verifyToken: (payload = {}) => api.post('/vendor/verify', payload),
  activate: (payload = {}) => api.post('/vendor/activate', payload),
  refreshSubscription: (payload = {}) => api.post('/vendor/subscription/refresh', payload),
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
    const profile = response.data?.profile ?? response.data ?? {};
    const success = response.data?.success ?? true;
    return {
      data: {
        success,
        data: profile,
      },
    };
  },
  updateProfile: async (payload = {}) => {
    const response = await api.patch('/vendor/me', payload);
    const profile = response.data?.profile ?? response.data ?? {};
    const success = response.data?.success ?? true;
    return {
      data: {
        success,
        data: profile,
      },
    };
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
  submitVerification: async (payload = {}) => {
    let response;
    if (payload instanceof FormData) {
      response = await api.post('/verification', payload, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    } else {
      response = await api.post('/verification', payload);
    }
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
    try {
      const response = await api.get(`/vendor/storefront/${identifier}`);
      return response.data;
    } catch (error) {
      const status = error?.response?.status;
      const data = error?.response?.data;
      console.warn('vendorAPI.getStorefront failed', identifier, status, data);
      throw error;
    }
  },
  getListings: async (params = {}) => {
    const result = await listingsAPI.getAll({ includeDrafts: true, ...params });
    const mapped = Array.isArray(result.items)
      ? result.items.map((listing) => ({
          id: listing.id,
          title: listing.title ?? listing.name ?? 'Untitled',
          description: listing.description ?? '',
          price: Number(listing.price) || 0,
          status: listing.status ?? 'pending',
          status_raw: (listing.status ?? 'pending').toLowerCase(),
          listing_id: listing.id,
          listing_title: listing.title ?? listing.name ?? 'Untitled',
          listing_image: listing.primaryImage ?? listing.image ?? (Array.isArray(listing.images) ? listing.images[0] : null),
          primaryImage: listing.primaryImage ?? listing.image ?? (Array.isArray(listing.images) ? listing.images[0] : null),
          images: Array.isArray(listing.images) ? listing.images : [],
          category: listing.category ?? '',
          subcategory: listing.subcategory ?? '',
          location: listing.location ?? '',
          city: listing.city ?? '',
          state: listing.state ?? '',
          country: listing.country ?? '',
          added_on: listing.createdAt ?? listing.added_on ?? '',
          updated_on: listing.updatedAt ?? listing.updated_on ?? '',
          views: Number(listing.views ?? listing.viewCount ?? 0),
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
    const response = await api.get('/vendor/notifications');
    const payload = response.data?.data ?? response.data ?? {};
    return {
      data: {
        success: response.data?.success ?? true,
        data: {
          notifications: payload.notifications ?? [],
          counts: payload.counts ?? null,
        },
      },
    };
  },
  updateNotifications: async (action, extra = {}) => {
    const response = await api.post('/vendor/notifications', {
      action,
      ...extra,
    });
    return response.data ?? { success: true };
  },
  getPlans: async () => {
    const [catalog, currentSubscription] = await Promise.all([fetchPlanCatalog(), fetchCurrentSubscription()]);
    const enrichedPlan = enrichSubscriptionWithPlan(currentSubscription, catalog);
    return {
      data: {
        success: true,
        data: {
          plans: catalog,
          currency: 'NGN',
          currencySymbol: '₦',
          paystackKey: 'inline',
          discounts: LONG_TERM_DISCOUNTS,
          subscription: enrichedPlan,
          currentPlan: enrichedPlan,
        },
      },
    };
  },
  getRenewPlan: async () => {
    const [catalog, subscription] = await Promise.all([fetchPlanCatalog(), fetchCurrentSubscription()]);
    const currentPlan = enrichSubscriptionWithPlan(subscription, catalog);
    if (!currentPlan) {
      return {
        data: {
          success: true,
          data: null,
        },
      };
    }
    const catalogEntry = catalog[currentPlan.slug] || catalog[`${currentPlan.slug}-plan`] || {};
    const durations = mapPlanDurationOptions(catalogEntry);
  return {
    data: {
      success: true,
      data: {
        planName: currentPlan.displayName,
        planBadge: currentPlan.statusLabel || currentPlan.status,
        monthlyPrice: currentPlan.price || (durations[0]?.amount ?? 0),
        currency: currentPlan.currency || 'NGN',
        expiresOn: currentPlan.nextBillingDisplay || currentPlan.expiryDisplay || '--',
        remainingListings: currentPlan.listings ?? null,
        contactEmail: 'support@yustam.com.ng',
        vendorName: currentPlan.vendorName || 'Yustam Vendor',
        slug: currentPlan.slug,
         planCode: currentPlan.planCode || catalogEntry?.planCode || null,
        durationOptions: durations,
      },
    },
  };
  },
  getSubscriptionDetails: async () => {
    const [catalog, subscription] = await Promise.all([fetchPlanCatalog(), fetchCurrentSubscription()]);
    const currentPlan = enrichSubscriptionWithPlan(subscription, catalog);
    if (!currentPlan) {
      return {
        data: {
          success: true,
          data: null,
        },
      };
    }
    const usage = {
      allowed: currentPlan.listings ?? 0,
      used: subscription?.listingsUsed ?? 0,
      pending: subscription?.pendingListings ?? 0,
    };
    return {
      data: {
        success: true,
        data: {
          ...currentPlan,
          planName: currentPlan.displayName,
          status: currentPlan.status || currentPlan.statusLabel || 'Active',
          statusNote: currentPlan.statusNote || null,
          statusMeta: currentPlan.statusMeta || null,
          expiryDisplay: currentPlan.nextBillingDisplay || currentPlan.expiryDisplay || '--',
          autoRenew: currentPlan.autoRenew,
          renewalLabel: currentPlan.renewalLabel || 'Next billing',
          canCancel: Boolean(
            subscription?.canCancel ?? subscription?.subscriptionCode
          ),
          cancelled: Boolean(subscription?.cancelled),
          subscriptionCode: subscription?.subscriptionCode || '',
          usage,
          notice: currentPlan.notice || subscription?.notice || '',
        },
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
    let catalog = {};
    try {
      catalog = await fetchPlanCatalog();
    } catch (error) {
      console.warn('Unable to fetch plan catalog for billing history', error);
    }

    const response = await api.get('/plans/subscriptions/me');
    const subscriptions = Array.isArray(response.data?.subscriptions) ? response.data.subscriptions : [];

    const parseAmountValue = (value) => {
      if (typeof value === 'number' && Number.isFinite(value)) {
        return value;
      }
      if (typeof value === 'string') {
        const numeric = Number(value.replace(/[^0-9.]/g, ''));
        return Number.isNaN(numeric) ? 0 : numeric;
      }
      return 0;
    };

    const resolveCatalogEntry = (slug) => {
      if (!slug) {
        return null;
      }
      if (catalog[slug]) {
        return catalog[slug];
      }
      if (catalog[`${slug}-plan`]) {
        return catalog[`${slug}-plan`];
      }
      return null;
    };

    const transactions = subscriptions.map((subscription, index) => {
      const metadata = subscription?.metadata || {};
      const planNameSource =
        metadata.displayName ||
        metadata.planName ||
        subscription.plan?.displayName ||
        subscription.plan?.name ||
        subscription.plan ||
        metadata.plan ||
        'Plan';
      const planName = cleanPlanDisplayName(planNameSource) || 'Plan';
      const slugCandidate =
        metadata.slug ||
        metadata.planSlug ||
        subscription.slug ||
        normalisePlanSlug(planName, `plan-${index + 1}`);
      const catalogEntry = resolveCatalogEntry(slugCandidate);
      const durationMonths = Number(
        metadata.durationMonths ??
          metadata.planDuration ??
          metadata.planDurationMonths ??
          subscription.durationMonths ??
          subscription.intervalMonths ??
          0
      );
      const durationOptions = catalogEntry?.durations || {};
      const durationOption =
        (Number.isFinite(durationMonths) && durationMonths > 0 && durationOptions[durationMonths]) ||
        (Number.isFinite(durationMonths) && durationMonths > 0 && durationOptions[String(durationMonths)]) ||
        Object.values(durationOptions)[0] ||
        null;
      const intervalLabel =
        subscription.intervalLabel ||
        subscription.plan?.intervalLabel ||
        metadata.intervalLabel ||
        metadata.planInterval ||
        metadata.billingCycle ||
        durationOption?.intervalLabel ||
        (Number.isFinite(durationMonths) && durationMonths > 0 ? formatDurationLabel(durationMonths) : 'Monthly');
      const planType =
        metadata.planType ||
        metadata.planTier ||
        metadata.planCategory ||
        subscription.plan?.category ||
        (catalogEntry?.displayName ?? catalogEntry?.name) ||
        null;
      const amount = parseAmountValue(
        subscription.amount ??
          subscription.plan?.amount ??
          subscription.plan?.price ??
          metadata.paymentAmount ??
          metadata.planAmount ??
          metadata.plan_amount ??
          durationOption?.amount ??
          catalogEntry?.price ??
          0
      );
      const reference =
        subscription.reference ||
        metadata.lastPaymentReference ||
        metadata.reference ||
        subscription.id ||
        `REF-${index + 1}`;
      const paymentMethod =
        metadata.paymentMethod ||
        subscription.paymentMethod ||
        subscription.cardBrand ||
        subscription.channel ||
        'Card';
      const resolvedDate =
        subscription.paidAt ||
        subscription.updatedAt ||
        subscription.endsAt ||
        subscription.startsAt ||
        metadata.lastPaymentDate ||
        metadata.date ||
        subscription.createdAt ||
        new Date().toISOString();
      const statusRaw = (subscription.status || metadata.status || 'completed').toString();
      const status = statusRaw.toLowerCase();
      const statusLabel =
        metadata.statusLabel ||
        subscription.statusLabel ||
        statusRaw.replace(/_/g, ' ') ||
        'Completed';

      return {
        id: reference,
        plan: planName,
        planType: planType || null,
        interval: intervalLabel,
        amount,
        status,
        statusLabel,
        date: resolvedDate,
        reference,
        paymentMethod,
      };
    });

    transactions.sort((a, b) => {
      const aTime = new Date(a.date).getTime();
      const bTime = new Date(b.date).getTime();
      if (Number.isNaN(aTime) && Number.isNaN(bTime)) {
        return 0;
      }
      if (Number.isNaN(aTime)) {
        return 1;
      }
      if (Number.isNaN(bTime)) {
        return -1;
      }
      return bTime - aTime;
    });

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
  verifyPlanPayment: (reference) =>
    api.post('/plans', { reference }),
  setAutoRenew: (enabled) =>
    api.post('/subscription/toggle-autorenew', { enabled }),
  cancelSubscription: (reason) =>
    api.post('/subscription/cancel', { reason }),
};

export const profileAPI = {
  getSettings: () =>
    api.get('/vendor/settings', {
      params: { ts: Date.now() },
      headers: {
        'Cache-Control': 'no-cache',
        Pragma: 'no-cache',
      },
    }),
  updateSettings: (payload = {}) => api.patch('/vendor/settings', payload),
  updatePassword: (payload = {}) => api.post('/vendor/password', payload),
  deleteAccount: (payload = {}) =>
    api.delete('/vendor/me', {
      data: payload,
    }),
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
    try {
      const response = await api.post('/chats', payload);
      return response.data?.thread ?? response.data;
    } catch (error) {
      const status = error?.response?.status;
      const data = error?.response?.data;
      console.warn('chatAPI.openChat failed', status, data, payload?.listing_id || payload?.listingId);
      throw error;
    }
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

