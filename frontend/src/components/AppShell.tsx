import type { ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
import { useGame } from '@/game/hooks';
import type { ConnectionStatus } from '@/game/socket';
import { cn } from 'cn';

const CONNECTION_LABELS: Record<ConnectionStatus, string> = {
  online: 'Connected',
  connecting: 'Connecting…',
  reconnecting: 'Reconnecting…',
};

function ConnectionBadge({ status }: { status: ConnectionStatus }) {
  const online = status === 'online';
  return (
    <Badge
      variant="outline"
      role="status"
      className={cn(
        online
          ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
          : 'border-amber-300 bg-amber-50 text-amber-800',
      )}
    >
      {CONNECTION_LABELS[status]}
    </Badge>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { connection } = useGame();

  return (
    <div className="min-h-screen bg-muted/40">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              A four-player supply chain
            </p>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Beer Distribution Game</h1>
          </div>
          <ConnectionBadge status={connection} />
        </header>
        <main className="space-y-6">{children}</main>
        <footer className="mt-10 text-center text-xs text-muted-foreground">
          Inventory costs 0.5 per unit · Backlog costs 1 per unit · Shipping is automatic
        </footer>
      </div>
    </div>
  );
}
