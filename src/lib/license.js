import { readLocal, writeLocal } from './localPersist';

const key = 'kitchen-os.license';
const password = 'HappyBirthday';
const dayMs = 24 * 60 * 60 * 1000;

function now() {
  return Date.now();
}

function initialLicense() {
  const saved = readLocal(key, null);
  if (saved?.firstSeenAt) return saved;
  const license = { firstSeenAt: new Date().toISOString(), unlockedUntil: '' };
  writeLocal(key, license);
  return license;
}

export function licenseStatus() {
  const license = initialLicense();
  const firstSeen = new Date(license.firstSeenAt).getTime();
  const trialUntil = firstSeen + 14 * dayMs;
  const unlockedUntil = license.unlockedUntil ? new Date(license.unlockedUntil).getTime() : 0;
  const expiresAt = Math.max(trialUntil, unlockedUntil);
  const ok = expiresAt > now();
  return {
    ok,
    expiresAt: new Date(expiresAt).toISOString(),
    mode: unlockedUntil > trialUntil ? 'subscription' : 'trial',
    daysLeft: Math.max(0, Math.ceil((expiresAt - now()) / dayMs))
  };
}

export function unlockLicense(input) {
  if (input !== password) return { ok: false, message: 'Wrong password.' };
  const license = initialLicense();
  const unlockedUntil = new Date(now() + 30 * dayMs).toISOString();
  writeLocal(key, { ...license, unlockedUntil });
  return { ok: true, status: licenseStatus() };
}
