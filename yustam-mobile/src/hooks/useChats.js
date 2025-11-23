import { useState, useEffect, useCallback, useRef } from 'react';
import { subscribeChatsForBuyer, subscribeChatsForVendor } from '../services/chatSync';
import { mapThreadToState } from '../utils/chat';

export default function useChats({ uid, role = 'buyer', onError } = {}) {
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const applyThreads = useCallback((threads = []) => {
    const mapped = threads.map(mapThreadToState);
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      try {
        const sample = mapped.slice(0, 5).map(t => ({ id: t.id, vendorId: t.vendorId, vendorName: t.vendorName, lastMessage: t.lastMessage }));
        console.debug('[useChats] applyThreads sample', { uid: uid || null, count: mapped.length, sample });
      } catch (e) {
        console.debug('[useChats] applyThreads', { uid: uid || null, count: mapped.length });
      }
    }
    setChats(mapped);
  }, []);

  const onErrorRef = useRef(onError);
  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  useEffect(() => {
    if (!uid) {
      setChats([]);
      setLoading(false);
      return () => {};
    }

    setLoading(true);
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      console.debug('[useChats] subscribing', { uid, role });
    }

    const subscriber = (role === 'vendor' && typeof subscribeChatsForVendor === 'function')
      ? subscribeChatsForVendor
      : subscribeChatsForBuyer;

    const unsubscribe = subscriber(
      uid,
      (threads = []) => {
        const list = Array.isArray(threads) ? threads : [];
        if (typeof __DEV__ !== 'undefined' && __DEV__) {
          console.debug('[useChats] received threads', { uid, count: list.length });
        }
        applyThreads(list);
        setLoading(false);
        setRefreshing(false);
      },
      {
        onError: (err) => {
          console.error('Chats subscription error:', err);
          onErrorRef.current?.(err);
        },
      }
    );

    return () => {
      if (typeof __DEV__ !== 'undefined' && __DEV__) {
        console.debug('[useChats] unsubscribing', { uid, role });
      }
      try { unsubscribe?.(); } catch (e) { /* ignore */ }
    };
  }, [uid, role, applyThreads]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 700);
  }, []);

  return { chats, loading, refreshing, onRefresh, setChats, setLoading };
}
