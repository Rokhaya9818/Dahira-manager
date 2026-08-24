import { describe, expect, it } from "vitest";
import { hashSecret, verifySecret } from "./memberAuth";

describe("member account secrets", () => {
  it("hashes a code secret and accepts only the matching value", async () => {
    const hash = await hashSecret("dahira-2026");
    expect(hash).not.toContain("dahira-2026");
    await expect(verifySecret("dahira-2026", hash)).resolves.toBe(true);
    await expect(verifySecret("mauvais-code", hash)).resolves.toBe(false);
  });
});
