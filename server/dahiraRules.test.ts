import { describe, expect, it } from "vitest";
import { canManageMembers, canManageTreasury, getSuggestedOrganizer, isCheckInOpen } from "../shared/dahiraRules";

describe("Dahira business rules", () => {
  const members = [
    { id: "a", active: true, rotationIndex: 1 },
    { id: "b", active: true, rotationIndex: 2 },
    { id: "c", active: true, rotationIndex: 3 },
  ];

  it("suggests the next active member after the last confirmed organizer", () => {
    expect(getSuggestedOrganizer(members, [{ memberId: "b", scheduledFor: 100 }])?.id).toBe("c");
  });

  it("wraps the rotation after the final active member", () => {
    expect(getSuggestedOrganizer(members, [{ memberId: "c", scheduledFor: 100 }])?.id).toBe("a");
  });

  it("opens voluntary check-in only Thursday between 21:00 and 23:59", () => {
    expect(isCheckInOpen(new Date(2026, 7, 27, 20, 59))).toBe(false);
    expect(isCheckInOpen(new Date(2026, 7, 27, 21, 0))).toBe(true);
    expect(isCheckInOpen(new Date(2026, 7, 27, 23, 59))).toBe(true);
    expect(isCheckInOpen(new Date(2026, 7, 28, 0, 0))).toBe(false);
  });

  it("keeps member administration with administrators and treasury access with admin or treasurer", () => {
    expect(canManageMembers("admin")).toBe(true);
    expect(canManageMembers("treasurer")).toBe(false);
    expect(canManageTreasury("treasurer")).toBe(true);
    expect(canManageTreasury("member")).toBe(false);
  });
});

