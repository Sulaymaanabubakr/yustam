import { useCallback, useEffect, useRef, useState } from 'react';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { botAPI } from '../services/api';

const HISTORY_STORAGE_KEY = 'yustam.bot.history.v1';
const SETTINGS_STORAGE_KEY = 'yustam.bot.settings.v1';
const MODE_VALUES = ['global', 'local'];

const resolveBooleanFlag = (value) => {
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'string') {
    return ['true', '1', 'yes', 'on'].includes(value.trim().toLowerCase());
  }
  if (typeof value === 'number') {
    return value === 1;
  }
  return false;
};

const expoConfigExtra = Constants?.expoConfig?.extra ?? Constants?.manifest?.extra ?? {};
const aiIntegrationConfig =
  expoConfigExtra?.yustaAI?.integrations ??
  expoConfigExtra?.yustaAI ??
  expoConfigExtra?.aiIntegrations ??
  {};

const INTEGRATION_OVERRIDES = {
  wishlist: resolveBooleanFlag(
    aiIntegrationConfig?.wishlist ??
      aiIntegrationConfig?.wishlistEnabled ??
      aiIntegrationConfig?.wishlistAlerts ??
      aiIntegrationConfig?.wishlistAi ??
      process.env.EXPO_PUBLIC_YUSTAAI_WISHLIST_ENABLED
  ),
  vendorRewards: resolveBooleanFlag(
    aiIntegrationConfig?.vendorRewards ??
      aiIntegrationConfig?.vendorRewardsEnabled ??
      aiIntegrationConfig?.rewards ??
      aiIntegrationConfig?.vendorAi ??
      process.env.EXPO_PUBLIC_YUSTAAI_VENDOR_REWARDS_ENABLED
  ),
};

const normaliseMode = (value) => (MODE_VALUES.includes(value) ? value : 'global');

const cleanLocation = (rawLocation = {}) => {
  const state = typeof rawLocation.state === 'string' ? rawLocation.state.trim() : '';
  const city = typeof rawLocation.city === 'string' ? rawLocation.city.trim() : '';
  return { state, city };
};

const buildHistoryEntry = ({ id, query, mode, location }) => ({
  id,
  query,
  mode,
  location,
  timestamp: Date.now(),
  status: 'pending',
  response: null,
  error: null,
});

const persistAsync = async (key, value) => {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.warn('useBotQuery persist error:', err);
  }
};

const restoreAsync = async (key, fallback) => {
  try {
    const stored = await AsyncStorage.getItem(key);
    if (!stored) {
      return fallback;
    }
    const parsed = JSON.parse(stored);
    return parsed ?? fallback;
  } catch (err) {
    console.warn('useBotQuery restore error:', err);
    return fallback;
  }
};

const buildRequestPayload = (query, mode, location) => {
  const payload = { query, mode };
  const trimmedLocation = cleanLocation(location);
  if (trimmedLocation.state || trimmedLocation.city) {
    payload.location = {};
    if (trimmedLocation.state) {
      payload.location.state = trimmedLocation.state;
    }
    if (trimmedLocation.city) {
      payload.location.city = trimmedLocation.city;
    }
  }
  return payload;
};

const buildResponsePayload = (data) => ({
  summary: Array.isArray(data?.ai?.summary) ? data.ai.summary : [],
  followUps: Array.isArray(data?.ai?.followUps) ? data.ai.followUps : [],
  intent: data?.ai?.intent ?? null,
  cached: Boolean(data?.ai?.cached),
  listings: Array.isArray(data?.listings?.items) ? data.listings.items : [],
  pagination: data?.listings?.pagination ?? null,
  fallbackUsed: Boolean(data?.fallbackUsed),
  raw: data,
});

const buildErrorMessage = (error) => {
  if (!error) {
    return 'Unable to reach YustaAI right now. Please try again shortly.';
  }

  const status = error.status || error?.response?.status;
  const retryAfter = error?.response?.data?.retryAfter;
  if (status === 429 && retryAfter) {
    return `You are moving fast. Please retry in ${retryAfter}s.`;
  }

  return error.message || 'Unable to reach YustaAI right now. Please try again shortly.';
};

