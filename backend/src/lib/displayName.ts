/**
 * Every domain record denormalizes a human display name so pages never have
 * to join back to User just to render "who". displayName is nullable on
 * User (frozen seed.ts admin-upsert never sets it), so this is the single
 * fallback point: prefer the stored name, else the email local-part.
 */
export function resolveDisplayName(user: { displayName?: string | null; email: string }): string {
  const trimmed = user.displayName?.trim();
  if (trimmed) return trimmed;
  return user.email.split('@')[0] ?? user.email;
}
