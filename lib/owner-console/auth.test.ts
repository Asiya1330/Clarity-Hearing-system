import { describe, expect, it } from "vitest";
// The security-critical authorization predicates live in the pure (edge-safe)
// claims module and are re-exported by auth.ts. We test them directly so the
// suite never needs next/navigation or the service-role client.
import {
  aalFromClaims,
  getConsoleRoleFromUser,
  isAal2,
  isConsoleEnabled,
  isHardcodedOwner,
  isSubAdmin,
  isSuperAdmin,
  normalizeEmail,
  type ConsoleIdentity,
} from "./claims";

const OWNER = "sl@evear.ca";
const owner: ConsoleIdentity = { email: OWNER, app_metadata: {} };
const ownerUpperSpaced: ConsoleIdentity = { email: "  SL@Evear.CA ", app_metadata: {} };
const superStaff: ConsoleIdentity = {
  email: "boss@example.com",
  app_metadata: { oviz_console_enabled: true, oviz_console_role: "super_admin" },
};
const subStaff: ConsoleIdentity = {
  email: "help@example.com",
  app_metadata: { oviz_console_enabled: true, oviz_console_role: "sub_admin" },
};
const enabledNoRole: ConsoleIdentity = {
  email: "weird@example.com",
  app_metadata: { oviz_console_enabled: true },
};
const roleWithoutEnabled: ConsoleIdentity = {
  email: "sneaky@example.com",
  app_metadata: { oviz_console_role: "super_admin" },
};
const clinicUser: ConsoleIdentity = {
  email: "clinician@example.com",
  app_metadata: { provider: "email" },
};

describe("normalizeEmail", () => {
  it("trims and lowercases", () => {
    expect(normalizeEmail("  Foo@Bar.COM ")).toBe("foo@bar.com");
    expect(normalizeEmail(null)).toBe("");
    expect(normalizeEmail(undefined)).toBe("");
  });
});

describe("isHardcodedOwner", () => {
  it("matches the owner email regardless of case/whitespace", () => {
    expect(isHardcodedOwner(owner)).toBe(true);
    expect(isHardcodedOwner(ownerUpperSpaced)).toBe(true);
  });
  it("rejects everyone else and null", () => {
    expect(isHardcodedOwner(clinicUser)).toBe(false);
    expect(isHardcodedOwner(superStaff)).toBe(false);
    expect(isHardcodedOwner(null)).toBe(false);
  });
});

describe("getConsoleRoleFromUser", () => {
  it("owner is always super_admin", () => {
    expect(getConsoleRoleFromUser(owner)).toBe("super_admin");
  });
  it("reads a valid staff role", () => {
    expect(getConsoleRoleFromUser(superStaff)).toBe("super_admin");
    expect(getConsoleRoleFromUser(subStaff)).toBe("sub_admin");
  });
  it("returns null for unknown roles and non-staff", () => {
    expect(
      getConsoleRoleFromUser({ email: "x@y.com", app_metadata: { oviz_console_role: "root" } }),
    ).toBeNull();
    expect(getConsoleRoleFromUser(clinicUser)).toBeNull();
    expect(getConsoleRoleFromUser(null)).toBeNull();
  });
});

describe("isConsoleEnabled", () => {
  it("true for owner and properly-flagged staff", () => {
    expect(isConsoleEnabled(owner)).toBe(true);
    expect(isConsoleEnabled(superStaff)).toBe(true);
    expect(isConsoleEnabled(subStaff)).toBe(true);
  });
  it("false when enabled flag is missing a valid role, or role without the enabled flag", () => {
    expect(isConsoleEnabled(enabledNoRole)).toBe(false);
    expect(isConsoleEnabled(roleWithoutEnabled)).toBe(false);
    expect(isConsoleEnabled(clinicUser)).toBe(false);
    expect(isConsoleEnabled(null)).toBe(false);
  });
});

describe("isSuperAdmin / isSubAdmin", () => {
  it("owner is super_admin and never sub_admin", () => {
    expect(isSuperAdmin(owner)).toBe(true);
    expect(isSubAdmin(owner)).toBe(false);
  });
  it("staff roles map correctly", () => {
    expect(isSuperAdmin(superStaff)).toBe(true);
    expect(isSubAdmin(superStaff)).toBe(false);
    expect(isSubAdmin(subStaff)).toBe(true);
    expect(isSuperAdmin(subStaff)).toBe(false);
  });
  it("a role claim without the enabled flag confers nothing", () => {
    expect(isSuperAdmin(roleWithoutEnabled)).toBe(false);
  });
});

describe("AAL helpers", () => {
  it("reads aal2 from claims, defaults to aal1", () => {
    expect(isAal2({ aal: "aal2" })).toBe(true);
    expect(isAal2({ aal: "aal1" })).toBe(false);
    expect(isAal2({})).toBe(false);
    expect(aalFromClaims(undefined)).toBe("aal1");
  });
});