const buildIntegrationState = (overrides = {}) => ({
  ready: Boolean(overrides.ready),
  enabled: Boolean(overrides.enabled ?? overrides.ready),
  syncing: Boolean(overrides.syncing ?? false),
  lastSynced: overrides.lastSynced ?? null,
  meta: overrides.meta ?? null,
  error: overrides.error ?? '',
});

const extractIntegrationNode = (source = {}, keys = []) => {
  for (let index = 0; index < keys.length; index += 1) {
    const key = keys[index];
    if (source && Object.prototype.hasOwnProperty.call(source, key) && source[key]) {
      return source[key];
    }
  }
  return {};
};

const filterSummaryLines = (summary) => {
  if (!Array.isArray(summary)) {
    return [];
  }
  return summary
    .map((line) => (typeof line === 'string' ? line.trim() : ''))
    .filter((line) => line.length);
};

const normaliseFollowUps = (followUps) => {
  if (!Array.isArray(followUps)) {
    return [];
  }
  return followUps
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter((item) => item.length);
};

const buildVendorRewardsSyncPayload = (responsePayload, summaryLines) => {
  if (!Array.isArray(summaryLines) || !summaryLines.length) {
    return null;
  }

  const listings = Array.isArray(responsePayload?.listings) ? responsePayload.listings : [];
  const highlightedListings = listings.slice(0, 5).map((listing) => ({
    id: listing?.id ?? listing?.public_id ?? listing?.firestoreId ?? null,
    title: listing?.title ?? listing?.name ?? 'Marketplace listing',
    price: listing?.price ?? null,
    location: listing?.city || listing?.state || listing?.location || null,
  }));

  const basePoints = summaryLines.length * 5;
  const listingPoints = highlightedListings.length * 10;
  const rewardPoints = Math.min(250, Math.max(0, basePoints + listingPoints));

  if (!rewardPoints) {
    return null;
  }

  return {
    earn: rewardPoints,
    reason: 'yustam-ai-recommendations',
    description: `Synced ${highlightedListings.length || 'several'} curated matches from YustaAI insights.`,
    meta: {
      listings: highlightedListings,
      summary: summaryLines,
      followUps: Array.isArray(responsePayload?.followUps) ? responsePayload.followUps : [],
    },
  };
};

