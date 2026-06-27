import { describe, expect, it } from "vitest";
import {
  CLINIC_ADMIN_ROLES,
  DEFAULT_CLINIC_ROLE,
  formatClinicRole,
  hasClinicAdminAccess,
  isClinicOwner,
  isClinicRole,
} from "./clinic-roles";

describe("clinic roles", () => {
  it("defaults new users to employee, not owner", () => {
    expect(DEFAULT_CLINIC_ROLE).toBe("employee");
    expect(DEFAULT_CLINIC_ROLE).not.toBe("owner");
  });

  it("treats owner and clinic-admin as admin-capable", () => {
    for (const role of CLINIC_ADMIN_ROLES) {
      expect(hasClinicAdminAccess(role)).toBe(true);
    }
    expect(hasClinicAdminAccess("clinic-staff")).toBe(false);
    expect(hasClinicAdminAccess("employee")).toBe(false);
  });

  it("identifies clinic owners", () => {
    expect(isClinicOwner("owner")).toBe(true);
    expect(isClinicOwner("clinic-admin")).toBe(false);
  });

  it("formats known role labels", () => {
    expect(formatClinicRole("clinic-admin")).toBe("Clinic Admin");
    expect(isClinicRole("clinic-staff")).toBe(true);
    expect(isClinicRole("admin")).toBe(false);
  });
});
