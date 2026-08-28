const SLUG = 'scan-archive-receipt';
const KEY = `sb_license:${SLUG}`;
const VERDICT_KEY = `${KEY}:verdict`;
const API = 'https://api.sociobot.in/api/v1';

export type LicenseVerdict = {
  token: string;
  valid: boolean;
  checkedAt: number;
  reason?: string;
};

export const checkoutUrl = `${API}/products/${SLUG}/checkout`;
export const getLicense = () => localStorage.getItem(KEY) || '';

function readVerdict(): LicenseVerdict | null {
  try {
    const verdict = JSON.parse(localStorage.getItem(VERDICT_KEY) || 'null') as Partial<LicenseVerdict> | null;
    if (!verdict || typeof verdict.token !== 'string' || typeof verdict.valid !== 'boolean' || typeof verdict.checkedAt !== 'number') return null;
    return {
      token: verdict.token,
      valid: verdict.valid,
      checkedAt: verdict.checkedAt,
      ...(typeof verdict.reason === 'string' ? { reason: verdict.reason } : {})
    };
  } catch {
    return null;
  }
}

/** Capturing any checkout return always makes its entitlement a fresh check. */
export function captureLicense(): boolean {
  const url = new URL(location.href); const token = url.searchParams.get('license');
  if (!token) return false;
  localStorage.setItem(KEY, token);
  localStorage.removeItem(VERDICT_KEY);
  url.searchParams.delete('license'); history.replaceState({}, '', url);
  return true;
}

export function storeLicense(token: string): void { localStorage.setItem(KEY, token.trim()); localStorage.removeItem(VERDICT_KEY); }

export function optimisticUnlock(): boolean {
  return Boolean(getLicenseVerdict()?.valid);
}

/** A verdict is only useful for the exact license token that produced it. */
export function getLicenseVerdict(): LicenseVerdict | null {
  const cached = readVerdict();
  return cached && cached.token === getLicense() ? cached : null;
}

export async function verifyLicense(force = false): Promise<boolean> {
  const token = getLicense(); if (!token) return false;
  const cached = getLicenseVerdict();
  if (!force && cached && Date.now() - cached.checkedAt < 86_400_000) return cached.valid;
  try {
    const response = await fetch(`${API}/products/${SLUG}/verify?license=${encodeURIComponent(token)}`);
    if (!response.ok) throw new Error(`License verification returned ${response.status}`);
    const result = await response.json() as {valid?: unknown; reason?: unknown};
    if (typeof result.valid !== 'boolean') throw new Error('License verification returned an invalid response');
    localStorage.setItem(VERDICT_KEY, JSON.stringify({
      token,
      valid: result.valid,
      checkedAt: Date.now(),
      ...(typeof result.reason === 'string' ? { reason: result.reason } : {})
    } satisfies LicenseVerdict));
    return result.valid;
  } catch { return cached?.valid || false; }
}
