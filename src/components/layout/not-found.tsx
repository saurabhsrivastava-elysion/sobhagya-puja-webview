import { Link } from '@tanstack/react-router';

import { Button } from '@/components/ui/button';

export function NotFound() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-3 p-6 text-center">
      <p className="font-mono text-sm text-muted-foreground">404</p>
      <h1 className="text-lg font-semibold">Page not found</h1>
      <Button asChild size="sm" variant="outline">
        <Link to="/">Back to home</Link>
      </Button>
    </main>
  );
}
