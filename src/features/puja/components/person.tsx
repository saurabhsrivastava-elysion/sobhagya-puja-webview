import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

export function initials(name: string | null | undefined): string {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean);
  return (
    parts
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join('') || '?'
  ).slice(0, 2);
}

export function PersonAvatar({
  name,
  src,
  className,
}: {
  name?: string | null;
  src?: string | null;
  className?: string;
}) {
  return (
    <Avatar className={cn('size-10 ring-2 ring-primary-soft', className)}>
      {src ? <AvatarImage src={src} alt="" className="object-cover" /> : null}
      <AvatarFallback className="bg-gradient-to-br from-primary-soft to-primary-tint/70 text-sm font-semibold text-primary-strong">
        {initials(name)}
      </AvatarFallback>
    </Avatar>
  );
}
