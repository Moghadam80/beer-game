import type { ReactNode } from 'react';
import { ROLE_LABELS, type GameView, type PlayerSummary } from '@/game/protocol';
import { cn } from 'cn';

interface PlayerListProps {
  view: GameView;
  /** Optional extra content per player, for example a "Take role" button. */
  renderAction?: (player: PlayerSummary) => ReactNode;
  className?: string;
}

function statusText(view: GameView, player: PlayerSummary): string {
  if (!player.taken) return 'Open role';
  if (view.status === 'waiting') return player.connected ? 'Ready' : 'Offline · reserved';
  if (player.submitted) return 'Order submitted ✓';
  return player.connected ? 'Choosing order' : 'Offline · waiting';
}

export function PlayerList({ view, renderAction, className }: PlayerListProps) {
  return (
    <ul aria-label="Player status" className={cn('grid grid-cols-2 gap-3', className)}>
      {view.players.map((player) => {
        const isYou = player.role === view.role;
        return (
          <li
            key={player.role}
            className={cn('grid content-start gap-1 rounded-lg border bg-card p-4', isYou && 'border-primary bg-primary/5')}
          >
            <strong className="text-sm">
              {ROLE_LABELS[player.role]}
              {isYou && ' · You'}
            </strong>
            <span className="break-words text-sm">{player.name ?? 'Available'}</span>
            <small className="text-xs text-muted-foreground">{statusText(view, player)}</small>
            {renderAction?.(player)}
          </li>
        );
      })}
    </ul>
  );
}
