import { ForbiddenException } from '@nestjs/common';

export interface ClientScopedUser {
  role?: string;
  clientId?: string | null;
}

export function isClientPortalUser(user?: ClientScopedUser): boolean {
  return user?.role === 'client';
}

export function assertClientAccess(user: ClientScopedUser | undefined, clientId: string) {
  if (isClientPortalUser(user) && user?.clientId !== clientId) {
    throw new ForbiddenException('Access denied to this client');
  }
}

/** Client portal users may only access their own clientId. */
export function resolveClientScope(user: ClientScopedUser | undefined, requestedClientId?: string): string | undefined {
  if (!isClientPortalUser(user)) return requestedClientId;
  if (!user?.clientId) throw new ForbiddenException('Client account is not linked to a company');
  if (requestedClientId && requestedClientId !== user.clientId) {
    throw new ForbiddenException('Access denied to this client');
  }
  return user.clientId;
}
