import { Link } from '@tanstack/react-router';
import type { LucideIcon } from 'lucide-react';

import { cn } from '@/lib/utils';

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  /** Active only on the exact path (home tabs whose children are other tabs). */
  exact?: boolean;
}

export function BottomNav({ items }: { items: NavItem[] }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
      <ul className="mx-auto flex max-w-md">
        {items.map((item) => (
          <li key={item.to} className="flex-1">
            <Link
              to={item.to}
              activeOptions={{ exact: item.exact ?? false }}
              className="group flex flex-col items-center gap-0.5 py-2 text-[11px] text-muted-foreground"
              activeProps={{ className: 'text-primary' }}
            >
              {({ isActive }) => (
                <>
                  <item.icon className={cn('size-5', isActive && 'text-primary')} />
                  <span className={cn(isActive && 'font-medium text-primary')}>{item.label}</span>
                </>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/** Page body above the bottom nav. */
export function NavPage({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('mx-auto w-full max-w-md pb-24', className)}>{children}</div>;
}
