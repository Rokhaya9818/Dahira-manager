export type RotationMember = {
  id: string;
  active: boolean;
  rotationIndex: number;
};

export type OrganizerHistoryEntry = {
  memberId: string;
  scheduledFor: number;
};

/** The check-in is voluntary and available Thursday from 21:00 to 23:59. */
export function isCheckInOpen(date: Date): boolean {
  return date.getDay() === 4 && date.getHours() >= 21 && date.getHours() < 24;
}

/**
 * Picks the next active member in the declared rotation after the most recently
 * confirmed organizer. This prevents a member from being selected twice before
 * the active rotation has moved on.
 */
export function getSuggestedOrganizer(
  members: RotationMember[],
  history: OrganizerHistoryEntry[],
): RotationMember | undefined {
  const ordered = members
    .filter(member => member.active)
    .sort((a, b) => a.rotationIndex - b.rotationIndex);

  if (ordered.length === 0) return undefined;
  if (history.length === 0) return ordered[0];

  const latest = [...history].sort((a, b) => b.scheduledFor - a.scheduledFor)[0];
  const lastIndex = ordered.findIndex(member => member.id === latest.memberId);
  return ordered[(lastIndex + 1 + ordered.length) % ordered.length];
}

export type AppRole = "admin" | "treasurer" | "member";

export function canManageTreasury(role: AppRole): boolean {
  return role === "admin" || role === "treasurer";
}

export function canManageMembers(role: AppRole): boolean {
  return role === "admin";
}
