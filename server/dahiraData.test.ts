import { describe, expect, it } from "vitest";
import { canManageGoudi } from "./dahiraData";

describe("gestion de Goudi Adjouma", () => {
  it("autorise l’administrateur et le trésorier à renseigner l’organisation", () => {
    expect(canManageGoudi("admin")).toBe(true);
    expect(canManageGoudi("treasurer")).toBe(true);
  });

  it("interdit la gestion au rôle membre", () => {
    expect(canManageGoudi("member")).toBe(false);
  });
});
