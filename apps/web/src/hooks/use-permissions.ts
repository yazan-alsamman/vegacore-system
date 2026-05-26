'use client';

import { useAuth } from '@/lib/auth-context';
import { canModule, hasPermission, isSuperAdmin, type PermissionAction } from '@/lib/permissions';

export function usePermissions() {
  const { user } = useAuth();

  return {
    user,
    isSuperAdmin: isSuperAdmin(user),
    has: (permission: string) => hasPermission(user, permission),
    can: (module: string, action: PermissionAction) => canModule(user, module, action),
    canCreate: (module: string) => canModule(user, module, 'create'),
    canUpdate: (module: string) => canModule(user, module, 'update'),
    canDelete: (module: string) => canModule(user, module, 'delete'),
    canRead: (module: string) => canModule(user, module, 'read'),
  };
}
