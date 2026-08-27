import { describe, expect, it } from "vitest";
import { getMemberFirstName, getMemberInitials } from "./memberPresentation";

describe("présentation du compte membre", () => {
  it("affiche les initiales du vrai compte connecté", () => {
    expect(getMemberInitials("Rokhaya Seck")).toBe("RS");
  });

  it("présente un état neutre en l’absence de session", () => {
    expect(getMemberInitials()).toBe("?");
    expect(getMemberFirstName()).toBe("Bienvenue");
  });
});
