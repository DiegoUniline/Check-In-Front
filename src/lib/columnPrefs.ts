import { useSyncExternalStore } from 'react';
import { supabase } from '@/integrations/supabase/client';

/*
 * Columnas ocultas por tabla y por usuario. Se guardan en el perfil de
 * Supabase Auth (user_metadata.columnas_ocultas), así viajan entre equipos;
 * localStorage sólo acelera el primer pintado.
 */
type Prefs = Record<string, string[]>;
const META_KEY = 'columnas_ocultas';
const localKey = (uid: string) => `vulo:columnas:${uid}`;

let uid: string | null = null;
let prefs: Prefs = {};
let saveTimer: ReturnType<typeof setTimeout> | null = null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

const load = (user: { id: string; user_metadata?: Record<string, any> } | null | undefined) => {
  uid = user?.id || null;
  let next: Prefs = {};
  if (uid) {
    try { next = JSON.parse(localStorage.getItem(localKey(uid)) || '{}'); } catch { next = {}; }
    const remote = user?.user_metadata?.[META_KEY];
    if (remote && typeof remote === 'object') next = remote as Prefs;
    try { localStorage.setItem(localKey(uid), JSON.stringify(next)); } catch { /* sin almacenamiento */ }
  }
  prefs = next;
  notify();
};

void supabase.auth.getSession().then(({ data }) => load(data.session?.user));
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'INITIAL_SESSION') load(session?.user);
});

const persist = () => {
  if (!uid) return;
  try { localStorage.setItem(localKey(uid), JSON.stringify(prefs)); } catch { /* sin almacenamiento */ }
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    void supabase.auth.updateUser({ data: { [META_KEY]: prefs } });
  }, 700);
};

export const setHiddenColumns = (tableKey: string, hidden: string[]) => {
  const next = { ...prefs };
  if (hidden.length) next[tableKey] = hidden;
  else delete next[tableKey];
  prefs = next;
  notify();
  persist();
};

const EMPTY: string[] = [];
export const useHiddenColumns = (tableKey: string | null): string[] =>
  useSyncExternalStore(
    (cb) => { listeners.add(cb); return () => listeners.delete(cb); },
    () => (tableKey ? prefs[tableKey] || EMPTY : EMPTY),
  );
