import {
  BarChart3,
  ClipboardList,
  Cog,
  LayoutDashboard,
  Package,
  PoundSterling,
  RefreshCw,
  RotateCcw,
  ScrollText,
  Users,
  UserCog,
  type LucideIcon,
} from 'lucide-react';
import type { Role } from '@/lib/auth/roles';

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  minRole: Role;
}

export const NAV: { group: string; items: NavItem[] }[] = [
  {
    group: 'Overview',
    items: [
      { href: '/admin', label: 'Dashboard', icon: LayoutDashboard, minRole: 'viewer' },
      { href: '/admin/reports', label: 'Reports', icon: BarChart3, minRole: 'viewer' },
    ],
  },
  {
    group: 'Sales',
    items: [
      { href: '/admin/orders', label: 'Orders', icon: ClipboardList, minRole: 'viewer' },
      { href: '/admin/customers', label: 'Customers', icon: Users, minRole: 'viewer' },
      { href: '/admin/returns', label: 'Returns', icon: RotateCcw, minRole: 'viewer' },
    ],
  },
  {
    group: 'Catalogue',
    items: [
      { href: '/admin/products', label: 'Products', icon: Package, minRole: 'viewer' },
      { href: '/admin/pricing', label: 'Pricing', icon: PoundSterling, minRole: 'viewer' },
      { href: '/admin/sync', label: 'Stock & sync', icon: RefreshCw, minRole: 'viewer' },
    ],
  },
  {
    group: 'System',
    items: [
      { href: '/admin/settings', label: 'Settings', icon: Cog, minRole: 'admin' },
      { href: '/admin/users', label: 'Users', icon: UserCog, minRole: 'owner' },
      { href: '/admin/audit', label: 'Audit log', icon: ScrollText, minRole: 'admin' },
    ],
  },
];
