const SLUG = 'scan-archive-receipt';
const KEY = `sb_license:${SLUG}`;
const VERDICT_KEY = `${KEY}:verdict`;
const API = 'https://api.sociobot.in/api/v1';

export const checkoutUrl = `${API}/products/${SLUG}/checkout`;
export const getLicense = () => localStorage.getItem(KEY) || '';

export function captureLicense(): void {
  const url = new URL(location.href); const token = url.searchParams.get('license');
  if (!token) return;
  localStorage.setItem(KEY, token); url.searchParams.delete('license'); history.replaceState({}, '', url);
}

export function storeLicense(token: string): void { localStorage.setItem(KEY, token.trim()); localStorage.removeItem(VERDICT_KEY); }

export function optimisticUnlock(): boolean {
  const cached = JSON.parse(localStorage.getItem(VERDICT_KEY) || 'null') as {valid:boolean}|null;
  return Boolean(getLicense() && cached?.valid);
}

export async function verifyLicense(force = false): Promise<boolean> {
  const token = getLicense(); if (!token) return false;
  const cached = JSON.parse(localStorage.getItem(VERDICT_KEY) || 'null') as {valid:boolean; checkedAt:number}|null;
  if (!force && cached && Date.now() - cached.checkedAt < 86_400_000) return cached.valid;
  try {
    const response = await fetch(`${API}/products/${SLUG}/verify?license=${encodeURIComponent(token)}`);
    const result = await response.json() as {valid:boolean};
    localStorage.setItem(VERDICT_KEY, JSON.stringify({valid: result.valid, checkedAt: Date.now()}));
    return result.valid;
  } catch { return cached?.valid || false; }
}
