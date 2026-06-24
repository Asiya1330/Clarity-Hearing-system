import { describe, expect, it } from "vitest";
import { getRequestAuditContext, hashRequestValue } from "./audit";

describe("hashRequestValue", () => {
  it("is deterministic for the same value+salt", () => {
    const a = hashRequestValue("1.2.3.4", "salt");
    const b = hashRequestValue("1.2.3.4", "salt");
    expect(a).toBe(b);
  });
  it("produces a 64-char hex digest that never echoes the input", () => {
    const h = hashRequestValue("1.2.3.4", "salt");
    expect(h).toMatch(/^[0-9a-f]{64}$/);
    expect(h).not.toContain("1.2.3.4");
  });
  it("changes when the salt changes", () => {
    expect(hashRequestValue("1.2.3.4", "salt-a")).not.toBe(
      hashRequestValue("1.2.3.4", "salt-b"),
    );
  });
});

describe("getRequestAuditContext", () => {
  it("returns nulls when no request is given", () => {
    expect(getRequestAuditContext(undefined)).toEqual({
      request_ip_hash: null,
      user_agent_hash: null,
    });
  });

  it("hashes IP + user-agent (never stores raw values)", () => {
    const req = new Request("https://example.com", {
      headers: {
        "x-forwarded-for": "9.9.9.9, 10.0.0.1",
        "user-agent": "Mozilla/5.0 TestAgent",
      },
    });
    const ctx = getRequestAuditContext(req);
    expect(ctx.request_ip_hash).toMatch(/^[0-9a-f]{64}$/);
    expect(ctx.user_agent_hash).toMatch(/^[0-9a-f]{64}$/);
    expect(ctx.request_ip_hash).not.toContain("9.9.9.9");
    expect(ctx.user_agent_hash).not.toContain("TestAgent");
  });

  it("leaves IP hash null when the IP is unknown", () => {
    const req = new Request("https://example.com", {
      headers: { "user-agent": "UA" },
    });
    const ctx = getRequestAuditContext(req);
    expect(ctx.request_ip_hash).toBeNull();
    expect(ctx.user_agent_hash).toMatch(/^[0-9a-f]{64}$/);
  });
});
