import type { LucideIcon } from 'lucide-react';
import {
  Archive,
  Bot,
  Building2,
  Camera,
  CalendarDays,
  CheckSquare,
  FileBarChart,
  FolderKanban,
  LayoutDashboard,
  Megaphone,
  MessageSquare,
  Shield,
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

export const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', icon: LayoutDashboard, key: 'dashboard', module: 'dashboard' },
  { href: '/clients', icon: Users, key: 'clients', module: 'clients' },
  { href: '/projects', icon: FolderKanban, key: 'projects', module: 'projects' },
  { href: '/tasks', icon: CheckSquare, key: 'tasks', module: 'tasks' },
  { href: '/chat', icon: MessageSquare, key: 'chat', module: 'chat' },
  { href: '/calendar', icon: CalendarDays, key: 'calendar', module: 'calendar' },
  { href: '/marketing', icon: Megaphone, key: 'marketing', module: 'marketing' },
  { href: '/media', icon: Camera, key: 'media', module: 'media' },
  { href: '/models', icon: UserCircle, key: 'models', module: 'models' },
  { href: '/hr', icon: Building2, key: 'hr', module: 'hr' },
  { href: '/finance', icon: Wallet, key: 'finance', module: 'finance' },
  { href: '/reports', icon: FileBarChart, key: 'reports', module: 'reports' },
  { href: '/archive', icon: Archive, key: 'archive', module: 'archive' },
  { href: '/ai', icon: Bot, key: 'ai', module: 'ai' },
  { href: '/security', icon: Shield, key: 'security', module: 'security' },
];

/** First allowed route for role after login */
export const ROLE_HOME: Record<string, string> = {
  'super-admin': '/dashboard',
  'general-manager': '/dashboard',
  'project-manager': '/projects',
  developer: '/projects',
  'marketing-manager': '/marketing',
  photographer: '/media',
  'video-editor': '/marketing',
  model: '/calendar',
  accountant: '/finance',
  client: '/projects',
};

export function getHomeForRole(roleSlug?: string): string {
  if (!roleSlug) return '/dashboard';
  return ROLE_HOME[roleSlug] || '/dashboard';
}
