export type AdmissionRole = 'Admin' | 'Creator' | 'Viewer';

export const VALID_ROLES: AdmissionRole[] = ['Admin', 'Creator', 'Viewer'];

export function normalizeAccountEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isValidAccountEmail(email: string): boolean {
  const normalized = normalizeAccountEmail(email);
  return (
    normalized.length >= 5 &&
    normalized.length <= 254 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)
  );
}

export function normalizeRole(role?: string | null): AdmissionRole {
  if (!role) return 'Creator';
  const r = role.trim().toLowerCase();
  if (r === 'admin' || r === 'administrator') return 'Admin';
  if (r === 'viewer' || r === 'readonly') return 'Viewer';
  return 'Creator';
}

export function accountAdmissionMode(): 'invitation-only' {
  return 'invitation-only';
}
