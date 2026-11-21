// Supabase Auth (Google + email) and per-user cloud sync.
// The SDK is loaded lazily so guests and unconfigured builds don't pay for it.
const URL = import.meta.env.VITE_SUPABASE_URL || 'https://dlwgceagomwqseaxqcla.supabase.co';
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const cloudConfigured = Boolean(URL && ANON_KEY);

let client = null;
async function sb() {
  if (!cloudConfigured) throw new Error('Sign-in is not configured yet.');
  if (!client) {
    const { createClient } = await import('@supabase/supabase-js');
    // PKCE returns ?code=… in the query string, which keeps our #/hash routes intact.
    client = createClient(URL, ANON_KEY, { auth: { flowType: 'pkce', persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storageKey: 'zvault-auth' } });
  }
  return client;
}

const toUser = (u) => (u ? {
  uid: u.id,
  name: u.user_metadata?.full_name || u.user_metadata?.name || u.email?.split('@')[0] || 'You',
  email: u.email,
  photo: u.user_metadata?.avatar_url || u.user_metadata?.picture || null,
} : null);

/** Calls cb(user|null) now and on every change. Returns an unsubscribe function. */
export async function watchAuth(cb, onEvent) {
  if (!cloudConfigured) { cb(null); return () => {}; }
  const s = await sb();
  // Subscribe straight after creating the client so events from the URL code exchange
  // (sign-in, password recovery) aren't missed. INITIAL_SESSION delivers the first state.
  const { data: sub } = s.auth.onAuthStateChange((event, session) => {
    cb(toUser(session?.user));
    if (event !== 'INITIAL_SESSION') setTimeout(() => onEvent?.(event), 0);
  });
  return () => sub.subscription.unsubscribe();
}

const appUrl = () => `${window.location.origin}/`;

export async function signInWithGoogle() {
  const s = await sb();
  const { error } = await s.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: appUrl(), queryParams: { prompt: 'select_account' } } });
  if (error) throw error;
  return 'redirect';
}

export async function emailSignIn(email, password, create) {
  const s = await sb();
  if (create) {
    const { data, error } = await s.auth.signUp({ email, password, options: { emailRedirectTo: appUrl() } });
    if (error) throw error;
    if (!data.session) return 'confirm'; // email confirmation is on
    return 'ok';
  }
  const { error } = await s.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return 'ok';
}

export async function resetPassword(email) {
  const s = await sb();
  const { error } = await s.auth.resetPasswordForEmail(email, { redirectTo: appUrl() });
  if (error) throw error;
}

export async function updatePassword(password) {
  const s = await sb();
  const { error } = await s.auth.updateUser({ password });
  if (error) throw error;
}

export async function signOutUser() {
  if (!cloudConfigured) return;
  const s = await sb();
  await s.auth.signOut();
}

/* ---- Cloud sync: one row per user in public.user_state ---- */
export async function loadCloudState(uid) {
  const s = await sb();
  const { data, error } = await s.from('user_state').select('state').eq('user_id', uid).maybeSingle();
  if (error) throw error;
  return data?.state || null;
}

export async function saveCloudState(uid, state) {
  const s = await sb();
  const { error } = await s.from('user_state').upsert({ user_id: uid, state, updated_at: new Date().toISOString() });
  if (error) throw error;
}

export function friendlyAuthError(e) {
  const m = e?.message || '';
  if (/invalid login credentials/i.test(m)) return 'Email or password is incorrect.';
  if (/email not confirmed/i.test(m)) return 'Please confirm your email first — check your inbox.';
  if (/already registered|already been registered/i.test(m)) return 'That email already has an account. Sign in instead.';
  if (/password should be at least/i.test(m)) return 'Use at least 6 characters for your password.';
  if (/provider is not enabled/i.test(m)) return 'Google sign-in isn\'t enabled in Supabase yet (Authentication → Providers → Google).';
  if (/rate limit|too many/i.test(m)) return 'Too many attempts. Wait a moment and try again.';
  if (/failed to fetch|network/i.test(m)) return 'Network error — check your connection.';
  return m || 'Something went wrong.';
}
