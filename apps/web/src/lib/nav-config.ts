import type { LucideIcon } from 'lucide-react';
import {
  Bot,
  Building2,
  CalendarDays,
  LayoutDashboard,
  MessageSquare,
  UserCircle,
  Users,
  Wallet,
} from 'lucide-react';

export interface NavItem {
  href: string;
  icon: LucideIcon;
  key: string;
  /** Module slug for `module.read` permission */
  module: string;
}

/** Sidebar items visible to client portal users only */
export const CLIENT_PORTAL_NAV_KEYS = new Set(['myPortal', 'calendar', 'chat']);

export const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', icon: LayoutDashboard, key: 'dashboard', module: 'dashboard' },
  { href: '/clients', icon: Users, key: 'clients', module: 'clients' },
  { href: '/clients', icon: Users, key: 'myPortal', module: 'clients' },
  { href: '/chat', icon: MessageSquare, key: 'chat', module: 'chat' },
  { href: '/calendar', icon: CalendarDays, key: 'calendar', module: 'calendar' },
  { href: '/models', icon: UserCircle, key: 'models', module: 'models' },
  { href: '/hr', icon: Building2, key: 'hr', module: 'hr' },
  { href: '/finance', icon: Wallet, key: 'finance', module: 'finance' },
  { href: '/ai', icon: Bot, key: 'ai', module: 'ai' },
];

/** First allowed route for role after login */
export const ROLE_HOME: Record<string, string> = {
  'super-admin': '/dashboard',
  'general-manager': '/dashboard',
  'project-manager': '/dashboard',
  developer: '/dashboard',
  'account-manager': '/clients',
  'marketing-manager': '/clients',
  photographer: '/calendar',
  'video-editor': '/clients',
  model: '/calendar',
  accountant: '/finance',
  client: '/clients',
};

export function isClientPortalRole(role?: string): boolean {
  return role === 'client';
}

export function getHomeForRole(roleSlug?: string): string {
  if (!roleSlug) return '/dashboard';
  return ROLE_HOME[roleSlug] || '/dashboard';
}
