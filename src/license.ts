const SLUG = 'rep-range-compass';
const TOKEN_KEY = `sb_license:${SLUG}`;
const CACHE_KEY = `${TOKEN_KEY}:verdict`;
const VERIFY_AFTER_MS = 24 * 60 * 60 * 1000;
const BILLING_BASE = 'https://api.sociobot.in/api/v1';

interface CachedVerdict {
  valid: boolean;
  reason: string;
  checkedAt: number;
}

export interface LicenseState {
  unlocked: boolean;
  checking: boolean;
  notice: string;
}

export const buyUrl = `${BILLING_BASE}/products/${SLUG}/checkout`;

function readToken(): string | null {
  try { return localStorage.getItem(TOKEN_KEY); }
  catch { return null; }
}

function storeToken(token: string): void {
  try { localStorage.setItem(TOKEN_KEY, token); localStorage.removeItem(CACHE_KEY); }
  catch { /* The free experience still works when localStorage is disabled. */ }
}

function readCache(): CachedVerdict | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) as CachedVerdict : null;
  } catch { return null; }
}

function initialToken(): string | null {
  const url = new URL(location.href);
  const returned = url.searchParams.get('license');
  if (returned) {
    storeToken(returned);
    url.searchParams.delete('license');
    history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
    return returned;
  }
  return readToken();
}

async function requestVerdict(token: string): Promise<CachedVerdict> {
  const response = await fetch(`${BILLING_BASE}/products/${SLUG}/verify?license=${encodeURIComponent(token)}`);
  if (!response.ok) throw new Error('License verification is temporarily unavailable.');
  const body = await response.json() as { valid: boolean; reason: string };
  const verdict = { valid: body.valid === true, reason: body.reason, checkedAt: Date.now() };
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(verdict)); } catch { /* Cache is optional. */ }
  return verdict;
}

export async function initializeLicense(onChange: (state: LicenseState) => void): Promise<LicenseState> {
  const token = initialToken();
  const cache = readCache();
  let state: LicenseState = {
    // Offline optimism is only safe after this device has cached a valid
    // verification. Possessing an arbitrary, never-verified string is not an
    // unlock signal.
    unlocked: Boolean(token && cache?.valid),
    checking: Boolean(token),
    notice: token ? 'Checking your Compass Plus license…' : ''
  };
  onChange(state);
  if (!token) return { ...state, checking: false };
  if (cache && Date.now() - cache.checkedAt < VERIFY_AFTER_MS) {
    return { unlocked: cache.valid, checking: false, notice: cache.valid ? 'Compass Plus is active on this device.' : 'License no longer active.' };
  }
  try {
    const verdict = await requestVerdict(token);
    state = { unlocked: verdict.valid, checking: false, notice: verdict.valid ? 'Compass Plus is active on this device.' : 'License no longer active.' };
  } catch {
    state = {
      unlocked: cache?.valid ?? false,
      checking: false,
      notice: cache?.valid
        ? 'Offline: using the last verified license state. We’ll check again later.'
        : 'Could not verify this license. Compass Plus stays locked until this device reconnects.'
    };
  }
  return state;
}

export async function restoreLicense(token: string): Promise<LicenseState> {
  const trimmed = token.trim();
  if (!trimmed) return { unlocked: false, checking: false, notice: 'Paste the license token from your receipt.' };
  storeToken(trimmed);
  try {
    const verdict = await requestVerdict(trimmed);
    return { unlocked: verdict.valid, checking: false, notice: verdict.valid ? 'Compass Plus restored.' : 'That license is not active for this product.' };
  } catch {
    return { unlocked: false, checking: false, notice: 'Could not verify this license. Compass Plus stays locked; reconnect and restore it again.' };
  }
}
