export type PermissionAction = 'read' | 'create' | 'update' | 'delete' | 'manage' | 'use';

export interface PermissionUser {
  permissions?: string[];
  role?: string;
}

export function hasPermission(user: PermissionUser | null | undefined, permission: string): boolean {
  if (!user?.permissions?.length) return false;
  if (user.permissions.includes('*')) return true;
  return user.permissions.includes(permission);
}

export function canModule(
  user: PermissionUser | null | undefined,
  module: string,
  action: PermissionAction,
): boolean {
  return hasPermission(user, `${module}.${action}`);
}

export function isSuperAdmin(user: PermissionUser | null | undefined): boolean {
  return user?.role === 'super-admin' || user?.permissions?.includes('*') === true;
}

/** Can see a sidebar section (needs `module.read` or `module.use` for AI) */
export function canAccessModule(user: PermissionUser | null | undefined, module: string): boolean {
  if (isSuperAdmin(user)) return true;
  if (module === 'ai') return canModule(user, 'ai', 'use') || canModule(user, 'ai', 'read');
  return canModule(user, module, 'read');
}
