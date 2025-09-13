import type { ClientStatus, UserRole, UserStatus } from "@omni/company-client"

export const userFixtures = {
  validUser: {
    email: "test@example.com",
    name: "Test User",
    role: "SUPPORT" as UserRole,
    status: "ACTIVE" as UserStatus,
  },

  adminUser: {
    email: "admin@omni.com",
    name: "Admin User",
    role: "ADMIN" as UserRole,
    status: "ACTIVE" as UserStatus,
  },

  supportUser: {
    email: "support@omni.com",
    name: "Support User",
    role: "SUPPORT" as UserRole,
    status: "ACTIVE" as UserStatus,
  },

  inactiveUser: {
    email: "inactive@example.com",
    name: "Inactive User",
    role: "SUPPORT" as UserRole,
    status: "INACTIVE" as UserStatus,
  },
}

export const clientFixtures = {
  validClient: {
    tenantId: "tenant-123",
    companyName: "Test Company",
    contactEmail: "contact@testcompany.com",
    status: "TRIAL" as ClientStatus,
  },

  activeClient: {
    tenantId: "tenant-456",
    companyName: "Active Company",
    contactEmail: "contact@activecompany.com",
    status: "ACTIVE" as ClientStatus,
  },

  suspendedClient: {
    tenantId: "tenant-789",
    companyName: "Suspended Company",
    contactEmail: "contact@suspendedcompany.com",
    status: "SUSPENDED" as ClientStatus,
  },
}

export const sessionFixtures = {
  validSession: {
    token: "test-session-token-123",
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
  },

  expiredSession: {
    token: "expired-session-token-456",
    expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
  },
}
