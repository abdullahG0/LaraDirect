// Admin roles (spec §11). Pure so it's shared by server guards, UI and tests.
//   owner:   everything, including users and settings
//   admin:   orders, products, pricing, sync
//   support: view and manage orders, customers and returns; no pricing edits
//   viewer:  read-only
export type Role = 'owner' | 'admin' | 'support' | 'viewer';
export const ROLES: Role[] = ['owner', 'admin', 'support', 'viewer'];

const RANK: Record<Role, number> = { owner: 4, admin: 3, support: 2, viewer: 1 };

export function hasRole(role: Role | null | undefined, min: Role): boolean {
  return !!role && RANK[role] >= RANK[min];
}

export const PERMISSIONS = {
  'orders.manage': 'support',
  'customers.manage': 'support',
  'returns.manage': 'support',
  'products.manage': 'admin',
  'pricing.manage': 'admin',
  'sync.run': 'admin',
  'logs.view': 'admin',
  'audit.view': 'admin',
  'settings.manage': 'owner',
  'users.manage': 'owner',
} as const satisfies Record<string, Role>;

export type Permission = keyof typeof PERMISSIONS;

export function can(role: Role | null | undefined, permission: Permission): boolean {
  return hasRole(role, PERMISSIONS[permission]);
}

export const ROLE_LABELS: Record<Role, string> = {
  owner: 'Owner',
  admin: 'Admin',
  support: 'Support',
  viewer: 'Viewer',
};
