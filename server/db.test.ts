import { describe, expect, it } from "vitest";
import { getDatabasePoolOptions } from "./db";

describe("database pool configuration", () => {
  it("requires TLS 1.2 for TiDB Cloud public endpoints", () => {
    const options = getDatabasePoolOptions("mysql://user:password@gateway01.us-east-1.prod.aws.tidbcloud.com:4000/dahira_manager");

    expect(options.ssl).toEqual({ minVersion: "TLSv1.2" });
    expect(options.enableKeepAlive).toBe(true);
  });

  it("does not force TLS for a local MySQL URL", () => {
    const options = getDatabasePoolOptions("mysql://root@127.0.0.1:3306/dahira_manager");

    expect(options.ssl).toBeUndefined();
  });
});
