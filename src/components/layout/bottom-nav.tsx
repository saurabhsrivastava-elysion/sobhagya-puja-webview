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
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border/70 bg-background/95 shadow-float backdrop-blur">
      <ul className="mx-auto flex max-w-md">
        {items.map((item) => (
          <li key={item.to} className="flex-1">
            <Link
              to={item.to}
              activeOptions={{ exact: item.exact ?? false, includeSearch: false }}
              className="flex h-16 flex-col items-center justify-center gap-1 text-[12px] font-medium text-muted-foreground"
            >
              {({ isActive }) => (
                <>
                  <span
                    className={cn(
                      'flex h-8 w-14 items-center justify-center rounded-full transition-colors duration-200',
                      isActive && 'bg-primary-soft',
                    )}
                  >
                    <item.icon
                      className={cn('size-[22px] transition-colors', isActive && 'text-primary')}
                      strokeWidth={isActive ? 2.2 : 1.8}
                    />
                  </span>
                  <span className={cn('leading-none', isActive && 'font-semibold text-primary-strong')}>
                    {item.label}
                  </span>
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
  return (
    <div className={cn('mx-auto w-full max-w-md pb-22', className)}>
      {children}
    </div>
  );
}
