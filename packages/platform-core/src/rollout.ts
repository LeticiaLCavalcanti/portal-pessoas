import type { JourneyManifest } from '@portal/journey-contract';

/** Hash estável: o mesmo colaborador cai sempre no mesmo bucket. */
function bucketOf(userId: string, journeyId: string): number {
  const s = `${userId}:${journeyId}`;
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h) % 100;
}

/**
 * Decide se ESTE colaborador vê a jornada moderna.
 *
 * Roda no cliente além do BFF, de propósito -- ver docs/adr/0010.
 */
export function resolveRollout(m: JourneyManifest, user: { id: string; roles: string[] }) {
  if (!m.rollout.enabled) return { active: false, reason: 'desligada' as const };
  if (m.rollout.allowlist.some((r) => user.roles.includes(r))) {
    return { active: true, reason: 'allowlist' as const };
  }
  const bucket = bucketOf(user.id, m.id);
  return bucket < m.rollout.percentage
    ? { active: true, reason: 'rollout' as const, bucket }
    : { active: false, reason: 'fora-do-rollout' as const, bucket };
}
