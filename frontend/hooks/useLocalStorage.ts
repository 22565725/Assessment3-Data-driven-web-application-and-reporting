"use client";

import { useCallback, useRef, useSyncExternalStore } from "react";

/* CHANGED: this hook no longer copies localStorage into useState inside a
   useEffect. That pattern is what the linter flagged (react-hooks/set-state-in-effect)
   and it had three real costs:

     1. A wasted render every mount — render with the default, run the effect,
        setState, render again.
     2. Two components reading the same key never agreed. Settings and FeedList
        both read "feedLayout" into their OWN useState, so changing the layout in
        Settings did not update a FeedList that was already mounted.
     3. Nothing noticed changes made in another browser tab.

   localStorage is not React state — it is state that lives OUTSIDE React and can
   change without React knowing. useSyncExternalStore is the API built for exactly
   that: it subscribes to an external source and takes a separate server snapshot,
   so server rendering and hydration are handled without an effect. */

type CacheEntry = { raw: string | null; value: unknown };

/* useSyncExternalStore calls getSnapshot on every render and throws
   "The result of getSnapshot should be cached" if the identity changes between
   calls. JSON.parse returns a NEW object each time, so parsed values are cached
   against the raw string they came from and only re-parsed when that string
   actually changes. */
const cache = new Map<string, CacheEntry>();

// One key is one store, so every hook reading that key shares these listeners.
const listeners = new Set<() => void>();

function notify() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  // "storage" only fires in OTHER tabs, which is why same-tab writes go through
  // notify() above. Together they cover both cases.
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

function readSnapshot<T>(key: string, fallback: T): T {
  const raw = window.localStorage.getItem(key);
  const cached = cache.get(key);
  if (cached && cached.raw === raw) return cached.value as T;

  let value = fallback;
  if (raw !== null) {
    try {
      value = JSON.parse(raw) as T;
    } catch (error) {
      console.error(`Could not read "${key}" from local storage:`, error);
    }
  }

  cache.set(key, { raw, value });
  return value;
}

// Never emits: the value it reports changes once, when React hydrates.
const noSubscription = () => () => {};

export function useLocalStorage<T>(key: string, initialValue: T) {
  /* Held in a ref because callers pass literals — useLocalStorage("myData", [])
     creates a new array every render, which would churn setValue's identity. */
  const initialRef = useRef(initialValue);

  const value = useSyncExternalStore(
    subscribe,
    () => readSnapshot(key, initialRef.current),
    // Server snapshot: there is no localStorage in Node, so the default stands.
    () => initialRef.current
  );

  /* Same technique, used to answer "has the browser taken over yet?" — false on
     the server, true once hydrated, and no effect required to find out. */
  const isLoaded = useSyncExternalStore(
    noSubscription,
    () => true,
    () => false
  );

  const setValue = useCallback(
    (next: T | ((current: T) => T)) => {
      const current = readSnapshot(key, initialRef.current);
      const resolved =
        typeof next === "function" ? (next as (current: T) => T)(current) : next;

      window.localStorage.setItem(key, JSON.stringify(resolved));
      cache.delete(key); // force the next read to re-parse
      notify(); // wake every hook watching this key, in this tab
    },
    [key]
  );

  return [value, setValue, isLoaded] as const;
}
