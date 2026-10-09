// Admin roles and what each one may do. Plain data, so client components (the sidebar) can use it too.

export const PERMISSIONS = [
  "dashboard.view", // overview page
  "members.view", // member list, member pages, passport photos
  "members.edit", // correct a member's details
  "members.delete",
  "members.export", // CSV with phone numbers and dates of birth
  "payments.cash", // mark a member as paid in cash
  "cards.print", // bulk print, single card print / download
  "settings.fee",
  "settings.signatory",
  "settings.programs",
  "admins.manage", // add admins, change roles, deactivate
  "audit.view", // the activity log
  "website.edit", // site content, executives, activities
] as const;

export type Permission = (typeof PERMISSIONS)[number];

export const ROLES = {
  super_admin: {
    label: "Super admin",
    about: "Everything, including admins, the fee, the signatory and the activity log.",
    can: PERMISSIONS,
  },
  finance: {
    label: "Finance",
    about: "Members, cash payments and the CSV export.",
    can: ["dashboard.view", "members.view", "payments.cash", "members.export"],
  },
  membership: {
    label: "Membership officer",
    about: "Members, correcting details, printing cards and the programme list.",
    can: ["dashboard.view", "members.view", "members.edit", "cards.print", "settings.programs"],
  },
  content: {
    label: "Content editor",
    about: "The website section only: site content, executives and activities.",
    can: ["website.edit"],
  },
} as const satisfies Record<string, { label: string; about: string; can: readonly Permission[] }>;

export type Role = keyof typeof ROLES;
export const ROLE_KEYS = Object.keys(ROLES) as Role[];

export const isRole = (v: unknown): v is Role => typeof v === "string" && v in ROLES;

export function can(role: string | null | undefined, permission: Permission) {
  return isRole(role) && (ROLES[role].can as readonly Permission[]).includes(permission);
}

export const roleLabel = (role: string) => (isRole(role) ? ROLES[role].label : role);

/** Where a role lands after signing in, or when it opens a page it can't use. Always a page the role can open. */
export const homeFor = (role: string) => (can(role, "dashboard.view") ? "/admin" : can(role, "website.edit") ? "/admin/website" : "/admin/settings");
