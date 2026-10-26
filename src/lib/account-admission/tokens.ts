import { createHash, randomBytes } from 'node:crypto';

export function createOpaqueToken(): string {
  return randomBytes(24).toString('base64url');
}

export function createInviteCode(prefix = 'TRIPO'): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = randomBytes(8);
  let part1 = '';
  let part2 = '';
  for (let i = 0; i < 4; i++) {
    part1 += alphabet[bytes[i] % alphabet.length];
    part2 += alphabet[bytes[i + 4] % alphabet.length];
  }
  return `${prefix}-${part1}-${part2}`;
}

export function normalizeInviteCode(code: string): string {
  return code.trim().toUpperCase();
}

export function hashOpaqueToken(token: string): string {
  return createHash('sha256').update(token.trim(), 'utf8').digest('base64url');
}