const useBotQuery = () => {
  const [history, setHistory] = useState([]);
  const [latestResponse, setLatestResponse] = useState(null);
  const [mode, setModeState] = useState('global');
  const [location, setLocationState] = useState({ state: '', city: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState({ configured: null, model: null, loading: true, error: '' });
  const [integrations, setIntegrations] = useState({
    wishlist: buildIntegrationState({
      ready: INTEGRATION_OVERRIDES.wishlist,
      enabled: INTEGRATION_OVERRIDES.wishlist,
    }),
    vendorRewards: buildIntegrationState({
      ready: INTEGRATION_OVERRIDES.vendorRewards,
      enabled: INTEGRATION_OVERRIDES.vendorRewards,
    }),
  });

  const hasRestoredRef = useRef(false);
  const mountedRef = useRef(true);
  const integrationCapabilitiesRef = useRef({
    wishlist: { ready: INTEGRATION_OVERRIDES.wishlist },
    vendorRewards: { ready: INTEGRATION_OVERRIDES.vendorRewards },
  });
  const lastSuccessRef = useRef(null);
  const integrationReadyRef = useRef({
    wishlist: INTEGRATION_OVERRIDES.wishlist,
    vendorRewards: INTEGRATION_OVERRIDES.vendorRewards,
  });

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    const bootstrap = async () => {
      const [storedHistory, storedSettings] = await Promise.all([
        restoreAsync(HISTORY_STORAGE_KEY, []),
        restoreAsync(SETTINGS_STORAGE_KEY, {}),
      ]);

      if (!mounted) {
        return;
      }

      if (Array.isArray(storedHistory) && storedHistory.length) {
        let shouldSeedLatest = false;
        let lastCompleteEntry = null;
        setHistory((prev) => {
          if (prev.length) {
            return prev;
          }
          shouldSeedLatest = true;
          lastCompleteEntry =
            [...storedHistory].reverse().find((entry) => entry.status === 'complete' && entry.response) || null;
          return storedHistory;
        });
        if (mounted && shouldSeedLatest && lastCompleteEntry) {
          lastSuccessRef.current = {
            entry: lastCompleteEntry,
            response: lastCompleteEntry.response,
          };
          setLatestResponse(lastCompleteEntry.response);
        }
      }

      const nextMode = normaliseMode(storedSettings?.mode);
      const nextLocation = cleanLocation(storedSettings?.location);
      setModeState(nextMode);
      setLocationState(nextLocation);

      hasRestoredRef.current = true;
    };

    bootstrap();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!hasRestoredRef.current) {
      return;
    }
    persistAsync(HISTORY_STORAGE_KEY, history);
  }, [history]);

  useEffect(() => {
    if (!hasRestoredRef.current) {
      return;
    }
    persistAsync(SETTINGS_STORAGE_KEY, { mode, location });
  }, [mode, location]);

  useEffect(() => {
    let cancelled = false;
    const fetchStatus = async () => {
      try {
        setStatus((prev) => ({ ...prev, loading: true, error: '' }));
        const payload = await botAPI.status();
        if (cancelled) {
          return;
        }
        setStatus({
          configured: Boolean(payload?.configured ?? payload?.success ?? false),
          model: payload?.model ?? null,
          loading: false,
          error: '',
        });

        const integrationHints = payload?.integrations;
        if (!cancelled && integrationHints && typeof integrationHints === 'object') {
          const wishlistNode = extractIntegrationNode(integrationHints, ['wishlist', 'favorites', 'saved']);
          const vendorNode = extractIntegrationNode(integrationHints, [
            'vendorRewards',
            'vendor',
            'rewards',
            'vendor_rewards',
          ]);

          const hasWishlistNode = wishlistNode && Object.keys(wishlistNode).length > 0;
          const hasVendorNode = vendorNode && Object.keys(vendorNode).length > 0;

          const wishlistReady = hasWishlistNode
            ? Boolean(wishlistNode.ready || wishlistNode.enabled || INTEGRATION_OVERRIDES.wishlist)
            : integrationCapabilitiesRef.current.wishlist.ready;
          const vendorReady = hasVendorNode
            ? Boolean(vendorNode.ready || vendorNode.enabled || INTEGRATION_OVERRIDES.vendorRewards)
            : integrationCapabilitiesRef.current.vendorRewards.ready;

          integrationCapabilitiesRef.current = {
            wishlist: { ...integrationCapabilitiesRef.current.wishlist, ready: wishlistReady },
            vendorRewards: { ...integrationCapabilitiesRef.current.vendorRewards, ready: vendorReady },
          };
          integrationReadyRef.current = {
            wishlist: wishlistReady,
            vendorRewards: vendorReady,
          };

          if (mountedRef.current) {
            setIntegrations((prev) => ({
              wishlist: {
                ...prev.wishlist,
                ready: wishlistReady,
                enabled: wishlistReady,
                lastSynced:
                  hasWishlistNode && wishlistNode.lastSynced !== undefined && wishlistNode.lastSynced !== null
                    ? wishlistNode.lastSynced
                    : hasWishlistNode && wishlistNode.last_synced !== undefined && wishlistNode.last_synced !== null
                      ? wishlistNode.last_synced
                      : prev.wishlist.lastSynced,
                meta:
                  hasWishlistNode && Object.prototype.hasOwnProperty.call(wishlistNode, 'meta')
                    ? wishlistNode.meta
                    : prev.wishlist.meta,
                error: wishlistReady ? '' : prev.wishlist.error,
              },
              vendorRewards: {
                ...prev.vendorRewards,
                ready: vendorReady,
                enabled: vendorReady,
                lastSynced:
                  hasVendorNode && vendorNode.lastSynced !== undefined && vendorNode.lastSynced !== null
                    ? vendorNode.lastSynced
                    : hasVendorNode && vendorNode.last_synced !== undefined && vendorNode.last_synced !== null
                      ? vendorNode.last_synced
                      : prev.vendorRewards.lastSynced,
                meta:
                  hasVendorNode && Object.prototype.hasOwnProperty.call(vendorNode, 'meta')
                    ? vendorNode.meta
                    : prev.vendorRewards.meta,
                error: vendorReady ? '' : prev.vendorRewards.error,
              },
            }));
          }
        }
      } catch (err) {
        if (cancelled) {
          return;
        }
        setStatus({ configured: false, model: null, loading: false, error: err?.message || 'Offline' });
      }
    };

    fetchStatus();
    return () => {
      cancelled = true;
    };
  }, []);

  const changeMode = useCallback((nextMode) => {
    setModeState((prev) => {
      const resolved = normaliseMode(nextMode);
      if (prev === resolved) {
        return prev;
      }
      return resolved;
    });
  }, []);

  const updateLocation = useCallback((updates = {}) => {
    setLocationState((prev) => {
      const next = { ...prev };
      if (Object.prototype.hasOwnProperty.call(updates, 'state')) {
        next.state = typeof updates.state === 'string' ? updates.state.trim() : '';
      }
      if (Object.prototype.hasOwnProperty.call(updates, 'city')) {
        next.city = typeof updates.city === 'string' ? updates.city.trim() : '';
      }
      return next;
    });
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
    setError('');
    setLatestResponse(null);
    lastSuccessRef.current = null;
  }, []);

  const runIntegrationSync = useCallback(async (key, operation) => {
    if (!mountedRef.current) {
      return null;
    }
    setIntegrations((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        syncing: true,
        error: '',
      },
    }));

    try {
      const result = await operation();
      if (!mountedRef.current) {
        return result ?? null;
      }
      setIntegrations((prev) => ({
        ...prev,
        [key]: {
          ...prev[key],
          syncing: false,
          error: '',
          enabled: true,
          ready: true,
          lastSynced: Date.now(),
          meta: result && Object.prototype.hasOwnProperty.call(result, 'meta') ? result.meta : prev[key].meta,
        },
      }));
      if (!integrationCapabilitiesRef.current[key]) {
        integrationCapabilitiesRef.current[key] = { ready: true };
      } else {
        integrationCapabilitiesRef.current[key].ready = true;
      }
      return result ?? null;
    } catch (err) {
      const statusCode = err?.status || err?.response?.status;
      const unavailable = statusCode === 404 || statusCode === 501;
      if (mountedRef.current) {
        setIntegrations((prev) => ({
          ...prev,
          [key]: {
            ...prev[key],
            syncing: false,
            error: unavailable ? '' : err?.message || 'Failed to sync integration.',
            ready: unavailable ? false : prev[key].ready,
            enabled: unavailable ? false : prev[key].enabled,
          },
        }));
      }
      if (!integrationCapabilitiesRef.current[key]) {
        integrationCapabilitiesRef.current[key] = { ready: !unavailable };
      } else if (unavailable) {
        integrationCapabilitiesRef.current[key].ready = false;
      }
      if (!unavailable) {
        console.warn(`YustaAI ${key} sync failed`, err);
      }
      return null;
    }
  }, []);

  const propagateIntegrations = useCallback(
    (entry, responsePayload) => {
      const summary = filterSummaryLines(responsePayload?.summary);
      if (!summary.length) {
        return;
      }

      const requestPayload = {
        entryId: entry.id,
        query: entry.query,
        summary,
        followUps: normaliseFollowUps(responsePayload?.followUps),
        intent: responsePayload?.intent ?? null,
        listings: Array.isArray(responsePayload?.listings) ? responsePayload.listings : [],
        mode: entry.mode,
        location: entry.location,
        model: status?.model ?? null,
        timestamp: entry.timestamp ?? Date.now(),
      };

      const tasks = [];

      if (integrationCapabilitiesRef.current.wishlist?.ready) {
        tasks.push(runIntegrationSync('wishlist', () => botAPI.syncWishlist(requestPayload)));
      }

      if (integrationCapabilitiesRef.current.vendorRewards?.ready) {
        const rewardsPayload = buildVendorRewardsSyncPayload(responsePayload, summary);
        const vendorPayload = rewardsPayload ? { ...requestPayload, rewards: rewardsPayload } : requestPayload;
        tasks.push(runIntegrationSync('vendorRewards', () => botAPI.syncVendorRewards(vendorPayload)));
      }

      if (tasks.length) {
        Promise.allSettled(tasks).catch((err) => {
          console.warn('useBotQuery integration propagation error:', err);
        });
      }
    },
    [runIntegrationSync, status.model]
  );

  const sendQuery = useCallback(
    async (queryText) => {
      const trimmed = typeof queryText === 'string' ? queryText.trim() : '';
      if (!trimmed) {
        setError('Let YustaAI know what you need first.');
        return { success: false, error: 'empty' };
      }

      const entryId = `entry-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
      const baseEntry = buildHistoryEntry({ id: entryId, query: trimmed, mode, location });
      setHistory((prev) => [...prev, baseEntry]);

      setLoading(true);
      setError('');

      try {
        const response = await botAPI.query(buildRequestPayload(trimmed, mode, location));
        const payload = buildResponsePayload(response);
        if (!mountedRef.current) {
          return { success: true, data: response };
        }
        const completedEntry = {
          ...baseEntry,
          status: 'complete',
          response: payload,
        };
        lastSuccessRef.current = {
          entry: completedEntry,
          response: payload,
        };
        setLatestResponse(payload);
        setHistory((prev) => prev.map((item) => (item.id === entryId ? completedEntry : item)));
        setLoading(false);
        propagateIntegrations(completedEntry, payload);
        return { success: true, data: response };
      } catch (err) {
        const message = buildErrorMessage(err);
        if (!mountedRef.current) {
          return { success: false, error: message };
        }
        const retryAfter = err?.response?.data?.retryAfter;
        setHistory((prev) =>
          prev.map((item) =>
            item.id === entryId
              ? {
                  ...item,
                  status: 'error',
                  error: message,
                  retryAfter,
                }
              : item
          )
        );
        setError(message);
        setLoading(false);
        return { success: false, error: message };
      }
    },
    [mode, location, propagateIntegrations]
  );

  const clearError = useCallback(() => setError(''), []);

  const syncLatestIntegrations = useCallback(() => {
    const lastSnapshot = lastSuccessRef.current;
    if (!lastSnapshot) {
      return { success: false, error: 'No YustaAI recommendation to sync yet.' };
    }

    const integrationsReady =
      integrationCapabilitiesRef.current.wishlist?.ready ||
      integrationCapabilitiesRef.current.vendorRewards?.ready;

    if (!integrationsReady) {
      return { success: false, error: 'Integrations are not enabled yet.' };
    }

    propagateIntegrations(lastSnapshot.entry, lastSnapshot.response);
    return { success: true };
  }, [propagateIntegrations]);

  useEffect(() => {
    const previous = integrationReadyRef.current;
    const current = {
      wishlist: Boolean(integrationCapabilitiesRef.current.wishlist?.ready && integrations.wishlist.ready),
      vendorRewards: Boolean(
        integrationCapabilitiesRef.current.vendorRewards?.ready && integrations.vendorRewards.ready
      ),
    };

    const wishlistJustEnabled = !previous.wishlist && current.wishlist;
    const vendorJustEnabled = !previous.vendorRewards && current.vendorRewards;

    integrationReadyRef.current = current;

    if ((wishlistJustEnabled || vendorJustEnabled) && lastSuccessRef.current) {
      syncLatestIntegrations();
    }
  }, [integrations.wishlist.ready, integrations.vendorRewards.ready, syncLatestIntegrations]);

  return {
    history,
    latestResponse,
    mode,
    location,
    status,
    integrations,
    loading,
    error,
    sendQuery,
    syncIntegrations: syncLatestIntegrations,
    setMode: changeMode,
    updateLocation,
    clearHistory,
    clearError,
  };
};

export default useBotQuery;
